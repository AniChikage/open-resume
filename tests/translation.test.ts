import assert from 'node:assert/strict';
import test from 'node:test';
import { isResume } from '../src/lib/validation.ts';
import {
  addTranslationLocale, removeTranslationLocale, setItemSame, setItemTranslation, setProfileTranslation,
  setSectionLabelTranslation, setSourceLocale,
} from '../src/lib/translation-edit.ts';
import { buildTranslationRows, isItemMarkedSame } from '../src/lib/translation-rows.ts';
import { resolveResume } from '../src/lib/variants.ts';
import { addItemVersion, setVersionField } from '../src/lib/variants-edit.ts';
import type { Resume } from '../src/types.ts';

function resume(): Resume {
  return {
    title: 'Fixture',
    profile: { name: 'Ada Example', email: 'ada@example.com', phone: '', website: '', city: 'London', birthday: '', status: '', headline: 'Backend engineer', avatar: '' },
    sections: [
      { id: 'work', type: 'work', label: 'Experience', visible: true, items: [
        { id: 'job-1', org: 'Acme', role: 'Senior engineer', startDate: '2020-01', current: true, body: '<p>Built the billing platform</p>' },
        { id: 'job-2', org: 'Globex', role: 'Engineer', period: '2017 - 2020', body: '<p>Maintained the API</p>' },
      ] },
      { id: 'skills', type: 'skills', label: 'Skills', visible: true, items: [{ id: 'skill-1', title: 'Core', values: ['SQL', 'Go'] }] },
      { id: 'private', type: 'custom', label: 'Private', visible: false, items: [{ id: 'p-1', body: 'hidden' }] },
    ],
  };
}

test('translations can be started, filled and cleared without leaving empty containers', () => {
  const doc = resume();
  setSourceLocale(doc, 'en');
  addTranslationLocale(doc, 'en');
  assert.deepEqual(doc.variants!.translations, {}, 'the source language is not a translation');
  addTranslationLocale(doc, 'fr');
  assert.deepEqual(doc.variants!.translations, { fr: {} });

  setProfileTranslation(doc, 'fr', 'headline', 'Ingénieur backend');
  setSectionLabelTranslation(doc, 'fr', 'work', 'Expérience');
  setItemTranslation(doc, 'fr', 'job-1', null, 'role', 'Ingénieur senior');
  setItemTranslation(doc, 'fr', 'skill-1', null, 'values', ['SQL', 'Go']);
  assert.deepEqual(doc.variants!.translations.fr, {
    profile: { headline: 'Ingénieur backend' },
    sections: { work: { label: 'Expérience' } },
    items: { 'job-1': { base: { role: 'Ingénieur senior' } }, 'skill-1': { base: { values: ['SQL', 'Go'] } } },
  });

  setProfileTranslation(doc, 'fr', 'headline', '  ');
  setSectionLabelTranslation(doc, 'fr', 'work', '');
  setItemTranslation(doc, 'fr', 'job-1', null, 'role', '');
  setItemTranslation(doc, 'fr', 'skill-1', null, 'values', []);
  assert.deepEqual(doc.variants!.translations.fr, {});
  assert.ok(isResume(doc));

  removeTranslationLocale(doc, 'fr');
  assert.deepEqual(doc.variants!.translations, {});
});

test('invalid locales, unknown sections and unsafe keys are ignored', () => {
  const doc = resume();
  setSourceLocale(doc, 'not a locale');
  assert.equal(doc.variants, undefined);
  setProfileTranslation(doc, '__proto__', 'city', 'x');
  setProfileTranslation(doc, 'not a locale', 'city', 'x');
  addTranslationLocale(doc, 'fr');
  setSectionLabelTranslation(doc, 'fr', 'missing-section', 'x');
  setItemTranslation(doc, 'fr', '__proto__', null, 'role', 'x');
  setItemTranslation(doc, 'fr', 'job-1', '__proto__', 'role', 'x');
  setItemSame(doc, 'fr', '__proto__', true);
  assert.deepEqual(doc.variants!.translations, { fr: {} });
  assert.equal(({} as { label?: string }).label, undefined);
});

