import type { PDFDocument } from 'pdf-lib';
import { languageTag } from './language-tags.ts';

/** What a PDF's properties say about the resume: viewers show the title, robots and readers use the rest. */
export interface PdfMetadata {
  title?: string;
  author?: string;
  /** An app language code such as "fr"; it is written as a language tag ("fr-FR"). */
  language?: string;
}

// Control characters have no place in document properties; the length keeps them readable.
const clean = (value: string | undefined) => (value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);

export function applyPdfMetadata(pdfDoc: PDFDocument, metadata: PdfMetadata): void {
  const title = clean(metadata.title);
  const author = clean(metadata.author);
  // `showInWindowTitleBar` asks viewers to show the title instead of the file name.
  if (title) pdfDoc.setTitle(title, { showInWindowTitleBar: true });
  if (author) pdfDoc.setAuthor(author);
  if (metadata.language) pdfDoc.setLanguage(languageTag(metadata.language));
  pdfDoc.setProducer('Open Resume');
  pdfDoc.setCreator('Open Resume');
}
