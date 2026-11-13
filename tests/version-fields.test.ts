import assert from 'node:assert/strict';
import test from 'node:test';
import { SECTION_TEMPLATES } from '../src/data.ts';
import { isItemText } from '../src/lib/validation.ts';
import { toDisplayValue, toStoredValue, versionFieldSpecs } from '../src/lib/version-fields.ts';
import { ITEM_TEXT_FIELDS } from '../src/lib/variants.ts';

test('every section kind offers fields a version can reword, all of them valid item text', () => {
  const kinds = new Set(Object.values(SECTION_TEMPLATES).map(template => template.kind));
  assert.ok(kinds.size >= 4, 'the editor has several section kinds');
  for (const kind of [...kinds, 'a-kind-that-does-not-exist']) {
    const specs = versionFieldSpecs(kind);
    assert.ok(specs.length > 0, kind);
    const fields = specs.map(spec => spec.field);
    assert.equal(new Set(fields).size, fields.length, `${kind} lists a field twice`);
    for (const field of fields) assert.ok(ITEM_TEXT_FIELDS.includes(field), `${kind}: ${field} is not an overridable field`);
  }
});

test('language-neutral fields can never be reworded by a version', () => {
  for (const kind of ['text', 'education', 'simpleList', 'chips', 'experience']) {
    for (const { field } of versionFieldSpecs(kind)) {
      assert.ok(!['startDate', 'endDate', 'current', 'id'].includes(field));
    }
  }
});

test('typed text converts to stored values and back', () => {
  assert.equal(toStoredValue('line', ' A title '), ' A title ');
  assert.equal(toStoredValue('rich', '<p>Hello</p>'), '<p>Hello</p>');
  assert.deepEqual(toStoredValue('lines', 'SQL\n  Figma  \n\n\nGo'), ['SQL', 'Figma', 'Go']);
  assert.deepEqual(toStoredValue('lines', ''), []);
  assert.equal(toDisplayValue(['SQL', 'Figma']), 'SQL\nFigma');
  assert.equal(toDisplayValue('text'), 'text');
  assert.equal(toDisplayValue(undefined), '');
  // A stored list survives an edit round trip without gaining blank entries.
  assert.deepEqual(toStoredValue('lines', toDisplayValue(['SQL', 'Figma'])), ['SQL', 'Figma']);
  assert.ok(isItemText({ values: toStoredValue('lines', 'a\nb'), body: toStoredValue('rich', '<p>x</p>') }));
});
