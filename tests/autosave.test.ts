import assert from 'node:assert/strict';
import test from 'node:test';
import { createAutosave } from '../src/lib/autosave.ts';

test('autosave persists drafts immediately and bounds the wait while typing continuously', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const saved: string[] = [], drafts: string[] = [];
  const controller = createAutosave({ save: async (value: string) => { saved.push(value); }, writeDraft: value => { drafts.push(value); return true; }, clearDraft: () => {} });
  controller.update('0');
  assert.deepEqual(drafts, ['0']);
  for (let i = 1; i <= 5; i++) { t.mock.timers.tick(900); controller.update(String(i)); }
  assert.equal(saved.length, 0);
  t.mock.timers.tick(500);
  await controller.flush();
  assert.deepEqual(saved, ['5']);
  assert.equal(controller.getSnapshot().dirty, false);
});

test('leaving during a slow save flushes the latest edit in order and keeps its draft until acknowledged', async () => {
  const saved: string[] = [], cleared: string[] = [];
  let release!: () => void;
  const slow = new Promise<void>(resolve => { release = resolve; });
  const controller = createAutosave({
    save: async (value: string) => { saved.push(value); if (value === 'first') await slow; },
    writeDraft: () => true, clearDraft: value => { cleared.push(value); },
  });
  controller.update('first');
  const saving = controller.flush();
  controller.update('second'); controller.update('latest');
  assert.equal(controller.flush(), saving);
  assert.deepEqual(cleared, []);
  release(); await saving;
  assert.deepEqual(saved, ['first', 'latest']);
  assert.deepEqual(cleared, ['latest']);
  assert.equal(controller.getSnapshot().dirty, false);
});

test('offline failures retain unsaved changes and an explicit retry succeeds', async () => {
  let offline = true, cleared = false;
  const controller = createAutosave({
    save: async () => { if (offline) throw new Error('OFFLINE'); },
    writeDraft: () => true, clearDraft: () => { cleared = true; },
  });
  controller.update('content');
  assert.equal(await controller.flush(), false);
  assert.equal(controller.getSnapshot().dirty, true);
  assert.equal(controller.getSnapshot().draftAvailable, true);
  assert.equal(cleared, false);
  offline = false;
  assert.equal(await controller.flush(), true);
  assert.equal(cleared, true);
  assert.equal(controller.getSnapshot().error, null);
});

test('unavailable browser storage is reported without blocking server saves', async () => {
  let saved = false;
  const controller = createAutosave({ save: async () => { saved = true; }, writeDraft: () => false, clearDraft: () => {} });
  controller.update('content');
  assert.equal(controller.getSnapshot().draftAvailable, false);
  await controller.flush(true);
  assert.equal(saved, true);
});
