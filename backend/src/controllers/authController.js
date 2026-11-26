import pool from '../config/db.js';
import { logAudit } from '../services/auditService.js';
import { sendOtpEmail, sendExistingAccountNoticeEmail } from '../services/emailService.js';
import {
  hashPassword, verifyPassword, dummyVerify, needsRehash, validatePassword
} from '../services/passwordService.js';
import { issueOtp, verifyOtp, peekChallenge, fakeChallenge } from '../services/otpService.js';
import { createSession, destroySession, destroyUserSessions } from '../services/sessionService.js';
import { POLICY, SESSION_COOKIE, isProd, adminEmails } from '../config/security.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GENERIC_LOGIN_ERROR = 'Invalid email or password.';
const GENERIC_OTP_ERROR = 'Invalid or expired verification code.';

const normEmail = v => (typeof v === 'string' ? v.trim().toLowerCase() : '');
const validEmail = e => e.length > 0 && e.length <= 254 && EMAIL_REGEX.test(e);
// Only ever true in automated tests (never in production): lets the suite read the code without an inbox.
const exposeOtp = () => process.env.AUTH_EXPOSE_OTP === 'true' && !isProd();

// ---------- session cookie helpers ----------
const cookieOptions = (req, maxAgeMs) => ({
  httpOnly: true,                       // invisible to JavaScript (XSS cannot steal it)
  secure: isProd() || req.secure,       // HTTPS only in production
  sameSite: 'strict',                   // never sent on cross-site requests (CSRF defence)
  path: '/',
  ...(maxAgeMs ? { maxAge: maxAgeMs } : {})
});
const readSessionCookie = req => req.cookies?.[SESSION_COOKIE()];
const clearSessionCookie = (req, res) => res.clearCookie(SESSION_COOKIE(), cookieOptions(req));

async function dispatchOtp(req, { email, userId, purpose, pendingPasswordHash = null }) {
  const { code, challenge } = await issueOtp({ email, userId, purpose, pendingPasswordHash });
  await logAudit('OTP_REQUEST', { userId, details: { email, purpose }, req });
  // not awaited: response time must not reveal whether an email was really sent
  sendOtpEmail(email, code, purpose).catch(() => {});
  if (process.env.NODE_ENV === 'development') console.log(`[AUTH] ${purpose} code for ${email}: ${code}`);
  return { code, challenge };
}

const otpStep = (purpose, challenge, code) => ({
  success: true,
  step: 'otp',
  purpose,
  challenge,
  ...(exposeOtp() && code ? { devOtp: code } : {})
});

async function finishLogin(req, res, user) {
  // session rotation: any session presented with this request is revoked, a brand new token is issued
  const previous = readSessionCookie(req);
  if (previous) await destroySession(previous);

  const { token, maxAgeMs } = await createSession(user, req);
  res.cookie(SESSION_COOKIE(), token, cookieOptions(req, maxAgeMs));
  await pool.execute(
    'UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = ?',
    [user.id]
  );
  await logAudit('USER_LOGIN_SUCCESS', { userId: user.id, details: { email: user.email, role: user.role }, req });
  res.json({ success: true, user: { id: user.id, email: user.email, role: user.role } });
}

