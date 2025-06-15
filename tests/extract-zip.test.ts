
import { beforeEach, afterEach, describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import AdmZip from 'adm-zip';
import { extractZipFiles } from '../server/file-handler';

describe('extractZipFiles', () => {
  const tmpDir = path.join(os.tmpdir(), 'extract-test');
  const zipPath = path.join(tmpDir, 'test.zip');

  beforeEach(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
    const zip = new AdmZip();
    zip.addFile('file.txt', Buffer.from('conteudo'));
    zip.writeZip(zipPath);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('extrai arquivos do zip', async () => {
    const files = await extractZipFiles(zipPath);
    const names = files.map(f => path.basename(f));
    expect(names).toContain('file.txt');
  });
});
