import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { closePool } from '../src/config/db.js';

describe('Notifications & Bookmarks Endpoints', () => {
  let studentToken = '';

  after(async () => {
    await closePool();
  });

  test('Setup student token', async () => {
    const studentRes = await request(app)
      .post('/api/auth/verify-code')
      .send({ email: `notif_student_${Date.now()}@example.org`, code: '123456' });
    studentToken = studentRes.body.token;
  });

  test('POST /api/notifications/saved/:id/toggle bookmarks a bursary', async () => {
    const res = await request(app)
      .post('/api/notifications/saved/b1/toggle')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.isSaved, true);
    assert.ok(res.body.saved.includes('b1'));

    // Retrieve saved
    const getRes = await request(app)
      .get('/api/notifications/saved')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(getRes.status, 200);
    assert.ok(getRes.body.includes('b1'));
  });

  test('POST /api/notifications/saved/:id/toggle removes bookmark on second call', async () => {
    const res = await request(app)
      .post('/api/notifications/saved/b1/toggle')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.isSaved, false);
    assert.ok(!res.body.saved.includes('b1'));
  });

  test('GET /api/notifications and mark-all-read', async () => {
    // Submit an application to generate a notification
    await request(app)
      .post('/api/profile/area')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ area: { constituency: 'Westlands' } });

    await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ bursaryId: 'b1', answers: {} });

    // Fetch notifications
    const notifsRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(notifsRes.status, 200);
    assert.ok(Array.isArray(notifsRes.body));
    assert.ok(notifsRes.body.length > 0);

    const firstNotif = notifsRes.body[0];
    assert.equal(firstNotif.read, false);

    // Mark single read
    const singleReadRes = await request(app)
      .post(`/api/notifications/${firstNotif.id}/read`)
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(singleReadRes.status, 200);

    // Mark all read
    const allReadRes = await request(app)
      .post('/api/notifications/mark-all-read')
      .set('Authorization', `Bearer ${studentToken}`);

    assert.equal(allReadRes.status, 200);
  });
});
