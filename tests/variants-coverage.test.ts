import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_SETTINGS } from '../src/data.ts';
import { parseBackup } from '../src/lib/backup.ts';
import { translate } from '../src/lib/i18n.ts';
import { createBackup, readBackup, TransferError } from '../src/lib/resume-transfer.ts';
import { buildShareDocument } from '../src/lib/share.ts';
import { compareVersionDocuments } from '../src/lib/version-diff.ts';
import { resolveResume } from '../src/lib/variants.ts';
import type { EditorDocument, Resume } from '../src/types.ts';

// A resume whose presets, versions and translations all refer to ids that an import will replace.
function resume(): Resume {
  return {
    title: 'Fixture',
    profile: { name: 'Ada Example', email: 'ada@example.com', phone: '', website: '', city: 'London', birthday: '', status: '', headline: 'Backend engineer', avatar: '' },
    sections: [
      { id: 'work', type: 'work', label: 'Experience', visible: true, items: [
        { id: 'job-1', org: 'Acme', role: 'Senior engineer', body: '<p>Long text</p>', versions: [{ id: 'short', name: 'Short', content: { body: '<p>Short text</p>' } }] },
        { id: 'job-2', org: 'Globex', role: 'Engineer', body: '<p>SECRET_HIDDEN_JOB</p>' },
      ] },
      { id: 'awards', type: 'awards', label: 'Awards', visible: true, items: [{ id: 'award-1', title: 'Best team' }] },
    ],
    variants: {
      v: 1, sourceLocale: 'en',
      presets: [{ id: 'p-short', name: 'Short', items: { 'job-1': { version: 'short' }, 'job-2': { hidden: true } }, sections: { awards: { hidden: true } } }],
      translations: { fr: {
        profile: { headline: 'Ingénieur backend' },
        sections: { work: { label: 'Expérience' } },
        items: { 'job-1': { base: { role: 'Ingénieur senior' }, versions: { short: { body: '<p>Texte court</p>' } } } },
      } },
    },
  };
}
const document = (value: Resume = resume()): EditorDocument => ({ resume: value, settings: { ...DEFAULT_SETTINGS } });
/** Drops generated ids so two resolved resumes can be compared by content. */
const withoutIds = (value: unknown): unknown => JSON.parse(JSON.stringify(value, (key, entry) => key === 'id' ? undefined : entry));

test('a workspace backup keeps presets, versions and translations although ids are regenerated', () => {
  const [restored] = readBackup(createBackup([document()]));
  const original = document().resume;
  assert.notEqual(restored.resume.sections[0].id, original.sections[0].id, 'an import always gets fresh ids');
  assert.ok(restored.resume.variants, 'variants were dropped by the import');
  const presetId = restored.resume.variants!.presets[0].id;
  assert.equal(presetId, 'p-short', 'preset ids are not tied to resume content and are kept');
  for (const locale of [undefined, 'fr']) {
    assert.deepEqual(
      withoutIds(resolveResume(restored.resume, { presetId, locale }).resume),
      withoutIds(resolveResume(original, { presetId, locale }).resume),
      `rendering differs for locale ${locale ?? 'source'}`,
    );
  }
  assert.deepEqual(resolveResume(restored.resume, { presetId, locale: 'fr' }).missing.map(entry => entry.field), resolveResume(original, { presetId, locale: 'fr' }).missing.map(entry => entry.field));
});

test('an import drops references to items that are not in the backup and keeps the document valid', () => {
  const value = resume();
  value.variants!.presets[0].items['ghost-item'] = { hidden: true };
  value.variants!.presets[0].sections!['ghost-section'] = { hidden: true };
  value.variants!.translations.fr.items!['ghost-item'] = { same: true };
  const [restored] = readBackup(createBackup([document(value)]));
  const variants = restored.resume.variants!;
  assert.equal(Object.keys(variants.presets[0].items).length, 2);
  assert.equal(Object.keys(variants.presets[0].sections!).length, 1);
  assert.equal(Object.keys(variants.translations.fr.items!).length, 1);
});

test('an import rejects malformed variants and versions', () => {
  const broken = (mutate: (value: Resume) => void) => { const value = resume(); mutate(value); return createBackup([document(value)]); };
  assert.throws(() => readBackup(broken(value => { value.variants!.sourceLocale = 'not a locale'; })), TransferError);
  assert.throws(() => readBackup(broken(value => { (value.sections[0].items[0].versions![0].content as { body: unknown }).body = 12; })), TransferError);
  assert.throws(() => readBackup(broken(value => { value.variants!.presets.push({ ...value.variants!.presets[0] }); })), TransferError);
  // Older backups without any variants still import.
  const plain = resume();
  delete plain.variants;
  assert.equal(readBackup(createBackup([document(plain)]))[0].resume.variants, undefined);
});

test('a single-resume JSON backup keeps the full resume with its variants', () => {
  const original = resume();
  assert.deepEqual(parseBackup(JSON.stringify({ version: 1, resume: original, settings: DEFAULT_SETTINGS })).resume, original);
});

test('a share link built from the resolved resume leaks no hidden item, version or translation', () => {
  const { resume: resolved } = resolveResume(resume(), { presetId: 'p-short' });
  const shared = JSON.stringify(buildShareDocument(resolved, DEFAULT_SETTINGS));
  assert.ok(!shared.includes('SECRET_HIDDEN_JOB'), 'an item hidden by the preset was shared');
  assert.ok(!shared.includes('Long text'), 'the default wording was shared instead of the preset version');
  assert.ok(shared.includes('Short text'));
  for (const leak of ['variants', 'versions', 'translations', 'Texte court', 'Best team']) assert.ok(!shared.includes(leak), `leaked ${leak}`);
});

test('the version comparison notices changes to presets and translations', () => {
  const current = document();
  assert.equal(compareVersionDocuments(current, document()).variantsChanged, false);
  const withNewPreset = document();
  withNewPreset.resume.variants!.presets.push({ id: 'p2', name: 'Other', items: {} });
  assert.equal(compareVersionDocuments(withNewPreset, current).variantsChanged, true);
  const translated = document();
  translated.resume.variants!.translations.fr.profile = { headline: 'Autre' };
  assert.equal(compareVersionDocuments(translated, current).variantsChanged, true);
  // A resume that never had variants compares as unchanged against itself.
  const plain = document();
  delete plain.resume.variants;
  assert.equal(compareVersionDocuments(plain, plain).variantsChanged, false);
  assert.equal(compareVersionDocuments(current, plain).variantsChanged, true);
  // A reworded item version shows up as a changed section.
  const reworded = document();
  reworded.resume.sections[0].items[0].versions![0].content.body = '<p>Different</p>';
  assert.deepEqual(compareVersionDocuments(reworded, current).changedSections, ['Experience']);
});

test('the "Present" label exists in every language that has a translated interface', () => {
  assert.equal(translate('en', 'Present'), 'Present');
  for (const lang of ['zh', 'zh-TW', 'fr', 'ja', 'ko', 'ru']) assert.notEqual(translate(lang, 'Present'), 'Present', lang);
  assert.equal(translate('fr', 'Present'), "Aujourd'hui");
});
