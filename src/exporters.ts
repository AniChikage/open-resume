import fontkit from '@pdf-lib/fontkit';
import type { PDFFont,PDFPage,RGB } from 'pdf-lib';
import { PDFDocument,rgb } from 'pdf-lib';
import { A4_HEIGHT_MM,A4_WIDTH_MM,getSmartPageCuts } from './lib/pagination.ts';
import { downloadBlob } from './lib/download.ts';
type FontSet = { normal:PDFFont; bold:PDFFont };
type CssColor = { color:RGB; opacity:number; raw?:{r:number;g:number;b:number} };
type TextOptions = {bold?:boolean;maxWidth?:number;lineRatio?:number;bulletIndent?:number};
type Box = {left:number;right:number;top:number;bottom:number;width:number;height:number};
type TextRun = {text:string;rect:Box;topKey?:number};

const VECTOR_FONT_URLS: Record<string,{normal:string;bold:string}> = {
  yahei: {
    normal: '/fonts/NotoSansCJKsc-Regular.otf',
    bold: '/fonts/NotoSansCJKsc-Bold.otf'
  },
  heiti: {
    normal: '/fonts/NotoSansCJKsc-Regular.otf',
    bold: '/fonts/NotoSansCJKsc-Bold.otf'
  },
  songti: {
    normal: '/fonts/NotoSerifCJKsc-Regular.otf',
    bold: '/fonts/NotoSerifCJKsc-Bold.otf'
  },
  kaiti: {
    normal: '/fonts/NotoSerifCJKsc-Regular.otf',
    bold: '/fonts/NotoSerifCJKsc-Bold.otf'
  },
  fangsong: {
    normal: '/fonts/NotoSerifCJKsc-Regular.otf',
    bold: '/fonts/NotoSerifCJKsc-Bold.otf'
  }
};
const PAGE_WIDTH_PT = mmToPt(A4_WIDTH_MM);
const PAGE_HEIGHT_PT = mmToPt(A4_HEIGHT_MM);

const vectorFontBytesPromises: Map<string, Promise<ArrayBuffer>> = new Map();

export const exportResumeAsDomVectorPdf = async (node: HTMLElement, filename = 'resume.pdf') => {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const rootStyle = node.ownerDocument.defaultView!.getComputedStyle(node);
  const fontSet = await getPdfFontSet(pdfDoc, getFontFamilyKey(rootStyle.fontFamily));
  const renderer = new DomVectorPdfRenderer(pdfDoc, fontSet, node);
  await renderer.render();
  const bytes = await pdfDoc.save();
  downloadBlob(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }), filename);
};

async function getPdfFontSet(pdfDoc: PDFDocument, familyKey: string = 'yahei') {
  const family = VECTOR_FONT_URLS[familyKey] || VECTOR_FONT_URLS.yahei;
  const [normalBytes, boldBytes] = await Promise.all([
    getVectorFontBytes(family.normal),
    getVectorFontBytes(family.bold)
  ]);
  return {
    normal: await pdfDoc.embedFont(normalBytes, { subset: true }),
    bold: await pdfDoc.embedFont(boldBytes, { subset: true })
  };
}

async function getVectorFontBytes(url: string) {
  if (!vectorFontBytesPromises.has(url)) {
    vectorFontBytesPromises.set(url, fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`VECTOR_FONT_LOAD_FAILED:${res.status}`);
        return res.arrayBuffer();
      }).catch(error => { vectorFontBytesPromises.delete(url); throw error; }));
  }
  return vectorFontBytesPromises.get(url)!;
}

function getFontFamilyKey(fontFamily: string) {
  const family = String(fontFamily || '').toLowerCase();
  if (family.includes('simhei') || family.includes('hei') || family.includes('黑体')) return 'heiti';
  if (family.includes('simsun') || family.includes('song') || family.includes('宋体')) return 'songti';
  if (family.includes('kaiti') || family.includes('kai') || family.includes('楷体')) return 'kaiti';
  if (family.includes('fangsong') || family.includes('fang') || family.includes('仿宋')) return 'fangsong';
  return 'yahei';
}

