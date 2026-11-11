import { getPaperSize } from './paper.ts';
import { getPdfPageLayout } from './pdf-layout.ts';
import { saveCanvasAsPng } from './png-export.ts';
import { registerPdfLayoutFonts } from './pdf-fonts.ts';

export interface PdfTarget { id: string; label: string; left: number; top: number; width: number; height: number }
export interface PdfSnapshot {
  bytes: Uint8Array; width: number; height: number; cuts: number[]; insets: number[]; targets: PdfTarget[]; paper: string;
}

// Preview and download request the same immutable document. A failed build can
// be retried, and an older build can never replace the latest cached document.
export function createPdfCache<T>() {
  let selected = '';
  let cached: { key: string; value: T } | null = null;
  const pending = new Map<string, Promise<T>>();
  return {
    select(key: string) { selected = key; },
    get(key: string, build: () => Promise<T>): Promise<T> {
      if (cached?.key === key) return Promise.resolve(cached.value);
      const existing = pending.get(key);
      if (existing) return existing;
      const promise = Promise.resolve().then(build).then(value => {
        if (selected === key) cached = { key, value };
        return value;
      }).finally(() => pending.delete(key));
      pending.set(key, promise);
      return promise;
    },
  };
}

/** Isolate a document before waiting for fonts, so typing cannot change a build. */
export async function createExportSurface(source: HTMLElement) {
  const paper = getPaperSize(source.dataset.paperSize);
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  frame.style.cssText = `position:fixed;left:-10000px;top:0;width:${paper.widthMm}mm;height:${paper.heightMm}mm;border:0;pointer-events:none`;
  document.body.appendChild(frame);
  try {
    const doc = frame.contentDocument;
    if (!doc) throw new Error('EXPORT_FRAME_UNAVAILABLE');
    doc.open();
    doc.write('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');
    doc.close();
    const stylesheetLoads: Promise<void>[] = [];
    for (const original of document.querySelectorAll<HTMLStyleElement | HTMLLinkElement>('style, link[rel="stylesheet"]')) {
      const copy = doc.importNode(original, true);
      if (copy.tagName === 'LINK') {
        (copy as HTMLLinkElement).href = (original as HTMLLinkElement).href;
        stylesheetLoads.push(new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('EXPORT_STYLES_TIMEOUT')), 15000);
          copy.onload = () => { clearTimeout(timeout); resolve(); };
          copy.onerror = () => { clearTimeout(timeout); reject(new Error('EXPORT_STYLES_FAILED')); };
        }));
      }
      doc.head.appendChild(copy);
    }
    const overrides = doc.createElement('style');
    overrides.textContent = `html,body{width:${paper.widthMm}mm;min-height:${paper.heightMm}mm;margin:0;background:white} .resume-paper{width:${paper.widthMm}mm!important;min-height:${paper.heightMm}mm!important;margin:0!important;transform:none!important;box-shadow:none!important;border-radius:0!important;visibility:visible!important}`;
    doc.head.appendChild(overrides);
    const node = doc.importNode(source, true);
    const originalDisplay = node.style.display;
    node.style.display = 'none';
    node.style.setProperty('--preview-scale', '1');
    doc.body.appendChild(node);
    await Promise.all(stylesheetLoads);
    // Measure using the exact bundled font that the PDF embeds. Measuring with
    // a system font can otherwise overlap adjacent runs or change line breaks.
    const family = await registerPdfLayoutFonts(doc, doc.defaultView!.getComputedStyle(node).fontFamily, node.textContent || '');
    overrides.textContent += `.resume-paper,.resume-paper *{font-family:"${family}"!important;font-kerning:none!important;font-variant-ligatures:none!important}`;
    node.style.display = originalDisplay;
    // Force font discovery after inserting the clone, then wait for its fonts.
    node.getBoundingClientRect();
    await doc.fonts.ready;
    await Promise.all([...node.querySelectorAll('img')].map(async image => {
      try {
        await image.decode();
        // Normalize image formats and object-fit crops before embedding in PDF.
        const rect = image.getBoundingClientRect();
        if (!rect.width || !rect.height || !image.naturalWidth) return;
        const canvas = doc.createElement('canvas');
        canvas.width = Math.ceil(rect.width * 2);
        canvas.height = Math.ceil(rect.height * 2);
        const context = canvas.getContext('2d')!;
        const fit = doc.defaultView!.getComputedStyle(image).objectFit;
        const scale = fit === 'cover' ? Math.max(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight) : fit === 'contain' ? Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight) : 0;
        const width = scale ? image.naturalWidth * scale : canvas.width;
        const height = scale ? image.naturalHeight * scale : canvas.height;
        context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
        image.src = canvas.toDataURL('image/png');
        await image.decode();
      } catch { /* Unavailable optional photos do not discard the resume text. */ }
    }));
    await new Promise<void>(resolve => frame.contentWindow!.requestAnimationFrame(() => frame.contentWindow!.requestAnimationFrame(() => resolve())));
    return { node, destroy: () => frame.remove() };
  } catch (error) {
    frame.remove();
    throw error;
  }
}

