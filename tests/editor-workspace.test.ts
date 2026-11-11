import assert from 'node:assert/strict';
import test from 'node:test';
import { getPaginationLineRange, paginateRanges } from '../src/lib/pagination.ts';
import { getPaperSize } from '../src/lib/paper.ts';
import { createPdfCache } from '../src/lib/pdf-snapshot.ts';
import { runChecks } from '../src/lib/ai-check.ts';
import { workspaceText } from '../src/lib/editor-workspace-copy.ts';
import { buildResumeFromTemplate, RESUME_TEMPLATES, DEFAULT_SETTINGS } from '../src/data.ts';
import { isResumeSettings } from '../src/lib/validation.ts';
import type { Resume } from '../src/types.ts';
import { createBackup, readBackup } from '../src/lib/resume-transfer.ts';
import { buildResumeDocx } from '../src/lib/docx-export.ts';
import { unzipSync, strFromU8 } from 'fflate';
import { getPdfFontKey } from '../src/lib/pdf-fonts.ts';

test('short trailing content gets a new page instead of being clipped past the previous page', () => {
  assert.deepEqual(paginateRanges(1050, 1000), [0, 1000, 1050]);
  assert.deepEqual(paginateRanges(2050, 1000), [0, 1000, 2000, 2050]);
});

test('pagination preserves complete entries and never exceeds the physical paper height', () => {
  const ranges = [{ top: 800, bottom: 1200 }, { top: 1700, bottom: 2100 }];
  const cuts = paginateRanges(2300, 1000, ranges);
  assert.deepEqual(cuts, [0, 800, 1700, 2300]);
  for (let i = 1; i < cuts.length; i++) {
    assert.ok(cuts[i] > cuts[i - 1]);
    assert.ok(cuts[i] - cuts[i - 1] <= 1000);
    assert.ok(!ranges.some(range => range.top < cuts[i] && range.bottom > cuts[i]));
  }
});

test('long paragraphs break between their rendered lines and retain the final line', () => {
  const lines = Array.from({ length: 120 }, (_, i) => ({ top: i * 24 + 4, bottom: i * 24 + 24 }));
  const cuts = paginateRanges(2884, 1000, lines);
  assert.equal(cuts.at(-1), 2884);
  for (const cut of cuts.slice(1, -1)) assert.ok(!lines.some(line => line.top < cut && line.bottom > cut));
});

test('keeping an overlapping block together never takes priority over a complete text line', () => {
  const ranges = [{ top: 100, bottom: 1040 }, { top: 990, bottom: 1010, line: true }];
  assert.deepEqual(paginateRanges(1100, 1000, ranges), [0, 990, 1100]);
});

test('tall font ascenders do not pull a dense paragraph back to its first line', () => {
  const ranges = Array.from({ length: 100 }, (_, index) => getPaginationLineRange(index * 16.2, index * 16.2 + 18, 16.2));
  const cuts = paginateRanges(1622, 1000, ranges);
  assert.equal(cuts.length, 3);
  assert.ok(cuts[1] > 960 && cuts[1] <= 1000);
  for (const cut of cuts.slice(1, -1)) assert.ok(!ranges.some(line => line.top < cut && line.bottom > cut));
});

test('continuation pages reserve top spacing without taking the first page top margin twice', () => {
  assert.deepEqual(paginateRanges(2400, 900, [], { firstPageHeight: 1000 }), [0, 1000, 1900, 2400]);
});

test('A4 and US Letter use their physical dimensions and legacy documents default to A4', () => {
  assert.equal(getPaperSize().widthMm, 210);
  assert.equal(getPaperSize('a4').heightMm, 297);
  assert.equal(getPaperSize('letter').widthPt, 612);
  assert.equal(getPaperSize('letter').heightPt, 792);
  assert.equal(getPaperSize('unknown').label, 'A4');
  assert.ok(isResumeSettings({ ...DEFAULT_SETTINGS, paperSize: 'letter' }));
  assert.equal(isResumeSettings({ ...DEFAULT_SETTINGS, paperSize: 'invalid' }), false);
});

test('layout and embedding choose the same bundled family without matching fallback serif names', () => {
  assert.equal(getPdfFontKey('Arial, sans-serif'), 'sans');
  assert.equal(getPdfFontKey('Microsoft YaHei, serif'), 'sans');
  assert.equal(getPdfFontKey('Resume PDF Sans'), 'sans');
  for (const family of ['Georgia', 'Times New Roman', 'SimSun', 'KaiTi', 'Resume PDF Serif']) assert.equal(getPdfFontKey(family), 'serif');
});

