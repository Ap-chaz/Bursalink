import './setup.js';
import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { closePool } from '../src/config/db.js';
import { CSRF, createVerifiedStudent, ensureAdminAndLogin } from './helpers.js';

describe('Applications & Drafts Endpoints', () => {
  let studentCookie = '';
  let adminCookie = '';
  let applicationRef = '';

  after(async () => {
    await closePool();
  });

  test('Setup student with matching area and admin', async () => {
    const stu = await createVerifiedStudent(app);
    studentCookie = stu.cookie;

    // Register area matching Westlands Bursary (b1): constituency = 'Westlands'
    const areaRes = await request(app)
      .post('/api/profile/area')
      .set(CSRF)
      .set('Cookie', studentCookie)
      .send({
        area: {
          county: 'Nairobi',
          constituency: 'Westlands',
          ward: 'Parklands/Highridge'
        }
      });
    assert.equal(areaRes.status, 200);

    const adm = await ensureAdminAndLogin(app);
    adminCookie = adm.cookie;
  });

  test('POST /api/applications/drafts saves application draft', async () => {
    const draftData = {
      needStatement: 'I require financial aid for high school fees.',
      grades: 'A-',
      householdIncome: 15000
    };

    const res = await request(app)
      .post('/api/applications/drafts')
      .set(CSRF)
      .set('Cookie', studentCookie)
      .send({ bursaryId: 'b1', data: draftData });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const getRes = await request(app)
      .get('/api/applications/drafts')
      .set('Cookie', studentCookie);

    assert.equal(getRes.status, 200);
    assert.ok(getRes.body.b1);
    assert.equal(getRes.body.b1.grades, 'A-');
  });

  test('POST /api/applications fails if bursary is closed (b5)', async () => {
    const res = await request(app)
      .post('/api/applications')
      .set(CSRF)
      .set('Cookie', studentCookie)
      .send({ bursaryId: 'b5', answers: { q: 'Closed bursary attempt' } });

    assert.equal(res.status, 400);
  });

  test('POST /api/applications succeeds for eligible open bursary (b1)', async () => {
    const res = await request(app)
      .post('/api/applications')
      .set(CSRF)
      .set('Cookie', studentCookie)
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

    const draftsRes = await request(app)
      .get('/api/applications/drafts')
      .set('Cookie', studentCookie);

    assert.equal(draftsRes.body.b1, undefined);
  });

  test('POST /api/applications prevents duplicate submissions', async () => {
    const res = await request(app)
      .post('/api/applications')
      .set(CSRF)
      .set('Cookie', studentCookie)
      .send({ bursaryId: 'b1', answers: {} });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /already applied/i);
  });

  test('GET /api/applications returns student application with history', async () => {
    const res = await request(app)
      .get('/api/applications')
      .set('Cookie', studentCookie);

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
      .set(CSRF)
      .set('Cookie', studentCookie);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const retryRes = await request(app)
      .post(`/api/applications/${applicationRef}/withdraw`)
      .set(CSRF)
      .set('Cookie', studentCookie);

    assert.equal(retryRes.status, 400);
  });

  test('Admin lists applications and updates status', async () => {
    const listRes = await request(app)
      .get('/api/applications/admin/all')
      .set('Cookie', adminCookie);

    assert.equal(listRes.status, 200);
    assert.ok(Array.isArray(listRes.body));
    const appItem = listRes.body.find(a => a.ref === applicationRef);
    assert.ok(appItem);

    const updateRes = await request(app)
      .patch(`/api/applications/admin/${applicationRef}/status`)
      .set(CSRF)
      .set('Cookie', adminCookie)
      .send({
        status: 'approved',
        note: 'Bursary approved by constituency committee.'
      });

    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.success, true);
  });

  test('Public tracker GET /api/applications/track/:ref returns live status without login', async () => {
    const badRes = await request(app).get('/api/applications/track/invalid-ref');
    assert.equal(badRes.status, 400);

    const notFoundRes = await request(app).get('/api/applications/track/BL-2026-999999');
    assert.equal(notFoundRes.status, 404);

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
