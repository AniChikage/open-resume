import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createApp } from '../server/app.ts';
import { clearEngineLanguageCache, buildLanguageOptions, fetchEngineLanguages, isPdfRenderable, languageLabel, languagesErrorMessage } from '../src/lib/translation-languages.ts';
import { deeplLocale, handleTranslation, handleTranslationLanguages, listEngineLanguages, translateEngine } from '../src/translation.ts';

const user = { id: 'user-1' };
const LIBRE = { TRANSLATE_PROVIDER: 'libretranslate', TRANSLATE_URL: 'http://libre.test:5000' };
const DEEPL = { TRANSLATE_PROVIDER: 'deepl', TRANSLATE_API_KEY: 'secret-key:fx' };

const LIBRE_LANGUAGES = [
  { code: 'en', name: 'English', targets: ['ar', 'de', 'fr', 'zh', 'zt'] },
  { code: 'fr', name: 'French', targets: ['en', 'de'] },
  { code: 'de', name: 'German', targets: ['en'] },
  { code: 'ar', name: 'Arabic', targets: ['en'] },
  { code: 'zh', name: 'Chinese', targets: ['en'] },
  { code: 'zt', name: 'Chinese (traditional)', targets: ['en'] },
];
const DEEPL_LANGUAGES = [
  { language: 'DE', name: 'German' }, { language: 'EN-GB', name: 'English (British)' }, { language: 'EN-US', name: 'English (American)' },
  { language: 'FR', name: 'French' }, { language: 'PT-BR', name: 'Portuguese (Brazilian)' }, { language: 'ZH-HANS', name: 'Chinese (simplified)' },
  { language: 'ZH-HANT', name: 'Chinese (traditional)' }, { language: 'AR', name: 'Arabic' },
];

interface Call { url: string; method: string; headers: Record<string, string> }
function fakeEngine(options: { status?: number } = {}) {
  const calls: Call[] = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), method: init?.method ?? 'GET', headers: Object.fromEntries(new Headers(init?.headers)) });
    if (options.status) return new Response('{}', { status: options.status });
    return String(input).includes('/v2/languages') ? Response.json(DEEPL_LANGUAGES) : Response.json(LIBRE_LANGUAGES);
  }) as typeof fetch;
  return { calls, fetchImpl };
}
const request = (source: string | null = 'en', method = 'GET') =>
  new Request(`http://localhost/api/translate/languages${source === null ? '' : `?source=${source}`}`, { method });

test('LibreTranslate languages are limited to what the source can be translated into, with app locale codes', async () => {
  const { calls, fetchImpl } = fakeEngine();
  const engine = translateEngine(LIBRE)!;
  assert.deepEqual(await listEngineLanguages(engine, 'en', fetchImpl), [
    { code: 'ar', name: 'Arabic' }, { code: 'zh', name: 'Chinese' }, { code: 'zh-TW', name: 'Chinese (traditional)' }, { code: 'fr', name: 'French' }, { code: 'de', name: 'German' },
  ]);
  assert.equal(calls[0].url, 'http://libre.test:5000/languages');
  assert.equal(calls[0].method, 'GET');
  assert.deepEqual((await listEngineLanguages(engine, 'fr', fetchImpl)).map(language => language.code), ['en', 'de']);
  // A source the engine does not list falls back to every language except itself.
  assert.ok((await listEngineLanguages(engine, 'sv', fetchImpl)).length >= 5);
  assert.deepEqual((await listEngineLanguages(engine, 'zh-TW', fetchImpl)).map(language => language.code), ['en']);
});

test('DeepL languages are mapped to app locales, without the source language and its regional variants', async () => {
  const { calls, fetchImpl } = fakeEngine();
  const engine = translateEngine(DEEPL)!;
  const fromEnglish = await listEngineLanguages(engine, 'en', fetchImpl);
  assert.deepEqual(fromEnglish.map(language => language.code), ['ar', 'zh', 'zh-TW', 'fr', 'de', 'pt-BR']);
  assert.equal(calls[0].url, 'https://api-free.deepl.com/v2/languages?type=target');
  assert.equal(calls[0].headers.authorization, 'DeepL-Auth-Key secret-key:fx');
  // A French source keeps both regional English targets.
  assert.deepEqual((await listEngineLanguages(engine, 'fr', fetchImpl)).map(language => language.code), ['ar', 'zh', 'zh-TW', 'en-US', 'en-GB', 'de', 'pt-BR']);
  // Simplified to Traditional Chinese is real work, so it is not filtered out.
  assert.ok((await listEngineLanguages(engine, 'zh', fetchImpl)).some(language => language.code === 'zh-TW'));
  assert.deepEqual(['EN-GB', 'PT-BR', 'ZH-HANS', 'ZH-HANT', 'ZH', 'DE'].map(deeplLocale), ['en-GB', 'pt-BR', 'zh', 'zh-TW', 'zh', 'de']);
});