test('preview and download share one in-flight immutable PDF build', async () => {
  const cache = createPdfCache<Uint8Array>();
  cache.select('document');
  let builds = 0;
  const build = async () => { builds++; return new Uint8Array([37, 80, 68, 70]); };
  const [preview, download] = await Promise.all([cache.get('document', build), cache.get('document', build)]);
  assert.equal(preview, download);
  assert.equal(builds, 1);
  assert.equal(await cache.get('document', build), preview);
});

test('a slow old PDF cannot overwrite the latest PDF, and a failed build can be retried', async () => {
  const cache = createPdfCache<string>();
  let finishOld!: (value: string) => void;
  cache.select('old');
  const old = cache.get('old', () => new Promise(resolve => { finishOld = resolve; }));
  await Promise.resolve();
  cache.select('new');
  assert.equal(await cache.get('new', async () => 'new bytes'), 'new bytes');
  finishOld('old bytes');
  await old;
  assert.equal(await cache.get('new', async () => { throw new Error('should be cached'); }), 'new bytes');
  cache.select('failed');
  await assert.rejects(cache.get('failed', async () => { throw new Error('font failed'); }), /font failed/);
  assert.equal(await cache.get('failed', async () => 'recovered'), 'recovered');
});

test('content checks point to profile fields, visible entries, and missing sections', () => {
  const resume: Resume = buildResumeFromTemplate(RESUME_TEMPLATES[0]);
  resume.profile.email = '';
  resume.profile.phone = '123456789';
  resume.profile.name = '';
  resume.sections = [{ id: 'hidden', type: 'work', label: 'Hidden', visible: false, items: [{ id: 'hidden-entry', body: 'a'.repeat(200) }] }];
  const findings = runChecks(resume).results;
  assert.ok(findings.some(finding => finding.targetId === 'profile' && finding.field === 'Email'));
  assert.ok(findings.some(finding => finding.sectionType === 'education'));
  assert.ok(!findings.some(finding => finding.targetId === 'hidden-entry'));
  resume.sections.push({ id: 'visible', type: 'work', label: 'Experience', visible: true, items: [{ id: 'visible-entry', body: 'a'.repeat(200) }] });
  assert.ok(runChecks(resume).results.some(finding => finding.targetId === 'visible-entry' && finding.field === 'Content'));
  resume.sections = [{ id: 'summary', type: 'summary', label: 'Summary', visible: true, items: [{ id: 'summary-body', body: 'a'.repeat(200) }] }];
  assert.ok(runChecks(resume).results.some(finding => finding.targetId === 'summary-body' && finding.field === 'Body'));
});

test('workspace labels and feedback are localized for all seven supported languages', () => {
  for (const lang of ['zh', 'zh-TW', 'ja', 'ko', 'fr', 'ru']) {
    for (const key of ['content', 'checkHelp', 'pdfHelp', 'preparing', 'linkHelp'] as const) assert.notEqual(workspaceText(lang, key), workspaceText('en', key));
    assert.ok(!workspaceText(lang, 'pages', { count: 3 }).includes('{count}'));
  }
});

test('workspace backup and restore preserve the selected paper size', () => {
  const document = { resume: buildResumeFromTemplate(RESUME_TEMPLATES[0]), settings: { ...DEFAULT_SETTINGS, paperSize: 'letter' as const } };
  assert.equal(readBackup(createBackup([document]))[0].settings.paperSize, 'letter');
});

test('Word output retains visible content and the selected physical paper size', async () => {
  const resume: Resume = buildResumeFromTemplate(RESUME_TEMPLATES[0]);
  resume.profile.name = 'Visible resume name';
  resume.sections.push({ id: 'hidden', type: 'custom', label: 'Private', visible: false, items: [{ id: 'private', body: 'DO_NOT_EXPORT_PRIVATE_TEXT' }] });
  for (const [paperSize, width, height] of [['a4', 11906, 16838], ['letter', 12240, 15840]] as const) {
    const blob = await buildResumeDocx({ resume, settings: { ...DEFAULT_SETTINGS, paperSize } });
    const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
    const xml = strFromU8(files['word/document.xml']);
    assert.ok(xml.includes(`w:w="${width}"`) && xml.includes(`w:h="${height}"`));
    assert.ok(xml.includes('Visible resume name'));
    assert.ok(!xml.includes('DO_NOT_EXPORT_PRIVATE_TEXT'));
  }
});
