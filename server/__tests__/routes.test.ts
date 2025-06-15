import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import fs from 'fs';
import path from 'path';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://user:pass@localhost/db';
import { storage } from '../storage';
import session from 'express-session';

// Mock security scanner to avoid heavy operations
vi.mock('../security-scanner', () => ({
  securityScanner: {
    scanFile: vi.fn(async () => ({
      isClean: true,
      threats: [],
      riskLevel: 'safe',
      metadata: { size: 0, hash: 'hash', mimeType: 'text/plain', extension: '.txt' }
    }))
  }
}));

const testStorage = storage;

let app: express.Express;

beforeEach(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
  const { registerRoutes } = await import('../routes');
  await registerRoutes(app);
});

describe('authentication middleware', () => {
  it('denies access when not authenticated', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('allows login and access to /api/auth/me', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'secret123', name: 'Tester' });

    const agent = request.agent(app);
    await agent
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'secret123' })
      .expect(200);

    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('test@example.com');
  });
});

describe('file upload handling', () => {
  const uploadsDir = path.join(process.cwd(), 'uploads');

  it('uploads a file successfully', async () => {
    fs.mkdirSync(uploadsDir, { recursive: true });
    const filePath = path.join(__dirname, 'sample.txt');
    fs.writeFileSync(filePath, 'hello');

    const res = await request(app)
      .post('/api/files/upload')
      .attach('file', filePath);

    fs.unlinkSync(filePath);
    expect(res.status).toBe(200);
    expect(res.body.files).toHaveLength(1);
    expect(res.body.files[0].originalName).toBe('sample.txt');
  });
});

describe('CSV export', () => {
  it('exports detections in CSV format', async () => {
    const file = await testStorage.createFile({
      name: 'f.txt',
      originalName: 'f.txt',
      size: 1,
      mimeType: 'text/plain',
      path: '/tmp/f.txt',
      status: 'uploaded'
    });
    await testStorage.createDetection({
      fileId: file.id,
      type: 'cpf',
      value: '111.111.111-11',
      riskLevel: 'high'
    });

    const res = await request(app).get('/api/reports/export/csv');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('f.txt');
  });
});
