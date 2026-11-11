import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createApp } from '../server/app.ts';

test('production assets negotiate Brotli/gzip, respect q=0 and keep worker MIME, HEAD and cache behavior', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'resume-static-'));
  const dist = path.join(root, 'dist'); await mkdir(path.join(dist, 'assets'), { recursive: true });
  const text = '/* PDF worker asset */\n'.repeat(10_000);
  await writeFile(path.join(dist, 'assets', 'worker.mjs'), text);
  await writeFile(path.join(dist, 'index.html'), '<main>Resume</main>');
  const server = createApp({ dataDir: path.join(root, 'data'), distDir: dist });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    for (const [accept, encoding] of [['br, gzip', 'br'], ['br;q=0, gzip', 'gzip'], ['br;q=0,gzip;q=0', null], ['gzip;q=0,*;q=0.5', 'br']]) {
      const response = await fetch(base + '/assets/worker.mjs', { headers: { 'Accept-Encoding': accept! } });
      assert.equal(response.status, 200); assert.equal(response.headers.get('Content-Encoding'), encoding);
      assert.equal(response.headers.get('Vary'), 'Accept-Encoding');
      assert.match(response.headers.get('Content-Type')!, /^text\/javascript/);
      assert.match(response.headers.get('Cache-Control')!, /immutable/);
      assert.equal(await response.text(), text);
    }
    const head = await fetch(base + '/assets/worker.mjs', { method: 'HEAD', headers: { 'Accept-Encoding': 'br' } });
    assert.equal(head.headers.get('Content-Encoding'), 'br'); assert.equal(await head.text(), '');
    const api = await fetch(base + '/api/config', { headers: { 'Accept-Encoding': 'br' } });
    assert.equal(api.headers.get('Content-Encoding'), null); assert.equal(api.headers.get('Cache-Control'), 'no-store');
  } finally {
    server.closeIdleConnections(); await new Promise<void>(resolve => server.close(() => resolve()));
    await rm(root, { recursive: true, force: true });
  }
});
