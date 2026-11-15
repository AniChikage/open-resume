import assert from 'node:assert/strict';
import test from 'node:test';
import { PDFBool, PDFDict, PDFDocument, PDFName, PDFString, PDFHexString } from 'pdf-lib';
import { languageTag } from '../src/lib/language-tags.ts';
import { applyPdfMetadata } from '../src/lib/pdf-metadata.ts';
import type { PdfMetadata } from '../src/lib/pdf-metadata.ts';

async function roundTrip(metadata: PdfMetadata) {
  const doc = await PDFDocument.create();
  doc.addPage([200, 200]);
  applyPdfMetadata(doc, metadata);
  // updateMetadata:false: loading must not overwrite the producer and dates with pdf-lib's own.
  return PDFDocument.load(await doc.save(), { updateMetadata: false });
}
const lang = (doc: PDFDocument) => {
  const value = doc.catalog.lookup(PDFName.of('Lang'));
  return value instanceof PDFString || value instanceof PDFHexString ? value.decodeText() : undefined;
};

test('language codes become full language tags', () => {
  assert.deepEqual(['en', 'fr', 'zh', 'zh-TW', 'ja', 'ko', 'ru', 'de', 'pt-BR'].map(languageTag), ['en-US', 'fr-FR', 'zh-CN', 'zh-TW', 'ja-JP', 'ko-KR', 'ru-RU', 'de', 'pt-BR']);
});

test('the title, author and language are written into the PDF', async () => {
  const doc = await roundTrip({ title: 'CV Ada Example · Engineer', author: 'Ada Example', language: 'fr' });
  assert.equal(doc.getTitle(), 'CV Ada Example · Engineer');
  assert.equal(doc.getAuthor(), 'Ada Example');
  assert.equal(lang(doc), 'fr-FR');
  assert.equal(doc.getProducer(), 'Open Resume');
  assert.equal(doc.getCreator(), 'Open Resume');
});

test('viewers are asked to show the title instead of the file name', async () => {
  const doc = await roundTrip({ title: 'A title' });
  const preferences = doc.catalog.lookup(PDFName.of('ViewerPreferences'), PDFDict);
  assert.equal(preferences.lookup(PDFName.of('DisplayDocTitle')), PDFBool.True);
});

test('accents and other alphabets survive', async () => {
  for (const title of ['Ingénieur senior – Café', '山田太郎 履歴書', 'Инженер']) assert.equal((await roundTrip({ title })).getTitle(), title);
});

test('blank fields are not written, control characters are removed and long values are cut', async () => {
  const empty = await roundTrip({ title: '   ', author: '', language: undefined });
  assert.equal(empty.getTitle(), undefined);
  assert.equal(empty.getAuthor(), undefined);
  assert.equal(lang(empty), undefined);
  assert.equal((await roundTrip({ title: 'Line one\nLine\ttwo\u0000' })).getTitle(), 'Line one Line two');
  assert.equal((await roundTrip({ title: 'x'.repeat(500) })).getTitle()!.length, 200);
});

test('a scanning robot reads the properties through a standard PDF library', async () => {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await PDFDocument.create();
  doc.addPage([200, 200]);
  applyPdfMetadata(doc, { title: 'CV Ada Example', author: 'Ada Example', language: 'en' });
  const loaded = await pdfjs.getDocument({ data: await doc.save(), verbosity: 0 }).promise;
  const { info } = await loaded.getMetadata() as { info: Record<string, string> };
  assert.equal(info.Title, 'CV Ada Example');
  assert.equal(info.Author, 'Ada Example');
  assert.equal(info.Producer, 'Open Resume');
});
