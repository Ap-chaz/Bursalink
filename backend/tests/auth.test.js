import './setup.js';
import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import pool, { closePool } from '../src/config/db.js';
import { CSRF, extractCookie, createVerifiedStudent, ensureAdminAndLogin } from './helpers.js';

describe('Hardened Email + Password Auth, OTP Verification, Cookies, Lockout & CSRF', () => {
  const uid = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const studentEmail = `auth_student_${uid}@example.org`;
  const studentPw = 'Kenya#Scholar2026!';
  const newStudentPw = 'Kenya#Updated99!';
  const adminEmail = `auth_staff_${uid}@bursalink.org`;
  const adminPw = 'Committee#Gate2026!';

  let studentCookie = '';

  after(async () => {
    await closePool();
  });

  test('CSRF protection blocks state-changing requests without X-Requested-With header', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: studentEmail, password: studentPw });

    assert.equal(res.status, 403);
    assert.equal(res.body.error, 'Request blocked');
  });

  test('Password policy rejects weak, common, missing-digit/symbol, and email-derived passwords', async () => {
    const weakCases = [
      'Short1!',
      'password123',
      'OnlyLettersHereWithoutDigits',
      `${studentEmail.split('@')[0]}#99`
    ];
    for (const badPw of weakCases) {
      const res = await request(app)
        .post('/api/auth/register')
        .set(CSRF)
        .send({ email: studentEmail, name: 'Kamau Otieno', password: badPw });
      assert.equal(res.status, 400);
      assert.ok(res.body.error);
    }
  });

  test('Register -> OTP verify issues HttpOnly SameSite=Strict cookie + Cache-Control: no-store', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF)
      .send({ email: studentEmail, name: 'Kamau Otieno', password: studentPw });

    assert.equal(regRes.status, 200);
    assert.equal(regRes.body.step, 'otp');
    assert.equal(regRes.body.purpose, 'verify_email');
    assert.ok(regRes.headers['cache-control']?.includes('no-store'));
    assert.ok(regRes.body.devOtp);

    const verRes = await request(app)
      .post('/api/auth/verify-otp')
      .set(CSRF)
      .send({ challenge: regRes.body.challenge, code: regRes.body.devOtp, purpose: 'verify_email' });

    assert.equal(verRes.status, 200);
    assert.equal(verRes.body.success, true);
    assert.equal(verRes.body.token, undefined); // no JS-readable token in response
    assert.equal(verRes.body.user.email, studentEmail);

    const setCookie = verRes.headers['set-cookie'];
    assert.ok(setCookie);
    const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    assert.ok(cookieStr.includes('HttpOnly'));
    assert.ok(cookieStr.toLowerCase().includes('samesite=strict'));
    assert.ok(cookieStr.includes('Path=/'));

    studentCookie = extractCookie(verRes);
    assert.ok(studentCookie.startsWith('bl_session='));

    // Single-use OTP cannot be replayed
    const replayRes = await request(app)
      .post('/api/auth/verify-otp')
      .set(CSRF)
      .send({ challenge: regRes.body.challenge, code: regRes.body.devOtp, purpose: 'verify_email' });
    assert.equal(replayRes.status, 400);
  });

  test('Email enumeration resistance on register & forgot-password', async () => {
    const dupReg = await request(app)
      .post('/api/auth/register')
      .set(CSRF)
      .send({ email: studentEmail, name: 'Attacker Probe', password: 'Another#Strong2026!' });

    assert.equal(dupReg.status, 200);
    assert.equal(dupReg.body.step, 'otp');
    assert.equal(dupReg.body.purpose, 'verify_email');
    assert.ok(dupReg.body.challenge);
    assert.equal(dupReg.body.devOtp, undefined);

    const unknownForgot = await request(app)
      .post('/api/auth/forgot-password')
      .set(CSRF)
      .send({ email: `nobody_${uid}@example.org` });

    assert.equal(unknownForgot.status, 200);
    assert.equal(unknownForgot.body.step, 'otp');
    assert.equal(unknownForgot.body.purpose, 'reset');
    assert.ok(unknownForgot.body.challenge);
    assert.equal(unknownForgot.body.devOtp, undefined);
  });

  test('GET /api/auth/me requires session cookie and rejects Bearer-only headers', async () => {
    const noCookie = await request(app).get('/api/auth/me');
    assert.equal(noCookie.status, 401);

    const bearerOnly = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer forged.jwt.token');
    assert.equal(bearerOnly.status, 401);

    const validRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', studentCookie);
    assert.equal(validRes.status, 200);
    assert.equal(validRes.body.user.email, studentEmail);
    assert.equal(validRes.body.user.password_hash, undefined);
  });

  test('OTP brute-force protection burns OTP after 5 failed attempts', async () => {
    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .set(CSRF)
      .send({ email: studentEmail });

    assert.equal(forgotRes.status, 200);
    const { challenge, devOtp } = forgotRes.body;
    assert.ok(devOtp);

    for (let i = 0; i < 5; i++) {
      const badTry = await request(app)
        .post('/api/auth/reset-password')
        .set(CSRF)
        .send({ challenge, code: '000000', newPassword: newStudentPw });
      assert.equal(badTry.status, 400);
    }

    // Even the real code is now burned
    const lateRealTry = await request(app)
      .post('/api/auth/reset-password')
      .set(CSRF)
      .send({ challenge, code: devOtp, newPassword: newStudentPw });
    assert.equal(lateRealTry.status, 400);
  });

  test('Login anti-enumeration & account lockout after 5 failed attempts', async () => {
    const unknownRes = await request(app)
      .post('/api/auth/login')
      .set(CSRF)
      .send({ email: `missing_${uid}@example.org`, password: studentPw, portal: 'student' });
    assert.equal(unknownRes.status, 401);
    assert.equal(unknownRes.body.error, 'Invalid email or password.');

    for (let i = 0; i < 5; i++) {
      const badPwRes = await request(app)
        .post('/api/auth/login')
        .set(CSRF)
        .send({ email: studentEmail, password: 'Wrong#Password99!', portal: 'student' });
      assert.equal(badPwRes.status, 401);
      assert.equal(badPwRes.body.error, 'Invalid email or password.');
    }

    // Locked account with wrong password still returns 401 (never confirms password guessability)
    const lockedWrong = await request(app)
      .post('/api/auth/login')
      .set(CSRF)
      .send({ email: studentEmail, password: 'Wrong#Password99!', portal: 'student' });
    assert.equal(lockedWrong.status, 401);

    // Locked account with right password returns 429
    const lockedRight = await request(app)
      .post('/api/auth/login')
      .set(CSRF)
      .send({ email: studentEmail, password: studentPw, portal: 'student' });
    assert.equal(lockedRight.status, 429);
  });

  test('Forgot & reset password validates email-rule without burning OTP, resets password, clears lockout, and revokes old sessions', async () => {
    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .set(CSRF)
      .send({ email: studentEmail });

    const { challenge, devOtp } = forgotRes.body;
    assert.ok(devOtp);

    // Email-derived password fails preCheck WITHOUT consuming the OTP
    const emailDerivedReset = await request(app)
      .post('/api/auth/reset-password')
      .set(CSRF)
      .send({ challenge, code: devOtp, newPassword: `${studentEmail.split('@')[0]}#New99!` });
    assert.equal(emailDerivedReset.status, 400);
    assert.match(emailDerivedReset.body.error, /email name/i);

    // Same OTP still works with a valid new password
    const resetOk = await request(app)
      .post('/api/auth/reset-password')
      .set(CSRF)
      .send({ challenge, code: devOtp, newPassword: newStudentPw });
    assert.equal(resetOk.status, 200);
    assert.equal(resetOk.body.success, true);

    // Previous session was revoked
    const oldSessionRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', studentCookie);
    assert.equal(oldSessionRes.status, 401);

    // Log in with new password (student is already email_verified -> immediate login)
    const loginRes = await request(app)
      .post('/api/auth/login')
      .set(CSRF)
      .send({ email: studentEmail, password: newStudentPw, portal: 'student' });
    assert.equal(loginRes.status, 200);
    assert.equal(loginRes.body.success, true);
    assert.equal(loginRes.body.user.email, studentEmail);
    studentCookie = extractCookie(loginRes);
  });

  test('Change password revokes OTHER sessions while keeping the current session valid', async () => {
    // Create a second session for the same student
    const secondLogin = await request(app)
      .post('/api/auth/login')
      .set(CSRF)
      .send({ email: studentEmail, password: newStudentPw, portal: 'student' });
    const otherCookie = extractCookie(secondLogin);

    const badCurrent = await request(app)
      .post('/api/auth/change-password')
      .set(CSRF)
      .set('Cookie', studentCookie)
      .send({ currentPassword: 'Wrong#Password1!', newPassword: 'Kenya#Rotated2026!' });
    assert.equal(badCurrent.status, 401);

    const changeOk = await request(app)
      .post('/api/auth/change-password')
      .set(CSRF)
      .set('Cookie', studentCookie)
      .send({ currentPassword: newStudentPw, newPassword: 'Kenya#Rotated2026!' });
    assert.equal(changeOk.status, 200);

    // Other device session was revoked, current device remains active
    const otherMe = await request(app).get('/api/auth/me').set('Cookie', otherCookie);
    assert.equal(otherMe.status, 401);

    const curMe = await request(app).get('/api/auth/me').set('Cookie', studentCookie);
    assert.equal(curMe.status, 200);
  });

  test('Strict portal isolation and mandatory Admin 2FA OTP flow', async () => {
    // Student cannot log in via admin portal
    const stuAsAdmin = await request(app)
      .post('/api/auth/login')
      .set(CSRF)
      .send({ email: studentEmail, password: 'Kenya#Rotated2026!', portal: 'admin' });
    assert.equal(stuAsAdmin.status, 401);

    // Admin login succeeds with 2FA OTP and unlocks admin audit logs
    const { cookie: adminCookie } = await ensureAdminAndLogin(app, { email: adminEmail, password: adminPw });

    // Admin cannot log in via student portal
    const admAsStu = await request(app)
      .post('/api/auth/login')
      .set(CSRF)
      .send({ email: adminEmail, password: adminPw, portal: 'student' });
    assert.equal(admAsStu.status, 401);

    const auditRes = await request(app)
      .get('/api/profile/admin/audit')
      .set('Cookie', adminCookie);
    assert.equal(auditRes.status, 200);
    assert.ok(Array.isArray(auditRes.body));

    // Student cookie is forbidden on admin endpoints
    const stuAudit = await request(app)
      .get('/api/profile/admin/audit')
      .set('Cookie', studentCookie);
    assert.equal(stuAudit.status, 403);
  });

  test('Logout destroys server session; delete account requires password and removes user', async () => {
    const temp = await createVerifiedStudent(app);

    // Logout destroys session server-side
    const outRes = await request(app)
      .post('/api/auth/logout')
      .set(CSRF)
      .set('Cookie', temp.cookie);
    assert.equal(outRes.status, 200);

    const afterLogoutMe = await request(app).get('/api/auth/me').set('Cookie', temp.cookie);
    assert.equal(afterLogoutMe.status, 401);

    // Log back in to test delete account
    const reLogin = await request(app)
      .post('/api/auth/login')
      .set(CSRF)
      .send({ email: temp.email, password: temp.password, portal: 'student' });
    const freshCookie = extractCookie(reLogin);

    const badDel = await request(app)
      .delete('/api/auth/account')
      .set(CSRF)
      .set('Cookie', freshCookie)
      .send({ password: 'Wrong#DeletePass1!' });
    assert.equal(badDel.status, 401);

    const okDel = await request(app)
      .delete('/api/auth/account')
      .set(CSRF)
      .set('Cookie', freshCookie)
      .send({ password: temp.password });
    assert.equal(okDel.status, 200);

    const afterDelMe = await request(app).get('/api/auth/me').set('Cookie', freshCookie);
    assert.equal(afterDelMe.status, 401);

    const [rows] = await pool.execute('SELECT id FROM users WHERE email = ?', [temp.email]);
    assert.equal(rows.length, 0);
  });

  test('Legacy passwordless student activates password via Register + OTP without pre-OTP takeover', async () => {
    const legacyEmail = `legacy_${uid}@example.org`;
    const legacyPw = 'Legacy#Converted2026!';

    const [ins] = await pool.execute(
      `INSERT INTO users (email, role, password_hash, email_verified) VALUES (?, 'student', NULL, TRUE)`,
      [legacyEmail]
    );
    await pool.execute(
      `INSERT INTO profiles (user_id, area, saver_mode, lang, notify_status, notify_deadline, notify_match, docs, details)
       VALUES (?, NULL, FALSE, 'en', TRUE, TRUE, TRUE, '{}', '{}')`,
      [ins.insertId]
    );

    const regRes = await request(app)
      .post('/api/auth/register')
      .set(CSRF)
      .send({ email: legacyEmail, name: 'Legacy Student', password: legacyPw });

    assert.equal(regRes.status, 200);
    assert.equal(regRes.body.step, 'otp');
    assert.equal(regRes.body.purpose, 'verify_email');
    assert.ok(regRes.body.devOtp);

    // Password MUST remain NULL in users until OTP proves inbox ownership
    const [preRows] = await pool.execute('SELECT password_hash FROM users WHERE id = ?', [ins.insertId]);
    assert.equal(preRows[0].password_hash, null);

    const preLogin = await request(app)
      .post('/api/auth/login')
      .set(CSRF)
      .send({ email: legacyEmail, password: legacyPw, portal: 'student' });
    assert.equal(preLogin.status, 401);

    // Resend preserves pending_password_hash on the fresh challenge
    const resendRes = await request(app)
      .post('/api/auth/resend-otp')
      .set(CSRF)
      .send({ challenge: regRes.body.challenge, purpose: 'verify_email' });
    assert.equal(resendRes.status, 200);
    assert.ok(resendRes.body.devOtp);
    assert.notEqual(resendRes.body.challenge, regRes.body.challenge);

    // Verify OTP activates password and logs student in
    const verRes = await request(app)
      .post('/api/auth/verify-otp')
      .set(CSRF)
      .send({ challenge: resendRes.body.challenge, code: resendRes.body.devOtp, purpose: 'verify_email' });
    assert.equal(verRes.status, 200);
    assert.equal(verRes.body.user.email, legacyEmail);
    assert.ok(extractCookie(verRes).startsWith('bl_session='));

    // Subsequent password login succeeds
    const postLogin = await request(app)
      .post('/api/auth/login')
      .set(CSRF)
      .send({ email: legacyEmail, password: legacyPw, portal: 'student' });
    assert.equal(postLogin.status, 200);
    assert.equal(postLogin.body.success, true);
  });
});
