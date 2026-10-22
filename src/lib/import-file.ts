import { BACKUP_MAX_BYTES, parseBackup } from './backup.ts';
import { IMPORT_MAX_TEXT_LENGTH, validateImportText } from './resume-import.ts';
import type { EditorDocument } from '../types.ts';

export const IMPORT_MAX_PDF_PAGES = 30;
const DOCX_MAX_ENTRIES = 2048;
const DOCX_MAX_EXPANDED_BYTES = 30 * 1024 * 1024;
const DOCX_MAX_XML_BYTES = 5 * 1024 * 1024;
const documentPart = (name: string) => name === 'word/document.xml' || /^word\/(?:header\d+|footer\d+|footnotes|endnotes)\.xml$/.test(name);

export type ImportedFile = { kind: 'backup'; document: EditorDocument } | { kind: 'text'; text: string; title: string };

async function extractPdf(data: Uint8Array, signal?: AbortSignal) {
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
  signal?.throwIfAborted();
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const task = pdfjs.getDocument({ data, disableFontFace: true, useSystemFonts: false, useWorkerFetch: false, stopAtErrors: true, verbosity: 0 });
  const abort = () => { void task.destroy().catch(() => {}); };
  signal?.addEventListener('abort', abort, { once: true });
  try {
    signal?.throwIfAborted();
    const pdf = await task.promise;
    if (pdf.numPages > IMPORT_MAX_PDF_PAGES) throw new Error('IMPORT_PDF_TOO_MANY_PAGES');
    let text = '';
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      signal?.throwIfAborted();
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      let lineY: number | undefined;
      let lineEndX: number | undefined;
      for (const item of content.items) {
        if (!('str' in item)) continue;
        const y = item.transform[5];
        if (lineY !== undefined && Math.abs(y - lineY) > 2 && !text.endsWith('\n')) text += '\n';
        else if (lineEndX !== undefined && item.transform[4] - lineEndX > Math.max(0.3, item.height * 0.15) && !/\s$/.test(text) && !/^\s/.test(item.str)) text += ' ';
        text += item.str + (item.hasEOL ? '\n' : '');
        lineY = y;
        lineEndX = item.transform[4] + item.width;
        if (text.length > IMPORT_MAX_TEXT_LENGTH) throw new Error('IMPORT_TEXT_TOO_LARGE');
      }
      text += '\n';
      page.cleanup();
    }
    if (!text.trim()) throw new Error('IMPORT_PDF_NO_TEXT');
    return validateImportText(text);
  } catch (error) {
    if (error instanceof Error && error.name === 'PasswordException') throw new Error('IMPORT_PDF_PASSWORD');
    if (error instanceof Error && error.message.startsWith('IMPORT_')) throw error;
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    throw new Error('IMPORT_INVALID_PDF');
  } finally {
    signal?.removeEventListener('abort', abort);
    await task.destroy().catch(() => {});
  }
}

export async function extractDocxText(data: Uint8Array) {
  const { unzipSync, strFromU8 } = await import('fflate');
  let entries = 0, expanded = 0, selected = 0;
  try {
    // Inspect directory metadata without expanding any entries first.
    unzipSync(data, { filter: entry => {
      entries++; expanded += entry.originalSize;
      if (entries > DOCX_MAX_ENTRIES || expanded > DOCX_MAX_EXPANDED_BYTES || documentPart(entry.name) && entry.originalSize > DOCX_MAX_XML_BYTES) throw new Error('IMPORT_DOCX_TOO_LARGE');
      if (documentPart(entry.name)) selected += entry.originalSize;
      if (selected > DOCX_MAX_XML_BYTES) throw new Error('IMPORT_DOCX_TOO_LARGE');
      return false;
    } });
    const files = unzipSync(data, { filter: entry => documentPart(entry.name) });
    if (!files['word/document.xml']) throw new Error('IMPORT_INVALID_DOCX');
    const parts = Object.keys(files).sort((a, b) => {
      const rank = (name: string) => name.includes('/header') ? 0 : name === 'word/document.xml' ? 1 : 2;
      return rank(a) - rank(b) || a.localeCompare(b);
    });
    let text = '';
    for (const name of parts) {
      if (files[name].byteLength > DOCX_MAX_XML_BYTES) throw new Error('IMPORT_DOCX_TOO_LARGE');
      const xml = strFromU8(files[name]);
      if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('IMPORT_INVALID_DOCX');
      const document = new DOMParser().parseFromString(xml, 'application/xml');
      if (document.getElementsByTagName('parsererror').length) throw new Error('IMPORT_INVALID_DOCX');
      for (const paragraph of document.getElementsByTagNameNS('*', 'p')) {
        for (const element of paragraph.getElementsByTagName('*')) {
          if (element.localName === 't') text += element.textContent || '';
          else if (element.localName === 'tab') text += '\t';
          else if (element.localName === 'br' || element.localName === 'cr') text += '\n';
          if (text.length > IMPORT_MAX_TEXT_LENGTH) throw new Error('IMPORT_TEXT_TOO_LARGE');
        }
        text += '\n';
      }
    }
    return validateImportText(text);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('IMPORT_')) throw error;
    throw new Error('IMPORT_INVALID_DOCX');
  }
}

export async function readResumeFile(file: File, { signal }: { signal?: AbortSignal } = {}): Promise<ImportedFile> {
  if (file.size > BACKUP_MAX_BYTES) throw new Error('IMPORT_FILE_TOO_LARGE');
  signal?.throwIfAborted();
  const readText = async () => { const text = await file.text(); signal?.throwIfAborted(); return text; };
  const readData = async () => { const data = await file.arrayBuffer(); signal?.throwIfAborted(); return new Uint8Array(data); };
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'json') return { kind: 'backup', document: parseBackup(await readText()) };
  const title = file.name.replace(/\.[^.]+$/, '').trim().slice(0, 1000) || 'Imported resume';
  if (extension === 'txt' || extension === 'md' || extension === 'markdown') return { kind: 'text', title, text: validateImportText(await readText()) };
  if (extension === 'pdf') return { kind: 'text', title, text: await extractPdf(await readData(), signal) };
  if (extension === 'docx') {
    const text = await extractDocxText(await readData());
    signal?.throwIfAborted();
    return { kind: 'text', title, text };
  }
  throw new Error('IMPORT_UNSUPPORTED_FILE');
}
