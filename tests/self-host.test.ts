import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp,rm,writeFile } from 'node:fs/promises';
import http from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createApp } from '../server/app.ts';
import { buildResumeFromTemplate,DEFAULT_SETTINGS,RESUME_TEMPLATES } from '../src/data.ts';
import { openText } from '../src/lib/open-copy.ts';

async function fixture(t: import("node:test").TestContext, options: import("../server/app.ts").AppOptions = {}) {
  const dir = await mkdtemp(path.join(tmpdir(), 'open-resume-test-'));
  const app = createApp({ dataDir: dir, distDir: dir, env: {}, ...options });
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  const base = `http://127.0.0.1:${(app.address() as import('node:net').AddressInfo).port}`;
  let cookie = '';
  const request = (url: string, method: string = 'GET', value: unknown = undefined, headers: Record<string,string> = {}) => fetch(base + url, { method, headers: { Cookie: cookie, ...(value !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers }, ...(value !== undefined ? { body: JSON.stringify(value) } : {}) });
  const login = async (username = 'admin', password = 'admin') => {
    const res = await request('/api/auth/login', 'POST', { username, password });
    if (res.ok) cookie = res.headers.get('set-cookie')!.split(';')[0];
    return res;
  };
  t.after(async () => { if (app.listening) { app.close(); await once(app, 'close'); } await rm(dir, { recursive: true, force: true }); });
  return { app, base, dir, request, login, get cookie() { return cookie; } };
}

test('admin/admin, invalid credentials, unforgeable sessions, CSRF and logout', async (t) => {
  const f = await fixture(t);
  assert.equal((await f.request('/api/resumes')).status, 401);
  assert.equal((await f.login('admin', 'incorrect')).status, 401);
  assert.equal((await f.request('/api/auth/login', 'POST', { username: 'admin', password: 'admin' }, { Origin: 'https://other.example' })).status, 403);
  assert.equal((await f.login()).status, 200);
  assert.equal((await (await f.request('/api/auth/me')).json()).user.username, 'admin');
  assert.equal((await f.request('/api/resumes', 'GET', undefined, { Cookie: 'openresume_session=' + 'a'.repeat(64) })).status, 401);
  assert.equal((await f.request('/api/auth/logout', 'POST')).status, 200);
  assert.equal((await f.request('/api/resumes')).status, 401);
});

test('all templates, more than five resumes, edit/rename/delete and restart persistence', async (t) => {
  const f = await fixture(t);
  await f.login();
  assert.ok(RESUME_TEMPLATES.length >= 150);
  assert.ok(RESUME_TEMPLATES.every((template) => template.free));
  const template = RESUME_TEMPLATES.at(-1)!;
  const resume = buildResumeFromTemplate(template, 'en');
  const settings = { ...DEFAULT_SETTINGS, template: template.id };
  let id;
  for (let i = 0; i < 8; i++) {
    const res = await f.request('/api/resumes', 'POST', { title: resume.title, resume, settings });
    assert.equal(res.status, 201);
    id = (await res.json()).id;
  }
  assert.equal((await (await f.request('/api/resumes')).json()).resumes.length, 8);
  assert.equal((await f.request(`/api/resumes/${id}`, 'PUT', { title: 'My saved resume', resume: { ...resume, profile: { ...resume.profile, name: 'Persistence check' } }, settings })).status, 200);
  await f.request(`/api/resumes/${id}`, 'PUT', { title: 'Renamed resume' });
  f.app.close(); await once(f.app, 'close');
  const restarted = createApp({ dataDir: f.dir, env: {} });
  restarted.listen(0, '127.0.0.1'); await once(restarted, 'listening');
  try {
    const base = `http://127.0.0.1:${(restarted.address() as import('node:net').AddressInfo).port}`;
    const res = await fetch(`${base}/api/resumes/${id}`, { headers: { Cookie: f.cookie } });
    assert.equal(res.status, 200);
    const stored = await res.json();
    assert.equal(stored.resume.profile.name, 'Persistence check');
    assert.equal(stored.resume.title, 'Renamed resume');
    assert.equal(stored.settings.template, template.id);
    assert.equal(stored.settings.titleMode, 'custom');
    assert.equal(stored.settings.titleKind, 'custom');
    assert.equal((await fetch(`${base}/api/resumes/${id}`, { method: 'DELETE', headers: { Cookie: f.cookie } })).status, 200);
    assert.equal((await fetch(`${base}/api/resumes/${id}`, { headers: { Cookie: f.cookie } })).status, 404);
  } finally { restarted.close(); await once(restarted, 'close'); }
});

test('a slow rename merges with the latest save instead of overwriting its content and appearance', async (t) => {
  const f = await fixture(t);
  await f.login();
  const resume = buildResumeFromTemplate(RESUME_TEMPLATES[0], 'en');
  const created = await f.request('/api/resumes', 'POST', { title: resume.title, resume, settings: DEFAULT_SETTINGS });
  const { id } = await created.json();
  const route = `/api/resumes/${id}`;

  const started = once(f.app, 'request');
  const pending = http.request(f.base + route, { method: 'PUT', headers: { Cookie: f.cookie, 'Content-Type': 'application/json' } });
  t.after(() => pending.destroy());
  const response = once(pending, 'response');
  pending.write('{"title":');
  await started;

  const latestResume = { ...resume, profile: { ...resume.profile, name: 'Latest saved content' } };
  const latestSettings = { ...DEFAULT_SETTINGS, fontSize: 14, accent: '#123456' };
  assert.equal((await f.request(route, 'PUT', { title: resume.title, resume: latestResume, settings: latestSettings })).status, 200);
  pending.end('"My custom title"}');
  const [renamed] = await response as [http.IncomingMessage];
  renamed.resume();
  assert.equal(renamed.statusCode, 200);

  const saved = await (await f.request(route)).json();
  assert.equal(saved.resume.profile.name, 'Latest saved content');
  assert.equal(saved.title, 'My custom title');
  assert.equal(saved.resume.title, 'My custom title');
  assert.deepEqual(saved.settings, { ...latestSettings, titleMode: 'custom', titleKind: 'custom' });
});

test('an update interrupted by deletion returns not found instead of claiming to save a deleted resume', async (t) => {
  const f = await fixture(t);
  await f.login();
  const resume = buildResumeFromTemplate(RESUME_TEMPLATES[0], 'en');
  const created = await f.request('/api/resumes', 'POST', { title: resume.title, resume, settings: DEFAULT_SETTINGS });
  const { id } = await created.json();
  const route = `/api/resumes/${id}`;

  const started = once(f.app, 'request');
  const pending = http.request(f.base + route, { method: 'PUT', headers: { Cookie: f.cookie, 'Content-Type': 'application/json' } });
  t.after(() => pending.destroy());
  const response = once(pending, 'response');
  pending.write('{"title":');
  await started;
  assert.equal((await f.request(route, 'DELETE')).status, 200);
  pending.end('"Deleted while uploading"}');
  const [updated] = await response as [http.IncomingMessage];
  updated.resume();
  assert.equal(updated.statusCode, 404);
  assert.equal((await f.request(route)).status, 404);
});

test('custom local credentials replace the demo; config never reveals the custom password', async (t) => {
  const f = await fixture(t, { env: { LOCAL_USERNAME: 'owner', LOCAL_PASSWORD: 'private-test-password' } });
  const config = await (await f.request('/api/config')).json();
  assert.equal(config.demoLogin, false);
  assert.equal(config.demoPassword, '');
  assert.equal((await f.login()).status, 401);
  assert.equal((await f.login('owner', 'private-test-password')).status, 200);
});

test('static build is served; source/config/database paths and invalid documents are rejected', async (t) => {
  const f = await fixture(t);
  await writeFile(path.join(f.dir, 'index.html'), '<!doctype html><title>Open Resume</title>');
  await writeFile(path.join(f.dir, '.env'), 'secret');
  assert.match(await (await f.request('/')).text(), /Open Resume/);
  for (const url of ['/.env', '/.data/open-resume.sqlite', '/src/worker.js', '/package.json', '/assets/missing.js']) assert.equal((await f.request(url)).status, 404, url);
  await f.login();
  assert.equal((await f.request('/api/resumes', 'POST', { title: 'invalid' })).status, 400);
  const raw = await fetch(f.base + '/api/resumes', { method: 'POST', headers: { Cookie: f.cookie, 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(raw.status, 400);
});

test('optional AI has no daily quota and uses the configured endpoint/model without leaking contact fields', async (t) => {
  let calls = 0;
  const f = await fixture(t, {
    env: { AI_API_KEY: 'synthetic-key', AI_MODEL: 'test-model', AI_BASE_URL: 'https://provider.example/v1' },
    fetchImpl: async (url, options) => {
      calls++;
      assert.equal(url, 'https://provider.example/v1/chat/completions');
      const payload = JSON.parse(String(options?.body));
      assert.equal(payload.model, 'test-model');
      assert.ok(!String(options?.body).includes('private@example.com'));
      return Response.json({ choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ role: 'Engineer', summary: 'Relevant experience.', gaps: [], suggestions: [] }) } }] });
    },
  });
  await f.login();
  const input = { consent: true, language: 'en', jobDescription: 'We are looking for an engineer to improve reliable software and work closely with the team on product development.', resume: { profile: { email: 'private@example.com' }, sections: [{ type: 'summary', visible: true, items: [{ body: 'I build reliable software with a product team.' }] }] } };
  for (let i = 0; i < 7; i++) assert.equal((await f.request('/api/tailor', 'POST', input)).status, 200);
  assert.equal(calls, 7);
  const disabled = await fixture(t);
  await disabled.login();
  assert.equal((await disabled.request('/api/tailor', 'POST', input)).status, 503);
});

test('self-hosting copy covers every supported interface language', () => {
  for (const lang of ['en', 'zh', 'zh-TW', 'ja', 'ko', 'fr', 'ru']) {
    for (const key of ['headline', 'hostedDescription', 'credentials', 'aiSetup', 'aiConsent']) {
      assert.ok(openText(lang, key).length > 0);
      assert.notEqual(openText(lang, key), key);
      if (lang !== 'en') assert.notEqual(openText(lang, key), openText('en', key));
    }
  }
});