class DomVectorPdfRenderer {
  declare pdfDoc: PDFDocument;
  declare fontSet: FontSet;
  declare font: PDFFont;
  declare page: PDFPage | null;
  declare node: HTMLElement;
  declare rootRect: DOMRect;
  declare scale: number;
  declare cssPageHeight: number;
  declare totalHeight: number;
  declare cuts: number[];
  declare pageTop: number;
  declare pageBottom: number;
  declare _bgPages: string[] | null | undefined;

  constructor(pdfDoc: PDFDocument, fontSet: FontSet, node: HTMLElement) {
    this.pdfDoc = pdfDoc;
    this.fontSet = fontSet;
    this.font = fontSet.normal;
    this.node = node;
    this.rootRect = node.getBoundingClientRect();
    this.scale = PAGE_WIDTH_PT / this.rootRect.width;
    this.cssPageHeight = this.rootRect.width * (A4_HEIGHT_MM / A4_WIDTH_MM);
    this.totalHeight = Math.ceil(Math.max(this.rootRect.height, node.scrollHeight, this.cssPageHeight));
    this.cuts = getSmartPageCuts(node, this.cssPageHeight, { totalHeight: this.totalHeight });
    this.page = null;
    this.pageTop = 0;
    this.pageBottom = 0;
  }

