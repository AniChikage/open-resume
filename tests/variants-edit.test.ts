import assert from 'node:assert/strict';
import test from 'node:test';
import { isResume } from '../src/lib/validation.ts';
import {
  addItemVersion, createPreset, deleteItemVersion, deletePreset, duplicatePreset, ensureVariants, findItem,
  pruneVariants, renameItemVersion, renamePreset, setItemChoice, setSectionHidden, setVersionField,
} from '../src/lib/variants-edit.ts';
import { resolveResume } from '../src/lib/variants.ts';
import type { Resume } from '../src/types.ts';

function resume(): Resume {
  return {
    title: 'Fixture',
    profile: { name: 'Ada Example', email: '', phone: '', website: '', city: '', birthday: '', status: '', headline: '', avatar: '' },
    sections: [
      { id: 'work', type: 'work', label: 'Experience', visible: true, items: [
        { id: 'job-1', org: 'Acme', role: 'Senior engineer', body: '<p>Long description</p>' },
        { id: 'job-2', org: 'Globex', role: 'Engineer', body: '<p>Older job</p>' },
      ] },
      { id: 'awards', type: 'awards', label: 'Awards', visible: true, items: [{ id: 'award-1', title: 'Best team' }] },
    ],
  };
}

test('variants are created once, with the default source language', () => {
  const doc = resume();
  const first = ensureVariants(doc);
  assert.deepEqual(first, { v: 1, sourceLocale: 'en', presets: [], translations: {} });
  assert.equal(ensureVariants(doc), first);
});

test('presets can be created, renamed, duplicated and deleted', () => {
  const doc = resume();
  assert.equal(createPreset(doc, '   '), undefined);
  assert.equal(doc.variants, undefined, 'a rejected name must not create variants');
  const preset = createPreset(doc, '  Backend  ', 'p1')!;
  assert.equal(preset.name, 'Backend');
  assert.deepEqual(doc.variants!.presets, [{ id: 'p1', name: 'Backend', items: {} }]);

  renamePreset(doc, 'p1', 'Platform');
  renamePreset(doc, 'p1', '  ');
  renamePreset(doc, 'unknown', 'Nope');
  assert.equal(doc.variants!.presets[0].name, 'Platform');

  setItemChoice(doc, 'p1', 'job-2', 'hidden');
  const copy = duplicatePreset(doc, 'p1', 'Platform (short)', 'p2')!;
  assert.deepEqual(copy.items, { 'job-2': { hidden: true } });
  // The copy is independent from the original.
  setItemChoice(doc, 'p2', 'job-2', 'default');
  assert.deepEqual(doc.variants!.presets[0].items, { 'job-2': { hidden: true } });
  assert.equal(duplicatePreset(doc, 'unknown', 'X'), undefined);
  assert.equal(duplicatePreset(doc, 'p1', ''), undefined);

  deletePreset(doc, 'p1');
  assert.deepEqual(doc.variants!.presets.map(candidate => candidate.id), ['p2']);
  assert.doesNotThrow(() => deletePreset(resume(), 'anything'));
});

test('a preset can hide an item, pick a version or go back to the default', () => {
  const doc = resume();
  createPreset(doc, 'P', 'p1');
  addItemVersion(doc, 'job-1', 'Short', 'short');
  setItemChoice(doc, 'p1', 'job-1', { version: 'short' });
  setItemChoice(doc, 'p1', 'job-2', 'hidden');
  assert.deepEqual(doc.variants!.presets[0].items, { 'job-1': { version: 'short' }, 'job-2': { hidden: true } });
  setItemChoice(doc, 'p1', 'job-2', 'default');
  assert.deepEqual(doc.variants!.presets[0].items, { 'job-1': { version: 'short' } });
  setItemChoice(doc, 'unknown', 'job-1', 'hidden');
  setItemChoice(doc, 'p1', '__proto__', 'hidden');
  assert.deepEqual(doc.variants!.presets[0].items, { 'job-1': { version: 'short' } });
  assert.equal(({} as { hidden?: boolean }).hidden, undefined);
});

test('a preset can hide a whole section and the empty map is removed when it is shown again', () => {
  const doc = resume();
  createPreset(doc, 'P', 'p1');
  setSectionHidden(doc, 'p1', 'awards', true);
  assert.deepEqual(doc.variants!.presets[0].sections, { awards: { hidden: true } });
  setSectionHidden(doc, 'p1', 'awards', false);
  assert.equal('sections' in doc.variants!.presets[0], false);
  setSectionHidden(doc, 'p1', 'awards', false);
  setSectionHidden(doc, 'unknown', 'awards', true);
  assert.equal('sections' in doc.variants!.presets[0], false);
});

