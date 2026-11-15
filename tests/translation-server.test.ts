import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createApp } from '../server/app.ts';
import {
  deeplSourceCode, deeplTargetCode, handleTranslation, libreCode, TRANSLATE_MAX_ITEM_LENGTH, TRANSLATE_MAX_ITEMS,
  translateEngine, translateItems,
} from '../src/translation.ts';

const user = { id: 'user-1' };
const LIBRE = { TRANSLATE_PROVIDER: 'libretranslate', TRANSLATE_URL: 'http://libre.test:5000/' };
const DEEPL = { TRANSLATE_PROVIDER: 'deepl', TRANSLATE_API_KEY: 'secret-key:fx' };

interface Call { url: string; headers: Record<string, string>; body: Record<string, unknown> }
/** A fake engine that records every call and "translates" by tagging the target language. */
function fakeEngine(options: { status?: number; wrongLength?: boolean } = {}) {
  const calls: Call[] = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    calls.push({ url: String(input), headers: Object.fromEntries(new Headers(init?.headers)), body });
    if (options.status) return new Response('{}', { status: options.status });
    const texts = (Array.isArray(body.q) ? body.q : body.text) as string[];
    const target = String(body.target ?? body.target_lang);
    const out = texts.map(text => `[${target}] ${text}`);
    if (options.wrongLength) out.pop();
    return String(input).includes('/v2/translate') ? Response.json({ translations: out.map(text => ({ text })) }) : Response.json({ translatedText: out });
  }) as typeof fetch;
  return { calls, fetchImpl };
}
const post = (value: unknown, headers: Record<string, string> = { 'content-type': 'application/json' }) =>
  new Request('http://localhost/api/translate', { method: 'POST', headers, body: JSON.stringify(value) });
const valid = (items = [{ text: 'Hello', format: 'text' }]) => ({ items, source: 'en', target: 'fr', consent: true });

test('the engine comes from the environment and is null unless fully configured', () => {
  assert.deepEqual(translateEngine(LIBRE), { provider: 'libretranslate', url: 'http://libre.test:5000', apiKey: '' });
  assert.deepEqual(translateEngine({ ...LIBRE, TRANSLATE_API_KEY: 'k' }), { provider: 'libretranslate', url: 'http://libre.test:5000', apiKey: 'k' });
  assert.equal(translateEngine({ TRANSLATE_PROVIDER: 'libretranslate' }), null, 'LibreTranslate needs a URL');
  assert.equal(translateEngine({ TRANSLATE_PROVIDER: 'deepl' }), null, 'DeepL needs a key');
  assert.equal(translateEngine({}), null);
  assert.equal(translateEngine({ TRANSLATE_PROVIDER: 'google', TRANSLATE_API_KEY: 'k', TRANSLATE_URL: 'http://x' }), null);
  assert.equal(translateEngine({ TRANSLATE_PROVIDER: 'libretranslate', TRANSLATE_URL: 'file:///etc/passwd' }), null, 'only http(s) URLs');
  assert.equal(translateEngine({ TRANSLATE_PROVIDER: 'libretranslate', TRANSLATE_URL: 'not a url' }), null);
  assert.equal(translateEngine(DEEPL)!.url, 'https://api-free.deepl.com', 'a ":fx" key uses the free endpoint');
  assert.equal(translateEngine({ TRANSLATE_PROVIDER: 'deepl', TRANSLATE_API_KEY: 'paid-key' })!.url, 'https://api.deepl.com');
  assert.equal(translateEngine({ ...DEEPL, TRANSLATE_URL: 'https://deepl.proxy.test/' })!.url, 'https://deepl.proxy.test');
});

test('language codes are adapted to each engine', () => {
  assert.deepEqual(['en', 'fr', 'zh-TW', 'zh', 'pt-BR'].map(libreCode), ['en', 'fr', 'zt', 'zh', 'pt']);
  assert.deepEqual(['en', 'fr', 'zh-TW', 'zh'].map(deeplSourceCode), ['EN', 'FR', 'ZH', 'ZH']);
  assert.deepEqual(['en', 'en-GB', 'fr', 'pt', 'pt-BR', 'zh', 'zh-TW', 'ja'].map(deeplTargetCode), ['EN-US', 'EN-GB', 'FR', 'PT-PT', 'PT-BR', 'ZH-HANS', 'ZH-HANT', 'JA']);
});

