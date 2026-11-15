import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_SETTINGS } from '../src/data.ts';
import { fingerprint } from '../src/lib/fingerprint.ts';
import { createBackup, readBackup } from '../src/lib/resume-transfer.ts';
import {
  markTranslationCurrent, setItemSame, setItemTranslation, setProfileTranslation, setSectionLabelTranslation,
} from '../src/lib/translation-edit.ts';
import { buildTranslationRows } from '../src/lib/translation-rows.ts';
import { isResume, isVariants } from '../src/lib/validation.ts';
import { addItemVersion, deleteItemVersion, pruneVariants, setVersionField } from '../src/lib/variants-edit.ts';
import type { Resume } from '../src/types.ts';

function resume(): Resume {
  return {
    title: 'Fixture',
    profile: { name: 'Ada Example', email: '', phone: '', website: '', city: '', birthday: '', status: '', headline: 'Backend engineer', avatar: '' },
    sections: [{ id: 'work', type: 'work', label: 'Experience', visible: true, items: [
      { id: 'job-1', org: 'Acme', role: 'Senior engineer', body: '<p>Built the billing platform</p>' },
    ] }],
  };
}
const row = (doc: Resume, key: string) => buildTranslationRows(doc, 'fr').find(candidate => candidate.key === key)!;
const stale = (doc: Resume) => buildTranslationRows(doc, 'fr').filter(candidate => candidate.stale).map(candidate => candidate.key).sort();

test('the fingerprint is stable, ignores surrounding whitespace and tells texts apart', () => {
  assert.equal(fingerprint('Senior engineer'), fingerprint('Senior engineer'));
  assert.equal(fingerprint('  Senior engineer \n'), fingerprint('Senior engineer'));
  assert.notEqual(fingerprint('Senior engineer'), fingerprint('Senior engineers'));
  assert.notEqual(fingerprint('é'), fingerprint('e'));
  assert.match(fingerprint(''), /^[0-9a-f]{8}$/);
});

test('a translation becomes stale when its source changes, and current again once vouched for', () => {
  const doc = resume();
  setItemTranslation(doc, 'fr', 'job-1', null, 'role', 'Ingénieur senior', 'Senior engineer');
  setItemTranslation(doc, 'fr', 'job-1', null, 'body', '<p>Plateforme de facturation</p>', '<p>Built the billing platform</p>');
  assert.deepEqual(stale(doc), []);

  doc.sections[0].items[0].role = 'Staff engineer';
  assert.deepEqual(stale(doc), ['item:job-1:role']);
  assert.equal(row(doc, 'item:job-1:role').missing, false, 'a stale translation is not a missing one');
  assert.equal(row(doc, 'item:job-1:role').translated, 'Ingénieur senior', 'the translation itself is kept');

  const target = row(doc, 'item:job-1:role');
  markTranslationCurrent(doc, 'fr', target, target.source);
  assert.deepEqual(stale(doc), []);
  // Whitespace-only edits of the source do not make a translation stale.
  doc.sections[0].items[0].role = '  Staff engineer ';
  assert.deepEqual(stale(doc), []);
});

test('translations written before fingerprints existed are never reported as stale', () => {
  const doc = resume();
  setItemTranslation(doc, 'fr', 'job-1', null, 'role', 'Ingénieur senior');
  doc.sections[0].items[0].role = 'Something else entirely';
  assert.deepEqual(stale(doc), []);
  assert.equal(doc.variants!.translations.fr.items!['job-1'].sources, undefined);
});

test('editing a translation without a source keeps its fingerprint, and clearing it drops the fingerprint', () => {
  const doc = resume();
  setItemTranslation(doc, 'fr', 'job-1', null, 'role', 'Ingénieur senior', 'Senior engineer');
  const before = doc.variants!.translations.fr.items!['job-1'].sources;
  setItemTranslation(doc, 'fr', 'job-1', null, 'role', 'Ingénieur principal');
  assert.deepEqual(doc.variants!.translations.fr.items!['job-1'].sources, before);
  setItemTranslation(doc, 'fr', 'job-1', null, 'role', '');
  assert.equal(doc.variants!.translations.fr.items, undefined, 'nothing is left behind');
});

