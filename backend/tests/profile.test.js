import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { closePool } from '../src/config/db.js';

describe('Profile & Area Management Endpoints', () => {
  let studentToken = '';
  let adminToken = '';
  let areaReqId = null;

  after(async () => {
    await closePool();
  });

  test('Setup tokens', async () => {
    const studentRes = await request(app)
      .post('/api/auth/verify-code')
      .send({ email: `profile_student_${Date.now()}@example.org`, code: '123456' });
    studentToken = studentRes.body.token;

    const adminRes = await request(app)
      .post('/api/auth/verify-code')
      .send({ email: 'admin@bursalink.org', code: '123456' });
    adminToken = adminRes.body.token;
  });

  test('GET /api/profile returns student profile', async () => {
    const res = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.profile);
    assert.equal(res.body.profile.area, null);
  });

  test('PATCH /api/profile updates contact details and preferences', async () => {
    const patch = {
      name: 'John Doe',
      phone: '+254712345678',
      school: 'Alliance High School',
      level: 'secondary',
      year: 'Form 3',
      idNo: '12345678',
      guardian: 'Jane Doe',
      notify: { status: true, deadline: true, match: true },
      saver: true,
      lang: 'en'
    };

    const res = await request(app)
      .patch('/api/profile')
      .set('Authorization', `Bearer ${studentToken}`)
      .send(patch);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    // Verify GET profile reflects the patch
    const getRes = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(getRes.body.profile.name, 'John Doe');
    assert.equal(getRes.body.profile.school, 'Alliance High School');
    assert.equal(getRes.body.profile.saver, true);
  });

  test('POST /api/profile/area registers and locks area', async () => {
    const area = {
      county: 'Nairobi',
      constituency: 'Westlands',
      ward: 'Parklands/Highridge'
    };

    const res = await request(app)
      .post('/api/profile/area')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ area });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    // Trying to register area again must fail because it's locked
    const retryRes = await request(app)
      .post('/api/profile/area')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ area: { county: 'Kiambu' } });

    assert.equal(retryRes.status, 400);
  });

  test('POST /api/profile/area-change requests area change', async () => {
    const targetArea = {
      county: 'Kiambu',
      constituency: 'Ruiru',
      ward: 'Biashara'
    };

    const res = await request(app)
      .post('/api/profile/area-change')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        area: targetArea,
        reason: 'Family relocated to Ruiru, Kiambu'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    // Duplicate pending request should fail
    const dupRes = await request(app)
      .post('/api/profile/area-change')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ area: targetArea, reason: 'Another reason' });

    assert.equal(dupRes.status, 400);
  });

  test('Admin reviews and approves area change', async () => {
    // 1. Admin lists requests
    const listRes = await request(app)
      .get('/api/profile/admin/area-requests')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(listRes.status, 200);
    assert.ok(listRes.body.length > 0);

    const pendingReq = listRes.body.find(r => r.status === 'pending');
    assert.ok(pendingReq);
    areaReqId = pendingReq.id;

    // 2. Admin approves request
    const approveRes = await request(app)
      .patch(`/api/profile/admin/area-requests/${areaReqId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'approved' });

    assert.equal(approveRes.status, 200);
    assert.equal(approveRes.body.success, true);

    // 3. Verify student profile area was updated to target area
    const checkRes = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(checkRes.body.profile.area.county, 'Kiambu');
  });
});
