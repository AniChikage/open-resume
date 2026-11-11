import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import http from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { createApp } from '../server/app.ts';
import { buildBlankResume, buildResumeFromTemplate, DEFAULT_SETTINGS, RESUME_TEMPLATES } from '../src/data.ts';
import { compareVersionDocuments, sameVersionValue } from '../src/lib/version-diff.ts';
import { VERSION_AUTO_LIMIT, VERSION_AUTOSAVE_WINDOW_MS, VERSION_MANUAL_LIMIT } from '../src/lib/version-types.ts';
import type { ResumeVersionSummary } from '../src/lib/version-types.ts';
import type { EditorDocument } from '../src/types.ts';

const blankDocument = (): EditorDocument => ({ resume: buildBlankResume('en'), settings: { ...DEFAULT_SETTINGS } });

async function fixture(t: import('node:test').TestContext) {
  const dir = await mkdtemp(path.join(tmpdir(), 'open-resume-history-'));
  let app = createApp({ dataDir: dir, env: {} });
  let base = '';
  let cookie = '';
  async function start() {
    app.listen(0, '127.0.0.1');
    await once(app, 'listening');
    base = `http://127.0.0.1:${(app.address() as import('node:net').AddressInfo).port}`;
  }
  async function stop() {
    if (app.listening) { app.close(); await once(app, 'close'); }
  }
  await start();
  const request = (route: string, method = 'GET', value?: unknown, headers: Record<string, string> = {}) => fetch(base + route, {
    method,
    headers: { Cookie: cookie, ...(value === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers },
    ...(value === undefined ? {} : { body: JSON.stringify(value) }),
  });
  const login = async () => {
    const response = await request('/api/auth/login', 'POST', { username: 'admin', password: 'admin' });
    assert.equal(response.status, 200);
    cookie = response.headers.get('set-cookie')!.split(';')[0];
  };
  const create = async (document = blankDocument()) => {
    const response = await request('/api/resumes', 'POST', { ...document, title: document.resume.title });
    assert.equal(response.status, 201);
    return (await response.json()).id as string;
  };
  const versions = async (id: string) => {
    const response = await request(`/api/resumes/${id}/versions`);
    assert.equal(response.status, 200);
    return (await response.json()).versions as ResumeVersionSummary[];
  };
  const update = async (id: string, document: EditorDocument) => {
    const response = await request(`/api/resumes/${id}`, 'PUT', { ...document, title: document.resume.title });
    assert.equal(response.status, 200);
    return response.json();
  };
  t.after(async () => { await stop(); await rm(dir, { recursive: true, force: true }); });
  return {
    get app() { return app; }, get base() { return base; }, get cookie() { return cookie; },
    dir, request, login, create, versions, update,
    restart: async () => { await stop(); app = createApp({ dataDir: dir, env: {} }); await start(); },
  };
}

test('history is authenticated, validates snapshots, isolates version IDs, and lists summaries without content', async t => {
  const f = await fixture(t);
  const missing = randomUUID();
  assert.equal((await f.request(`/api/resumes/${missing}/versions`)).status, 401);
  assert.equal((await f.request(`/api/resumes/${missing}/versions`, 'POST', blankDocument())).status, 401);
  await f.login();
  const id = await f.create();
  const route = `/api/resumes/${id}/versions`;
  const initial = (await f.versions(id))[0];
  assert.equal(initial.kind, 'initial');
  assert.equal('resume' in initial, false);
  assert.equal('settings' in initial, false);
  assert.equal((await f.request(route, 'POST', { ...blankDocument(), label: 'valid' }, { Origin: 'https://other.example' })).status, 403);
  for (const value of [{}, { ...blankDocument(), label: 12 }, { ...blankDocument(), label: 'x'.repeat(121) }, { ...blankDocument(), title: 'x'.repeat(1001) }, { ...blankDocument(), settings: { ...DEFAULT_SETTINGS, fontSize: -1 } }]) {
    assert.equal((await f.request(route, 'POST', value)).status, 400);
  }
  assert.equal((await f.versions(id)).length, 1);
  assert.equal((await f.request(route, 'DELETE')).status, 405);
  assert.equal((await f.request(`${route}/${initial.id}`, 'PUT', {})).status, 405);
  assert.equal((await f.request(`${route}/${initial.id}/restore`)).status, 405);
  assert.equal((await f.request(`/api/resumes/${missing}/versions`)).status, 404);
  assert.equal((await f.request(`${route}/${missing}`)).status, 404);
  const other = await f.create();
  assert.equal((await f.request(`/api/resumes/${other}/versions/${initial.id}`)).status, 404);
  assert.equal((await f.request(`/api/resumes/${other}/versions/${initial.id}/restore`, 'POST')).status, 404);
  const checkpoint = await f.request(route, 'POST', { ...blankDocument(), label: '   ' });
  assert.equal(checkpoint.status, 201);
  assert.equal((await checkpoint.json()).label, '');
});

test('automatic versions ignore no-op saves, group continuous edits into fixed windows, and preserve manual checkpoints', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: 1_800_000_000_000 });
  const f = await fixture(t);
  await f.login();
  const document = blankDocument();
  const id = await f.create(document);
  const route = `/api/resumes/${id}/versions`;
  const initial = (await f.versions(id))[0];
  await f.update(id, document);
  await f.update(id, { ...document, settings: Object.fromEntries(Object.entries(document.settings).reverse()) as unknown as EditorDocument['settings'] });
  assert.equal((await f.versions(id)).length, 1);

  document.resume.profile.name = 'First edit';
  t.mock.timers.tick(1000);
  await f.update(id, document);
  const first = (await f.versions(id))[0];
  assert.equal(first.kind, 'auto');
  document.resume.profile.name = 'Latest edit in first minute';
  t.mock.timers.tick(1000);
  await f.update(id, document);
  const grouped = (await f.versions(id))[0];
  assert.equal(grouped.id, first.id);
  assert.equal(grouped.createdAt, first.createdAt);
  assert.ok(grouped.updatedAt > first.updatedAt);
  assert.equal((await (await f.request(`${route}/${first.id}`)).json()).resume.profile.name, document.resume.profile.name);
  assert.equal((await (await f.request(`${route}/${initial.id}`)).json()).resume.profile.name, '');

  t.mock.timers.tick(VERSION_AUTOSAVE_WINDOW_MS);
  document.resume.profile.name = 'Second minute';
  await f.update(id, document);
  const second = (await f.versions(id))[0];
  assert.notEqual(second.id, first.id);

  const unsaved = structuredClone(document);
  unsaved.resume.profile.name = 'Unsaved local checkpoint';
  unsaved.settings.accent = '#123456';
  const checkpointResponse = await f.request(route, 'POST', { ...unsaved, label: '  Before applying a new style  ' });
  assert.equal(checkpointResponse.status, 201);
  const checkpoint = await checkpointResponse.json();
  assert.equal(checkpoint.label, 'Before applying a new style');
  assert.deepEqual(checkpoint.resume, unsaved.resume);
  assert.equal((await (await f.request(`/api/resumes/${id}`)).json()).resume.profile.name, 'Second minute');
  document.resume.profile.name = 'After checkpoint';
  await f.update(id, document);
  assert.notEqual((await f.versions(id))[0].id, second.id, 'an automatic save must not coalesce across a manual checkpoint');
  assert.equal((await (await f.request(`${route}/${checkpoint.id}`)).json()).resume.profile.name, 'Unsaved local checkpoint');
});

