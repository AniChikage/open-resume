import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_SETTINGS } from '../src/data.ts';
import { runChecks } from '../src/lib/ai-check.ts';
import { buildResumeDocx } from '../src/lib/docx-export.ts';
import { matchJobDescription } from '../src/lib/job-match.ts';
import { getSummaryBody, isRichHtml, toRichHtml } from '../src/lib/resume-content.ts';
import { buildTranslationRows } from '../src/lib/translation-rows.ts';
import { versionFieldSpecs } from '../src/lib/version-fields.ts';
import type { Resume } from '../src/types.ts';

const resumeWith = (body: string): Resume => ({
  title: 'Fixture',
  profile: { name: 'Ada Example', email: 'ada@example.com', phone: '+33 1 23 45 67 89', website: '', city: 'London', birthday: '', status: '', headline: 'Engineer', avatar: '' },
  sections: [{ id: 'summary', type: 'summary', label: 'Summary', visible: true, items: [{ id: 'sum-1', body }] }],
});

test('text typed before formatting existed keeps its line breaks and is escaped', () => {
  assert.equal(toRichHtml('First line\nSecond line'), 'First line<br>Second line');
  assert.equal(toRichHtml('One\r\nTwo'), 'One<br>Two', 'Windows line endings');
  assert.equal(toRichHtml('Tom & Jerry <3 "quotes"'), 'Tom &amp; Jerry &lt;3 &quot;quotes&quot;');
  assert.equal(toRichHtml('  padded  '), 'padded');
  assert.equal(toRichHtml(''), '');
  assert.equal(toRichHtml(undefined), '');
  assert.equal(toRichHtml('   \n  '), '');
  // Markup the editor cannot produce is treated as text, never as HTML.
  assert.equal(toRichHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
  assert.equal(getSummaryBody({ id: 'x', body: 'Plain\nsummary' }), 'Plain<br>summary');
});

test('rich text is recognised by the markup the editor produces', () => {
  for (const rich of ['<strong>Bold</strong> text', 'a<br>b', '<p>Paragraph</p>', '<em>x</em>', '<ul><li>one</li></ul>', '<a href="https://example.com">link</a>', '<B>upper</B>']) {
    assert.equal(isRichHtml(rich), true, rich);
  }
  for (const plain of ['', 'plain', 'a < b and c > d', '1 <3 2', '<script>x</script>', 'AT&T']) {
    assert.equal(isRichHtml(plain), false, plain);
  }
  assert.equal(isRichHtml(undefined), false);
});

test('the summary is edited and translated as rich text', () => {
  assert.equal(versionFieldSpecs('text').find(spec => spec.field === 'body')!.input, 'rich');
  const rows = buildTranslationRows(resumeWith('<strong>Senior</strong> engineer'), 'fr');
  assert.equal(rows.find(row => row.key === 'item:sum-1:body')!.input, 'rich');
});

test('the resume checks and the job matching read a rich summary like a plain one', () => {
  const plain = resumeWith('Experienced Python engineer who builds reliable systems for banks and insurers every day.');
  const rich = resumeWith('<p>Experienced <strong>Python</strong> engineer who builds <em>reliable</em> systems for banks and insurers every day.</p>');
  const messages = (resume: Resume) => runChecks(resume, (message: string) => message).results.map(finding => finding.message);
  assert.deepEqual(messages(rich), messages(plain));
  for (const resume of [plain, rich]) {
    const match = matchJobDescription(resume, 'We need a Python engineer.');
    assert.deepEqual(match.keywords.map(keyword => keyword.label), ['Python']);
    assert.equal(match.coverage, 100);
  }
});

test('the Word export accepts a summary with bold passages, and a plain one with line breaks', async () => {
  for (const body of ['Plain summary\nwith two lines', '<p>Mostly plain with a <strong>bold</strong> passage and an <em>italic</em> one.</p>']) {
    const blob = await buildResumeDocx({ resume: resumeWith(body), settings: { ...DEFAULT_SETTINGS } }, 'en');
    assert.ok(blob.size > 2000, 'a real .docx document is produced');
  }
});
