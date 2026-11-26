import './setup.js';
import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { closePool } from '../src/config/db.js';
import { CSRF, createVerifiedStudent } from './helpers.js';

describe('Notifications & Bookmarks Endpoints', () => {
  let studentCookie = '';

  after(async () => {
    await closePool();
  });

  test('Setup student session', async () => {
    const stu = await createVerifiedStudent(app);
    studentCookie = stu.cookie;
  });

  test('POST /api/notifications/saved/:id/toggle bookmarks a bursary', async () => {
    const res = await request(app)
      .post('/api/notifications/saved/b1/toggle')
      .set(CSRF)
      .set('Cookie', studentCookie);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.isSaved, true);
    assert.ok(res.body.saved.includes('b1'));

    const getRes = await request(app)
      .get('/api/notifications/saved')
      .set('Cookie', studentCookie);

    assert.equal(getRes.status, 200);
    assert.ok(getRes.body.includes('b1'));
  });

  test('POST /api/notifications/saved/:id/toggle removes bookmark on second call', async () => {
    const res = await request(app)
      .post('/api/notifications/saved/b1/toggle')
      .set(CSRF)
      .set('Cookie', studentCookie);

    assert.equal(res.status, 200);
    assert.equal(res.body.isSaved, false);
    assert.ok(!res.body.saved.includes('b1'));
  });

  test('GET /api/notifications and mark-all-read', async () => {
    await request(app)
      .post('/api/profile/area')
      .set(CSRF)
      .set('Cookie', studentCookie)
      .send({ area: { constituency: 'Westlands' } });

    await request(app)
      .post('/api/applications')
      .set(CSRF)
      .set('Cookie', studentCookie)
      .send({ bursaryId: 'b1', answers: {} });

    const notifsRes = await request(app)
      .get('/api/notifications')
      .set('Cookie', studentCookie);

    assert.equal(notifsRes.status, 200);
    assert.ok(Array.isArray(notifsRes.body));
    assert.ok(notifsRes.body.length > 0);

    const firstNotif = notifsRes.body[0];
    assert.equal(firstNotif.read, false);

    const singleReadRes = await request(app)
      .post(`/api/notifications/${firstNotif.id}/read`)
      .set(CSRF)
      .set('Cookie', studentCookie);

    assert.equal(singleReadRes.status, 200);

    const allReadRes = await request(app)
      .post('/api/notifications/mark-all-read')
      .set(CSRF)
      .set('Cookie', studentCookie);

    assert.equal(allReadRes.status, 200);
  });
});
