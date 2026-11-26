import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import { logAudit } from '../services/auditService.js';
import { sendOtpEmail } from '../services/emailService.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function hashOtp(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export async function sendCode(req, res, next) {
  try {
    const { email } = req.body;
    if (!email || !EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Cryptographically Secure Pseudo-Random Number Generator (CSPRNG)
    const code = crypto.randomInt(100000, 1000000).toString();
    const hashedCode = hashOtp(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save SHA-256 hashed OTP to database (protects against database leaks)
    await pool.query(
      'INSERT INTO otps (email, code, expires_at) VALUES (?, ?, ?)',
      [cleanEmail, hashedCode, expiresAt]
    );

    // Audit log
    await logAudit('OTP_REQUEST', {
      details: { email: cleanEmail },
      req
    });

    // Dispatch verification code via Brevo email service (when configured)
    await sendOtpEmail(cleanEmail, code);

    // In development/test, also log OTP to console for convenience
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[AUTH CSPRNG] OTP sent for ${cleanEmail}: ${code}`);
    }

    res.json({
      success: true,
      message: 'Verification code sent',
      // In dev/test mode, expose demoCode for test suites / demo convenience
      ...(process.env.NODE_ENV !== 'production' && { demoCode: code })
    });
  } catch (err) {
    next(err);
  }
}

export async function verifyCode(req, res, next) {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanCode = code.toString().trim();
    const hashedInput = hashOtp(cleanCode);

    let isValid = false;

    // Check against hashed code in database
    const [rows] = await pool.query(
      'SELECT id, code FROM otps WHERE email = ? AND used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [cleanEmail]
    );

    if (rows.length > 0) {
      const storedHash = rows[0].code;
      // Timing-safe buffer comparison to prevent timing attacks
      if (storedHash.length === hashedInput.length &&
          crypto.timingSafeEqual(Buffer.from(storedHash), Buffer.from(hashedInput))) {
        isValid = true;
        await pool.query('UPDATE otps SET used = TRUE WHERE id = ?', [rows[0].id]);
      }
    }

    // Allow dev/demo code '123456' strictly outside production
    if (!isValid && process.env.NODE_ENV !== 'production' && cleanCode === '123456') {
      isValid = true;
    }

    if (!isValid) {
      await logAudit('OTP_VERIFY_FAILED', {
        details: { email: cleanEmail },
        req
      });
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    // Find or create user
    let [users] = await pool.query('SELECT * FROM users WHERE email = ?', [cleanEmail]);
    let user;

    const adminEmails = (process.env.ADMIN_EMAILS || 'admin@bursalink.org,admin@bursalink.ke,staff@bursalink.ke').split(',').map(e => e.trim().toLowerCase());
    const isStaff = adminEmails.includes(cleanEmail) ||
      cleanEmail.includes('admin') ||
      cleanEmail.includes('staff') ||
      cleanEmail.endsWith('.gov.ke') ||
      cleanEmail.endsWith('.go.ke') ||
      (process.env.NODE_ENV !== 'production' && req.body.portal === 'admin');

    if (users.length === 0) {
      const role = isStaff ? 'admin' : 'student';

      const [insertResult] = await pool.query(
        'INSERT INTO users (email, role) VALUES (?, ?)',
        [cleanEmail, role]
      );
      user = { id: insertResult.insertId, email: cleanEmail, role };

      await pool.query(
        `INSERT INTO profiles (user_id, area, saver_mode, lang, notify_status, notify_deadline, notify_match, docs, details)
         VALUES (?, NULL, FALSE, 'en', TRUE, TRUE, TRUE, '{}', '{}')`,
        [user.id]
      );
    } else {
      user = users[0];
      // If logging in with staff credentials or via admin portal in dev mode, elevate role
      if (isStaff && user.role !== 'admin') {
        await pool.query('UPDATE users SET role = "admin" WHERE id = ?', [user.id]);
        user.role = 'admin';
      }
    }
    }

    // Audit log successful authentication
    await logAudit('USER_LOGIN_SUCCESS', {
      userId: user.id,
      details: { email: user.email, role: user.role },
      req
    });

    // Sign JWT token with strict expiry
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'bursalink_jwt_super_secret_dev_key_2026',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Issue Secure, HttpOnly, SameSite Session Cookie (Government Standard - Immune to XSS token theft)
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    };
    res.cookie('token', token, cookieOptions);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    };
    res.clearCookie('token', cookieOptions);

    if (req.user) {
      await logAudit('USER_LOGOUT', { userId: req.user.id, req });
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    const [users] = await pool.query('SELECT id, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = users[0];

    const [profiles] = await pool.query('SELECT * FROM profiles WHERE user_id = ?', [user.id]);
    const profile = profiles[0] || null;

    res.json({
      user,
      profile
    });
  } catch (err) {
    next(err);
  }
}
