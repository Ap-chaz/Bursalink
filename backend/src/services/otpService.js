import crypto from 'node:crypto';
import pool from '../config/db.js';
import { authSecret, POLICY } from '../config/security.js';

const sha256 = v => crypto.createHash('sha256').update(v).digest('hex');
// HMAC (not a bare hash): a 6-digit code has only 1M possibilities, so an unkeyed hash would be
// trivially reversible if the table leaked.
const codeMac = (code, challenge) =>
  crypto.createHmac('sha256', authSecret()).update(`${challenge}:${code}`).digest('hex');

const safeEqualHex = (a, b) =>
  a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

export const PURPOSES = ['verify_email', 'login', 'reset'];

/** Create a one-time code bound to a random challenge. Any older code for the same purpose is invalidated. */
export async function issueOtp({ email, userId = null, purpose, pendingPasswordHash = null }) {
  const code = crypto.randomInt(100000, 1000000).toString(); // CSPRNG
  const challenge = crypto.randomBytes(32).toString('base64url');

  await pool.execute('UPDATE otps SET used = TRUE WHERE email = ? AND purpose = ? AND used = FALSE', [email, purpose]);
  await pool.execute(
    `INSERT INTO otps (email, user_id, purpose, challenge_hash, code, attempts, pending_password_hash, expires_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, DATE_ADD(NOW(), INTERVAL ${Number(POLICY.otpTtlMinutes)} MINUTE))`,
    [email, userId, purpose, sha256(challenge), codeMac(code, challenge), pendingPasswordHash]
  );
  return { code, challenge };
}

/** A challenge indistinguishable from a real one, used for unknown accounts (no enumeration). */
export const fakeChallenge = () => crypto.randomBytes(32).toString('base64url');

async function findLive(challenge, purpose) {
  if (typeof challenge !== 'string' || challenge.length < 20 || challenge.length > 100) return null;
  const [rows] = await pool.execute(
    `SELECT id, email, user_id, code, attempts, pending_password_hash FROM otps
     WHERE challenge_hash = ? AND purpose = ? AND used = FALSE AND expires_at > NOW() LIMIT 1`,
    [sha256(challenge), purpose]
  );
  return rows[0] || null;
}

/** Look up the email behind a live challenge without consuming it. */
export async function peekChallenge(challenge, purpose) {
  const row = await findLive(challenge, purpose);
  return row ? { email: row.email, userId: row.user_id, pendingPasswordHash: row.pending_password_hash || null } : null;
}

/**
 * Verify a code. Max attempts per code, single use (atomic), constant-time compare.
 * Optional `preCheck(row)` runs only after the code matches (preventing enumeration) and before consuming the OTP.
 * Returns { email, userId, pendingPasswordHash } on success, { preCheckError } if preCheck fails, or null if invalid/expired.
 */
export async function verifyOtp({ challenge, code, purpose, preCheck }) {
  const row = await findLive(challenge, purpose);
  const clean = String(code ?? '').trim();
  if (!row || !/^\d{6}$/.test(clean)) return null;

  if (row.attempts >= POLICY.otpMaxAttempts) {
    await pool.execute('UPDATE otps SET used = TRUE WHERE id = ?', [row.id]);
    return null;
  }

  if (!safeEqualHex(row.code, codeMac(clean, challenge))) {
    await pool.execute(
      `UPDATE otps SET attempts = attempts + 1, used = (attempts + 1 >= ${Number(POLICY.otpMaxAttempts)}) WHERE id = ?`,
      [row.id]
    );
    return null;
  }

  if (typeof preCheck === 'function') {
    const err = preCheck(row);
    if (err) return { preCheckError: err };
  }

  // Atomic consume: only one concurrent request can win, so a code can never be replayed.
  const [result] = await pool.execute('UPDATE otps SET used = TRUE WHERE id = ? AND used = FALSE', [row.id]);
  if (result.affectedRows !== 1) return null;
  return { email: row.email, userId: row.user_id, pendingPasswordHash: row.pending_password_hash || null };
}
