import './setup.js';
import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { closePool } from '../src/config/db.js';
import { CSRF, createVerifiedStudent, ensureAdminAndLogin } from './helpers.js';

describe('Profile & Area Management Endpoints', () => {
  let studentCookie = '';
  let studentEmail = '';
  let adminCookie = '';
  let areaReqId = null;

  after(async () => {
    await closePool();
  });

  test('Setup student and admin sessions', async () => {
    const stu = await createVerifiedStudent(app);
    studentCookie = stu.cookie;
    studentEmail = stu.email;

    const adm = await ensureAdminAndLogin(app);
    adminCookie = adm.cookie;
  });

  test('GET /api/profile returns student profile', async () => {
    const res = await request(app)
      .get('/api/profile')
      .set('Cookie', studentCookie);

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
      .set(CSRF)
      .set('Cookie', studentCookie)
      .send(patch);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const getRes = await request(app)
      .get('/api/profile')
      .set('Cookie', studentCookie);

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
      .set(CSRF)
      .set('Cookie', studentCookie)
      .send({ area });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const retryRes = await request(app)
      .post('/api/profile/area')
      .set(CSRF)
      .set('Cookie', studentCookie)
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
      .set(CSRF)
      .set('Cookie', studentCookie)
      .send({
        area: targetArea,
        reason: 'Family relocated to Ruiru, Kiambu'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const dupRes = await request(app)
      .post('/api/profile/area-change')
      .set(CSRF)
      .set('Cookie', studentCookie)
      .send({ area: targetArea, reason: 'Another reason' });

    assert.equal(dupRes.status, 400);
  });

  test('Admin reviews and approves area change', async () => {
    const listRes = await request(app)
      .get('/api/profile/admin/area-requests')
      .set('Cookie', adminCookie);

    assert.equal(listRes.status, 200);
    assert.ok(listRes.body.length > 0);

    const pendingReq = listRes.body.find(r => r.status === 'pending' && r.user_email === studentEmail);
    assert.ok(pendingReq);
    areaReqId = pendingReq.id;

    const approveRes = await request(app)
      .patch(`/api/profile/admin/area-requests/${areaReqId}`)
      .set(CSRF)
      .set('Cookie', adminCookie)
      .send({ status: 'approved' });

    assert.equal(approveRes.status, 200);
    assert.equal(approveRes.body.success, true);

    const checkRes = await request(app)
      .get('/api/profile')
      .set('Cookie', studentCookie);

    assert.equal(checkRes.body.profile.area.county, 'Kiambu');
  });
});
