import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createApp } from '../server/app.ts';
import { DEFAULT_SETTINGS } from '../src/data.ts';
import { storedFingerprint } from '../src/lib/fingerprint.ts';
import { createBackup, readBackup } from '../src/lib/resume-transfer.ts';
import { TRANSLATE_MAX_ITEM_LENGTH, TRANSLATE_MAX_ITEMS } from '../src/lib/translate-limits.ts';
import { translateRows } from '../src/lib/translate-client.ts';
import {
  markTranslationCurrent, markTranslationReviewed, setItemTranslation, setProfileTranslation, setSectionLabelTranslation,
} from '../src/lib/translation-edit.ts';
import { assembleTranslations, chunkPlan, planTranslation } from '../src/lib/translation-plan.ts';
import type { PlannedItem } from '../src/lib/translation-plan.ts';
import { buildTranslationRows } from '../src/lib/translation-rows.ts';
import { isVariants } from '../src/lib/validation.ts';
import type { Resume } from '../src/types.ts';

function resume(): Resume {
  return {
    title: 'Fixture',
    profile: { name: 'Ada Example', email: '', phone: '', website: '', city: 'London', birthday: '', status: '', headline: 'Backend engineer', avatar: '' },
    sections: [
      { id: 'work', type: 'work', label: 'Experience', visible: true, items: [
        { id: 'job-1', org: 'Acme', role: 'Senior engineer', startDate: '2020-01', current: true, body: '<p>Built the <b>billing</b> platform</p>' },
      ] },
      { id: 'skills', type: 'skills', label: 'Skills', visible: true, items: [{ id: 'skill-1', title: 'Core', values: ['SQL', 'Distributed systems', 'Go'] }] },
    ],
  };
}
const rows = (doc: Resume = resume()) => buildTranslationRows(doc, 'fr');
const keys = (items: PlannedItem[]) => items.map(item => `${item.rowKey}${item.line === undefined ? '' : `#${item.line}`}`);

test('only untranslated texts are planned, with the right format, and lists are sent line by line', () => {
  const plan = planTranslation(rows());
  assert.deepEqual(keys(plan.items), [
    'profile:headline', 'profile:city', 'section:work:label', 'item:job-1:role', 'item:job-1:body',
    'section:skills:label', 'item:skill-1:title', 'item:skill-1:values#0', 'item:skill-1:values#1', 'item:skill-1:values#2',
  ]);
  assert.equal(plan.items.find(item => item.rowKey === 'item:job-1:body')!.format, 'html');
  assert.equal(plan.items.find(item => item.rowKey === 'item:job-1:role')!.format, 'text');
  assert.deepEqual(plan.skipped, []);
});

test('texts that already have a translation, or need none, are never planned', () => {
  const doc = resume();
  setItemTranslation(doc, 'fr', 'job-1', null, 'role', 'Ingénieur senior', 'Senior engineer');
  setProfileTranslation(doc, 'fr', 'headline', 'Ingénieur backend', 'Backend engineer', true);
  doc.variants!.translations.fr.items!['skill-1'] = { same: true };
  const planned = keys(planTranslation(rows(doc)).items);
  assert.ok(!planned.includes('item:job-1:role'), 'a hand-written translation is protected');
  assert.ok(!planned.includes('profile:headline'), 'an earlier automatic translation is protected too');
  assert.ok(!planned.some(key => key.startsWith('item:skill-1')), 'items marked "no translation needed" are skipped');
  assert.ok(planned.includes('profile:city'));
});

test('a plan can be limited to some rows, and over-long texts are skipped, not truncated', () => {
  const only = planTranslation(rows(), new Set(['item:job-1:role']));
  assert.deepEqual(keys(only.items), ['item:job-1:role']);
  const doc = resume();
  doc.sections[0].items[0].body = `<p>${'a'.repeat(TRANSLATE_MAX_ITEM_LENGTH)}</p>`;
  const plan = planTranslation(rows(doc));
  assert.deepEqual(plan.skipped, ['item:job-1:body']);
  assert.ok(!keys(plan.items).includes('item:job-1:body'));
});

test('a plan is cut into requests that respect the item count and the total size', () => {
  const many: PlannedItem[] = Array.from({ length: TRANSLATE_MAX_ITEMS * 2 + 10 }, (_, index) => ({ rowKey: `r${index}`, text: 'x', format: 'text' }));
  const byCount = chunkPlan(many);
  assert.deepEqual(byCount.map(chunk => chunk.length), [TRANSLATE_MAX_ITEMS, TRANSLATE_MAX_ITEMS, 10]);
  const big: PlannedItem[] = Array.from({ length: 12 }, (_, index) => ({ rowKey: `b${index}`, text: 'y'.repeat(15_000), format: 'text' }));
  const chunks = chunkPlan(big);
  assert.ok(chunks.length > 1);
  for (const chunk of chunks) assert.ok(chunk.reduce((sum, item) => sum + item.text.length, 0) <= 100_000);
  assert.deepEqual(chunks.flat(), big, 'order and content are kept');
  assert.deepEqual(chunkPlan([]), []);
});

test('answers are put back in order, lists are rejoined, and incomplete rows are left out', () => {
  const items: PlannedItem[] = [
    { rowKey: 'a', text: 'one', format: 'text' },
    { rowKey: 'list', line: 0, text: 'x', format: 'text' }, { rowKey: 'list', line: 1, text: 'y', format: 'text' },
    { rowKey: 'broken', text: 'z', format: 'text' },
  ];
  const result = assembleTranslations(items, ['  un ', 'ex', 'ygrec', undefined]);
  assert.deepEqual([...result], [['a', 'un'], ['list', 'ex\nygrec']]);
  assert.equal(assembleTranslations(items, ['un', 'ex', '   ', 'z']).has('list'), false, 'a blank answer does not count');
});

// A real server with a fake engine: the client, the route and the engine adapter working together.
async function withServer(t: import('node:test').TestContext, engineFails = false) {
  const dir = await mkdtemp(path.join(tmpdir(), 'open-resume-auto-'));
  const sent: string[][] = [];
  const fetchImpl = (async (_url: string | URL | Request, init?: RequestInit) => {
    const q = (JSON.parse(String(init?.body)) as { q: string[] }).q;
    sent.push(q);
    if (engineFails) return new Response('{}', { status: 500 });
    return Response.json({ translatedText: q.map(text => `FR(${text})`) });
  }) as typeof fetch;
  const app = createApp({ dataDir: dir, env: { TRANSLATE_PROVIDER: 'libretranslate', TRANSLATE_URL: 'http://engine.test' }, fetchImpl });
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  t.after(async () => { app.close(); await once(app, 'close'); await rm(dir, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${(app.address() as import('node:net').AddressInfo).port}`;
  const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'admin' }) });
  const cookie = login.headers.get('set-cookie')!.split(';')[0];
  const clientFetch = ((url: string, init?: RequestInit) => fetch(base + url, { ...init, headers: { ...(init?.headers as Record<string, string>), Cookie: cookie } })) as typeof fetch;
  return { sent, clientFetch, base };
}

test('the client translates the missing texts through the server and returns them by row', async (t) => {
  const { sent, clientFetch } = await withServer(t);
  const progress: number[] = [];
  const result = await translateRows(rows(), 'en', 'fr', { fetchImpl: clientFetch, onProgress: done => progress.push(done) });
  assert.equal(result.error, undefined);
  assert.equal(result.translations.get('profile:headline'), 'FR(Backend engineer)');
  assert.equal(result.translations.get('item:skill-1:values'), 'FR(SQL)\nFR(Distributed systems)\nFR(Go)');
  assert.equal(result.translations.get('item:job-1:body'), 'FR(<p>Built the <b>billing</b> platform</p>)', 'HTML goes through as HTML');
  assert.equal(result.translations.size, rows().length);
  assert.equal(sent.length, 2, 'one request per format');
  assert.deepEqual(progress.at(-1), 10);
});

test('a failing service returns the error code and nothing it did not translate', async (t) => {
  const { clientFetch } = await withServer(t, true);
  const result = await translateRows(rows(), 'en', 'fr', { fetchImpl: clientFetch });
  assert.equal(result.error, 'TRANSLATE_UNAVAILABLE');
  assert.equal(result.translations.size, 0);
  const offline = await translateRows(rows(), 'en', 'fr', { fetchImpl: (async () => { throw new Error('offline'); }) as typeof fetch });
  assert.equal(offline.error, 'NETWORK');
  const empty = await translateRows([], 'en', 'fr', { fetchImpl: (async () => { throw new Error('must not be called'); }) as typeof fetch });
  assert.deepEqual([empty.translations.size, empty.error], [0, undefined]);
});

test('an automatic translation is flagged until someone edits or reviews it', () => {
  const doc = resume();
  setItemTranslation(doc, 'fr', 'job-1', null, 'role', 'Ingénieur senior', 'Senior engineer', true);
  setProfileTranslation(doc, 'fr', 'headline', 'Ingénieur backend', 'Backend engineer', true);
  setSectionLabelTranslation(doc, 'fr', 'work', 'Expérience', 'Experience', true);
  const machine = () => rows(doc).filter(row => row.machine).map(row => row.key).sort();
  assert.deepEqual(machine(), ['item:job-1:role', 'profile:headline', 'section:work:label']);
  assert.ok(rows(doc).every(row => !row.stale), 'a fresh automatic translation is not stale');

  // A person's own edit clears the flag.
  setItemTranslation(doc, 'fr', 'job-1', null, 'role', 'Ingénieur principal', 'Senior engineer');
  assert.deepEqual(machine(), ['profile:headline', 'section:work:label']);
  // Reviewing clears it without touching the text.
  const headline = rows(doc).find(row => row.key === 'profile:headline')!;
  markTranslationReviewed(doc, 'fr', headline);
  const label = rows(doc).find(row => row.key === 'section:work:label')!;
  markTranslationReviewed(doc, 'fr', label);
  assert.deepEqual(machine(), []);
  assert.equal(rows(doc).find(row => row.key === 'profile:headline')!.translated, 'Ingénieur backend');
  assert.ok(isVariants(doc.variants));
});

test('"up to date" keeps the automatic flag, and "reviewed" keeps the staleness', () => {
  const doc = resume();
  setItemTranslation(doc, 'fr', 'job-1', null, 'role', 'Ingénieur senior', 'Senior engineer', true);
  doc.sections[0].items[0].role = 'Staff engineer';
  let role = rows(doc).find(row => row.key === 'item:job-1:role')!;
  assert.deepEqual([role.stale, role.machine], [true, true]);
  markTranslationReviewed(doc, 'fr', role);
  role = rows(doc).find(row => row.key === 'item:job-1:role')!;
  assert.deepEqual([role.stale, role.machine], [true, false], 'reviewing is not the same as being up to date');
  setItemTranslation(doc, 'fr', 'job-1', null, 'role', 'Ingénieur principal', 'Senior engineer', true);
  doc.sections[0].items[0].role = 'Principal engineer';
  markTranslationCurrent(doc, 'fr', rows(doc).find(row => row.key === 'item:job-1:role')!, 'Principal engineer');
  role = rows(doc).find(row => row.key === 'item:job-1:role')!;
  assert.deepEqual([role.stale, role.machine], [false, true]);
  // Vouching for a text without a translation does nothing.
  markTranslationReviewed(doc, 'fr', { scope: 'item', itemId: 'job-1', field: 'body' });
  assert.equal(doc.variants!.translations.fr.items!['job-1'].base!.body, undefined);
});

test('the automatic flag survives a backup restore', () => {
  const doc = resume();
  setItemTranslation(doc, 'fr', 'job-1', null, 'role', 'Ingénieur senior', 'Senior engineer', true);
  const [restored] = readBackup(createBackup([{ resume: doc, settings: { ...DEFAULT_SETTINGS } }]));
  assert.equal(buildTranslationRows(restored.resume, 'fr').find(row => row.field === 'role')!.machine, true);
  assert.ok(storedFingerprint('x', true).startsWith('~'));
});