// ---------- register ----------
export async function register(req, res, next) {
  try {
    const email = normEmail(req.body?.email);
    const name = String(req.body?.name ?? '').trim().replace(/\s+/g, ' ');
    const password = req.body?.password;

    if (!validEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
    if (name.length < 2 || name.length > 100) return res.status(400).json({ error: 'Please enter your full name.' });
    const pwError = validatePassword(password, { email });
    if (pwError) return res.status(400).json({ error: pwError });

    const [rows] = await pool.execute('SELECT id, role, email_verified, password_hash FROM users WHERE email = ? LIMIT 1', [email]);
    const existing = rows[0];
    const hash = await hashPassword(password); // always hashed so timing is identical in every branch

    // Legacy passwordless student account (created before passwords were introduced): stage the password
    // on the OTP challenge and activate it only after inbox ownership is proven via OTP.
    if (existing && existing.role === 'student' && existing.email_verified && !existing.password_hash && !adminEmails().includes(email)) {
      await logAudit('LEGACY_PASSWORD_SETUP_REQUESTED', { userId: existing.id, details: { email }, req });
      const { code, challenge } = await dispatchOtp(req, {
        email,
        userId: existing.id,
        purpose: 'verify_email',
        pendingPasswordHash: hash
      });
      return res.json(otpStep('verify_email', challenge, code));
    }

    // Staff accounts and already-registered verified accounts with a password receive the exact same
    // HTTP response to prevent email enumeration, while Brevo emails sign-in help to the real owner.
    if (adminEmails().includes(email) || (existing && (existing.role === 'admin' || (existing.email_verified && existing.password_hash)))) {
      await logAudit('REGISTER_REJECTED', { userId: existing?.id ?? null, details: { email }, req });
      sendExistingAccountNoticeEmail(email).catch(() => {});
      await pool.execute('SELECT 1');
      return res.json(otpStep('verify_email', fakeChallenge()));
    }

    let userId;
    if (existing) {
      // unverified leftover (abandoned or squatted sign-up): the person who proves the inbox takes it over
      userId = existing.id;
      await pool.execute('UPDATE users SET password_hash = ?, password_changed_at = NOW() WHERE id = ?', [hash, userId]);
      await pool.execute(
        `UPDATE profiles SET details = JSON_SET(COALESCE(details, JSON_OBJECT()), '$.name', ?) WHERE user_id = ?`,
        [name, userId]
      );
    } else {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [ins] = await conn.execute(
          `INSERT INTO users (email, role, password_hash, email_verified, password_changed_at)
           VALUES (?, 'student', ?, FALSE, NOW())`,
          [email, hash]
        );
        userId = ins.insertId;
        await conn.execute(
          `INSERT INTO profiles (user_id, area, saver_mode, lang, notify_status, notify_deadline, notify_match, docs, details)
           VALUES (?, NULL, FALSE, 'en', TRUE, TRUE, TRUE, '{}', ?)`,
          [userId, JSON.stringify({ name })]
        );
        await conn.commit();
      } catch (err) {
        await conn.rollback();
        if (err.code === 'ER_DUP_ENTRY') return res.json(otpStep('verify_email', fakeChallenge()));
        throw err;
      } finally {
        conn.release();
      }
    }

    await logAudit('USER_REGISTERED', { userId, details: { email }, req });
    const { code, challenge } = await dispatchOtp(req, { email, userId, purpose: 'verify_email' });
    res.json(otpStep('verify_email', challenge, code));
  } catch (err) {
    next(err);
  }
}

