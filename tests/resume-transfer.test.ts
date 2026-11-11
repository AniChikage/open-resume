import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import test from 'node:test';
import { PDFDocument } from 'pdf-lib';
import { unzipSync, strFromU8 } from 'fflate';
import 'fake-indexeddb/auto';
import { buildBlankResume, DEFAULT_SETTINGS } from '../src/data.ts';
import { createBackup, EMPTY_IMPORT_AVATAR, normalizeDocument, pdfItemsToText, readBackup, resumeFromText } from '../src/lib/resume-transfer.ts';
import { buildResumeDocx } from '../src/lib/docx-export.ts';
import fontkit from '../src/lib/pdf-fontkit.ts';
import { parseLinearGradient } from '../src/lib/pdf-gradient.ts';
import { listVersions, recordVersion, VERSION_LIMIT } from '../src/lib/resume-versions.ts';
import type { EditorDocument } from '../src/types.ts';

const document = (): EditorDocument => ({ resume: { ...buildBlankResume(), title: 'Jane Smith · Resume' }, settings: { ...DEFAULT_SETTINGS } });
const english = 'Jane Smith\nSoftware Engineer\njane@example.com | +1 415 555 0123 | San Francisco\nSummary\nBuilds reliable products.\nWork Experience\nExample Inc\n2022 - Present\nReduced latency by 30%.\nEducation\nExample University\n2017 - 2021\nComputer Science\nSkills\nTypeScript, React, SQL';

test('colored PDF headers preserve computed gradient colors including CSS Color 4 stops', () => {
  const gradient = parseLinearGradient('linear-gradient(90deg, rgb(139, 99, 246), color(srgb 0.4 0.3 0.7))');
  assert.equal(gradient?.angle, 90);
  assert.deepEqual(gradient?.stops, [{color:'rgb(139, 99, 246)',position:0},{color:'rgba(102,77,179,1)',position:1}]);
  assert.equal(parseLinearGradient('none'), null);
  assert.equal(parseLinearGradient('url(https://example.com)'), null);
  assert.equal(parseLinearGradient('linear-gradient(135deg, #ffffff 0% 50%, transparent 50% 100%)')?.stops.length, 4);
});

test('legacy single-document and versioned workspace backups retain content, photos and settings', () => {
  const original = document(); original.resume.profile.name = '张三'; original.resume.profile.avatar = 'data:image/png;base64,AAAA';
  original.resume.sections[0].items[0] = { id: 'legacy', school: 'Example University', details: ['Scholarship'], current: false };
  for (const json of [JSON.stringify(original), createBackup([original])]) {
    const restored = readBackup(json)[0];
    assert.deepEqual(restored.resume.profile, original.resume.profile);
    assert.equal(restored.resume.title, original.resume.title);
    assert.equal(restored.settings.template, original.settings.template);
    assert.equal(restored.resume.sections[0].items[0].details?.[0], 'Scholarship');
    assert.notEqual(restored.resume.sections[0].items[0].id, 'legacy');
  }
  assert.equal(readBackup(createBackup([original, original])).length, 2);
});

test('invalid, oversized, future-version and partially corrupt backups fail before any restore', () => {
  for (const source of ['{', '{}', '[]', JSON.stringify({ format: 'resume-workspace', version: 2, documents: [document()] }), JSON.stringify({ format: 'resume-workspace', version: 1, documents: [document(), {}] })]) assert.throws(() => readBackup(source));
  assert.throws(() => createBackup([]), /backupCount/);
  assert.throws(() => createBackup(Array.from({ length: 101 }, document)), /backupCount/);
  assert.throws(() => readBackup(' '.repeat(25 * 1024 * 1024 + 1)), /fileTooLarge/);
});

test('untrusted backup fields cannot introduce executable avatar URLs or settings/prototype keys', () => {
  const original = document(); original.resume.profile.avatar = 'javascript:alert(1)';
  const value = JSON.parse(JSON.stringify(original));
  value.settings = { ...value.settings, fontSize: -500, lineHeight: 100, accent: 'url(https://example.com)', template: '../evil', fontFamily: 'evil' };
  value.resume.profile.__proto__ = { isAdmin: true };
  const restored = normalizeDocument(value);
  assert.equal(restored.resume.profile.avatar, '');
  assert.equal(restored.settings.accent, DEFAULT_SETTINGS.accent);
  assert.equal(restored.settings.template, DEFAULT_SETTINGS.template);
  assert.equal(restored.settings.fontSize, 10);
  assert.equal(restored.settings.lineHeight, 2.2);
  assert.equal(Object.hasOwn(restored.resume.profile, 'isAdmin'), false);
});

test('English and Chinese PDFs become editable fields and sections without sample data', () => {
  const parsed = resumeFromText(english, 'Jane.pdf');
  assert.equal(parsed.resume.profile.name, 'Jane Smith');
  assert.equal(parsed.resume.profile.avatar, EMPTY_IMPORT_AVATAR);
  assert.equal(parsed.resume.profile.email, 'jane@example.com');
  assert.equal(parsed.resume.profile.headline, 'Software Engineer');
  assert.match(parsed.resume.profile.phone, /415/);
  assert.equal(parsed.resume.sections.find((section) => section.type === 'work')?.items[0].org, 'Example Inc');
  assert.equal(parsed.resume.sections.find((section) => section.type === 'work')?.items[0].current, true);
  assert.match(parsed.resume.sections.find((section) => section.type === 'work')?.items[0].body || '', /30%/);
  assert.equal(parsed.resume.sections.find((section) => section.type === 'education')?.items[0].school, 'Example University');
  const chinese = resumeFromText('张三\n前端工程师\nzhang@example.com 13800138000\n个人简介\n开发高质量产品。\n工作经历\n示例科技\n2023.01 – 至今\n负责简历编辑器\n专业技能\nTypeScript、React', '中文简历.pdf', 'zh');
  assert.equal(chinese.resume.profile.name, '张三');
  assert.equal(chinese.resume.profile.phone, '13800138000');
  assert.equal(chinese.resume.sections.find((section) => section.type === 'work')?.items[0].org, '示例科技');
  assert.equal(resumeFromText('Jane Smith\nEducation\nExample University\n2017 - 2021', 'Dates.pdf').resume.profile.phone, '');
});

