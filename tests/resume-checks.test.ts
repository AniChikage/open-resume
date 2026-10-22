import assert from 'node:assert/strict';
import test from 'node:test';
import { hasResumeItemContent, runChecks } from '../src/lib/ai-check.ts';
import { CHECK_MESSAGES } from '../src/lib/check-messages.ts';
import type { Resume, ResumeSection } from '../src/types.ts';

function fixture(sections: ResumeSection[] = []): Resume {
  return {
    title: 'Resume',
    profile: { name: 'Ada', email: 'ada@example.com', phone: '12345678', headline: 'Engineer', city: '', website: '', birthday: '', status: '', avatar: '' },
    sections,
  };
}

const section = (type: ResumeSection['type'], items: ResumeSection['items'], visible = true): ResumeSection => ({
  id: `${type}-section`, type, label: type, visible, items,
});
const messages = (resume: Resume) => runChecks(resume).results.map(result => result.message);

test('whitespace and rich-text placeholders do not satisfy profile or section checks', () => {
  const resume = fixture([
    section('summary', [{ id: 'summary-item', title: 'Career summary', body: '<p>&nbsp;&#x200B;&#160;<br></p>' }]),
    section('work', [{ id: 'work-item', org: ' ', body: '<div><br></div>', bullets: ['  '] }]),
    section('education', [{ id: 'school-item', school: ' ', details: ['&nbsp;'] }]),
    section('skills', [{ id: 'skill-item', title: 'Skills', values: [' ', '\u200B'] }]),
  ]);
  resume.profile.name = ' \u200B ';
  resume.profile.email = '\t';
  resume.profile.phone = ' ';
  resume.profile.headline = '\n';
  const { results } = runChecks(resume);
  assert.ok(results.some(result => result.message === 'Add your name.' && result.targetId === 'profile'));
  assert.ok(results.some(result => result.message === 'Add at least one contact method: phone or email.'));
  assert.ok(results.some(result => result.message.startsWith('Add a professional summary') && result.targetId === 'section:summary-section'));
  assert.ok(results.some(result => result.message === 'Add an experience section.' && result.targetId === 'section:work-section'));
  assert.ok(results.some(result => result.message === 'Add an education section.' && result.targetId === 'section:education-section'));
  assert.ok(results.some(result => result.message === 'summary, work, education, skills is empty. Add content or hide the section.'));
});

test('meaningful content satisfies required sections without generated item titles doing so', () => {
  const resume = fixture([
    section('summary', [{ id: 'summary', body: '<p>Software engineer building reliable products.</p>' }]),
    section('work', [{ id: 'work', org: 'Product company' }]),
    section('education', [{ id: 'school', school: 'University' }]),
  ]);
  assert.equal(runChecks(resume).score, 100);
  assert.deepEqual(runChecks(resume).results, []);
  assert.equal(hasResumeItemContent('work', { id: 'dates', startDate: '2020-01', location: 'City' }), false);
  assert.equal(hasResumeItemContent('education', { id: 'details', details: ['Relevant coursework'] }), true);
  assert.equal(hasResumeItemContent('skills', { id: 'skills', values: ['TypeScript'] }), true);
});

test('hidden content contributes no writing, empty-entry or reversed-date warnings', () => {
  const hidden = section('work', [
    { id: 'private', body: 'x'.repeat(100), startDate: '2025-01', endDate: '2024-01' },
    { id: 'private-blank', body: '' },
  ], false);
  const before = runChecks(fixture());
  const after = runChecks(fixture([hidden, section('skills', [], false)]));
  assert.deepEqual(after, before);
});

test('rich paragraphs and list items are checked individually and point to the offending item', () => {
  const resume = fixture([section('work', [{ id: 'rich', body: '<ul><li>Built 3 reliable systems for the team.</li><li>Improved 4 important workflows for users.</li></ul><p>Delivered 5 projects across departments.</p>' }])]);
  assert.ok(!messages(resume).some(message => message.includes('over 80')));
  resume.sections[0].items.push({ id: 'long', body: `<p>${'a'.repeat(81)}</p><p>${'b'.repeat(82)}</p>` });
  const long = runChecks(resume).results.find(result => result.message.includes('over 80'));
  assert.equal(long?.message.startsWith('2 descriptions'), true);
  assert.equal(long?.targetId, 'long');
});

test('empty rich text falls back to legacy bullets; hidden attributes are not measurable impact', () => {
  const resume = fixture([section('project', [{ id: 'legacy', body: '<div>&nbsp;</div>', bullets: [
    '<b data-number="12">The team delivered useful outcomes.</b>',
    'Another useful outcome for customers.',
    'A third useful outcome across departments.',
  ] }])]);
  const lacking = runChecks(resume).results.find(result => result.message.includes('lack numbers'));
  assert.equal(lacking?.message.startsWith('3 descriptions'), true);
  assert.equal(lacking?.targetId, 'legacy');
});

test('malformed email is flagged, surrounding whitespace is ignored and issues update after correction', () => {
  const resume = fixture();
  resume.profile.email = 'ada@@example.com';
  assert.ok(runChecks(resume).results.some(result => result.message === 'Enter a valid email address.' && result.targetId === 'profile'));
  resume.profile.email = ' ada+work@example.com ';
  assert.ok(!messages(resume).includes('Enter a valid email address.'));
});

test('date checks flag reversed ranges and ignore current entries and valid same-month ranges', () => {
  const resume = fixture([section('education', [
    { id: 'reversed', school: 'University', startDate: '2025-05', endDate: '2024-09' },
    { id: 'same', school: 'University', startDate: '2024-09', endDate: '2024-09' },
    { id: 'current', school: 'University', startDate: '2025-05', endDate: '2024-09', current: true },
  ])]);
  const dates = runChecks(resume).results.filter(result => result.category === 'Dates');
  assert.equal(dates.length, 1);
  assert.equal(dates[0].targetId, 'reversed');
});

test('blank entries in a partly filled section are actionable and checking never mutates the resume', () => {
  const resume = fixture([section('work', [
    { id: 'filled', org: 'Company', bullets: ['Built 3 systems.'] }, { id: 'blank', body: '<br>' },
  ])]);
  const original = structuredClone(resume);
  const { results, score } = runChecks(resume);
  const blank = results.find(result => result.message.includes('entries are blank'));
  assert.equal(blank?.targetId, 'blank');
  assert.ok(score >= 0 && score <= 100);
  assert.deepEqual(resume, original);
});

test('every new check and action message has all supported non-English translations', () => {
  for (const [message, translations] of Object.entries(CHECK_MESSAGES)) {
    for (const language of ['zh', 'zh-TW', 'ja', 'ko', 'fr', 'ru']) {
      assert.ok(translations[language], `${message}/${language}`);
    }
  }
});