// ---------- login ----------
export async function login(req, res, next) {
  try {
    const email = normEmail(req.body?.email);
    const password = req.body?.password;
    const adminPortal = req.body?.portal === 'admin';

    if (!validEmail(email) || typeof password !== 'string' || !password || password.length > 128) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const [rows] = await pool.execute(
      `SELECT id, email, role, password_hash, email_verified, failed_attempts,
              (locked_until IS NOT NULL AND locked_until > NOW()) AS locked
         FROM users WHERE email = ? LIMIT 1`,
      [email]
    );
    const user = rows[0];

    // A bcrypt comparison always runs: against the real hash, or the dummy hash for unknown accounts / accounts without a password.
    const passwordOk = user?.password_hash
      ? await verifyPassword(password, user.password_hash)
      : await dummyVerify(password);
    // Staff and students are strictly separated: each must use its own portal.
    const portalOk = !!user && (user.role === 'admin') === adminPortal;

    if (user?.locked && passwordOk && portalOk) {
      // only someone who already knows the correct password can see this, so nothing is leaked
      await logAudit('LOGIN_BLOCKED_LOCKED', { userId: user.id, details: { email }, req });
      return res.status(429).json({
        error: user.role === 'admin'
          ? `This staff account is temporarily locked after too many failed attempts. Try again in ${POLICY.lockMinutes} minutes or contact an administrator.`
          : `This account is temporarily locked after too many failed attempts. Try again in ${POLICY.lockMinutes} minutes, or reset your password.`
      });
    }

    if (!user || !passwordOk || !portalOk || user.locked) {
      let reason = !user ? 'unknown_user' : user.locked ? 'locked' : !passwordOk ? 'bad_password' : 'wrong_portal';
      if (user && !user.locked && !passwordOk) {
        await pool.execute('UPDATE users SET failed_attempts = failed_attempts + 1 WHERE id = ?', [user.id]);
        if (user.failed_attempts + 1 >= POLICY.maxFailedLogins) {
          await pool.execute(
            `UPDATE users SET locked_until = DATE_ADD(NOW(), INTERVAL ${Number(POLICY.lockMinutes)} MINUTE), failed_attempts = 0 WHERE id = ?`,
            [user.id]
          );
          await logAudit('ACCOUNT_LOCKED', { userId: user.id, details: { email, minutes: POLICY.lockMinutes }, req });
          reason = 'locked_now';
        }
      }
      await logAudit('LOGIN_FAILED', { userId: user?.id ?? null, details: { email, reason, portal: adminPortal ? 'admin' : 'student' }, req });
      // identical message and status for every failure: no account enumeration
      return res.status(401).json({ error: GENERIC_LOGIN_ERROR });
    }

    if (needsRehash(user.password_hash)) {
      await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [await hashPassword(password), user.id]);
    }

    // OTP is the verification step: always for staff, and for any student who has not yet verified their email.
    if (!user.email_verified || user.role === 'admin') {
      const purpose = user.email_verified ? 'login' : 'verify_email';
      const { code, challenge } = await dispatchOtp(req, { email: user.email, userId: user.id, purpose });
      return res.json(otpStep(purpose, challenge, code));
    }

    await finishLogin(req, res, user);
  } catch (err) {
    next(err);
  }
}

// ---------- OTP verification (second step) ----------
export async function verifyOtpCode(req, res, next) {
  try {
    const { challenge, code, purpose } = req.body || {};
    if (!['verify_email', 'login'].includes(purpose)) {
      return res.status(400).json({ error: 'Invalid request.' });
    }

    const result = await verifyOtp({ challenge, code, purpose });
    if (!result) {
      await logAudit('OTP_VERIFY_FAILED', { details: { purpose }, req });
      return res.status(400).json({ error: GENERIC_OTP_ERROR });
    }

    const [rows] = await pool.execute('SELECT id, email, role FROM users WHERE id = ? LIMIT 1', [result.userId]);
    const user = rows[0];
    if (!user) return res.status(400).json({ error: GENERIC_OTP_ERROR });

    if (purpose === 'verify_email') {
      if (result.pendingPasswordHash) {
        await pool.execute(
          `UPDATE users
              SET email_verified = TRUE,
                  password_hash = ?,
                  password_changed_at = NOW(),
                  failed_attempts = 0,
                  locked_until = NULL
            WHERE id = ?`,
          [result.pendingPasswordHash, user.id]
        );
        await destroyUserSessions(user.id);
      } else {
        await pool.execute('UPDATE users SET email_verified = TRUE WHERE id = ?', [user.id]);
      }
    }
    await finishLogin(req, res, user);
  } catch (err) {
    next(err);
  }
}

export async function resendOtp(req, res, next) {
  try {
    const { challenge, purpose } = req.body || {};
    if (!['verify_email', 'login'].includes(purpose)) return res.status(400).json({ error: 'Invalid request.' });
    const found = await peekChallenge(challenge, purpose);
    if (!found) return res.json(otpStep(purpose, fakeChallenge()));
    const { code, challenge: fresh } = await dispatchOtp(req, {
      email: found.email,
      userId: found.userId,
      purpose,
      pendingPasswordHash: found.pendingPasswordHash
    });
    res.json(otpStep(purpose, fresh, code));
  } catch (err) {
    next(err);
  }
}

