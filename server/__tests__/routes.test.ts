import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import fs from 'fs';
import path from 'path';
import session from 'express-session';

vi.mock('../security-scanner', () => ({
  securityScanner: {
    scanFile: vi.fn(async () => ({
      isClean: true,
      threats: [],
      riskLevel: 'safe',
      metadata: {
        size: 0,
        hash: 'hash',
        mimeType: 'application/zip',
        extension: '.zip',
      },
    })),
  },
}));

let app: express.Express;

beforeEach(async () => {
  app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  app.use(session({ secret: 'test', resave: false, saveUninitialized: false }));
  const { registerRoutes } = await import('../routes');
  await registerRoutes(app);
});

describe('ZIP extraction route', () => {
  const testZipPath = path.join(__dirname, 'test.zip');

  beforeEach(() => {
    // cria zip de teste simples com um único arquivo
    const AdmZip = require('adm-zip');
    const zip = new AdmZip();
    zip.addFile('file.txt', Buffer.from('Conteúdo do arquivo'));
    zip.writeZip(testZipPath);
  });

  afterEach(() => {
    if (fs.existsSync(testZipPath)) fs.unlinkSync(testZipPath);
  });

  it('extrai arquivos de um .zip com sucesso', async () => {
    const res = await request(app)
      .post('/api/files/extract')
      .attach('file', testZipPath);

    expect(res.status).toBe(200);
    expect(res.body.files).toBeDefined();
    expect(Array.isArray(res.body.files)).toBe(true);
    expect(res.body.files.length).toBeGreaterThan(0);
    expect(res.body.files[0].name).toMatch(/file\.txt/);
  });
});
