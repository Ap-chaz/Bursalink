import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('Bursalink API Base Endpoints & Zero-Disclosure Security', () => {
  test('GET / returns strictly minimal status without leaking stack or DB details', async () => {
    const res = await request(app).get('/');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: 'operational' });
    // Verify no internal reconnaissance leaks
    assert.equal(res.body.database, undefined);
    assert.equal(res.body.endpoints, undefined);
    assert.equal(res.body.version, undefined);
  });

  test('GET /health returns minimal status ok', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { status: 'ok' });
  });

  test('Helmet security headers are active and X-Powered-By is hidden', async () => {
    const res = await request(app).get('/health');
    // Express stack info must be stripped
    assert.equal(res.headers['x-powered-by'], undefined);
    // Security headers must be present
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.ok(res.headers['x-frame-options']);
  });

  test('Strict payload limit rejects payloads exceeding 100kb with 413', async () => {
    const oversizedString = 'A'.repeat(120 * 1024); // 120kb payload
    const res = await request(app)
      .post('/api/auth/send-code')
      .send({ email: 'test@example.org', padding: oversizedString });

    assert.equal(res.status, 413);
  });

  test('Unknown routes return generic 404 without leaking path details', async () => {
    const res = await request(app).get('/unlisted_probe_endpoint');
    assert.equal(res.status, 404);
    assert.deepEqual(res.body, { error: 'Not Found' });
  });
});
