import assert from 'node:assert/strict';
import test from 'node:test';
import { buildBlankResume, DEFAULT_SETTINGS } from '../src/data.ts';
import { renameDashboardDraft, selectDashboardResumes } from '../src/lib/dashboard.ts';
import { readDraft, writeDraft } from '../src/lib/drafts.ts';
import type { ResumeEntry } from '../src/types.ts';

function entry(id: string, title: string, updatedAt: number, name = '', headline = ''): ResumeEntry {
  const resume = buildBlankResume('en');
  return { id, title, updatedAt, resume: { ...resume, title, profile: { ...resume.profile, name, headline } }, settings: { ...DEFAULT_SETTINGS } };
}

test('dashboard search matches title, name and headline with Unicode, case and whitespace normalization', () => {
  const resumes = [entry('a', 'Frontend Portfolio', 1, 'Alice Chen', 'React Engineer'), entry('b', '产品经理', 2, '张三', '产品设计')];
  assert.deepEqual(selectDashboardResumes(resumes, { query: '  ＦＲＯＮＴＥＮＤ   alice ' }).map(item => item.id), ['a']);
  assert.deepEqual(selectDashboardResumes(resumes, { query: 'react' }).map(item => item.id), ['a']);
  assert.deepEqual(selectDashboardResumes(resumes, { query: '张三 设计' }).map(item => item.id), ['b']);
  assert.deepEqual(selectDashboardResumes(resumes, { query: 'missing' }), []);
  assert.equal(selectDashboardResumes(resumes, { query: '   ' }).length, 2);
});

test('dashboard hides excluded entries and sorts without mutating the saved list', () => {
  const resumes = [entry('a', 'Resume 10', 1), entry('b', 'Resume 2', 3), entry('c', 'Another resume', 2)];
  assert.deepEqual(selectDashboardResumes(resumes).map(item => item.id), ['b', 'c', 'a']);
  assert.deepEqual(selectDashboardResumes(resumes, { sort: 'oldest' }).map(item => item.id), ['a', 'c', 'b']);
  assert.deepEqual(selectDashboardResumes(resumes, { sort: 'name' }).map(item => item.id), ['c', 'b', 'a']);
  assert.deepEqual(selectDashboardResumes(resumes, { hiddenIds: ['b', 'deleted-id', 'b'] }).map(item => item.id), ['c', 'a']);
  assert.deepEqual(resumes.map(item => item.id), ['a', 'b', 'c']);
});

test('renaming preserves unsaved draft content and keeps its custom name when the editor restores it', t => {
  for (const name of ['localStorage', 'sessionStorage'] as const) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
    const values = new Map<string, string>();
    Object.defineProperty(globalThis, name, { configurable: true, value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    } });
    t.after(() => { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name); });
  }
  const draft = entry('a', 'Old name', 1, 'Unsaved name', 'Unsaved headline');
  draft.resume.sections.push({ id: 'offline-notes', type: 'custom', label: 'Offline notes', visible: true, items: [{ id: 'pending', body: 'Keep this unsaved content' }] });
  draft.settings.accent = '#123456';
  draft.settings.titleMode = 'auto';
  assert.equal(writeDraft('a', 'owner', { resume: draft.resume, settings: draft.settings }), true);
  renameDashboardDraft('a', 'other-user', 'Unrelated rename');
  assert.equal(readDraft('a', 'owner')?.resume.title, 'Old name');
  renameDashboardDraft('a', 'owner', 'Application for new role');
  const restored = readDraft('a', 'owner');
  assert.ok(restored);
  assert.equal(restored.resume.title, 'Application for new role');
  assert.equal(restored.settings.titleMode, 'custom');
  assert.equal(restored.settings.titleKind, 'custom');
  assert.deepEqual(restored.resume.profile, draft.resume.profile);
  assert.deepEqual(restored.resume.sections, draft.resume.sections);
  assert.equal(restored.settings.accent, '#123456');
  assert.equal(readDraft('a', 'other-user'), null);
});
