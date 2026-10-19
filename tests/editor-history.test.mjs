import assert from 'node:assert/strict';
import test from 'node:test';
import { createEditorHistory } from '../src/lib/editor-history.js';
import { translate } from '../src/lib/i18n.js';
const initial = { resume: { title: 'CV', sections: [{ id: 'work', items: [{ id: 'one', body: 'Original' }] }] }, settings: { template: 'classic', accent: 'purple' } };

test('deletion and appearance changes undo and redo as complete document operations', () => {
  const history = createEditorHistory(initial);
  const deleted = { ...initial, resume: { ...initial.resume, sections: [] } };
  history.commit(deleted);
  const styled = { ...deleted, settings: { template: 'modern', accent: 'blue' } };
  history.commit(styled);
  history.undo(); assert.deepEqual(history.getSnapshot().present, deleted);
  history.undo(); assert.deepEqual(history.getSnapshot().present, initial);
  history.redo(); history.redo(); assert.deepEqual(history.getSnapshot().present, styled);
});

test('typing groups only within the same field and time window; edits after undo discard redo', () => {
  let time = 0;
  const h = createEditorHistory(initial, { now: () => time });
  const title = (text) => (doc) => ({ ...doc, resume: { ...doc.resume, title: text } });
  h.commit(title('A'), 'title'); time = 100; h.commit(title('AB'), 'title');
  h.undo(); assert.equal(h.getSnapshot().present.resume.title, 'CV');
  h.redo(); assert.equal(h.getSnapshot().present.resume.title, 'AB');
  time = 1000; h.commit(title('ABC'), 'title'); h.undo();
  assert.equal(h.getSnapshot().present.resume.title, 'AB');
  h.commit(title('New'), 'other-field'); assert.equal(h.getSnapshot().canRedo, false);
  h.undo(); assert.equal(h.getSnapshot().present.resume.title, 'AB');
});

test('no-op updates do not create undo steps and history is bounded and reset per document', () => {
  const h = createEditorHistory(initial, { limit: 2 });
  h.commit(structuredClone(initial)); assert.equal(h.getSnapshot().canUndo, false);
  for (let i = 0; i < 3; i++) h.commit({ ...initial, settings: { template: String(i) } });
  h.undo(); h.undo(); assert.equal(h.getSnapshot().present.settings.template, '0');
  assert.equal(h.getSnapshot().canUndo, false);
  h.reset(initial); assert.equal(h.getSnapshot().canUndo, false); assert.equal(h.getSnapshot().canRedo, false);
});

test('system transformations preserve undo history and apply to redo snapshots', () => {
  const h = createEditorHistory(initial);
  h.commit({ ...initial, settings: { template: 'modern' } }); h.undo();
  h.map((doc) => ({ ...doc, resume: { ...doc.resume, title: '履历' } }));
  h.redo(); assert.equal(h.getSnapshot().present.resume.title, '履历');
  assert.equal(h.getSnapshot().present.settings.template, 'modern');
  h.undo(); assert.equal(h.getSnapshot().present.resume.title, '履历');
});

test('snapshot identity distinguishes a pending save from newer edits', () => {
  const h = createEditorHistory(initial);
  const saved = h.getSnapshot().present;
  h.commit({ ...initial, settings: { template: 'changed' } });
  assert.notEqual(h.getSnapshot().present, saved);
});

test('editor actions remain translated in all six non-English languages', () => {
  for (const message of ['Undo', 'Redo', 'Apply template', 'Retry', 'Close']) {
    for (const lang of ['zh', 'zh-TW', 'ja', 'ko', 'fr', 'ru']) assert.notEqual(translate(lang, message), message);
  }
});