test('unrecognized headings and markup-like PDF text remain readable and safe', () => {
  const parsed = resumeFromText('Jane Smith\nUnusual qualifications\n<script>alert(1)</script>\nUnique experience', 'unknown.pdf');
  assert.match(parsed.resume.sections[0].items[0].body || '', /Unique experience/);
  assert.match(parsed.resume.sections[0].items[0].body || '', /&lt;script&gt;/);
  assert.throws(() => resumeFromText('  ', 'empty.pdf'), /noText/);
});

test('PDF fragments join into lines in reading order, including split Chinese glyphs', () => {
  const item = (str: string, x: number, y: number, width = 10) => ({ str, transform: [1, 0, 0, 10, x, y], width, height: 10 });
  assert.equal(pdfItemsToText([item('Smith', 42, 100, 30), item('张', 0, 80), item('三', 10, 80), item('Jane', 0, 100, 30)]), 'Jane Smith\n张三');
});

test('DOCX is standard OOXML with editable content, formatting, links and section visibility', async () => {
  const parsed = resumeFromText(english, 'Jane.pdf');
  parsed.resume.sections.push({ id: 'rich', type: 'custom', label: 'Selected work', visible: true, items: [{ id: 'rich-item', org: 'Project', body: '<strong>Bold result</strong><br><ul><li>Built with <em>care</em></li></ul><a href="https://example.com">Portfolio</a><a href="javascript:alert(1)">Plain</a>' }] });
  parsed.resume.sections.push({ id: 'hidden', type: 'custom', label: 'Private hidden notes', visible: false, items: [{ id: 'secret', body: 'Do not export this' }] });
  const blob = await buildResumeDocx(parsed);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  assert.equal(bytes[0], 0x50); assert.equal(bytes[1], 0x4b);
  const zip = unzipSync(bytes);
  const xml = strFromU8(zip['word/document.xml']);
  assert.ok(zip['[Content_Types].xml']);
  for (const content of ['Jane Smith', 'Example Inc', 'Bold result', 'care', 'Portfolio']) assert.ok(xml.includes(content));
  assert.match(xml, /w:b/); assert.match(xml, /w:numPr/); assert.match(xml, /w:pgSz/);
  assert.doesNotMatch(xml, /Private hidden notes|Do not export this|<html|javascript:/);
  assert.match(strFromU8(zip['word/_rels/document.xml.rels']), /https:\/\/example.com/);
});

test('saved versions persist across reopened databases, deduplicate, isolate accounts and retain 30', async () => {
  const scope = `user-a:${crypto.randomUUID()}`;
  const otherScope = `user-b:${crypto.randomUUID()}`;
  const original = document();
  await recordVersion(scope, original); await recordVersion(scope, original);
  assert.equal((await listVersions(scope)).length, 1);
  await recordVersion(otherScope, original);
  for (let index = 0; index < 32; index++) await recordVersion(scope, { ...original, resume: { ...original.resume, title: `Version ${index}` } });
  const versions = await listVersions(scope);
  assert.equal(versions.length, VERSION_LIMIT); assert.equal(versions[0].document.resume.title, 'Version 31');
  assert.equal((await listVersions(otherScope)).length, 1);
  const selected = structuredClone(versions[3].document);
  await recordVersion(scope, selected);
  assert.equal((await listVersions(scope))[0].document.resume.title, selected.resume.title);
});

test('CJK fonts export as small, readable subsets across all bundled families and weights', async () => {
  const pdf = await PDFDocument.create(); pdf.registerFontkit(fontkit);
  const text = 'Jane Smith 张三 简历测试 TypeScript 2026';
  for (const filename of ['NotoSansCJKsc-Regular.otf', 'NotoSansCJKsc-Bold.otf', 'NotoSerifCJKsc-Regular.otf', 'NotoSerifCJKsc-Bold.otf']) {
    const font = await pdf.embedFont(await readFile(new URL(`../public/fonts/${filename}`, import.meta.url)), { subset: true });
    pdf.addPage([595, 842]).drawText(text, { font, size: 14, x: 40, y: 780 });
  }
  const bytes = await pdf.save();
  assert.ok(bytes.length < 600_000, `Unexpected PDF size: ${bytes.length}`);
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({ data: new Uint8Array(bytes) });
  try {
    const result = await task.promise;
    assert.equal(result.numPages, 4);
    for (let index = 1; index <= 4; index++) {
      const content = await (await result.getPage(index)).getTextContent();
      assert.equal(content.items.filter((item) => 'str' in item).map((item) => 'str' in item ? item.str : '').join(''), text);
    }
  } finally { await task.destroy(); }
  if (process.env.RESUME_QA_PDF) await writeFile(process.env.RESUME_QA_PDF, bytes);
});