test('retention bounds automatic and manual snapshots separately and deletion removes all history', async t => {
  t.mock.timers.enable({ apis: ['Date'], now: 1_800_000_000_000 });
  const f = await fixture(t);
  await f.login();
  const document = blankDocument();
  const id = await f.create(document);
  const initial = (await f.versions(id))[0];
  for (let index = 0; index < VERSION_AUTO_LIMIT + 5; index++) {
    t.mock.timers.tick(VERSION_AUTOSAVE_WINDOW_MS + 1);
    document.resume.profile.name = `Automatic ${index}`;
    await f.update(id, document);
  }
  for (let index = 0; index < VERSION_MANUAL_LIMIT + 5; index++) {
    t.mock.timers.tick(1);
    const response = await f.request(`/api/resumes/${id}/versions`, 'POST', { ...document, label: `Manual ${index}` });
    assert.equal(response.status, 201);
  }
  const versions = await f.versions(id);
  assert.equal(versions.filter(version => version.kind === 'auto').length, VERSION_AUTO_LIMIT);
  assert.equal(versions.filter(version => version.kind === 'manual').length, VERSION_MANUAL_LIMIT);
  assert.equal(versions.filter(version => version.kind === 'initial').length, 1);
  assert.ok(versions.some(version => version.id === initial.id));
  assert.ok(!versions.some(version => version.label === 'Manual 0'));
  assert.equal(versions[0].label, `Manual ${VERSION_MANUAL_LIMIT + 4}`);
  assert.equal((await f.request(`/api/resumes/${id}`, 'DELETE')).status, 200);
  const db = new DatabaseSync(path.join(f.dir, 'open-resume.sqlite'));
  try { assert.equal(db.prepare('SELECT COUNT(*) AS count FROM resume_versions WHERE resume_id = ?').get(id)!.count, 0); }
  finally { db.close(); }
  assert.equal((await f.request(`/api/resumes/${id}/versions`)).status, 404);
});