test('the languages route needs a session, a valid source and a configured engine', async () => {
  const { calls, fetchImpl } = fakeEngine();
  assert.equal((await handleTranslationLanguages(request(), LIBRE, null, { fetchImpl })).status, 401);
  assert.equal((await handleTranslationLanguages(request('en', 'POST'), LIBRE, user, { fetchImpl })).status, 405);
  assert.equal((await handleTranslationLanguages(request(null), LIBRE, user, { fetchImpl })).status, 400);
  assert.equal((await handleTranslationLanguages(request('not a locale'), LIBRE, user, { fetchImpl })).status, 400);
  assert.equal((await handleTranslationLanguages(request(), {}, user, { fetchImpl })).status, 503);
  assert.equal(calls.length, 0, 'nothing reaches the engine for refused requests');

  const ok = await handleTranslationLanguages(request(), DEEPL, user, { fetchImpl });
  assert.equal(ok.status, 200);
  const text = await ok.text();
  assert.equal(JSON.parse(text).provider, 'deepl');
  assert.ok(!text.includes('secret-key'));
  assert.equal((await handleTranslationLanguages(request(), LIBRE, user, { fetchImpl: fakeEngine({ status: 500 }).fetchImpl })).status, 503);
  assert.equal((await handleTranslationLanguages(request(), LIBRE, user, { fetchImpl: fakeEngine({ status: 429 }).fetchImpl })).status, 429);
  assert.equal((await handleTranslationLanguages(request(), LIBRE, user, { fetchImpl: (async () => { throw new Error('down'); }) as typeof fetch })).status, 503);
  assert.equal((await handleTranslationLanguages(request(), LIBRE, user, { fetchImpl: (async () => Response.json({ not: 'a list' })) as typeof fetch })).status, 503);
});

