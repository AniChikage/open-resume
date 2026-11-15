import assert from 'node:assert/strict';
import test from 'node:test';
import { exportWarnings } from '../src/lib/export-warnings.ts';

test('nothing is flagged for a fully translated resume in a language the PDF fonts can draw', () => {
  assert.deepEqual(exportWarnings('pdf', 'fr', 'en', 0), { untranslated: 0, noFont: false });
  assert.deepEqual(exportWarnings('pdf', null, 'en', 0), { untranslated: 0, noFont: false });
  assert.deepEqual(exportWarnings('docx', 'ja', 'en', 0), { untranslated: 0, noFont: false });
});

test('untranslated texts are reported only when a translation is shown, and never for the JSON backup', () => {
  assert.equal(exportWarnings('pdf', 'fr', 'en', 4).untranslated, 4);
  assert.equal(exportWarnings('docx', 'fr', 'en', 4).untranslated, 4);
  assert.equal(exportWarnings('png', 'fr', 'en', 4).untranslated, 4);
  assert.equal(exportWarnings('json', 'fr', 'en', 4).untranslated, 0);
  assert.equal(exportWarnings('pdf', null, 'en', 4).untranslated, 0, 'the source language has nothing to translate');
});

test('PDF and PNG warn about alphabets the fonts cannot draw, in the shown language or the source one', () => {
  for (const type of ['pdf', 'png']) {
    assert.equal(exportWarnings(type, 'ar', 'en', 0).noFont, true, `${type} into Arabic`);
    assert.equal(exportWarnings(type, null, 'hi', 0).noFont, true, `${type} of a Hindi resume`);
    assert.equal(exportWarnings(type, 'fr', 'ar', 0).noFont, false, 'the shown translation is what is drawn, not the source');
  }
  assert.equal(exportWarnings('docx', 'ar', 'en', 0).noFont, false, 'Word supplies its own fonts');
  assert.equal(exportWarnings('json', 'ar', 'en', 0).noFont, false);
});

test('both warnings can apply at once', () => {
  assert.deepEqual(exportWarnings('pdf', 'th', 'en', 7), { untranslated: 7, noFont: true });
});