// ---------- password reset (OTP proves ownership of the inbox) ----------
export async function forgotPassword(req, res, next) {
  try {
    const email = normEmail(req.body?.email);
    if (!validEmail(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });

    const [rows] = await pool.execute('SELECT id, role FROM users WHERE email = ? LIMIT 1', [email]);
    if (rows[0]?.role === 'admin') {
      await logAudit('ADMIN_RESET_BLOCKED', { userId: rows[0].id, details: { email }, req });
      return res.json(otpStep('reset', fakeChallenge()));
    }
    if (rows[0]) {
      const { code, challenge } = await dispatchOtp(req, { email, userId: rows[0].id, purpose: 'reset' });
      return res.json(otpStep('reset', challenge, code));
    }
    await pool.execute('SELECT 1');
    // same response whether or not the account exists
    res.json(otpStep('reset', fakeChallenge()));
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const { challenge, code, newPassword } = req.body || {};

    // Basic password policy runs before touching the DB/challenge so weak passwords fail uniformly
    // without revealing whether a reset challenge is real or fake.
    const basicPwError = validatePassword(newPassword);
    if (basicPwError) return res.status(400).json({ error: basicPwError });

    const result = await verifyOtp({
      challenge,
      code,
      purpose: 'reset',
      preCheck: row => validatePassword(newPassword, { email: row.email })
    });
    if (!result) {
      await logAudit('OTP_VERIFY_FAILED', { details: { purpose: 'reset' }, req });
      return res.status(400).json({ error: GENERIC_OTP_ERROR });
    }
    if (result.preCheckError) {
      return res.status(400).json({ error: result.preCheckError });
    }

    const hash = await hashPassword(newPassword);
    await pool.execute(
      `UPDATE users SET password_hash = ?, email_verified = TRUE, failed_attempts = 0, locked_until = NULL,
              password_changed_at = NOW() WHERE id = ?`,
      [hash, result.userId]
    );
    await destroyUserSessions(result.userId); // sign out everywhere
    await logAudit('PASSWORD_RESET', { userId: result.userId, details: { email: result.email }, req });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (typeof currentPassword !== 'string' || !currentPassword) {
      return res.status(400).json({ error: 'Current password is required.' });
    }
    const [rows] = await pool.execute('SELECT id, email, password_hash FROM users WHERE id = ? LIMIT 1', [req.user.id]);
    const user = rows[0];
    const ok = user?.password_hash ? await verifyPassword(currentPassword, user.password_hash) : await dummyVerify(currentPassword);
    if (!user || !ok) {
      await logAudit('PASSWORD_CHANGE_FAILED', { userId: req.user.id, req });
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }
    const pwError = validatePassword(newPassword, { email: user.email });
    if (pwError) return res.status(400).json({ error: pwError });

    await pool.execute('UPDATE users SET password_hash = ?, password_changed_at = NOW() WHERE id = ?', [await hashPassword(newPassword), user.id]);
    await destroyUserSessions(user.id, req.sessionId); // every other device is signed out
    await logAudit('PASSWORD_CHANGED', { userId: user.id, req });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function deleteAccount(req, res, next) {
  try {
    const { password } = req.body || {};
    if (typeof password !== 'string' || !password) {
      return res.status(400).json({ error: 'Password is required to delete your account.' });
    }
    const [rows] = await pool.execute('SELECT id, email, password_hash FROM users WHERE id = ? LIMIT 1', [req.user.id]);
    const user = rows[0];
    const ok = user?.password_hash ? await verifyPassword(password, user.password_hash) : await dummyVerify(password);
    if (!user || !ok) {
      await logAudit('ACCOUNT_DELETE_FAILED', { userId: req.user.id, req });
      return res.status(401).json({ error: 'Password is incorrect.' });
    }

    await logAudit('ACCOUNT_DELETED', { userId: user.id, details: { email: user.email }, req });
    await destroyUserSessions(user.id);
    clearSessionCookie(req, res);
    await pool.execute('DELETE FROM users WHERE id = ?', [user.id]);
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// ---------- session ----------
export async function logout(req, res, next) {
  try {
    const token = readSessionCookie(req);
    if (token) await destroySession(token);
    clearSessionCookie(req, res);
    if (req.user) await logAudit('USER_LOGOUT', { userId: req.user.id, details: { email: req.user.email }, req });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    const [users] = await pool.execute('SELECT id, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = users[0];
    const [profiles] = await pool.execute('SELECT * FROM profiles WHERE user_id = ?', [user.id]);
    res.json({ user, profile: profiles[0] || null });
  } catch (err) {
    next(err);
  }
}