test('profile texts, section titles and version wordings are tracked too', () => {
  const doc = resume();
  addItemVersion(doc, 'job-1', 'Short', 'short');
  setVersionField(doc, 'job-1', 'short', 'body', '<p>Short billing</p>');
  setProfileTranslation(doc, 'fr', 'headline', 'Ingénieur backend', 'Backend engineer');
  setSectionLabelTranslation(doc, 'fr', 'work', 'Expérience', 'Experience');
  setItemTranslation(doc, 'fr', 'job-1', 'short', 'body', '<p>Facturation</p>', '<p>Short billing</p>');
  assert.deepEqual(stale(doc), []);

  doc.profile.headline = 'Platform engineer';
  doc.sections[0].label = 'Work experience';
  doc.sections[0].items[0].versions![0].content.body = '<p>Short billing platform</p>';
  assert.deepEqual(stale(doc), ['item:job-1:short:body', 'profile:headline', 'section:work:label']);

  for (const key of ['item:job-1:short:body', 'profile:headline', 'section:work:label']) {
    const target = row(doc, key);
    markTranslationCurrent(doc, 'fr', target, target.source);
  }
  assert.deepEqual(stale(doc), []);
  assert.ok(isResume(doc));
});

test('vouching for a text that has no translation does nothing', () => {
  const doc = resume();
  markTranslationCurrent(doc, 'fr', { scope: 'item', itemId: 'job-1', field: 'role' }, 'Senior engineer');
  markTranslationCurrent(doc, 'fr', { scope: 'profile', field: 'headline' }, 'Backend engineer');
  assert.equal(doc.variants, undefined);
  setItemSame(doc, 'fr', 'job-1', true);
  markTranslationCurrent(doc, 'fr', { scope: 'item', itemId: 'job-1', field: 'role' }, 'Senior engineer');
  assert.deepEqual(doc.variants!.translations.fr.items!['job-1'], { same: true });
});

test('deleting a version or an item removes its fingerprints with it', () => {
  const doc = resume();
  addItemVersion(doc, 'job-1', 'Short', 'short');
  setVersionField(doc, 'job-1', 'short', 'body', '<p>Short</p>');
  setItemTranslation(doc, 'fr', 'job-1', 'short', 'body', '<p>Court</p>', '<p>Short</p>');
  setItemTranslation(doc, 'fr', 'job-1', null, 'role', 'Ingénieur', 'Senior engineer');
  deleteItemVersion(doc, 'job-1', 'short');
  assert.deepEqual(Object.keys(doc.variants!.translations.fr.items!['job-1'].sources!), ['base']);
  assert.equal(doc.variants!.translations.fr.items!['job-1'].sources!.versions, undefined);

  doc.sections[0].items = [];
  pruneVariants(doc);
  assert.equal(doc.variants!.translations.fr.items, undefined);
});

test('validation accepts fingerprints and rejects malformed ones', () => {
  const doc = resume();
  setProfileTranslation(doc, 'fr', 'headline', 'Ingénieur', 'Backend engineer');
  setSectionLabelTranslation(doc, 'fr', 'work', 'Expérience', 'Experience');
  setItemTranslation(doc, 'fr', 'job-1', null, 'role', 'Ingénieur', 'Senior engineer');
  assert.ok(isVariants(doc.variants));
  const broken = (mutate: (value: Resume) => void) => { const copy = structuredClone(doc); mutate(copy); return isVariants(copy.variants); };
  assert.equal(broken(value => { (value.variants!.translations.fr.profileSources as Record<string, unknown>).headline = 5; }), false);
  assert.equal(broken(value => { value.variants!.translations.fr.items!['job-1'].sources!.base!.role = 'x'.repeat(65); }), false);
  assert.equal(broken(value => { (value.variants!.translations.fr.items!['job-1'].sources as { versions: unknown }).versions = { v: 'not a map' }; }), false);
  assert.equal(broken(value => { (value.variants!.translations.fr.sections!.work as { source: unknown }).source = 3; }), false);
});

test('an import keeps fingerprints, so outdated translations stay flagged after a restore', () => {
  const doc = resume();
  setProfileTranslation(doc, 'fr', 'headline', 'Ingénieur backend', 'Backend engineer');
  setItemTranslation(doc, 'fr', 'job-1', null, 'role', 'Ingénieur senior', 'Senior engineer');
  doc.sections[0].items[0].role = 'Staff engineer';
  const [restored] = readBackup(createBackup([{ resume: doc, settings: { ...DEFAULT_SETTINGS } }]));
  assert.deepEqual(buildTranslationRows(restored.resume, 'fr').filter(candidate => candidate.stale).map(candidate => candidate.field), ['role']);
  assert.equal(buildTranslationRows(restored.resume, 'fr').find(candidate => candidate.key === 'profile:headline')!.stale, false);
});
