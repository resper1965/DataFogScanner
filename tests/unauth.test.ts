import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import session from 'express-session';
import request from 'supertest';

process.env.DATABASE_URL ||= 'postgres://localhost/test';

const { registerRoutes } = await import('../server/routes');

async function createApp() {
  const app = express();
  app.use(express.json());
  app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
  await registerRoutes(app);
  return app;
}

test('unauthenticated upload returns 401', async () => {
  const app = await createApp();
  const res = await request(app).post('/api/files/upload');
  assert.equal(res.statusCode, 401);
});

test('unauthenticated processing jobs returns 401', async () => {
  const app = await createApp();
  const res = await request(app).get('/api/processing/jobs');
  assert.equal(res.statusCode, 401);
});

test('unauthenticated detections returns 401', async () => {
  const app = await createApp();
  const res = await request(app).get('/api/detections');
  assert.equal(res.statusCode, 401);
});

test('unauthenticated reports stats returns 401', async () => {
  const app = await createApp();
  const res = await request(app).get('/api/reports/stats');
  assert.equal(res.statusCode, 401);
});

test('unauthenticated cases returns 401', async () => {
  const app = await createApp();
  const res = await request(app).get('/api/cases');
  assert.equal(res.statusCode, 401);
});
