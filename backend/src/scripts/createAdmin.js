import 'dotenv/config';
import pool from '../config/db.js';
import { hashPassword, validatePassword } from '../services/passwordService.js';
import { destroyUserSessions } from '../services/sessionService.js';
import { logAudit } from '../services/auditService.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseArg(flag) {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  const pref = process.argv.find(a => a.startsWith(`${flag}=`));
  return pref ? pref.slice(flag.length + 1) : '';
}

async function main() {
  const rawEmail = parseArg('--email') || process.env.ADMIN_EMAIL || '';
  const password = parseArg('--password') || process.env.ADMIN_PASSWORD || '';
  const email = rawEmail.trim().toLowerCase();

  if (!email || email.length > 254 || !EMAIL_REGEX.test(email)) {
    console.error('❌ Valid --email <address> (or ADMIN_EMAIL env var) is required.');
    process.exitCode = 1;
    return;
  }

  const pwError = validatePassword(password, { email });
  if (pwError) {
    console.error(`❌ Invalid password: ${pwError}`);
    process.exitCode = 1;
    return;
  }

  const hash = await hashPassword(password);
  const [rows] = await pool.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);

  let userId;
  if (rows.length > 0) {
    userId = rows[0].id;
    await pool.execute(
      `UPDATE users
          SET role = 'admin',
              password_hash = ?,
              email_verified = TRUE,
              failed_attempts = 0,
              locked_until = NULL,
              password_changed_at = NOW()
        WHERE id = ?`,
      [hash, userId]
    );
    await destroyUserSessions(userId);
    console.log(`✅ Updated admin account: ${email} (id=${userId})`);
  } else {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [ins] = await conn.execute(
        `INSERT INTO users (email, role, password_hash, email_verified, password_changed_at)
         VALUES (?, 'admin', ?, TRUE, NOW())`,
        [email, hash]
      );
      userId = ins.insertId;
      await conn.execute(
        `INSERT INTO profiles (user_id, area, saver_mode, lang, notify_status, notify_deadline, notify_match, docs, details)
         VALUES (?, NULL, FALSE, 'en', TRUE, TRUE, TRUE, '{}', '{}')`,
        [userId]
      );
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
    console.log(`✅ Created admin account: ${email} (id=${userId})`);
  }

  await logAudit('ADMIN_PROVISIONED', { userId, details: { email } });
}

main()
  .catch(err => {
    console.error('Admin provisioning failed:', err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