  async render() {
    await this.drawBgLayer();
    for (let index = 0; index < this.cuts.length - 1; index += 1) {
      this.pageTop = this.cuts[index];
      this.pageBottom = this.cuts[index + 1];
      this.page = this.pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);
      await this.drawPageBg(index);
      this.drawElementBackgrounds();
      this.drawElementBorders();
      await this.drawImages();
      this.drawListMarkers();
      this.drawTextNodes();
    }
  }

  async drawBgLayer() {
    const bgEl = this.node.querySelector<HTMLElement>('.resume-bg');
    if (!bgEl) { this._bgPages = null; return; }
    const scale = 3;
    const w = Math.ceil(this.rootRect.width * scale);
    const h = Math.ceil(this.totalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const bgCanvas = await html2canvas(bgEl, {
        backgroundColor: null,
        scale,
        width: Math.ceil(this.rootRect.width),
        height: this.totalHeight,
        useCORS: true,
        logging: false,
        foreignObjectRendering: true
      });
      ctx.drawImage(bgCanvas, 0, 0);
    } catch { /* fallback: no bg decoration */ }
    const pageH = Math.ceil(this.cssPageHeight * scale);
    this._bgPages = [];
    for (let i = 0; i < this.cuts.length - 1; i++) {
      const y = Math.round(this.cuts[i] * scale);
      const sliceH = Math.round((this.cuts[i + 1] - this.cuts[i]) * scale);
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = w;
      pageCanvas.height = pageH;
      const pCtx = pageCanvas.getContext('2d')!;
      pCtx.fillStyle = '#ffffff';
      pCtx.fillRect(0, 0, w, pageH);
      pCtx.drawImage(canvas, 0, y, w, sliceH, 0, 0, w, sliceH);
      this._bgPages.push(pageCanvas.toDataURL('image/png'));
    }
  }

  async drawPageBg(pageIndex: number) {
    if (!this._bgPages || !this._bgPages[pageIndex]) return;
    try {
      const dataUrl = this._bgPages[pageIndex];
      const res = await fetch(dataUrl);
      const bytes = new Uint8Array(await res.arrayBuffer());
      const img = await this.pdfDoc.embedPng(bytes);
      this.page!.drawImage(img, { x: 0, y: 0, width: PAGE_WIDTH_PT, height: PAGE_HEIGHT_PT });
    } catch { /* skip bg */ }
  }

  drawElementBackgrounds() {
    Array.from(this.node.querySelectorAll('*')).forEach((el) => {
      const style = el.ownerDocument.defaultView!.getComputedStyle(el);
      const fill = parseCssColor(style.backgroundColor);
      if (!fill || isEffectivelyWhite(fill)) return;
      Array.from(el.getClientRects()).forEach((rect) => {
        this.drawCssRect(rect, fill);
      });
    });
  }

  drawElementBorders() {
    Array.from(this.node.querySelectorAll('*')).forEach((el) => {
      const style = el.ownerDocument.defaultView!.getComputedStyle(el);
      const rects = Array.from(el.getClientRects());
      rects.forEach((rect) => {
        this.drawBorderSide(rect.left, rect.top, rect.width, parseFloat(style.borderTopWidth), style.borderTopStyle, style.borderTopColor);
        this.drawBorderSide(rect.left, rect.bottom - parseFloat(style.borderBottomWidth), rect.width, parseFloat(style.borderBottomWidth), style.borderBottomStyle, style.borderBottomColor);
        this.drawBorderSide(rect.left, rect.top, parseFloat(style.borderLeftWidth), rect.height, style.borderLeftStyle, style.borderLeftColor);
        this.drawBorderSide(rect.right - parseFloat(style.borderRightWidth), rect.top, parseFloat(style.borderRightWidth), rect.height, style.borderRightStyle, style.borderRightColor);
      });
    });
  }

  drawBorderSide(left: number, top: number, width: number, height: number, styleName: string, colorValue: string) {
    if (!width || !height || styleName === 'none' || styleName === 'hidden') return;
    const color = parseCssColor(colorValue);
    if (!color) return;
    this.drawCssBox(left - this.rootRect.left, top - this.rootRect.top, width, height, color);
  }

  async drawImages() {
    const images = Array.from(this.node.querySelectorAll('img'));
    for (const image of images) {
      const rect = image.getBoundingClientRect();
      if (!this.intersectsPage(rect)) continue;
      const src = image.currentSrc || image.src;
      if (!src) continue;
      try {
        const bytes = await fetchImageBytes(src);
        const embedded = /image\/png|\\.png(?:$|[?#])/i.test(src)
          ? await this.pdfDoc.embedPng(bytes)
          : await this.pdfDoc.embedJpg(bytes);
        const box = this.rectToPageBox(rect);
        if (box) this.page!.drawImage(embedded, box);
      } catch {
        // Keep the rest of the vector export intact if a user image cannot be embedded.
      }
    }
  }

  drawListMarkers() {
    Array.from(this.node.querySelectorAll('li')).forEach((li) => {
      const textRect = getFirstTextRect(li);
      if (!textRect || !this.intersectsPage(textRect)) return;
      const marker = getListMarker(li);
      if (!marker) return;
      const style = li.ownerDocument.defaultView!.getComputedStyle(li);
      const color = parseCssColor(style.color) || { color: rgb(0, 0, 0), opacity: 1 };
      const fontSize = parseFloat(style.fontSize || '13') * this.scale;
      const markerWidth = this.font.widthOfTextAtSize(marker, fontSize);
      const markerGap = 5 * this.scale;
      const x = (textRect.left - this.rootRect.left) * this.scale - markerWidth - markerGap;
      const yTop = (textRect.top - this.rootRect.top - this.pageTop) * this.scale;
      this.drawPdfText(marker, x, yTop, fontSize, color, { maxWidth: markerWidth + markerGap });
    });
  }

  drawTextNodes() {
    const walker = this.node.ownerDocument.createTreeWalker(this.node, NodeFilter.SHOW_TEXT);
    const range = this.node.ownerDocument.createRange();
    let textNode = walker.nextNode();
    while (textNode) {
      this.drawTextNode(textNode, range);
      textNode = walker.nextNode();
    }
    range.detach();
  }

  drawTextNode(textNode: Node, range: Range) {
    const parent = textNode.parentElement;
    if (!parent || !String(textNode.textContent || '').trim()) return;
    const style = parent.ownerDocument.defaultView!.getComputedStyle(parent);
    if (style.display === 'none' || style.visibility === 'hidden') return;

    const runs: TextRun[] = getTextLineRuns(textNode, range);
    const color = parseCssColor(style.color) || { color: rgb(0, 0, 0), opacity: 1 };
    const fontSize = parseFloat(style.fontSize || '12') * this.scale;
    const bold = Number.parseInt(style.fontWeight, 10) >= 600 || style.fontWeight === 'bold';
    const underline = String(style.textDecorationLine || '').includes('underline');
    const transform = style.textTransform;

    runs.forEach((run) => {
      if (!this.intersectsPage(run.rect)) return;
      const x = (run.rect.left - this.rootRect.left) * this.scale;
      const yTop = (run.rect.top - this.rootRect.top - this.pageTop) * this.scale;
      const maxWidth = run.rect.width * this.scale + 2;
      const text = applyTextTransform(run.text, transform);
      this.drawPdfText(text, x, yTop, fontSize, color, { bold, maxWidth });
      if (underline) {
        const y = yTop + fontSize + 1.5 * this.scale;
        this.page!.drawLine({
          start: { x, y: PAGE_HEIGHT_PT - y },
          end: { x: x + Math.min(maxWidth, this.font.widthOfTextAtSize(text, fontSize)), y: PAGE_HEIGHT_PT - y },
          thickness: Math.max(0.4, this.scale),
          color: color.color,
          opacity: color.opacity
        });
      }
    });
  }

  drawPdfText(text: string, x: number, yTop: number, size: number, color: CssColor, options: TextOptions = {}) {
    if (!text) return;
    const clipped = text;
    const y = PAGE_HEIGHT_PT - yTop - size;
    const font = options.bold ? this.fontSet.bold : this.fontSet.normal;
    this.page!.drawText(clipped, {
      x,
      y,
      size,
      font,
      color: color.color,
      opacity: color.opacity
    });
  }

  drawCssRect(rect: Box, color: CssColor) {
    this.drawCssBox(rect.left - this.rootRect.left, rect.top - this.rootRect.top, rect.width, rect.height, color);
  }

  drawCssBox(left: number, top: number, width: number, height: number, color: CssColor) {
    const clippedTop = Math.max(top, this.pageTop);
    const clippedBottom = Math.min(top + height, this.pageBottom);
    if (clippedBottom <= clippedTop || width <= 0) return;
    const x = left * this.scale;
    const yTop = (clippedTop - this.pageTop) * this.scale;
    const h = (clippedBottom - clippedTop) * this.scale;
    this.page!.drawRectangle({
      x,
      y: PAGE_HEIGHT_PT - yTop - h,
      width: width * this.scale,
      height: h,
      color: color.color,
      opacity: color.opacity
    });
  }

  rectToPageBox(rect: Box) {
    const top = rect.top - this.rootRect.top;
    const bottom = rect.bottom - this.rootRect.top;
    const clippedTop = Math.max(top, this.pageTop);
    const clippedBottom = Math.min(bottom, this.pageBottom);
    if (clippedBottom <= clippedTop) return null;
    const x = (rect.left - this.rootRect.left) * this.scale;
    const yTop = (clippedTop - this.pageTop) * this.scale;
    const h = (clippedBottom - clippedTop) * this.scale;
    return {
      x,
      y: PAGE_HEIGHT_PT - yTop - h,
      width: rect.width * this.scale,
      height: h
    };
  }

  intersectsPage(rect: Box) {
    const top = rect.top - this.rootRect.top;
    const bottom = rect.bottom - this.rootRect.top;
    return bottom > this.pageTop && top < this.pageBottom;
  }
}

function mmToPt(mm: number) {
  return (mm * 72) / 25.4;
}

function toRgb(hex: string) {
  const fallback = '#000000';
  const raw = String(hex || fallback).trim();
  const value = raw.startsWith('#') ? raw.slice(1) : raw;
  const normalized = value.length === 3
    ? value.split('').map((char) => `${char}${char}`).join('')
    : value.padEnd(6, '0').slice(0, 6);
  const int = Number.parseInt(normalized, 16);
  if (!Number.isFinite(int)) return rgb(0, 0, 0);
  return rgb(((int >> 16) & 255) / 255, ((int >> 8) & 255) / 255, (int & 255) / 255);
}

function parseCssColor(value: string) {
  const raw = String(value || '').trim();
  if (!raw || raw === 'transparent') return null;
  const rgba = raw.match(/^rgba?\(([^)]+)\)$/i);
  if (rgba) {
    const parts = rgba[1].split(',').map((part) => part.trim());
    const r = Number.parseFloat(parts[0]);
    const g = Number.parseFloat(parts[1]);
    const b = Number.parseFloat(parts[2]);
    const a = parts[3] === undefined ? 1 : Number.parseFloat(parts[3]);
    if (![r, g, b, a].every(Number.isFinite) || a <= 0) return null;
    return { color: rgb(r / 255, g / 255, b / 255), opacity: Math.max(0, Math.min(a, 1)), raw: { r, g, b } };
  }
  if (raw.startsWith('#')) {
    const color = toRgb(raw);
    const value6 = raw.length === 4
      ? raw.slice(1).split('').map((char) => `${char}${char}`).join('')
      : raw.slice(1).padEnd(6, '0').slice(0, 6);
    const int = Number.parseInt(value6, 16);
    return {
      color,
      opacity: 1,
      raw: { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 }
    };
  }
  return null;
}

