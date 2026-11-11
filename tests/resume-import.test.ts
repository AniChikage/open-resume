import assert from 'node:assert/strict';
import test from 'node:test';
import { zipSync, strToU8 } from 'fflate';
import { buildBlankResume, DEFAULT_SETTINGS } from '../src/data.ts';
import { parseBackup } from '../src/lib/backup.ts';
import { extractDocxText, readResumeFile } from '../src/lib/import-file.ts';
import { IMPORT_MAX_TEXT_LENGTH, parseResumeText, validateImportText } from '../src/lib/resume-import.ts';
import { isEditorDocument } from '../src/lib/validation.ts';

test('text import detects profile and English sections without inventing experience or dates', () => {
  const input = 'Jane Doe\nSenior Software Engineer\njane@example.com\n+1 415 555 0123\nSummary\nI build reliable services.\nExperience\nExample Corp | Engineer | 2020–2025\nBuilt a tool used by 200 people.\nEducation\nExample University\nComputer Science, 2016–2020\nSkills\nTypeScript, SQL, React';
  const document = parseResumeText(input, { title: 'My previous CV' });
  assert.ok(isEditorDocument(document));
  assert.equal(document.resume.title, 'My previous CV');
  assert.equal(document.resume.profile.name, 'Jane Doe');
  assert.equal(document.resume.profile.headline, 'Senior Software Engineer');
  assert.equal(document.resume.profile.email, 'jane@example.com');
  assert.equal(document.resume.profile.phone, '+1 415 555 0123');
  assert.deepEqual(document.resume.sections.map(section => section.type), ['summary', 'work', 'education', 'skills']);
  assert.ok(JSON.stringify(document.resume.sections).includes('Example Corp | Engineer | 2020–2025'));
  assert.equal(document.resume.sections[1].items[0].startDate, undefined);
  assert.equal(document.settings.titleMode, 'custom');
});

test('Chinese labels and Markdown headings map to sections and ambiguous content is preserved', () => {
  const document = parseResumeText('姓名：张三\n求职意向：前端工程师\n电话：13800138000\n邮箱：zhang@example.com\n上海 · 可远程\n## 教育经历\n示例大学\n计算机科学\n## 项目经历\n个人项目 <组件库> & 文档\n未知行：绝不能丢失\n## 技能\nReact / Vue', { language: 'zh' });
  assert.equal(document.resume.profile.name, '张三');
  assert.equal(document.resume.profile.headline, '前端工程师');
  assert.equal(document.resume.profile.phone, '13800138000');
  assert.equal(document.resume.profile.email, 'zhang@example.com');
  assert.deepEqual(document.resume.sections.map(section => section.type), ['custom', 'education', 'project', 'skills']);
  const content = JSON.stringify(document.resume.sections);
  assert.ok(content.includes('上海 · 可远程'));
  assert.ok(content.includes('未知行：绝不能丢失'));
  assert.ok(content.includes('&lt;组件库&gt; &amp; 文档'));
});

test('unrecognized text and heading-only sections survive import; mixed contact lines retain extra text', () => {
  const document = parseResumeText('Jane Doe\njane@example.com | Berlin | https://example.com\nUnusual section: patents pending\nA precise outcome 2020-2024\nEducation\nSkills');
  const content = JSON.stringify(document);
  for (const value of ['Berlin', 'https://example.com', 'patents pending', '2020-2024']) assert.ok(content.includes(value), value);
  assert.equal(document.resume.profile.phone, '');
  assert.deepEqual(document.resume.sections.slice(-2).map(section => [section.type, section.items.length]), [['education', 0], ['skills', 0]]);
});

test('supported interface language headings are recognized without translating the source text', () => {
  for (const [heading, type] of [['学歴', 'education'], ['경력', 'work'], ['Compétences', 'skills'], ['Опыт работы', 'work'], ['教育經歷', 'education']] as const) {
    const document = parseResumeText(`${heading}\nOriginal content stays here`);
    assert.equal(document.resume.sections[0].type, type);
    assert.equal(document.resume.sections[0].label, heading);
  }
});

test('empty and oversized text is rejected explicitly without silently clipping', () => {
  assert.throws(() => parseResumeText(' \n\t'), /IMPORT_EMPTY/);
  assert.throws(() => parseResumeText('x'.repeat(IMPORT_MAX_TEXT_LENGTH + 1)), /IMPORT_TEXT_TOO_LARGE/);
  assert.equal(validateImportText('a'.repeat(IMPORT_MAX_TEXT_LENGTH)).length, IMPORT_MAX_TEXT_LENGTH);
});

test('old and versioned Open Resume JSON backups keep all content and appearance', async () => {
  const document = { resume: buildBlankResume('en'), settings: { ...DEFAULT_SETTINGS, accent: '#123456' } };
  for (const value of [document, { version: 1, ...document }]) {
    const file = new File([JSON.stringify(value)], 'backup.json', { type: 'application/json' });
    const result = await readResumeFile(file);
    assert.equal(result.kind, 'backup');
    if (result.kind === 'backup') assert.deepEqual(result.document, document);
    assert.deepEqual(parseBackup(JSON.stringify(value)), document);
  }
  await assert.rejects(readResumeFile(new File(['{}'], 'invalid.json')), /INVALID_BACKUP/);
});

test('TXT and Markdown files use bounded text parsing and unsupported or oversized files fail clearly', async () => {
  const result = await readResumeFile(new File(['# Jane Doe\n## Skills\nReact'], 'Jane Resume.md'));
  assert.equal(result.kind, 'text');
  if (result.kind === 'text') { assert.equal(result.title, 'Jane Resume'); assert.equal(result.text, '# Jane Doe\n## Skills\nReact'); }
  await assert.rejects(readResumeFile(new File(['old binary data'], 'resume.doc')), /IMPORT_UNSUPPORTED_FILE/);
  await assert.rejects(readResumeFile(new File(['x'.repeat(10 * 1024 * 1024 + 1)], 'resume.txt')), /IMPORT_FILE_TOO_LARGE/);
});

test('DOCX rejects invalid archives and bounds expanded ZIP size and entry count before XML extraction', async () => {
  await assert.rejects(extractDocxText(new Uint8Array([1, 2, 3])), /IMPORT_INVALID_DOCX/);
  await assert.rejects(extractDocxText(zipSync({ 'unrelated.txt': strToU8('not a Word document') })), /IMPORT_INVALID_DOCX/);
  await assert.rejects(extractDocxText(zipSync({ 'word/document.xml': strToU8('x'.repeat(5 * 1024 * 1024 + 1)) })), /IMPORT_DOCX_TOO_LARGE/);
  const manyFiles = Object.fromEntries(Array.from({ length: 2049 }, (_, index) => [`part-${index}`, new Uint8Array(0)]));
  await assert.rejects(extractDocxText(zipSync(manyFiles)), /IMPORT_DOCX_TOO_LARGE/);
});

test('cancelling a file read rejects after asynchronous text extraction instead of returning a stale import', async () => {
  const controller = new AbortController();
  let release!: (text: string) => void;
  const file = new File(['original'], 'resume.txt');
  file.text = () => new Promise(resolve => { release = resolve; });
  const reading = readResumeFile(file, { signal: controller.signal });
  controller.abort();
  release('Jane Doe\nSoftware Engineer');
  await assert.rejects(reading, error => error instanceof Error && error.name === 'AbortError');
});
