import assert from 'node:assert/strict';
import test from 'node:test';
import { buildResumeFromTemplate,DEFAULT_SETTINGS,RESUME_TEMPLATES } from '../src/data.ts';
import { buildShareDocument,parseShareData } from '../src/lib/share.ts';
import { parseBackup } from '../src/lib/backup.ts';
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

test('sharing removes hidden sections and unselected personal data from the encoded document', () => {
  const resume = buildResumeFromTemplate(RESUME_TEMPLATES[0], 'en');
  resume.sections.push({ id: crypto.randomUUID(), type: 'custom', label: 'Private', visible: false, items: [{ id: crypto.randomUUID(), body: 'PRIVATE_CONTENT' }] });
  resume.profile.avatar = 'data:image/png;base64,PRIVATE_PHOTO';
  const original = structuredClone(resume);
  const document = buildShareDocument(resume, DEFAULT_SETTINGS, { includeContact: false });
  assert.ok(isEditorDocument(document));
  assert.equal(JSON.stringify(document).includes('PRIVATE_'), false);
  for (const key of ['phone', 'email', 'website', 'city', 'birthday', 'status', 'avatar'] as const) assert.equal(document.resume.profile[key], '');
  assert.equal(document.resume.profile.name, resume.profile.name);
  assert.deepEqual(resume, original);
});

test('JSON restoration accepts old and versioned backups and rejects invalid, unsupported and oversized files', () => {
  const document = { resume: buildResumeFromTemplate(RESUME_TEMPLATES[0]), settings: DEFAULT_SETTINGS };
  assert.deepEqual(parseBackup(JSON.stringify(document)), document);
  assert.deepEqual(parseBackup('\uFEFF' + JSON.stringify({ version: 1, ...document })), document);
  assert.throws(() => parseBackup('{'), /INVALID_BACKUP/);
  assert.throws(() => parseBackup(JSON.stringify({ ...document, resume: {} })), /INVALID_BACKUP/);
  assert.throws(() => parseBackup(JSON.stringify({ ...document, settings: { ...DEFAULT_SETTINGS, fontSize: -1 } })), /INVALID_BACKUP/);
  assert.throws(() => parseBackup(JSON.stringify({ ...document, version: 2 })), /UNSUPPORTED_BACKUP/);
  assert.throws(() => parseBackup('x'.repeat(10 * 1024 * 1024 + 1)), /BACKUP_TOO_LARGE/);
});