test('LibreTranslate receives batched texts with its own codes, and the key only when configured', async () => {
  const { calls, fetchImpl } = fakeEngine();
  const engine = translateEngine({ ...LIBRE, TRANSLATE_API_KEY: 'k' })!;
  const result = await translateItems(engine, [{ text: 'One', format: 'text' }, { text: '<p>Two</p>', format: 'html' }, { text: 'Three', format: 'text' }], 'en', 'zh-TW', fetchImpl);
  assert.deepEqual(result, ['[zt] One', '[zt] <p>Two</p>', '[zt] Three'], 'order is kept across formats');
  assert.equal(calls.length, 2, 'one request per format');
  assert.equal(calls[0].url, 'http://libre.test:5000/translate');
  assert.deepEqual(calls[0].body, { q: ['One', 'Three'], source: 'en', target: 'zt', format: 'text', api_key: 'k' });
  assert.equal(calls[1].body.format, 'html');
  const anonymous = fakeEngine();
  await translateItems(translateEngine(LIBRE)!, [{ text: 'One', format: 'text' }], 'en', 'fr', anonymous.fetchImpl);
  assert.equal('api_key' in anonymous.calls[0].body, false);
});

test('DeepL receives its auth header, HTML tag handling and regional target codes', async () => {
  const { calls, fetchImpl } = fakeEngine();
  const result = await translateItems(translateEngine(DEEPL)!, [{ text: 'Bonjour', format: 'text' }, { text: '<p>Salut</p>', format: 'html' }], 'fr', 'en', fetchImpl);
  assert.deepEqual(result, ['[EN-US] Bonjour', '[EN-US] <p>Salut</p>']);
  assert.equal(calls[0].url, 'https://api-free.deepl.com/v2/translate');
  assert.equal(calls[0].headers.authorization, 'DeepL-Auth-Key secret-key:fx');
  assert.deepEqual(calls[0].body, { text: ['Bonjour'], source_lang: 'FR', target_lang: 'EN-US' });
  assert.equal(calls[1].body.tag_handling, 'html');
  assert.equal('api_key' in calls[0].body, false, 'the DeepL key goes in the header only');
});

test('many texts are sent in batches and come back in order', async () => {
  const { calls, fetchImpl } = fakeEngine();
  const items = Array.from({ length: 120 }, (_, index) => ({ text: `Text ${index}`, format: index % 2 ? 'html' as const : 'text' as const }));
  const result = await translateItems(translateEngine(LIBRE)!, items, 'en', 'fr', fetchImpl);
  assert.deepEqual(result, items.map(item => `[fr] ${item.text}`));
  assert.ok(calls.every(call => (call.body.q as string[]).length <= 50));
  assert.equal(calls.length, 4);
});

test('the handler refuses anonymous, wrong-method, cross-site and non-JSON requests', async () => {
  const { fetchImpl } = fakeEngine();
  assert.equal((await handleTranslation(post(valid()), LIBRE, null, { fetchImpl })).status, 401);
  assert.equal((await handleTranslation(new Request('http://localhost/api/translate'), LIBRE, user, { fetchImpl })).status, 405);
  assert.equal((await handleTranslation(post(valid(), { 'content-type': 'application/json', origin: 'http://evil.test' }), LIBRE, user, { fetchImpl })).status, 403);
  assert.equal((await handleTranslation(post(valid(), { 'content-type': 'application/json', 'sec-fetch-site': 'cross-site' }), LIBRE, user, { fetchImpl })).status, 403);
  assert.equal((await handleTranslation(post(valid(), { 'content-type': 'text/plain' }), LIBRE, user, { fetchImpl })).status, 415);
});

