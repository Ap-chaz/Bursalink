import assert from 'node:assert/strict';
import request from 'supertest';
import pool from '../src/config/db.js';
import { hashPassword } from '../src/services/passwordService.js';

export const CSRF = { 'X-Requested-With': 'bursalink' };

export function extractCookie(res) {
  const raw = res.headers['set-cookie'];
  if (!raw) return '';
  const first = Array.isArray(raw) ? raw[0] : raw;
  return first.split(';')[0];
}

export async function createVerifiedStudent(app, {
  email = `student_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@example.org`,
  name = 'Amina Wanjiku',
  password = 'Strong#Student2026!'
} = {}) {
  const regRes = await request(app)
    .post('/api/auth/register')
    .set(CSRF)
    .send({ email, name, password });

  assert.equal(regRes.status, 200);
  assert.equal(regRes.body.step, 'otp');
  assert.ok(regRes.body.challenge);
  assert.ok(regRes.body.devOtp);

  const verRes = await request(app)
    .post('/api/auth/verify-otp')
    .set(CSRF)
    .send({
      challenge: regRes.body.challenge,
      code: regRes.body.devOtp,
      purpose: 'verify_email'
    });

  assert.equal(verRes.status, 200);
  assert.equal(verRes.body.success, true);
  assert.equal(verRes.body.user.email, email.toLowerCase());

  const cookie = extractCookie(verRes);
  assert.ok(cookie.startsWith('bl_session='));

  return { email: email.toLowerCase(), password, cookie, user: verRes.body.user };
}

export async function ensureAdminAndLogin(app, {
  email = `staff_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@bursalink.org`,
  password = 'Strong#Staff2026!'
} = {}) {
  const cleanEmail = email.toLowerCase().trim();
  const hash = await hashPassword(password);
  const [rows] = await pool.execute('SELECT id FROM users WHERE email = ? LIMIT 1', [cleanEmail]);

  if (rows.length > 0) {
    await pool.execute(
      `UPDATE users
          SET role = 'admin', password_hash = ?, email_verified = TRUE,
              failed_attempts = 0, locked_until = NULL, password_changed_at = NOW()
        WHERE id = ?`,
      [hash, rows[0].id]
    );
  } else {
    const [ins] = await pool.execute(
      `INSERT INTO users (email, role, password_hash, email_verified, password_changed_at)
       VALUES (?, 'admin', ?, TRUE, NOW())`,
      [cleanEmail, hash]
    );
    await pool.execute(
      `INSERT INTO profiles (user_id, area, saver_mode, lang, notify_status, notify_deadline, notify_match, docs, details)
       VALUES (?, NULL, FALSE, 'en', TRUE, TRUE, TRUE, '{}', '{}')`,
      [ins.insertId]
    );
  }

  const loginRes = await request(app)
    .post('/api/auth/login')
    .set(CSRF)
    .send({ email: cleanEmail, password, portal: 'admin' });

  assert.equal(loginRes.status, 200);
  assert.equal(loginRes.body.step, 'otp');
  assert.equal(loginRes.body.purpose, 'login');
  assert.ok(loginRes.body.devOtp);

  const verRes = await request(app)
    .post('/api/auth/verify-otp')
    .set(CSRF)
    .send({
      challenge: loginRes.body.challenge,
      code: loginRes.body.devOtp,
      purpose: 'login'
    });

  assert.equal(verRes.status, 200);
  assert.equal(verRes.body.user.role, 'admin');
  const cookie = extractCookie(verRes);
  assert.ok(cookie.startsWith('bl_session='));

  return { email: cleanEmail, password, cookie, user: verRes.body.user };
}
