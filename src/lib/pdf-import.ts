import { MAX_TRANSFER_BYTES, pdfItemsToText, TransferError } from './resume-transfer.ts';
import type { PdfTextItem } from './resume-transfer.ts';

export async function extractPdfText(file: File, onProgress: (page: number, total: number) => void, signal: AbortSignal) {
  if (file.size > MAX_TRANSFER_BYTES) throw new TransferError('fileTooLarge');
  const buffer = await file.arrayBuffer();
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  const header = new TextDecoder().decode(buffer.slice(0, 1024));
  if (!header.includes('%PDF-')) throw new TransferError('invalidPdf');
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  // No remote resources or scripting; the file is parsed entirely in this browser.
  const task = pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true, stopAtErrors: true });
  const abort = () => { void task.destroy(); };
  signal.addEventListener('abort', abort, { once: true });
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 30) throw new TransferError('tooManyPages');
    const pages: string[] = [];
    let length = 0;
    for (let index = 1; index <= pdf.numPages; index++) {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      const page = await pdf.getPage(index);
      const content = await page.getTextContent();
      const text = pdfItemsToText(content.items.filter((item): item is typeof item & PdfTextItem => 'str' in item));
      length += text.length;
      if (length > 200_000) throw new TransferError('tooMuchText');
      pages.push(text);
      page.cleanup();
      onProgress(index, pdf.numPages);
    }
    const text = pages.join('\n\n').trim();
    if (text.replace(/\s/g, '').length < 10) throw new TransferError('noText');
    return text;
  } catch (error) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    if (error instanceof TransferError) throw error;
    if (error instanceof Error && error.name === 'PasswordException') throw new TransferError('passwordPdf');
    throw new TransferError('invalidPdf');
  } finally {
    signal.removeEventListener('abort', abort);
    await task.destroy();
  }
}
