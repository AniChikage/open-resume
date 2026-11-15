import assert from 'node:assert/strict';
import test from 'node:test';
import { relativeTime, summarizeResume } from '../src/lib/resume-summary.ts';
import { setItemTranslation } from '../src/lib/translation-edit.ts';
import { addItemVersion, createPreset } from '../src/lib/variants-edit.ts';
import type { Resume } from '../src/types.ts';

const resume = (): Resume => ({
  title: 'Fixture',
  profile: { name: 'Ada', email: '', phone: '', website: '', city: '', birthday: '', status: '', headline: 'Engineer', avatar: '' },
  sections: [{ id: 'work', type: 'work', label: 'Experience', visible: true, items: [{ id: 'job', org: 'Acme', role: 'Engineer', body: '<p>Built things</p>' }] }],
});

test('a resume without variants has nothing extra to show', () => {
  assert.deepEqual(summarizeResume(resume()), { sourceLocale: 'en', translations: [], presets: 0, versions: 0, hasVariants: false });
});

test('presets, item versions and translations are counted, with each language\'s progress', () => {
  const doc = resume();
  createPreset(doc, 'Backend', 'p1');
  createPreset(doc, 'Lead', 'p2');
  addItemVersion(doc, 'job', 'Short', 'v1');
  setItemTranslation(doc, 'fr', 'job', null, 'role', 'Ingénieur', 'Engineer');
  setItemTranslation(doc, 'de', 'job', null, 'role', 'Ingenieur', 'Engineer');
  doc.sections[0].items[0].role = 'Staff engineer';
  const summary = summarizeResume(doc);
  assert.equal(summary.presets, 2);
  assert.equal(summary.versions, 1);
  assert.equal(summary.hasVariants, true);
  assert.deepEqual(summary.translations.map(language => language.code).sort(), ['de', 'fr']);
  const fr = summary.translations.find(language => language.code === 'fr')!;
  // The role was translated then edited (stale); the profile headline and section title are still missing.
  assert.equal(fr.stale, 1);
  assert.ok(fr.missing >= 2);
});

test('a source language other than English is reported, and is never listed as a translation', () => {
  const doc = resume();
  createPreset(doc, 'P', 'p');
  doc.variants!.sourceLocale = 'fr';
  doc.variants!.translations.fr = {};
  doc.variants!.translations.en = {};
  const summary = summarizeResume(doc);
  assert.equal(summary.sourceLocale, 'fr');
  assert.deepEqual(summary.translations.map(language => language.code), ['en']);
});

test('a fully translated language reports nothing missing', () => {
  const doc = resume();
  doc.profile.headline = '';
  doc.sections[0].label = '';
  doc.sections[0].items[0] = { id: 'job', role: 'Engineer' };
  setItemTranslation(doc, 'fr', 'job', null, 'role', 'Ingénieur', 'Engineer');
  assert.deepEqual(summarizeResume(doc).translations, [{ code: 'fr', missing: 0, stale: 0 }]);
});

test('edits are shown as relative times for the last month, then as a date', () => {
  const now = Date.UTC(2026, 10, 15, 12, 0, 0);
  const at = (offset: number) => relativeTime(now - offset, now, 'en', 'Just now');
  assert.equal(at(10_000), 'Just now');
  assert.equal(at(5 * 60_000), '5 minutes ago');
  assert.equal(at(3 * 3_600_000), '3 hours ago');
  assert.equal(at(86_400_000), 'yesterday');
  assert.equal(at(5 * 86_400_000), '5 days ago');
  assert.match(at(60 * 86_400_000), /^\d{2}\/\d{2}\/\d{4}$/);
  assert.equal(relativeTime(now - 2 * 3_600_000, now, 'fr', 'À l’instant'), 'il y a 2 heures');
  assert.equal(relativeTime(0, now, 'en', 'Just now'), '', 'never saved');
  assert.match(relativeTime(now + 5 * 60_000, now, 'en', 'Just now'), /^\d{2}\/\d{2}\/\d{4}$/, 'a clock slightly ahead does not print a future time');
});