test('history persists across restarts and restoring creates an independent copy with its own baseline', async t => {
  const f = await fixture(t);
  await f.login();
  const document: EditorDocument = { resume: buildResumeFromTemplate(RESUME_TEMPLATES[0], 'zh'), settings: { ...DEFAULT_SETTINGS, accent: '#654321', fontSize: 14 } };
  document.resume.profile.avatar = 'data:image/png;base64,test-photo';
  const id = await f.create(document);
  const response = await f.request(`/api/resumes/${id}/versions`, 'POST', { ...document, label: 'Ready to send' });
  const checkpoint = await response.json();
  const changed = structuredClone(document);
  changed.resume.profile.name = 'Current source stays here';
  changed.settings.fontSize = 16;
  await f.update(id, changed);
  await f.restart();
  const versionsBeforeRestore = await f.versions(id);
  assert.deepEqual((await (await f.request(`/api/resumes/${id}/versions/${checkpoint.id}`)).json()).resume, document.resume);
  const restoredResponse = await f.request(`/api/resumes/${id}/versions/${checkpoint.id}/restore`, 'POST');
  assert.equal(restoredResponse.status, 201);
  const restored = await restoredResponse.json();
  assert.notEqual(restored.id, id);
  const copy = await (await f.request(`/api/resumes/${restored.id}`)).json();
  assert.deepEqual(copy.resume, document.resume);
  assert.deepEqual(copy.settings, document.settings);
  const source = await (await f.request(`/api/resumes/${id}`)).json();
  assert.deepEqual(source.resume, changed.resume);
  assert.deepEqual(source.settings, changed.settings);
  assert.equal((await f.versions(restored.id)).length, 1);
  assert.deepEqual(await f.versions(id), versionsBeforeRestore);
});

test('existing documents gain their original baseline before their first update or history read', async t => {
  const f = await fixture(t);
  await f.login();
  const original = blankDocument();
  original.resume.title = 'Legacy title';
  const id = await f.create(original);
  const second = await f.create();
  const db = new DatabaseSync(path.join(f.dir, 'open-resume.sqlite'));
  db.prepare('DELETE FROM resume_versions').run();
  try {
    assert.equal((await f.request(`/api/resumes/${id}`, 'PUT', { title: 'New title' })).status, 200);
    const versions = await f.versions(id);
    const baseline = versions.find(version => version.kind === 'initial')!;
    assert.equal(baseline.title, 'Legacy title');
    assert.deepEqual((await (await f.request(`/api/resumes/${id}/versions/${baseline.id}`)).json()).resume, original.resume);
    assert.equal((await f.versions(second)).length, 1);
    assert.equal((await f.versions(second)).length, 1);
  } finally { db.close(); }
});