test('the handler rejects invalid input before contacting any engine', async () => {
  const { calls, fetchImpl } = fakeEngine();
  const attempt = async (value: unknown) => (await handleTranslation(post(value), LIBRE, user, { fetchImpl })).status;
  assert.equal(await attempt({ ...valid(), consent: false }), 400, 'consent is required');
  assert.equal(await attempt({ ...valid(), consent: undefined }), 400);
  assert.equal(await attempt({ ...valid(), source: 'fr', target: 'FR' }), 400, 'same language');
  assert.equal(await attempt({ ...valid(), source: 'not a locale' }), 400);
  assert.equal(await attempt({ ...valid(), items: [] }), 400);
  assert.equal(await attempt({ ...valid(), items: 'Hello' }), 400);
  assert.equal(await attempt(valid([{ text: '   ', format: 'text' }])), 400, 'blank text');
  assert.equal(await attempt(valid([{ text: 'Hi', format: 'markdown' }])), 400, 'unknown format');
  assert.equal(await attempt(valid(Array.from({ length: TRANSLATE_MAX_ITEMS + 1 }, () => ({ text: 'a', format: 'text' })))), 400);
  assert.equal(await attempt(valid([{ text: 'a'.repeat(TRANSLATE_MAX_ITEM_LENGTH + 1), format: 'text' }])), 400);
  assert.equal(await attempt(valid(Array.from({ length: 6 }, () => ({ text: 'a'.repeat(TRANSLATE_MAX_ITEM_LENGTH), format: 'text' })))), 400, 'total size');
  assert.equal((await handleTranslation(new Request('http://localhost/api/translate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{not json' }), LIBRE, user, { fetchImpl })).status, 400);
  assert.equal(calls.length, 0);
});

test('the handler answers 503 when no engine is configured, and maps provider failures', async () => {
  const none = fakeEngine();
  assert.equal((await handleTranslation(post(valid()), {}, user, { fetchImpl: none.fetchImpl })).status, 503);
  assert.equal(none.calls.length, 0);

  const failing = await handleTranslation(post(valid()), LIBRE, user, { fetchImpl: fakeEngine({ status: 500 }).fetchImpl });
  assert.equal(failing.status, 503);
  assert.deepEqual(await failing.json(), { error: 'TRANSLATE_UNAVAILABLE' });
  const busy = await handleTranslation(post(valid()), LIBRE, user, { fetchImpl: fakeEngine({ status: 429 }).fetchImpl });
  assert.equal(busy.status, 429);
  assert.equal(busy.headers.get('retry-after'), '30');
  assert.equal((await handleTranslation(post(valid()), DEEPL, user, { fetchImpl: fakeEngine({ status: 456 }).fetchImpl })).status, 429, 'DeepL quota exceeded');
  assert.equal((await handleTranslation(post(valid()), LIBRE, user, { fetchImpl: (async () => { throw new Error('network down'); }) as typeof fetch })).status, 503);
  // A provider that answers with the wrong number of texts must not be trusted.
  assert.equal((await handleTranslation(post(valid([{ text: 'a', format: 'text' }, { text: 'b', format: 'text' }])), LIBRE, user, { fetchImpl: fakeEngine({ wrongLength: true }).fetchImpl })).status, 503);
});

test('a successful answer carries only the translations and the provider, never the key', async () => {
  const response = await handleTranslation(post(valid([{ text: 'Hello', format: 'text' }, { text: '<p>World</p>', format: 'html' }])), { ...DEEPL }, user, { fetchImpl: fakeEngine().fetchImpl });
  assert.equal(response.status, 200);
  const text = await response.text();
  assert.deepEqual(JSON.parse(text), { translations: ['[FR] Hello', '[FR] <p>World</p>'], provider: 'deepl' });
  assert.ok(!text.includes('secret-key'));
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('the server exposes the configured engine, requires a session, and never exposes the key', async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), 'open-resume-translate-'));
  const { calls, fetchImpl } = fakeEngine();
  const app = createApp({ dataDir: dir, env: { ...DEEPL }, fetchImpl });
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  t.after(async () => { app.close(); await once(app, 'close'); await rm(dir, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${(app.address() as import('node:net').AddressInfo).port}`;

  const config = await (await fetch(`${base}/api/config`)).text();
  assert.equal(JSON.parse(config).translateProvider, 'deepl');
  assert.ok(!config.includes('secret-key'));

  const body = JSON.stringify(valid());
  const anonymous = await fetch(`${base}/api/translate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  assert.equal(anonymous.status, 401);
  assert.equal(calls.length, 0);

  const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'admin' }) });
  const cookie = login.headers.get('set-cookie')!.split(';')[0];
  const answered = await fetch(`${base}/api/translate`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie }, body });
  assert.equal(answered.status, 200);
  assert.deepEqual(await answered.json(), { translations: ['[FR] Hello'], provider: 'deepl' });
});

test('without any configuration the server reports no engine', async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), 'open-resume-translate-none-'));
  const app = createApp({ dataDir: dir, env: {} });
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  t.after(async () => { app.close(); await once(app, 'close'); await rm(dir, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${(app.address() as import('node:net').AddressInfo).port}`;
  assert.equal((await (await fetch(`${base}/api/config`)).json()).translateProvider, null);
});
