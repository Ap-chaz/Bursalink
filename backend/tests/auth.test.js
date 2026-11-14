import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { closePool } from '../src/config/db.js';

describe('Auth & User Lifecycle Endpoints with HttpOnly Session Cookies', () => {
  const testEmail = `student_${Date.now()}@example.org`;
  let authToken = '';
  let sessionCookie = '';

  after(async () => {
    await closePool();
  });

  test('POST /api/auth/send-code fails with invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/send-code')
      .send({ email: 'notanemail' });

    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  test('POST /api/auth/send-code succeeds with valid email', async () => {
    const res = await request(app)
      .post('/api/auth/send-code')
      .send({ email: testEmail });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.demoCode);
  });

  test('POST /api/auth/verify-code fails with wrong OTP', async () => {
    const res = await request(app)
      .post('/api/auth/verify-code')
      .send({ email: testEmail, code: '000000' });

    assert.equal(res.status, 400);
    assert.ok(res.body.error);
  });

  test('POST /api/auth/verify-code issues HttpOnly SameSite=Strict cookie', async () => {
    const res = await request(app)
      .post('/api/auth/verify-code')
      .send({ email: testEmail, code: '123456' });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.token);
    assert.equal(res.body.user.email, testEmail);

    authToken = res.body.token;

    // Verify Government Standard: HttpOnly, SameSite=Strict cookie header
    const setCookie = res.headers['set-cookie'];
    assert.ok(setCookie, 'set-cookie header must be present');
    const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    assert.ok(cookieStr.includes('HttpOnly'), 'Cookie must be HttpOnly (immune to XSS theft)');
    assert.ok(cookieStr.toLowerCase().includes('samesite=strict'), 'Cookie must be SameSite=Strict (CSRF defense)');
    assert.ok(cookieStr.includes('Path=/'), 'Cookie path must be root');

    sessionCookie = cookieStr.split(';')[0]; // token=...
  });

  test('GET /api/auth/me returns 401 without cookie or authorization header', async () => {
    const res = await request(app).get('/api/auth/me');
    assert.equal(res.status, 401);
  });

  test('GET /api/auth/me authenticates via HttpOnly session cookie alone (no Bearer header)', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', sessionCookie);

    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, testEmail);
    assert.ok(res.body.profile);
  });

  test('GET /api/auth/me also accepts Bearer token for client backward compatibility', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, testEmail);
    assert.ok(res.body.profile);
  });

  test('POST /api/auth/logout clears session cookie', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', sessionCookie);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const setCookie = res.headers['set-cookie'];
    assert.ok(setCookie);
    const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    assert.ok(cookieStr.includes('token=;'), 'Session cookie must be cleared on logout');
  });
});