function isEffectivelyWhite(color: CssColor) {
  return color.opacity >= 1 && color.raw && color.raw.r >= 250 && color.raw.g >= 250 && color.raw.b >= 250;
}

function getTextLineRuns(textNode: Node, range: Range) {
  const text = textNode.textContent || '';
  const runs: TextRun[] = [];
  let current: (TextRun & {topKey:number}) | null = null;
  let offset = 0;

  for (const char of Array.from(text)) {
    const start = offset;
    const end = offset + char.length;
    offset = end;

    if (!char.trim() && !current) continue;
    range.setStart(textNode, start);
    range.setEnd(textNode, end);
    const rect = Array.from(range.getClientRects()).find((item) => item.width || item.height);
    if (!rect) {
      if (current && /\s/.test(char)) current.text += char;
      continue;
    }

    const topKey = Math.round(rect.top * 2) / 2;
    if (!current || Math.abs(current.topKey - topKey) > 1.5) {
      current = {
        text: char,
        topKey,
        rect: {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height
        }
      };
      runs.push(current);
    } else {
      current.text += char;
      current.rect.left = Math.min(current.rect.left, rect.left);
      current.rect.top = Math.min(current.rect.top, rect.top);
      current.rect.right = Math.max(current.rect.right, rect.right);
      current.rect.bottom = Math.max(current.rect.bottom, rect.bottom);
      current.rect.width = current.rect.right - current.rect.left;
      current.rect.height = current.rect.bottom - current.rect.top;
    }
  }

  return runs.map((run) => ({ text: run.text.replace(/\s+/g, ' '), rect: run.rect })).filter((run) => run.text.trim());
}

