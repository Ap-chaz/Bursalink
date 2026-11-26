import crypto from 'node:crypto';
import pool from '../config/db.js';
import { POLICY } from '../config/security.js';

const sha256 = v => crypto.createHash('sha256').update(v).digest('hex');

/**
 * Server-side sessions. The browser only holds an opaque 256-bit random token in an HttpOnly cookie;
 * the database stores just its SHA-256, so a database leak cannot be replayed as live sessions.
 */
export async function createSession(user, req) {
  const token = crypto.randomBytes(32).toString('base64url');
  const rules = user.role === 'admin' ? POLICY.admin : POLICY.student;
  const ua = String(req.headers['user-agent'] || '').slice(0, 255);

  await pool.execute(
    `INSERT INTO sessions (id, user_id, expires_at, idle_seconds, ip_address, user_agent)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ${Number(rules.absoluteSeconds)} SECOND), ?, ?, ?)`,
    [sha256(token), user.id, rules.idleSeconds, String(req.ip || '').slice(0, 45), ua]
  );

  // housekeeping: purge expired rows and cap concurrent sessions per user
  await pool.execute('DELETE FROM sessions WHERE expires_at < NOW()');
  await pool.execute(
    `DELETE FROM sessions WHERE user_id = ? AND id NOT IN (
       SELECT id FROM (SELECT id FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT ${Number(POLICY.maxSessionsPerUser)}) keep
     )`,
    [user.id, user.id]
  );

  return { token, maxAgeMs: rules.absoluteSeconds * 1000 };
}

/** Resolve a cookie token to { sessionId, user } or null. Role is always read fresh from the DB. */
export async function resolveSession(token) {
  if (typeof token !== 'string' || token.length < 40 || token.length > 100) return null;
  const id = sha256(token);
  const [rows] = await pool.execute(
    `SELECT s.id, s.user_id, u.email, u.role,
            (s.last_seen < DATE_SUB(NOW(), INTERVAL 60 SECOND)) AS stale
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.id = ? AND s.expires_at > NOW()
        AND s.last_seen > DATE_SUB(NOW(), INTERVAL s.idle_seconds SECOND)
      LIMIT 1`,
    [id]
  );
  const row = rows[0];
  if (!row) return null;
  if (row.stale) await pool.execute('UPDATE sessions SET last_seen = NOW() WHERE id = ?', [id]);
  return { sessionId: id, user: { id: row.user_id, email: row.email, role: row.role } };
}

export async function destroySession(token) {
  if (typeof token !== 'string' || !token) return;
  await pool.execute('DELETE FROM sessions WHERE id = ?', [sha256(token)]);
}

export async function destroyUserSessions(userId, exceptSessionId = null) {
  if (exceptSessionId) {
    await pool.execute('DELETE FROM sessions WHERE user_id = ? AND id <> ?', [userId, exceptSessionId]);
  } else {
    await pool.execute('DELETE FROM sessions WHERE user_id = ?', [userId]);
  }
}
