import type { BackgroundPages } from './pdf-background-build.ts';
/** Cache decoration independently of resume text. Keep only two recent designs. */
const cache = new Map<string, Promise<Uint8Array>>();
const paintProperties = ['position', 'display', 'overflow', 'width', 'height', 'left', 'right', 'top', 'bottom', 'margin', 'padding', 'box-sizing', 'border', 'border-radius', 'box-shadow', 'opacity', 'transform', 'transform-origin', 'background', 'background-size', 'background-position', 'background-repeat', 'background-clip', 'filter', 'clip-path', 'z-index'];
let nativeSupport: Promise<boolean> | undefined;
function supportsNativePaint() {
  return nativeSupport ||= (async () => {
    const canvas = document.createElement('canvas'); canvas.width = 2; canvas.height = 2;
    try {
      const image = new Image();
      image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><foreignObject width="2" height="2"><div xmlns="http://www.w3.org/1999/xhtml" style="width:2px;height:2px;background:rgb(255,0,0)"></div></foreignObject></svg>');
      await image.decode(); const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0);
      const pixel = context.getImageData(0, 0, 1, 1).data;
      return pixel[0] === 255 && pixel[1] === 0 && pixel[2] === 0 && pixel[3] === 255;
    } catch { return false; }
    finally { canvas.width = 0; canvas.height = 0; }
  })();
}
interface BackgroundLayout { width: number; height: number; pageHeight: number; cuts: number[]; insets: number[] }

export function getResumeBackgroundPages(source: HTMLElement, layout: BackgroundLayout): Promise<Uint8Array> {
  const clone = source.cloneNode(true) as HTMLElement;
  const originals = [source, ...source.querySelectorAll<HTMLElement>('*')];
  const copies = [clone, ...clone.querySelectorAll<HTMLElement>('*')];
  for (let index = 0; index < originals.length; index++) {
    const computed = source.ownerDocument.defaultView!.getComputedStyle(originals[index]);
    for (const property of paintProperties) copies[index].style.setProperty(property, computed.getPropertyValue(property));
  }
  Object.assign(clone.style, { position: 'relative', left: '0', top: '0', right: 'auto', bottom: 'auto', width: `${layout.width}px`, height: `${layout.height}px`, margin: '0' });
  const html = new XMLSerializer().serializeToString(clone);
  const key = JSON.stringify([html, layout]);
  const cached = cache.get(key);
  if (cached) { cache.delete(key); cache.set(key, cached); return cached; }
  const pending = rasterize(source, html, layout).catch(error => { cache.delete(key); throw error; });
  cache.set(key, pending);
  while (cache.size > 2) cache.delete(cache.keys().next().value!);
  return pending;
}

async function rasterize(source: HTMLElement, html: string, layout: BackgroundLayout) {
  const scale = 3;
  const width = Math.ceil(layout.width * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = Math.ceil(layout.height * scale);
  const context = canvas.getContext('2d', { alpha: false })!;
  context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
  try {
    try {
      // Only six decorative nodes, with their computed paint styles. No cloned
      // editor, stylesheets, photos or fonts are needed for this native SVG pass.
      if (!await supportsNativePaint() || source.textContent?.trim() || source.querySelector('img,canvas,svg')) throw new Error('COMPLEX_BACKGROUND');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${layout.width} ${layout.height}"><foreignObject width="100%" height="100%">${html}</foreignObject></svg>`;
      const image = new Image();
      image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      await image.decode();
      context.drawImage(image, 0, 0);
      // Detect restricted foreignObject implementations before caching a result.
      context.getImageData(0, 0, 1, 1);
    } catch {
      const { default: html2canvas } = await import('html2canvas');
      const fallback = await html2canvas(source, { backgroundColor: null, scale, width: Math.ceil(layout.width), height: layout.height, useCORS: true, logging: false, foreignObjectRendering: true });
      context.drawImage(fallback, 0, 0); fallback.width = 0; fallback.height = 0;
    }
    const pages: ArrayBuffer[] = [];
    for (let index = 0; index < layout.cuts.length - 1; index++) {
      const slice = document.createElement('canvas');
      slice.width = width; slice.height = Math.ceil(layout.pageHeight * scale);
      const paint = slice.getContext('2d', { alpha: false })!;
      paint.fillStyle = '#fff'; paint.fillRect(0, 0, slice.width, slice.height);
      const start = Math.round(layout.cuts[index] * scale), height = Math.round((layout.cuts[index + 1] - layout.cuts[index]) * scale);
      paint.drawImage(canvas, 0, start, width, height, 0, Math.round(layout.insets[index] * scale), width, height);
      const blob = await new Promise<Blob>((resolve, reject) => slice.toBlob(value => value ? resolve(value) : reject(new Error('BACKGROUND_PNG_FAILED')), 'image/png'));
      pages.push(await blob.arrayBuffer());
      slice.width = 0; slice.height = 0;
    }
    canvas.width = 0; canvas.height = 0;
    return await encodeInWorker({ pages, width: layout.width, height: layout.pageHeight });
  } finally { canvas.width = 0; canvas.height = 0; }
}

async function encodeInWorker(data: BackgroundPages): Promise<Uint8Array> {
  let worker: Worker | undefined;
  // Keep source copies for browsers that cannot start a dedicated worker.
  try {
    worker = new Worker(new URL('./pdf-background.worker.ts', import.meta.url), { type: 'module' });
    return await new Promise<Uint8Array>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('BACKGROUND_TIMEOUT')), 45000);
      worker!.onmessage = event => { clearTimeout(timer); event.data.bytes ? resolve(event.data.bytes) : reject(new Error('BACKGROUND_BUILD_FAILED')); };
      worker!.onerror = () => { clearTimeout(timer); reject(new Error('BACKGROUND_WORKER_FAILED')); };
      worker!.postMessage(data);
    });
  } catch {
    const { buildBackgroundPdf } = await import('./pdf-background-build.ts');
    return buildBackgroundPdf(data);
  } finally { worker?.terminate(); }
}