test('version text is translated under its version and cleaned up with it', () => {
  const doc = resume();
  addItemVersion(doc, 'job-1', 'Short', 'short');
  setItemTranslation(doc, 'fr', 'job-1', 'short', 'body', '<p>Court</p>');
  assert.deepEqual(doc.variants!.translations.fr.items!['job-1'], { versions: { short: { body: '<p>Court</p>' } } });
  setItemTranslation(doc, 'fr', 'job-1', 'short', 'body', '');
  assert.equal(doc.variants!.translations.fr.items, undefined);
});

test('an item can be marked as needing no translation', () => {
  const doc = resume();
  assert.equal(isItemMarkedSame(doc, 'fr', 'skill-1'), false);
  setItemSame(doc, 'fr', 'skill-1', true);
  assert.equal(isItemMarkedSame(doc, 'fr', 'skill-1'), true);
  assert.equal(buildTranslationRows(doc, 'fr').filter(row => row.itemId === 'skill-1').every(row => !row.missing), true);
  setItemSame(doc, 'fr', 'skill-1', false);
  assert.equal(doc.variants!.translations.fr.items, undefined);
});

test('translation rows list every written text next to its source, hidden sections excluded', () => {
  const rows = buildTranslationRows(resume(), 'fr');
  const keys = rows.map(row => row.key);
  assert.ok(keys.includes('profile:headline'));
  assert.ok(keys.includes('profile:city'));
  assert.ok(!keys.includes('profile:status'), 'blank source fields have no row');
  assert.ok(keys.includes('section:work:label'));
  assert.ok(keys.includes('item:job-1:role'));
  assert.ok(keys.includes('item:job-2:period'), 'free-text period is listed when there are no structured dates');
  assert.ok(!keys.includes('item:job-1:period'));
  assert.ok(!keys.some(key => key.includes('p-1') || key.includes('section:private')));
  assert.equal(new Set(keys).size, keys.length);
  const role = rows.find(row => row.key === 'item:job-1:role')!;
  assert.deepEqual([role.source, role.translated, role.missing, role.input], ['Senior engineer', '', true, 'line']);
  assert.equal(rows.find(row => row.key === 'item:skill-1:values')!.input, 'lines');
});

test('the rows and resolveResume agree on what is still untranslated', () => {
  const doc = resume();
  addItemVersion(doc, 'job-1', 'Short', 'short');
  setVersionField(doc, 'job-1', 'short', 'body', '<p>Short billing</p>');
  setProfileTranslation(doc, 'fr', 'headline', 'Ingénieur backend');
  setItemTranslation(doc, 'fr', 'job-2', null, 'role', 'Ingénieur');
  const rowsMissing = buildTranslationRows(doc, 'fr').filter(row => row.missing && !row.versionId);
  const resolved = resolveResume(doc, { locale: 'fr' }).missing;
  const rowKeys = rowsMissing.map(row => `${row.scope}:${row.itemId ?? row.sectionId ?? ''}:${row.field}`).sort();
  const resolvedKeys = resolved.map(entry => `${entry.scope}:${entry.itemId ?? entry.sectionId ?? ''}:${entry.field}`).sort();
  assert.deepEqual(rowKeys, resolvedKeys);
  assert.ok(rowKeys.length > 0);
});

test('a fully translated resume has no missing rows and resolves in that language', () => {
  const doc = resume();
  for (const row of buildTranslationRows(doc, 'fr')) {
    const value = row.input === 'lines' ? row.source.split('\n').map(line => `${line} (fr)`) : `${row.source} (fr)`;
    if (row.scope === 'profile') setProfileTranslation(doc, 'fr', row.field as 'headline' | 'city' | 'status', value as string);
    else if (row.scope === 'section') setSectionLabelTranslation(doc, 'fr', row.sectionId!, value as string);
    else setItemTranslation(doc, 'fr', row.itemId!, row.versionId ?? null, row.field as 'role', value as string);
  }
  assert.equal(buildTranslationRows(doc, 'fr').some(row => row.missing), false);
  const resolved = resolveResume(doc, { locale: 'fr' });
  assert.deepEqual(resolved.missing, []);
  assert.equal(resolved.resume.profile.headline, 'Backend engineer (fr)');
  assert.equal(resolved.resume.sections[0].items[0].role, 'Senior engineer (fr)');
  assert.deepEqual(resolved.resume.sections[1].items[0].values, ['SQL (fr)', 'Go (fr)']);
  // The source language is untouched by all of this.
  assert.equal(resolveResume(doc).resume.profile.headline, 'Backend engineer');
});