test('the server serves the engine languages to a signed-in browser only', async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), 'open-resume-languages-'));
  const { fetchImpl } = fakeEngine();
  const app = createApp({ dataDir: dir, env: { ...LIBRE }, fetchImpl });
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  t.after(async () => { app.close(); await once(app, 'close'); await rm(dir, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${(app.address() as import('node:net').AddressInfo).port}`;
  assert.equal((await fetch(`${base}/api/translate/languages?source=en`)).status, 401);
  const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'admin' }) });
  const cookie = login.headers.get('set-cookie')!.split(';')[0];
  const answered = await fetch(`${base}/api/translate/languages?source=en`, { headers: { Cookie: cookie } });
  assert.equal(answered.status, 200);
  assert.deepEqual((await answered.json()).languages.map((language: { code: string }) => language.code), ['ar', 'zh', 'zh-TW', 'fr', 'de']);
});

test('alphabets the PDF fonts cannot draw are recognised', () => {
  for (const code of ['en', 'fr', 'de', 'ru', 'uk', 'el', 'zh', 'zh-TW', 'ja', 'ko', 'vi', 'pt-BR', 'tr', 'pl', 'en-GB']) assert.equal(isPdfRenderable(code), true, code);
  for (const code of ['ar', 'he', 'fa', 'hi', 'bn', 'th', 'ka', 'hy', 'ur', 'ta', 'AR', 'ar-EG']) assert.equal(isPdfRenderable(code), false, code);
});

test('languages are named in their own language, with shipped names taking precedence', () => {
  const shipped = [{ code: 'fr', label: 'Français' }];
  assert.equal(languageLabel('fr', shipped), 'Français');
  assert.equal(languageLabel('de'), 'Deutsch');
  assert.equal(languageLabel('es'), 'Español');
  assert.equal(languageLabel('xx', [], 'Made-up language'), 'Made-up language');
  assert.equal(languageLabel('xx'), 'xx');
});

test('language options are sorted by name, de-duplicated, and mark the Word-only ones', () => {
  const options = buildLanguageOptions([{ code: 'fr' }, { code: 'de' }, { code: 'ar' }, { code: 'de' }, { code: 'en' }], [{ code: 'fr', label: 'Français' }], new Set(['en']));
  assert.deepEqual(options.map(option => option.code).sort(), ['ar', 'de', 'fr'], 'the excluded source is gone and the duplicate is merged');
  assert.deepEqual(options.map(option => option.label), [...options.map(option => option.label)].sort((a, b) => a.localeCompare(b)));
  assert.deepEqual(options.filter(option => !option.pdf).map(option => option.code), ['ar']);
  assert.equal(options.find(option => option.code === 'fr')!.label, 'Français');
});

test('the browser asks for the engine languages once per source, and never remembers a failure', async () => {
  clearEngineLanguageCache();
  let calls = 0;
  const ok = (async () => { calls += 1; return Response.json({ languages: [{ code: 'fr', name: 'French' }, { nope: true }, { code: 'de' }] }); }) as typeof fetch;
  const expected = { languages: [{ code: 'fr', name: 'French' }, { code: 'de' }] };
  assert.deepEqual(await fetchEngineLanguages('en', ok), expected);
  await fetchEngineLanguages('en', ok);
  assert.equal(calls, 1, 'a successful list is remembered');
  await fetchEngineLanguages('fr', ok);
  assert.equal(calls, 2, 'a new source asks again');

  // Every kind of failure says why, leaves the list empty, and is retried next time.
  const failures: [string, typeof fetch, string][] = [
    ['key refused', (async () => Response.json({ error: 'PROVIDER_AUTH' }, { status: 502 })) as typeof fetch, 'PROVIDER_AUTH'],
    ['engine unreachable', (async () => Response.json({ error: 'PROVIDER_UNREACHABLE' }, { status: 503 })) as typeof fetch, 'PROVIDER_UNREACHABLE'],
    ['not signed in', (async () => Response.json({ error: 'UNAUTHORIZED' }, { status: 401 })) as typeof fetch, 'UNAUTHORIZED'],
    ['route unknown to an old server', (async () => new Response('Not found', { status: 404 })) as typeof fetch, 'HTTP_404'],
    ['offline', (async () => { throw new Error('offline'); }) as typeof fetch, 'NETWORK'],
    ['no list', (async () => Response.json({ not: 'a list' })) as typeof fetch, 'BAD_RESPONSE'],
  ];
  for (const [label, failing, code] of failures) {
    clearEngineLanguageCache();
    assert.deepEqual(await fetchEngineLanguages('en', failing), { languages: [], error: code }, label);
    assert.deepEqual(await fetchEngineLanguages('en', ok), expected, `${label}: the next call tries again`);
  }
});

test('every failure code has a message that tells the user what to do', () => {
  for (const code of ['PROVIDER_AUTH', 'PROVIDER_UNREACHABLE', 'PROVIDER_BUSY', 'UNAUTHORIZED', 'HTTP_404', 'NETWORK', 'BAD_RESPONSE', 'SOMETHING_ELSE']) {
    assert.ok(languagesErrorMessage(code).length > 20, code);
  }
  assert.match(languagesErrorMessage('PROVIDER_AUTH'), /key/i);
  assert.match(languagesErrorMessage('HTTP_404'), /restart/i);
  assert.notEqual(languagesErrorMessage('PROVIDER_AUTH'), languagesErrorMessage('PROVIDER_UNREACHABLE'));
});

test('the engine failing is reported precisely: refused key, unreachable service, quota', async () => {
  const answer = async (fetchImpl: typeof fetch, route: 'languages' | 'translate') => {
    const response = route === 'languages'
      ? await handleTranslationLanguages(request(), DEEPL, user, { fetchImpl })
      : await handleTranslation(new Request('http://localhost/api/translate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items: [{ text: 'Hi', format: 'text' }], source: 'en', target: 'fr', consent: true }) }), DEEPL, user, { fetchImpl });
    return { status: response.status, body: await response.json() };
  };
  for (const route of ['languages', 'translate'] as const) {
    assert.deepEqual(await answer((async () => new Response('{"message":"Wrong key secret-key:fx"}', { status: 403 })) as typeof fetch, route), { status: 502, body: { error: 'PROVIDER_AUTH' } }, `${route}: 403`);
    assert.deepEqual(await answer((async () => new Response('{}', { status: 401 })) as typeof fetch, route), { status: 502, body: { error: 'PROVIDER_AUTH' } }, `${route}: 401`);
    assert.deepEqual(await answer((async () => { throw new Error('getaddrinfo ENOTFOUND api-free.deepl.com'); }) as typeof fetch, route), { status: 503, body: { error: 'PROVIDER_UNREACHABLE' } }, `${route}: unreachable`);
    assert.deepEqual(await answer((async () => new Response('{}', { status: 456 })) as typeof fetch, route), { status: 429, body: { error: 'PROVIDER_BUSY' } }, `${route}: quota`);
    assert.deepEqual(await answer((async () => new Response('{}', { status: 500 })) as typeof fetch, route), { status: 503, body: { error: 'TRANSLATE_UNAVAILABLE' } }, `${route}: other`);
  }
});
