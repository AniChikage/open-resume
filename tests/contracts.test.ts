import assert from 'node:assert/strict';
import test from 'node:test';
import { buildResumeFromTemplate,DEFAULT_SETTINGS,RESUME_TEMPLATES } from '../src/data.ts';
import { parseShareData } from '../src/lib/share.ts';
import { isEditorDocument,isResume,isResumeSettings } from '../src/lib/validation.ts';

test('every template in every locale satisfies the shared resume contract', () => {
  for (const language of ['en','zh','zh-TW','ja','ko','fr','ru']) {
    for (const template of RESUME_TEMPLATES) {
      const resume = buildResumeFromTemplate(template, language);
      assert.ok(isEditorDocument({ resume, settings: { ...DEFAULT_SETTINGS, template: template.id } }), `${template.id}/${language}`);
    }
  }
});

test('untrusted JSON cannot substitute invalid profile, section, item or setting values', () => {
  const resume = buildResumeFromTemplate(RESUME_TEMPLATES[0]);
  assert.equal(isResume({ ...resume, profile: { ...resume.profile, email: 42 } }), false);
  assert.equal(isResume({ ...resume, sections: [{ ...resume.sections[0], type: 'unknown-section' }] }), false);
  assert.equal(isResume({ ...resume, sections: [{ ...resume.sections[0], items: [{ id: 'bad', bullets: [123] }] }] }), false);
  assert.equal(isResumeSettings({ ...DEFAULT_SETTINGS, fontSize: '12' }), false);
  assert.equal(isResumeSettings({ ...DEFAULT_SETTINGS, lineHeight: Infinity }), false);
});

test('shared links round-trip valid documents and reject malformed payloads', async () => {
  const document = { resume: buildResumeFromTemplate(RESUME_TEMPLATES[0]), settings: DEFAULT_SETTINGS };
  const encoded = btoa(encodeURIComponent(JSON.stringify(document)));
  assert.deepEqual(await parseShareData(encoded), document);
  const invalid = btoa(encodeURIComponent(JSON.stringify({ resume: {}, settings: {} })));
  assert.equal(await parseShareData(invalid), null);
  assert.equal(await parseShareData('not-valid-json'), null);
});
