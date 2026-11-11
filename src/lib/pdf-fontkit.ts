import { create } from 'fontkit';
import type { PDFDocument } from 'pdf-lib';
type Fontkit = Parameters<PDFDocument['registerFontkit']>[0];
const parsed = new WeakMap<ArrayBufferLike, { offset: number; length: number; font: ReturnType<Fontkit['create']> }>();

/** fontkit 2 fixes CID/CFF subsetting; pdf-lib still expects its older stream API. */
const pdfFontkit: Fontkit = {
  create(bytes) {
    const cached = parsed.get(bytes.buffer);
    if (cached?.offset === bytes.byteOffset && cached.length === bytes.byteLength) return cached.font;
    const font = create(bytes as Parameters<typeof create>[0]);
    if ('fonts' in font) throw new Error('FONT_COLLECTION_UNSUPPORTED');
    const createSubset = font.createSubset.bind(font);
    font.createSubset = () => {
      const subset = createSubset();
      return Object.assign(subset, {
        encodeStream() {
          const handlers: Record<string, (value?: Uint8Array | Error) => void> = {};
          const stream = { on(event: string, handler: (value?: Uint8Array | Error) => void) { handlers[event] = handler; return stream; } };
          queueMicrotask(() => {
            try { handlers.data?.(subset.encode()); handlers.end?.(); }
            catch (error) { handlers.error?.(error instanceof Error ? error : new Error(String(error))); }
          });
          return stream;
        },
      });
    };
    // The two releases expose the same font/glyph API but have different TS declarations.
    const compatible = font as unknown as ReturnType<Fontkit['create']>;
    // Each PDF still creates its own subset. Reuse only the immutable source
    // font, not glyph selections or document-specific embedded font objects.
    parsed.set(bytes.buffer, { offset: bytes.byteOffset, length: bytes.byteLength, font: compatible });
    return compatible;
  },
};
export default pdfFontkit;