export async function createPdfSnapshot(source: HTMLElement, isCurrent: () => boolean = () => true): Promise<PdfSnapshot> {
  const surface = await createExportSurface(source);
  try {
    if (!isCurrent()) throw new Error('PREVIEW_CHANGED');
    const { buildResumePdf } = await import('../exporters.ts');
    if (!isCurrent()) throw new Error('PREVIEW_CHANGED');
    const rect = surface.node.getBoundingClientRect();
    const paper = getPaperSize(surface.node.dataset.paperSize);
    const layout = getPdfPageLayout(surface.node);
    const targets = [...surface.node.querySelectorAll<HTMLElement>('[data-preview-target]')].map(node => {
      const box = node.getBoundingClientRect();
      return { id: node.dataset.previewTarget || '', label: (node.textContent || '').trim().slice(0, 80), left: box.left - rect.left, top: box.top - rect.top, width: box.width, height: box.height };
    });
    const bytes = await buildResumePdf(surface.node);
    return { bytes, ...layout, targets, paper: paper.label };
  } finally { surface.destroy(); }
}

export function downloadPdfSnapshot(snapshot: PdfSnapshot, filename: string) {
  downloadBlob(new Blob([new Uint8Array(snapshot.bytes)], { type: 'application/pdf' }), filename);
}

export async function downloadPdfSnapshotAsPng(snapshot: PdfSnapshot, filename: string) {
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const task = pdfjs.getDocument({ data: snapshot.bytes.slice() });
  const canvas = document.createElement('canvas');
  const pageCanvas = document.createElement('canvas');
  pageCanvas.style.cssText = 'position:fixed;left:-10000px;top:0;visibility:hidden';
  document.body.appendChild(pageCanvas);
  try {
    const pdf = await task.promise;
    const width = Math.ceil(snapshot.width * 2);
    const height = Math.ceil(snapshot.height * 2);
    canvas.width = width;
    canvas.height = height * pdf.numPages;
    const context = canvas.getContext('2d');
    if (!context || !canvas.height) throw new Error('PNG_CANVAS_UNAVAILABLE');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    for (let index = 1; index <= pdf.numPages; index++) {
      const page = await pdf.getPage(index);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: snapshot.width / base.width * 2 });
      pageCanvas.width = width; pageCanvas.height = height;
      await page.render({ canvas: pageCanvas, viewport }).promise;
      context.drawImage(pageCanvas, 0, (index - 1) * height);
    }
    await saveCanvasAsPng(canvas, filename, downloadBlob);
  } finally {
    pageCanvas.remove();
    canvas.width = 0; canvas.height = 0;
    await task.destroy();
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  try { link.click(); } finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