test('snapshot failures roll back writes and snapshots interrupted by deletion cannot leave orphans', async t => {
  const f = await fixture(t);
  await f.login();
  const document = blankDocument();
  const id = await f.create(document);
  const db = new DatabaseSync(path.join(f.dir, 'open-resume.sqlite'));
  t.after(() => db.close());
  db.exec("CREATE TRIGGER fail_history BEFORE INSERT ON resume_versions WHEN NEW.kind = 'auto' BEGIN SELECT RAISE(FAIL, 'synthetic snapshot failure'); END;");
  const errors = t.mock.method(console, 'error', () => {});
  const edited = structuredClone(document);
  edited.resume.profile.name = 'Must roll back';
  assert.equal((await f.request(`/api/resumes/${id}`, 'PUT', { ...edited, title: edited.resume.title })).status, 500);
  assert.equal(errors.mock.callCount(), 1);
  assert.deepEqual((await (await f.request(`/api/resumes/${id}`)).json()).resume, document.resume);
  assert.equal((await f.versions(id)).length, 1);
  db.exec('DROP TRIGGER fail_history');

  const started = once(f.app, 'request');
  const pending = http.request(`${f.base}/api/resumes/${id}/versions`, { method: 'POST', headers: { Cookie: f.cookie, 'Content-Type': 'application/json' } });
  t.after(() => pending.destroy());
  const response = once(pending, 'response');
  pending.write('{"label":');
  await started;
  assert.equal((await f.request(`/api/resumes/${id}`, 'DELETE')).status, 200);
  pending.end(`"Interrupted",${JSON.stringify(document).slice(1)}`);
  const [result] = await response as [http.IncomingMessage];
  result.resume();
  assert.equal(result.statusCode, 404);
  assert.equal(db.prepare('SELECT COUNT(*) AS count FROM resume_versions WHERE resume_id = ?').get(id)!.count, 0);
});

test('version comparison detects content, section order and appearance changes without exposing photo data', () => {
  const historical: EditorDocument = { resume: buildResumeFromTemplate(RESUME_TEMPLATES[0], 'en'), settings: { ...DEFAULT_SETTINGS } };
  const current = structuredClone(historical);
  assert.equal(sameVersionValue({ label: 'Work', items: [{ body: 'Built a product', id: 'item' }] }, { items: [{ id: 'item', body: 'Built a product' }], label: 'Work' }), true);
  assert.equal(sameVersionValue(['Work', 'Education'], ['Education', 'Work']), false);
  assert.deepEqual(compareVersionDocuments(current, historical), { profileFields: [], changedSections: [], appearanceChanged: false, titleChanged: false });
  const withMetadata = { ...current, resume: { ...current.resume, profile: { ...current.resume.profile, importedMetadata: { source: 'external document' } } } };
  assert.deepEqual(compareVersionDocuments(withMetadata, historical), { profileFields: [], changedSections: [], appearanceChanged: false, titleChanged: false }, 'object-valued imported metadata is ignored, just as it is by the resume renderer');
  current.settings = Object.fromEntries(Object.entries(current.settings).reverse()) as unknown as EditorDocument['settings'];
  current.settings.titleMode = 'custom';
  assert.equal(compareVersionDocuments(current, historical).appearanceChanged, false);
  current.resume.profile.avatar = 'data:image/png;base64,private-photo';
  current.resume.profile.name = 'Changed name';
  current.resume.title = 'Changed title';
  current.settings.fontSize = 14;
  current.resume.sections.reverse();
  const result = compareVersionDocuments(current, historical);
  assert.deepEqual(new Set(result.profileFields), new Set(['avatar', 'name']));
  assert.equal(result.appearanceChanged, true);
  assert.equal(result.titleChanged, true);
  assert.ok(result.changedSections.length > 0);
  assert.equal(JSON.stringify(result).includes('private-photo'), false);
  assert.notEqual(historical.resume.profile.name, 'Changed name');
});
