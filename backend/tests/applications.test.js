import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { closePool } from '../src/config/db.js';

describe('Applications & Drafts Endpoints', () => {
  let studentToken = '';
  let adminToken = '';
  let applicationRef = '';

  after(async () => {
    await closePool();
  });

  test('Setup student with matching area and admin', async () => {
    const studentRes = await request(app)
      .post('/api/auth/verify-code')
      .send({ email: `app_student_${Date.now()}@example.org`, code: '123456' });
    studentToken = studentRes.body.token;

    // Register area matching Westlands Bursary (b1): constituency = 'Westlands'
    await request(app)
      .post('/api/profile/area')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        area: {
          county: 'Nairobi',
          constituency: 'Westlands',
          ward: 'Parklands/Highridge'
        }
      });

    // Admin
    const adminRes = await request(app)
      .post('/api/auth/verify-code')
      .send({ email: 'admin@bursalink.org', code: '123456' });
    adminToken = adminRes.body.token;
  });

  test('POST /api/applications/drafts saves application draft', async () => {
    const draftData = {
      needStatement: 'I require financial aid for high school fees.',
      grades: 'A-',
      householdIncome: 15000
    };

    const res = await request(app)
      .post('/api/applications/drafts')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ bursaryId: 'b1', data: draftData });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    // Retrieve drafts
    const getRes = await request(app)
      .get('/api/applications/drafts')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(getRes.status, 200);
    assert.ok(getRes.body.b1);
    assert.equal(getRes.body.b1.grades, 'A-');
  });

  test('POST /api/applications fails if bursary is closed (b5)', async () => {
    const res = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ bursaryId: 'b5', answers: { q: 'Closed bursary attempt' } });

    assert.equal(res.status, 400);
  });

  test('POST /api/applications succeeds for eligible open bursary (b1)', async () => {
    const res = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        bursaryId: 'b1',
        answers: {
          q: 'I am a dedicated student pursuing sciences.',
          amountRequested: 15000
        }
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.ref);
    assert.match(res.body.ref, /^BL-\d{4}-\d{6}$/);

    applicationRef = res.body.ref;

    // Verify draft was cleaned up
    const draftsRes = await request(app)
      .get('/api/applications/drafts')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(draftsRes.body.b1, undefined);
  });

  test('POST /api/applications prevents duplicate submissions', async () => {
    const res = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ bursaryId: 'b1', answers: {} });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /already applied/i);
  });

  test('GET /api/applications returns student application with history', async () => {
    const res = await request(app)
      .get('/api/applications')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    const appItem = res.body.find(a => a.ref === applicationRef);
    assert.ok(appItem);
    assert.equal(appItem.status, 'submitted');
    assert.ok(appItem.history.length >= 1);
  });

  test('POST /api/applications/:ref/withdraw withdraws application', async () => {
    const res = await request(app)
      .post(`/api/applications/${applicationRef}/withdraw`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    // Attempting to withdraw again must fail (already decided)
    const retryRes = await request(app)
      .post(`/api/applications/${applicationRef}/withdraw`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(retryRes.status, 400);
  });

  test('Admin lists applications and updates status', async () => {
    const listRes = await request(app)
      .get('/api/applications/admin/all')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(listRes.status, 200);
    assert.ok(Array.isArray(listRes.body));
    const appItem = listRes.body.find(a => a.ref === applicationRef);
    assert.ok(appItem);

    // Admin updates status to approved
    const updateRes = await request(app)
      .patch(`/api/applications/admin/${applicationRef}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'approved',
        note: 'Bursary approved by constituency committee.'
      });

    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.success, true);
  });

  test('Public tracker GET /api/applications/track/:ref returns live status without login', async () => {
    // 1. Invalid reference format returns 400
    const badRes = await request(app).get('/api/applications/track/invalid-ref');
    assert.equal(badRes.status, 400);

    // 2. Non-existent reference returns 404
    const notFoundRes = await request(app).get('/api/applications/track/BL-2026-999999');
    assert.equal(notFoundRes.status, 404);

    // 3. Existing application returns live status and timeline
    const res = await request(app).get(`/api/applications/track/${applicationRef}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.found, true);
    assert.equal(res.body.ref, applicationRef);
    assert.equal(res.body.status, 'approved');
    assert.equal(res.body.bursaryTitle, 'Westlands NG-CDF Secondary & Tertiary Bursary');
    assert.ok(Array.isArray(res.body.history));
    assert.ok(res.body.history.length >= 2);
  });
});
