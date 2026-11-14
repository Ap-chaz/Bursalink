import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { closePool } from '../src/config/db.js';

describe('Bursaries API Endpoints', () => {
  let studentToken = '';
  let adminToken = '';

  after(async () => {
    await closePool();
  });

  test('Setup student and admin tokens', async () => {
    // Student auth
    const studentRes = await request(app)
      .post('/api/auth/verify-code')
      .send({ email: 'student_bursary_test@example.org', code: '123456' });
    studentToken = studentRes.body.token;

    // Admin auth (admin@bursalink.org is in default admin email list)
    const adminRes = await request(app)
      .post('/api/auth/verify-code')
      .send({ email: 'admin@bursalink.org', code: '123456' });
    adminToken = adminRes.body.token;
  });

  test('GET /api/bursaries returns seeded bursaries', async () => {
    const res = await request(app).get('/api/bursaries');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.length >= 6);

    const b1 = res.body.find(b => b.id === 'b1');
    assert.ok(b1);
    assert.equal(b1.title, 'Westlands NG-CDF Secondary & Tertiary Bursary');
    assert.equal(b1.type, 'Constituency');
    assert.deepEqual(b1.place, { type: 'constituency', name: 'Westlands' });
  });

  test('GET /api/bursaries/:id returns specific bursary', async () => {
    const res = await request(app).get('/api/bursaries/b1');
    assert.equal(res.status, 200);
    assert.equal(res.body.id, 'b1');
    assert.equal(res.body.org, 'Westlands NG-CDF Committee');
  });

  test('POST /api/bursaries fails with 403 for non-admin student', async () => {
    const res = await request(app)
      .post('/api/bursaries')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: 'Unauthorized Bursary',
        org: 'Hacker Org',
        type: 'Corporate',
        opens: '2026-01-01',
        closes: '2026-12-31'
      });

    assert.equal(res.status, 403);
  });

  test('POST /api/bursaries succeeds for admin', async () => {
    const newBursary = {
      id: `b_test_${Date.now()}`,
      title: 'National STEM Grant',
      org: 'Ministry of Education',
      type: 'National',
      place: null,
      min: 15000,
      max: 50000,
      levels: ['university'],
      opens: '2026-01-01',
      closes: '2026-12-31',
      status: 'published',
      docs: ['Transcript', 'Admission Letter'],
      desc: 'Special fund for science students.',
      how: 'Merit-based committee review.',
      contact: 'stem@education.gov',
      q: 'Describe your STEM project or ambition.'
    };

    const res = await request(app)
      .post('/api/bursaries')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newBursary);

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.id, newBursary.id);
  });
});
