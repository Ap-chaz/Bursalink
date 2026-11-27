import './setup.js';
import { test, describe, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import { closePool } from '../src/config/db.js';
import { CSRF, createVerifiedStudent, ensureAdminAndLogin } from './helpers.js';

describe('Cloudinary Document Upload Endpoints', () => {
  let studentCookie = '';
  let studentUser = null;
  let otherStudentCookie = '';
  let uploadedPublicId = '';

  after(async () => {
    await closePool();
  });

  test('Setup test student sessions', async () => {
    const s1 = await createVerifiedStudent(app);
    studentCookie = s1.cookie;
    studentUser = s1.user;

    const s2 = await createVerifiedStudent(app);
    otherStudentCookie = s2.cookie;
  });

  test('POST /api/upload/doc requires authentication (401)', async () => {
    const res = await request(app)
      .post('/api/upload/doc')
      .set(CSRF)
      .attach('file', Buffer.from('test pdf content'), {
        filename: 'statement.pdf',
        contentType: 'application/pdf'
      });

    assert.equal(res.status, 401);
  });

  test('POST /api/upload/doc requires CSRF protection header (403)', async () => {
    const res = await request(app)
      .post('/api/upload/doc')
      .set('Cookie', studentCookie)
      .attach('file', Buffer.from('test pdf content'), {
        filename: 'statement.pdf',
        contentType: 'application/pdf'
      });

    assert.equal(res.status, 403);
  });

  test('POST /api/upload/doc rejects missing file (400)', async () => {
    const res = await request(app)
      .post('/api/upload/doc')
      .set(CSRF)
      .set('Cookie', studentCookie);

    assert.equal(res.status, 400);
    assert.match(res.body.error, /choose a document/i);
  });

  test('POST /api/upload/doc rejects disallowed MIME types (e.g. text/plain, exe)', async () => {
    const res = await request(app)
      .post('/api/upload/doc')
      .set(CSRF)
      .set('Cookie', studentCookie)
      .attach('file', Buffer.from('hello world'), {
        filename: 'test.txt',
        contentType: 'text/plain'
      });

    assert.equal(res.status, 400);
    assert.match(res.body.error, /invalid file type/i);
  });

  test('POST /api/upload/doc uploads valid image/document and returns Cloudinary metadata', async () => {
    // 1x1 transparent PNG buffer
    const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

    const res = await request(app)
      .post('/api/upload/doc')
      .set(CSRF)
      .set('Cookie', studentCookie)
      .attach('file', pngBuffer, {
        filename: 'national_id.png',
        contentType: 'image/png'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.file);
    assert.ok(res.body.file.url);
    assert.ok(res.body.file.publicId);
    assert.equal(res.body.file.name, 'national_id.png');

    uploadedPublicId = res.body.file.publicId;
  });

  test('DELETE /api/upload prevents other students from deleting foreign files (403)', async () => {
    const res = await request(app)
      .delete('/api/upload')
      .set(CSRF)
      .set('Cookie', otherStudentCookie)
      .send({ publicId: uploadedPublicId });

    assert.equal(res.status, 403);
    assert.match(res.body.error, /not authorized/i);
  });

  test('DELETE /api/upload allows owner to delete their own file (200)', async () => {
    const res = await request(app)
      .delete('/api/upload')
      .set(CSRF)
      .set('Cookie', studentCookie)
      .send({ publicId: uploadedPublicId });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
  });
});
