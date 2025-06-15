import test from 'node:test';
import assert from 'node:assert/strict';
import { extractZipFiles } from '../server/file-handler';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

function run(cmd: string, cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd }, (err) => {
      if (err) reject(err); else resolve();
    });
  });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('extractZipFiles extracts file from archive', async () => {
  const tmp = path.join(__dirname, 'tmp');
  await fs.mkdir(tmp, { recursive: true });
  await fs.writeFile(path.join(tmp, 'sample.txt'), 'hello');
  await run('zip -j sample.zip sample.txt', tmp);
  const files = await extractZipFiles(path.join(tmp, 'sample.zip'));
  assert.ok(files.some(f => f.endsWith('sample.txt')));
  await fs.rm(tmp, { recursive: true, force: true });
});