function getFirstTextRect(root: Element) {
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = root.ownerDocument.createRange();
  let node = walker.nextNode();
  while (node) {
    if (String(node.textContent || '').trim()) {
      range.selectNodeContents(node);
      const rect = Array.from(range.getClientRects()).find((item) => item.width || item.height);
      range.detach();
      if (rect) return rect;
      return null;
    }
    node = walker.nextNode();
  }
  range.detach();
  return null;
}

function getListMarker(li: HTMLLIElement) {
  const parent = li.parentElement;
  if (!parent) return '';
  const tag = parent.tagName;
  if (tag === 'UL') return '•';
  if (tag !== 'OL') return '';
  const start = Number.parseInt(parent.getAttribute('start') || '1', 10);
  const index = Array.from(parent.children).filter((child) => child.tagName === 'LI').indexOf(li);
  return `${(Number.isFinite(start) ? start : 1) + Math.max(0, index)}.`;
}

function applyTextTransform(text: string, transform: string) {
  if (transform === 'uppercase') return text.toUpperCase();
  if (transform === 'lowercase') return text.toLowerCase();
  if (transform === 'capitalize') return text.replace(/(^|\s)(\S)/g, (match) => match.toUpperCase());
  return text;
}

async function fetchImageBytes(src: string) {
  if (src.startsWith('data:')) {
    const [, payload = ''] = src.split(',');
    return base64ToUint8Array(payload);
  }
  const res = await fetch(src);
  if (!res.ok) throw new Error(`IMAGE_LOAD_FAILED:${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

function base64ToUint8Array(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
