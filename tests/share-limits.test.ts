import assert from 'node:assert/strict';
import test from 'node:test';
import { deflateSync } from 'node:zlib';
import { buildResumeFromTemplate, DEFAULT_SETTINGS, RESUME_TEMPLATES } from '../src/data.ts';
import { generateShareUrl, parseShareData, SHARE_MAX_BYTES, SHARE_MAX_ENCODED_LENGTH } from '../src/lib/share.ts';

const document = () => ({ resume: buildResumeFromTemplate(RESUME_TEMPLATES[0], 'zh'), settings: DEFAULT_SETTINGS });
const compressed = (value: unknown) => deflateSync(JSON.stringify(value)).toString('base64url');
const legacy = (value: unknown) => btoa(encodeURIComponent(JSON.stringify(value)));

test('compressed and legacy share links still round-trip multilingual content', async () => {
  const value = document();
  value.resume.profile.name = '张三 · 日本語 · 한국어';
  assert.deepEqual(await parseShareData(compressed(value)), value);
  assert.deepEqual(await parseShareData(legacy(value)), value);
});

test('untrusted share inputs reject oversized encoded strings and corrupt compression', async () => {
  assert.equal(await parseShareData('A'.repeat(SHARE_MAX_ENCODED_LENGTH + 1)), null);
  for (const value of [undefined, '', 'not-a-share', 'eJw', '!!!!', btoa('%invalid')]) {
    assert.equal(await parseShareData(value), null);
  }
});

test('decompression stops at the expanded JSON limit even for a tiny highly compressed link', async () => {
  const value = document();
  const initialBytes = Buffer.byteLength(JSON.stringify(value));
  value.resume.profile.headline += 'x'.repeat(SHARE_MAX_BYTES - initialBytes);
  assert.equal(Buffer.byteLength(JSON.stringify(value)), SHARE_MAX_BYTES);
  assert.deepEqual(await parseShareData(compressed(value)), value);
  assert.deepEqual(await parseShareData(legacy(value)), value);

  value.resume.profile.headline += 'x';
  const encoded = compressed(value);
  assert.ok(encoded.length < 10_000, 'payload should exercise the decompressed limit, not the encoded limit');
  assert.equal(await parseShareData(encoded), null);
  assert.equal(await parseShareData(legacy(value)), null);
  value.resume.profile.headline += 'x'.repeat(4096);
  await assert.rejects(generateShareUrl(value.resume, value.settings), /SHARE_TOO_LARGE/);
});
