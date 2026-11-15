import assert from 'node:assert/strict';
import test from 'node:test';
import { strFromU8, unzipSync } from 'fflate';
import { DEFAULT_SETTINGS } from '../src/data.ts';
import { buildResumeDocx, docxLanguageTag } from '../src/lib/docx-export.ts';
import type { Resume } from '../src/types.ts';

const resume: Resume = {
  title: 'Fixture',
  profile: { name: 'Ada Example', email: 'ada@example.com', phone: '', website: '', city: '', birthday: '', status: '', headline: 'Engineer', avatar: '' },
  sections: [{ id: 'work', type: 'work', label: 'Experience', visible: true, items: [{ id: 'job', org: 'Acme', role: 'Engineer', body: '<ul><li>Built things</li></ul>' }] }],
};

test('app language codes become the tags Word expects', () => {
  assert.deepEqual(['en', 'fr', 'zh', 'zh-TW', 'ja', 'ko', 'ru', 'de', 'pt-BR'].map(docxLanguageTag), ['en-US', 'fr-FR', 'zh-CN', 'zh-TW', 'ja-JP', 'ko-KR', 'ru-RU', 'de', 'pt-BR']);
});

test('a Word export declares the language of its text', async () => {
  for (const [lang, tag] of [['fr', 'fr-FR'], ['en', 'en-US'], ['de', 'de']] as const) {
    const blob = await buildResumeDocx({ resume, settings: { ...DEFAULT_SETTINGS } }, lang);
    const styles = strFromU8(unzipSync(new Uint8Array(await blob.arrayBuffer()))['word/styles.xml']);
    assert.match(styles, new RegExp(`<w:lang [^>]*w:val="${tag}"`), `${lang} -> ${tag}`);
  }
});

test('the Word export keeps real headings and real list items, which is what scanning robots read best', async () => {
  const blob = await buildResumeDocx({ resume, settings: { ...DEFAULT_SETTINGS } }, 'en');
  const document = strFromU8(unzipSync(new Uint8Array(await blob.arrayBuffer()))['word/document.xml']);
  assert.match(document, /<w:pStyle w:val="Title"/);
  assert.match(document, /<w:pStyle w:val="Heading1"/);
  assert.match(document, /<w:numPr>/);
  assert.ok(!/<w:tbl>|<w:txbxContent|<w:drawing>/.test(document), 'no table, text box or picture hides the text');
});
