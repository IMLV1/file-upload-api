const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
let server, base, dir;
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
before(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'upload-api-test-'));
  process.env.UPLOAD_DIR = dir;
  server = require('../src/app').listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (dir) await fs.rm(dir, { recursive: true, force: true });
});
function upload(files, multiple = false, field) {
  const form = new FormData();
  for (const file of files) form.append(field || (multiple ? 'files' : 'file'), new Blob([file.data || png], { type: file.type || 'image/png' }), file.name || 'test.png');
  return fetch(base + '/api/files' + (multiple ? '/multiple' : ''), { method: 'POST', body: form });
}
test('file upload, list, download and deletion', async () => {
  const r = await upload([{}]); assert.equal(r.status, 201);
  const f = await r.json(); assert.notEqual(f.filename, 'test.png'); assert.equal(f.size, png.length);
  const list = await (await fetch(base + '/api/files')).json(); assert.equal(list.length, 1);
  const download = await fetch(f.url); assert.equal(download.status, 200);
  assert.match(download.headers.get('content-disposition'), /attachment/);
  assert.deepEqual(Buffer.from(await download.arrayBuffer()), png);
  assert.equal((await fetch(f.url, { method: 'DELETE' })).status, 204);
  assert.equal((await fetch(f.url)).status, 404);
  assert.equal((await fetch(f.url, { method: 'DELETE' })).status, 404);
});
test('upload validation and cleanup of entire rejected batch', async () => {
  assert.equal((await upload([])).status, 400);
  assert.equal((await upload([{}], false, 'wrong')).status, 400);
  assert.equal((await upload([{ name: 'x.txt', type: 'text/plain', data: 'hello' }])).status, 415);
  assert.equal((await upload([{ data: 'not a PNG' }])).status, 415);
  assert.equal((await upload([{ data: Buffer.from('%PDF-1.4\ncontent') }])).status, 415);
  assert.equal((await upload([{}, { data: 'fake' }], true)).status, 415);
  assert.equal((await upload(Array.from({ length: 6 }, () => ({})), true)).status, 400);
  assert.equal((await upload([{ data: Buffer.alloc(5 * 1024 * 1024 + 1) }])).status, 413);
  assert.deepEqual(await fs.readdir(dir), []);
  assert.equal((await fetch(base + '/api/files/..%5Cpackage.json')).status, 400);
  const r = await upload(Array.from({ length: 5 }, () => ({})), true);
  assert.equal(r.status, 201); assert.equal((await r.json()).count, 5);
});
test('unknown routes return JSON 404', async () => {
  assert.equal((await fetch(base + '/api-docs/')).status, 404);
  assert.equal((await fetch(base + '/api/products')).status, 404);
  const response = await fetch(base + '/missing');
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { error: 'Not found' });
});