test('item versions are added, renamed and edited field by field', () => {
  const doc = resume();
  assert.equal(addItemVersion(doc, 'missing', 'Short'), undefined);
  assert.equal(addItemVersion(doc, 'job-1', '  '), undefined);
  const version = addItemVersion(doc, 'job-1', ' Infrastructure focus ', 'infra')!;
  assert.deepEqual(version, { id: 'infra', name: 'Infrastructure focus', content: {} });
  assert.equal(findItem(doc, 'job-1')!.versions!.length, 1);

  renameItemVersion(doc, 'job-1', 'infra', 'Platform focus');
  renameItemVersion(doc, 'job-1', 'infra', '');
  assert.equal(findItem(doc, 'job-1')!.versions![0].name, 'Platform focus');

  setVersionField(doc, 'job-1', 'infra', 'body', '<p>Cut cloud costs</p>');
  setVersionField(doc, 'job-1', 'infra', 'role', '');
  assert.deepEqual(findItem(doc, 'job-1')!.versions![0].content, { body: '<p>Cut cloud costs</p>', role: '' });
  setVersionField(doc, 'job-1', 'infra', 'role', undefined);
  assert.deepEqual(findItem(doc, 'job-1')!.versions![0].content, { body: '<p>Cut cloud costs</p>' });
  assert.doesNotThrow(() => setVersionField(doc, 'job-1', 'unknown', 'body', 'x'));
});

test('deleting a version also removes the preset choices and translations that used it', () => {
  const doc = resume();
  createPreset(doc, 'P', 'p1');
  addItemVersion(doc, 'job-1', 'Short', 'short');
  addItemVersion(doc, 'job-1', 'Long', 'long');
  setItemChoice(doc, 'p1', 'job-1', { version: 'short' });
  doc.variants!.translations.fr = { items: { 'job-1': { versions: { short: { body: 'court' }, long: { body: 'long' } } } } };

  deleteItemVersion(doc, 'job-1', 'short');
  assert.deepEqual(findItem(doc, 'job-1')!.versions!.map(version => version.id), ['long']);
  assert.deepEqual(doc.variants!.presets[0].items, {});
  assert.deepEqual(doc.variants!.translations.fr.items!['job-1'].versions, { long: { body: 'long' } });
  deleteItemVersion(doc, 'job-1', 'long');
  assert.equal('versions' in findItem(doc, 'job-1')!, false, 'the empty list is dropped');
});

test('pruning removes references to deleted items, sections and versions', () => {
  const doc = resume();
  createPreset(doc, 'P', 'p1');
  addItemVersion(doc, 'job-1', 'Short', 'short');
  setItemChoice(doc, 'p1', 'job-1', { version: 'short' });
  setItemChoice(doc, 'p1', 'job-2', 'hidden');
  setItemChoice(doc, 'p1', 'award-1', 'hidden');
  setSectionHidden(doc, 'p1', 'awards', true);
  doc.variants!.translations.fr = {
    sections: { work: { label: 'Expérience' }, awards: { label: 'Distinctions' } },
    items: { 'job-2': { base: { role: 'Ingénieur' } }, 'award-1': { same: true }, 'job-1': { versions: { short: { body: 'court' }, gone: { body: 'x' } } } },
  };

  // Delete job-2, the awards section (and its item) and nothing else.
  doc.sections[0].items = doc.sections[0].items.filter(item => item.id !== 'job-2');
  doc.sections = doc.sections.filter(section => section.id !== 'awards');
  pruneVariants(doc);

  assert.deepEqual(doc.variants!.presets[0].items, { 'job-1': { version: 'short' } });
  assert.equal('sections' in doc.variants!.presets[0], false);
  assert.deepEqual(Object.keys(doc.variants!.translations.fr.sections!), ['work']);
  assert.deepEqual(Object.keys(doc.variants!.translations.fr.items!), ['job-1']);
  assert.deepEqual(doc.variants!.translations.fr.items!['job-1'].versions, { short: { body: 'court' } });
  assert.doesNotThrow(() => pruneVariants(resume()));
});

test('an edited resume stays valid and resolves as the user configured it', () => {
  const doc = resume();
  createPreset(doc, 'Platform roles', 'p1');
  addItemVersion(doc, 'job-1', 'Short', 'short');
  setVersionField(doc, 'job-1', 'short', 'body', '<p>Short description</p>');
  setItemChoice(doc, 'p1', 'job-1', { version: 'short' });
  setItemChoice(doc, 'p1', 'job-2', 'hidden');
  setSectionHidden(doc, 'p1', 'awards', true);
  assert.ok(isResume(doc));

  const { resume: rendered } = resolveResume(doc, { presetId: 'p1' });
  assert.deepEqual(rendered.sections[0].items.map(item => [item.id, item.body]), [['job-1', '<p>Short description</p>']]);
  assert.equal(rendered.sections[1].visible, false);
  // Without the preset the full content is back.
  assert.equal(resolveResume(doc).resume.sections[0].items.length, 2);
  assert.equal(resolveResume(doc).resume.sections[0].items[0].body, '<p>Long description</p>');
});
