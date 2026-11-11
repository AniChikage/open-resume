import { PDFDocument } from 'pdf-lib';
export interface BackgroundPages { pages: ArrayBuffer[]; width: number; height: number }

/** PNG decoding and stream compression run outside the UI thread. */
export async function buildBackgroundPdf({ pages, width, height }: BackgroundPages) {
  const document = await PDFDocument.create();
  for (const bytes of pages) {
    const image = await document.embedPng(bytes);
    document.addPage([width, height]).drawImage(image, { x: 0, y: 0, width, height });
    await image.embed();
  }
  return document.save();
}
