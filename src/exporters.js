import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {
  DEFAULT_SETTINGS,
  SECTION_TEMPLATES,
  TEMPLATE_ACCENTS,
  TEMPLATE_VARIANTS
} from './data.js';
import { A4_HEIGHT_MM, A4_WIDTH_MM, getSmartPageCuts } from './lib/pagination.js';
import { saveCanvasAsPng } from './lib/png-export.js';

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  try {
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(url);
  }
};

const getCanvas = async (node, optionsOverride = {}) => {
  await document.fonts?.ready;
  const rect = node.getBoundingClientRect();
  const width = Math.ceil(rect.width || node.scrollWidth);
  const height = Math.ceil(Math.max(rect.height, node.scrollHeight));
  const options = {
    backgroundColor: '#ffffff',
    scale: optionsOverride.scale ?? 2,
    useCORS: true,
    logging: false,
    width,
    height,
    windowWidth: width,
    windowHeight: height,
    scrollX: 0,
    scrollY: 0,
    ...optionsOverride
  };

  try {
    return await html2canvas(node, {
      ...options,
      foreignObjectRendering: true
    });
  } catch {
    return html2canvas(node, options);
  }
};

const PDF_EPSILON_MM = 0.5;
const PDF_CANVAS_SCALE = 4;
const VECTOR_FONT_URLS = {
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
const PX_TO_PT = 0.75;

const vectorFontBytesPromises = new Map();

const addCanvasToPdfPage = (pdf, canvas, orientation = 'portrait') => {
  const pageWidth = orientation === 'landscape' ? 297 : 210;
  const pageHeight = orientation === 'landscape' ? 210 : 297;
  const imgRatio = canvas.width / canvas.height;
  const pageRatio = pageWidth / pageHeight;
  let width = pageWidth;
  let height = pageHeight;
  let x = 0;
  let y = 0;

  if (imgRatio > pageRatio) {
    height = pageWidth / imgRatio;
    y = (pageHeight - height) / 2;
  } else {
    width = pageHeight * imgRatio;
    x = (pageWidth - width) / 2;
  }

  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', x, y, width, height, undefined, 'FAST');
};

export const exportResumeAsPdf = async (node, filename = 'resume.pdf') => {
  const canvas = await getCanvas(node, { scale: PDF_CANVAS_SCALE });
  const pdf = new jsPDF('p', 'mm', 'a4');
  const imgHeightMm = (canvas.height * A4_WIDTH_MM) / canvas.width;

  if (imgHeightMm <= A4_HEIGHT_MM + PDF_EPSILON_MM) {
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, undefined, 'FAST');
    pdf.save(filename);
    return;
  }

  const pageHeightPx = Math.floor((canvas.width * A4_HEIGHT_MM) / A4_WIDTH_MM);
  const rootRect = node.getBoundingClientRect();
  const cssHeight = Math.ceil(Math.max(rootRect.height, node.scrollHeight));
  const pageCuts = getSmartPageCuts(node, pageHeightPx, {
    totalHeight: canvas.height,
    scaleY: cssHeight ? canvas.height / cssHeight : 1
  });
  for (let pageIndex = 0; pageIndex < pageCuts.length - 1; pageIndex += 1) {
    const y = pageCuts[pageIndex];
    const nextY = pageCuts[pageIndex + 1];
    const sliceHeight = nextY - y;
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = pageHeightPx;
    const ctx = pageCanvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    ctx.drawImage(canvas, 0, y, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
    if (pageIndex > 0) pdf.addPage();
    pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, undefined, 'FAST');
  }
  pdf.save(filename);
};

export const exportResumeAsVectorPdf = async (resume, settings = DEFAULT_SETTINGS, filename = 'resume.pdf') => {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const fontSet = await getPdfFontSet(pdfDoc, getFontFamilyKey(settings.fontFamily));
  const renderer = new VectorResumeRenderer(pdfDoc, fontSet, resume, settings);
  await renderer.render();
  const bytes = await pdfDoc.save();
  downloadBlob(new Blob([bytes], { type: 'application/pdf' }), filename);
};

export const exportResumeAsDomVectorPdf = async (node, filename = 'resume.pdf') => {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const rootStyle = node.ownerDocument.defaultView.getComputedStyle(node);
  const fontSet = await getPdfFontSet(pdfDoc, getFontFamilyKey(rootStyle.fontFamily));
  const renderer = new DomVectorPdfRenderer(pdfDoc, fontSet, node);
  await renderer.render();
  const bytes = await pdfDoc.save();
  downloadBlob(new Blob([bytes], { type: 'application/pdf' }), filename);
};

async function getPdfFontSet(pdfDoc, familyKey = 'yahei') {
  const family = VECTOR_FONT_URLS[familyKey] || VECTOR_FONT_URLS.yahei;
  const [normalBytes, boldBytes] = await Promise.all([
    getVectorFontBytes(family.normal),
    getVectorFontBytes(family.bold)
  ]);
  return {
    normal: await pdfDoc.embedFont(normalBytes, { subset: false }),
    bold: await pdfDoc.embedFont(boldBytes, { subset: false })
  };
}

async function getVectorFontBytes(url) {
  if (!vectorFontBytesPromises.has(url)) {
    vectorFontBytesPromises.set(url, fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`VECTOR_FONT_LOAD_FAILED:${res.status}`);
        return res.arrayBuffer();
      }));
  }
  return vectorFontBytesPromises.get(url);
}

function getFontFamilyKey(fontFamily) {
  const family = String(fontFamily || '').toLowerCase();
  if (family.includes('simhei') || family.includes('hei') || family.includes('黑体')) return 'heiti';
  if (family.includes('simsun') || family.includes('song') || family.includes('宋体')) return 'songti';
  if (family.includes('kaiti') || family.includes('kai') || family.includes('楷体')) return 'kaiti';
  if (family.includes('fangsong') || family.includes('fang') || family.includes('仿宋')) return 'fangsong';
  return 'yahei';
}

class DomVectorPdfRenderer {
  constructor(pdfDoc, fontSet, node) {
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
    const bgEl = this.node.querySelector('.resume-bg');
    if (!bgEl) { this._bgPages = null; return; }
    const scale = 3;
    const w = Math.ceil(this.rootRect.width * scale);
    const h = Math.ceil(this.totalHeight * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
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
      const pCtx = pageCanvas.getContext('2d');
      pCtx.fillStyle = '#ffffff';
      pCtx.fillRect(0, 0, w, pageH);
      pCtx.drawImage(canvas, 0, y, w, sliceH, 0, 0, w, sliceH);
      this._bgPages.push(pageCanvas.toDataURL('image/png'));
    }
  }

  async drawPageBg(pageIndex) {
    if (!this._bgPages || !this._bgPages[pageIndex]) return;
    try {
      const dataUrl = this._bgPages[pageIndex];
      const res = await fetch(dataUrl);
      const bytes = new Uint8Array(await res.arrayBuffer());
      const img = await this.pdfDoc.embedPng(bytes);
      this.page.drawImage(img, { x: 0, y: 0, width: PAGE_WIDTH_PT, height: PAGE_HEIGHT_PT });
    } catch { /* skip bg */ }
  }

  drawElementBackgrounds() {
    Array.from(this.node.querySelectorAll('*')).forEach((el) => {
      const style = el.ownerDocument.defaultView.getComputedStyle(el);
      const fill = parseCssColor(style.backgroundColor);
      if (!fill || isEffectivelyWhite(fill)) return;
      Array.from(el.getClientRects()).forEach((rect) => {
        this.drawCssRect(rect, fill);
      });
    });
  }

  drawElementBorders() {
    Array.from(this.node.querySelectorAll('*')).forEach((el) => {
      const style = el.ownerDocument.defaultView.getComputedStyle(el);
      const rects = Array.from(el.getClientRects());
      rects.forEach((rect) => {
        this.drawBorderSide(rect.left, rect.top, rect.width, parseFloat(style.borderTopWidth), style.borderTopStyle, style.borderTopColor);
        this.drawBorderSide(rect.left, rect.bottom - parseFloat(style.borderBottomWidth), rect.width, parseFloat(style.borderBottomWidth), style.borderBottomStyle, style.borderBottomColor);
        this.drawBorderSide(rect.left, rect.top, parseFloat(style.borderLeftWidth), rect.height, style.borderLeftStyle, style.borderLeftColor);
        this.drawBorderSide(rect.right - parseFloat(style.borderRightWidth), rect.top, parseFloat(style.borderRightWidth), rect.height, style.borderRightStyle, style.borderRightColor);
      });
    });
  }

  drawBorderSide(left, top, width, height, styleName, colorValue) {
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
        if (box) this.page.drawImage(embedded, box);
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
      const style = li.ownerDocument.defaultView.getComputedStyle(li);
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

  drawTextNode(textNode, range) {
    const parent = textNode.parentElement;
    if (!parent || !String(textNode.textContent || '').trim()) return;
    const style = parent.ownerDocument.defaultView.getComputedStyle(parent);
    if (style.display === 'none' || style.visibility === 'hidden') return;

    const runs = getTextLineRuns(textNode, range);
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
        this.page.drawLine({
          start: { x, y: PAGE_HEIGHT_PT - y },
          end: { x: x + Math.min(maxWidth, this.font.widthOfTextAtSize(text, fontSize)), y: PAGE_HEIGHT_PT - y },
          thickness: Math.max(0.4, this.scale),
          color: color.color,
          opacity: color.opacity
        });
      }
    });
  }

  drawPdfText(text, x, yTop, size, color, options = {}) {
    if (!text) return;
    const clipped = text;
    const y = PAGE_HEIGHT_PT - yTop - size;
    const font = options.bold ? this.fontSet.bold : this.fontSet.normal;
    this.page.drawText(clipped, {
      x,
      y,
      size,
      font,
      color: color.color,
      opacity: color.opacity
    });
  }

  drawCssRect(rect, color) {
    this.drawCssBox(rect.left - this.rootRect.left, rect.top - this.rootRect.top, rect.width, rect.height, color);
  }

  drawCssBox(left, top, width, height, color) {
    const clippedTop = Math.max(top, this.pageTop);
    const clippedBottom = Math.min(top + height, this.pageBottom);
    if (clippedBottom <= clippedTop || width <= 0) return;
    const x = left * this.scale;
    const yTop = (clippedTop - this.pageTop) * this.scale;
    const h = (clippedBottom - clippedTop) * this.scale;
    this.page.drawRectangle({
      x,
      y: PAGE_HEIGHT_PT - yTop - h,
      width: width * this.scale,
      height: h,
      color: color.color,
      opacity: color.opacity
    });
  }

  rectToPageBox(rect) {
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

  intersectsPage(rect) {
    const top = rect.top - this.rootRect.top;
    const bottom = rect.bottom - this.rootRect.top;
    return bottom > this.pageTop && top < this.pageBottom;
  }
}

class VectorResumeRenderer {
  constructor(pdfDoc, fontSet, resume, settings) {
    this.pdfDoc = pdfDoc;
    this.fontSet = fontSet;
    this.font = fontSet.normal;
    this.resume = resume;
    this.settings = { ...DEFAULT_SETTINGS, ...(settings || {}) };
    this.templateVariant = TEMPLATE_VARIANTS[this.settings.template] ?? 'classic';
    this.accent = toRgb(TEMPLATE_ACCENTS[this.settings.template] ?? this.settings.accent ?? '#8b63f6');
    this.textColor = toRgb('#1e293b');
    this.strongColor = toRgb('#0f172a');
    this.mutedColor = toRgb('#64748b');
    this.bodyColor = toRgb('#334155');
    this.lightFill = toRgb('#f1f5f9');
    this.marginX = mmToPt(9.5);
    this.marginTop = mmToPt(8.5);
    this.marginBottom = mmToPt(8.5);
    this.contentWidth = PAGE_WIDTH_PT - this.marginX * 2;
    this.baseFontSize = pxToPt(this.settings.fontSize ?? 12);
    this.lineRatio = Number(this.settings.lineHeight || 1.58);
    this.sectionGap = pxToPt(this.settings.compact ? 11 : 18);
    this.itemGap = pxToPt(10);
    this.page = null;
    this.y = 0;
  }

  async render() {
    this.addPage();
    await this.drawHeader();
    const visibleSections = (this.resume.sections || []).filter((section) => section.visible !== false);
    visibleSections.forEach((section, index) => {
      this.drawSection(section);
      if (index < visibleSections.length - 1) this.y += this.sectionGap;
    });
  }

  addPage() {
    this.page = this.pdfDoc.addPage([PAGE_WIDTH_PT, PAGE_HEIGHT_PT]);
    this.y = this.marginTop;
  }

  remainingHeight() {
    return PAGE_HEIGHT_PT - this.marginBottom - this.y;
  }

  usableHeight() {
    return PAGE_HEIGHT_PT - this.marginTop - this.marginBottom;
  }

  ensureSpace(height) {
    if (height > this.remainingHeight() && this.y > this.marginTop + 0.5) this.addPage();
  }

  async drawHeader() {
    if (this.templateVariant === 'rose') {
      await this.drawRoseHeader();
      return;
    }
    await this.drawClassicHeader();
  }

  async drawClassicHeader() {
    const profile = this.resume.profile || {};
    const photoW = pxToPt(64);
    const photoH = pxToPt(84);
    const gap = pxToPt(16);
    const nameSize = pxToPt(22);
    const infoSize = pxToPt(12);
    const contentH = Math.max(photoH, nameSize * 1.25 + infoSize * 1.35);
    const startY = this.y;
    const photoX = this.marginX + this.contentWidth - photoW;
    const textWidth = this.contentWidth - photoW - gap;

    this.drawText(profile.name || '姓名', this.marginX, startY, nameSize, this.strongColor, { bold: true, maxWidth: textWidth });
    const info = getProfileInfoItems(profile).join(' | ');
    if (info) this.drawWrappedText(info, this.marginX, startY + pxToPt(28), textWidth, infoSize, this.mutedColor, { lineRatio: 1.25 });
    await this.drawAvatar(profile, photoX, startY, photoW, photoH, this.strongColor);

    const lineY = startY + contentH + pxToPt(12);
    this.drawLine(this.marginX, lineY, this.marginX + this.contentWidth, lineY, pxToPt(2), this.accent);
    this.y = lineY + pxToPt(2) + pxToPt(16);
  }

  async drawRoseHeader() {
    const profile = this.resume.profile || {};
    const pad = pxToPt(20);
    const gap = pxToPt(16);
    const photoW = pxToPt(64);
    const photoH = pxToPt(84);
    const bannerH = photoH + pad * 2;
    const startY = this.y;
    const x = this.marginX;

    this.drawRect(x, startY, this.contentWidth, bannerH, this.accent);
    await this.drawAvatar(profile, x + pad, startY + pad, photoW, photoH, toRgb('#ffffff'));

    const textX = x + pad + photoW + gap;
    const textW = this.contentWidth - pad * 2 - photoW - gap;
    this.drawText(profile.name || '姓名', textX, startY + pad, pxToPt(20), toRgb('#ffffff'), { bold: true, maxWidth: textW });

    const infoSize = pxToPt(12);
    const infoItems = [
      profile.headline && `目标职位 ${profile.headline}`,
      profile.phone && `电话 ${profile.phone}`,
      profile.email && `邮箱 ${profile.email}`,
      profile.city && `城市 ${profile.city}`,
      getAgeLabel(profile.birthday) && `年龄 ${getAgeLabel(profile.birthday)}`,
      profile.status && `状态 ${profile.status}`,
      profile.website && `网站 ${profile.website}`
    ].filter(Boolean);
    this.drawWrappedText(infoItems.join('   '), textX, startY + pad + pxToPt(32), textW, infoSize, toRgb('#ffffff'), { lineRatio: 1.35 });

    this.y = startY + bannerH + pxToPt(16);
  }

  drawSection(section) {
    const kind = SECTION_TEMPLATES[section.type]?.kind ?? 'experience';
    const items = section.items || [];
    const titleH = this.measureSectionTitle();
    const firstItemH = items[0] ? this.measureItem(kind, items[0]) : 0;
    this.ensureSpace(titleH + Math.min(firstItemH, pxToPt(48)));
    this.drawSectionTitle(section.label || SECTION_TEMPLATES[section.type]?.label || '模块');

    items.forEach((item, index) => {
      this.drawItem(kind, item);
      if (index < items.length - 1) this.y += this.itemGap;
    });
  }

  measureSectionTitle() {
    return pxToPt(13) * 1.25 + pxToPt(7) + pxToPt(8);
  }

  drawSectionTitle(label) {
    const size = pxToPt(13);
    const lineH = size * 1.25;
    const padBottom = pxToPt(7);
    const marginBottom = pxToPt(8);
    const startY = this.y;
    this.drawText(label, this.marginX, startY, size, this.accent, { bold: true, maxWidth: this.contentWidth });
    const lineY = startY + lineH + padBottom;
    this.drawLine(this.marginX, lineY, this.marginX + this.contentWidth, lineY, pxToPt(1), this.accent);
    this.y = lineY + marginBottom;
  }

  measureItem(kind, item) {
    if (kind === 'text') return this.measureTextBlock(String(item.body || ''), this.contentWidth, pxToPt(13), this.lineRatio);
    if (kind === 'chips') return this.measureChips(item);
    if (kind === 'simpleList') return this.measureSimpleItem(item);
    return this.measureExperienceItem(kind, item);
  }

  drawItem(kind, item) {
    if (kind === 'text') {
      this.drawTextBlock(String(item.body || ''), this.marginX, this.contentWidth, pxToPt(13), this.bodyColor, { lineRatio: this.lineRatio });
      return;
    }
    if (kind === 'chips') {
      this.drawChips(item);
      return;
    }
    if (kind === 'simpleList') {
      this.drawSimpleItem(item);
      return;
    }
    this.drawExperienceItem(kind, item);
  }

  measureSimpleItem(item) {
    const title = [item.title, item.meta].filter(Boolean).join('  ');
    const titleH = pxToPt(13) * 1.3;
    const descH = item.description ? pxToPt(2) + this.measureTextBlock(item.description, this.contentWidth, pxToPt(12), 1.35) : 0;
    return (title ? titleH : 0) + descH;
  }

  drawSimpleItem(item) {
    const itemH = this.measureSimpleItem(item);
    this.ensureSpace(itemH);
    const size = pxToPt(13);
    const title = String(item.title || '');
    const meta = String(item.meta || '');
    if (title) this.drawText(title, this.marginX, this.y, size, this.strongColor, { bold: true, maxWidth: this.contentWidth });
    if (meta) {
      const titleW = title ? this.font.widthOfTextAtSize(title, size) + pxToPt(8) : 0;
      this.drawText(meta, this.marginX + titleW, this.y, size, this.bodyColor, { maxWidth: this.contentWidth - titleW });
    }
    this.y += size * 1.3;
    if (item.description) {
      this.y += pxToPt(2);
      this.drawTextBlock(item.description, this.marginX, this.contentWidth, pxToPt(12), this.mutedColor, { lineRatio: 1.35 });
    }
  }

  measureChips(item) {
    const titleSize = pxToPt(13);
    const chipSize = pxToPt(12);
    const rowH = Math.max(titleSize * 1.3, chipSize + pxToPt(6));
    const titleW = item.title ? this.font.widthOfTextAtSize(item.title, titleSize) + pxToPt(8) : 0;
    let x = this.marginX + titleW;
    let rows = 1;
    for (const value of item.values || []) {
      const w = this.font.widthOfTextAtSize(String(value), chipSize) + pxToPt(16);
      if (x + w > this.marginX + this.contentWidth) {
        rows += 1;
        x = this.marginX + titleW;
      }
      x += w + pxToPt(6);
    }
    return rows * rowH + Math.max(0, rows - 1) * pxToPt(4);
  }

  drawChips(item) {
    const itemH = this.measureChips(item);
    this.ensureSpace(itemH);
    const titleSize = pxToPt(13);
    const chipSize = pxToPt(12);
    const rowH = Math.max(titleSize * 1.3, chipSize + pxToPt(6));
    const title = String(item.title || '');
    let titleW = 0;
    if (title) {
      this.drawText(title, this.marginX, this.y, titleSize, this.strongColor, { bold: true, maxWidth: this.contentWidth });
      titleW = this.font.widthOfTextAtSize(title, titleSize) + pxToPt(8);
    }
    let x = this.marginX + titleW;
    let y = this.y;
    for (const value of item.values || []) {
      const text = String(value);
      const w = this.font.widthOfTextAtSize(text, chipSize) + pxToPt(16);
      if (x + w > this.marginX + this.contentWidth) {
        y += rowH + pxToPt(4);
        x = this.marginX + titleW;
      }
      this.drawRect(x, y + pxToPt(1), w, chipSize + pxToPt(5), this.lightFill);
      this.drawText(text, x + pxToPt(8), y + pxToPt(4), chipSize, this.bodyColor, { maxWidth: w - pxToPt(16) });
      x += w + pxToPt(6);
    }
    this.y += itemH;
  }

  measureExperienceItem(kind, item) {
    const titleSize = pxToPt(14);
    const metaSize = pxToPt(12);
    const bodySize = pxToPt(13);
    const titleH = titleSize * 1.25;
    const meta = this.getMeta(kind, item);
    const metaH = meta ? metaSize * 1.25 : 0;
    const blocks = this.getBodyBlocks(kind, item);
    const bodyH = blocks.length ? pxToPt(4) + this.measureBlocks(blocks, this.contentWidth, bodySize, this.lineRatio, pxToPt(12)) : 0;
    return titleH + metaH + bodyH + pxToPt(6);
  }

  drawExperienceItem(kind, item) {
    const itemH = this.measureExperienceItem(kind, item);
    const titleSize = pxToPt(14);
    const metaSize = pxToPt(12);
    const bodySize = pxToPt(13);
    const titleH = titleSize * 1.25;
    const meta = this.getMeta(kind, item);
    const period = getItemPeriodLabel(item);
    const title = kind === 'education' ? item.school : item.org;
    const blocks = this.getBodyBlocks(kind, item);

    if (itemH < this.usableHeight()) this.ensureSpace(itemH);
    else this.ensureSpace(titleH + (meta ? metaSize * 1.25 : 0));

    this.drawText(title || '', this.marginX, this.y, titleSize, this.strongColor, { bold: true, maxWidth: this.contentWidth * 0.62 });
    if (period) {
      const periodW = this.font.widthOfTextAtSize(period, metaSize);
      this.drawText(period, this.marginX + this.contentWidth - periodW, this.y + pxToPt(1), metaSize, this.mutedColor, { maxWidth: this.contentWidth * 0.38 });
    }
    this.y += titleH;

    if (meta) {
      this.drawText(meta, this.marginX, this.y, metaSize, this.mutedColor, { maxWidth: this.contentWidth });
      this.y += metaSize * 1.25;
    }

    if (blocks.length) {
      this.y += pxToPt(4);
      this.drawBlocks(blocks, this.marginX, this.contentWidth, bodySize, this.bodyColor, { lineRatio: this.lineRatio, bulletIndent: pxToPt(12) });
    }
    this.y += pxToPt(6);
  }

  getMeta(kind, item) {
    if (kind === 'education') return [item.major, item.degree, item.location].filter(Boolean).join(' · ');
    return [item.role, item.department, item.location].filter(Boolean).join(' · ');
  }

  getBodyBlocks(kind, item) {
    if (kind === 'education') {
      if (!isRichTextEmpty(item.body)) return richTextToBlocks(item.body);
      return (item.details || []).filter(Boolean).map((text) => ({ text: String(text), bullet: false }));
    }
    if (!isRichTextEmpty(item.body)) return richTextToBlocks(item.body);
    return (item.bullets || []).filter(Boolean).map((text) => ({ text: String(text), bullet: false }));
  }

  measureTextBlock(text, width, size, lineRatio) {
    const lines = wrapText(text, width, size, this.font);
    return Math.max(1, lines.length) * size * lineRatio;
  }

  drawTextBlock(text, x, width, size, color, options = {}) {
    const lineRatio = options.lineRatio ?? this.lineRatio;
    const blocks = String(text || '').split(/\n+/).filter(Boolean).map((line) => ({ text: line, bullet: false }));
    this.drawBlocks(blocks.length ? blocks : [{ text: String(text || ''), bullet: false }], x, width, size, color, { lineRatio });
  }

  measureBlocks(blocks, width, size, lineRatio, bulletIndent = 0) {
    return blocks.reduce((height, block) => {
      const marker = getBlockMarker(block);
      const levelIndent = getBlockLevelIndent(block, size);
      const markerWidth = marker ? getMarkerWidth(marker, size, this.font) : 0;
      const textWidth = width - levelIndent - markerWidth;
      const lines = wrapText(block.text, textWidth, size, this.font);
      return height + Math.max(1, lines.length) * size * lineRatio;
    }, 0);
  }

  drawBlocks(blocks, x, width, size, color, options = {}) {
    const lineRatio = options.lineRatio ?? this.lineRatio;
    const bulletIndent = options.bulletIndent ?? 0;
    const lineH = size * lineRatio;

    blocks.forEach((block) => {
      const marker = getBlockMarker(block);
      const levelIndent = getBlockLevelIndent(block, size);
      const markerWidth = marker ? Math.max(bulletIndent, getMarkerWidth(marker, size, this.font)) : 0;
      const markerX = x + levelIndent;
      const textX = markerX + markerWidth;
      const textWidth = width - levelIndent - markerWidth;
      const lines = wrapText(block.text, textWidth, size, this.font);
      lines.forEach((line, index) => {
        this.ensureSpace(lineH);
        if (marker && index === 0) this.drawText(marker, markerX, this.y, size, color, { maxWidth: markerWidth });
        this.drawText(line || ' ', textX, this.y, size, color, { maxWidth: textWidth });
        this.y += lineH;
      });
    });
  }

  async drawAvatar(profile, x, y, width, height, textColor) {
    if (profile.avatar && /^data:image\/(png|jpe?g);base64,/.test(profile.avatar)) {
      try {
        const image = await this.embedDataUrlImage(profile.avatar);
        this.page.drawImage(image, {
          x,
          y: topToPdfY(y + height),
          width,
          height
        });
        return;
      } catch {
        // Fall through to vector placeholder when the uploaded image cannot be embedded.
      }
    }
    this.drawRect(x, y, width, height, toRgb('#f1f5f9'));
    const label = String(profile.name || '简').slice(0, 1);
    const size = pxToPt(20);
    const textW = this.font.widthOfTextAtSize(label, size);
    this.drawText(label, x + (width - textW) / 2, y + (height - size) / 2, size, textColor, { bold: true, maxWidth: width });
  }

  async embedDataUrlImage(dataUrl) {
    const [header, payload] = dataUrl.split(',');
    const bytes = base64ToUint8Array(payload || '');
    if (/image\/png/i.test(header)) return this.pdfDoc.embedPng(bytes);
    return this.pdfDoc.embedJpg(bytes);
  }

  drawText(text, x, yTop, size, color, options = {}) {
    const value = String(text ?? '');
    if (!value) return;
    const maxWidth = options.maxWidth;
    const font = options.bold ? this.fontSet.bold : this.fontSet.normal;
    const clipped = maxWidth ? truncateText(value, maxWidth, size, font) : value;
    const y = topToPdfY(yTop + size);
    this.page.drawText(clipped, { x, y, size, font, color });
  }

  drawWrappedText(text, x, yTop, width, size, color, options = {}) {
    const lineRatio = options.lineRatio ?? this.lineRatio;
    const lineH = size * lineRatio;
    wrapText(text, width, size, this.font).forEach((line, index) => {
      this.drawText(line, x, yTop + index * lineH, size, color, { maxWidth: width, bold: options.bold });
    });
  }

  drawLine(x1, yTop1, x2, yTop2, thickness, color) {
    this.page.drawLine({
      start: { x: x1, y: topToPdfY(yTop1) },
      end: { x: x2, y: topToPdfY(yTop2) },
      thickness,
      color
    });
  }

  drawRect(x, yTop, width, height, color) {
    this.page.drawRectangle({
      x,
      y: topToPdfY(yTop + height),
      width,
      height,
      color
    });
  }
}

function mmToPt(mm) {
  return (mm * 72) / 25.4;
}

function pxToPt(px) {
  return px * PX_TO_PT;
}

function topToPdfY(yTop) {
  return PAGE_HEIGHT_PT - yTop;
}

function toRgb(hex) {
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

function parseCssColor(value) {
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

function isEffectivelyWhite(color) {
  return color.opacity >= 1 && color.raw && color.raw.r >= 250 && color.raw.g >= 250 && color.raw.b >= 250;
}

function getProfileInfoItems(profile = {}) {
  const age = getAgeLabel(profile.birthday);
  return [
    profile.phone && `电话：${profile.phone}`,
    profile.email && `邮箱：${profile.email}`,
    profile.city && `城市：${profile.city}`,
    age && `年龄：${age}`,
    profile.status && `状态：${profile.status}`,
    profile.website && `网站：${profile.website}`
  ].filter(Boolean);
}

function getAgeLabel(birthday) {
  const text = String(birthday ?? '').trim();
  if (!text) return '';
  const match = text.match(/(\d{4})(?:\D+(\d{1,2}))?(?:\D+(\d{1,2}))?/);
  if (!match) return '';
  const year = Number(match[1]);
  const month = match[2] ? Number(match[2]) - 1 : null;
  const day = match[3] ? Number(match[3]) : 1;
  const now = new Date();
  let age = now.getFullYear() - year;
  if (month !== null && (now.getMonth() < month || (now.getMonth() === month && now.getDate() < day))) age -= 1;
  if (!Number.isFinite(age) || age < 0 || age > 100) return '';
  return `${age}岁`;
}

function formatPeriod(startDate, endDate, current) {
  if (!startDate && !endDate && !current) return '';
  const fmt = (date) => date ? date.replace('-', '.') : '';
  const start = fmt(startDate);
  const end = current ? '至今' : fmt(endDate);
  if (start && end) return `${start} – ${end}`;
  return start || end;
}

function getItemPeriodLabel(item = {}) {
  if (item.startDate || item.endDate || item.current) return formatPeriod(item.startDate, item.endDate, item.current);
  return item.period || '';
}

function isRichTextEmpty(value) {
  return richTextToPlainText(value).replace(/\u00a0/g, ' ').trim().length === 0;
}

function richTextToPlainText(value) {
  const raw = String(value ?? '');
  if (!raw) return '';
  if (typeof document === 'undefined') return raw.replace(/<[^>]+>/g, '');
  const template = document.createElement('template');
  template.innerHTML = raw;
  return template.content.textContent ?? '';
}

function richTextToBlocks(value) {
  const raw = String(value ?? '');
  if (!raw) return [];
  if (typeof document === 'undefined') {
    return raw.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').split(/\n+/).map((line) => line.trim()).filter(Boolean).map((text) => ({ text }));
  }

  const template = document.createElement('template');
  template.innerHTML = raw;
  const blocks = [];

  const pushText = (text, options = {}) => {
    String(text || '')
      .split(/\n+/)
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .forEach((line) => blocks.push({ text: line, ...options }));
  };

  const getInlineText = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';
    const tag = node.tagName;
    if (tag === 'BR') return '\n';
    if (tag === 'UL' || tag === 'OL') return '';
    return Array.from(node.childNodes).map(getInlineText).join('');
  };

  const walkList = (listNode, level = 0) => {
    const ordered = listNode.tagName === 'OL';
    let index = Number(listNode.getAttribute('start') || '1');
    Array.from(listNode.children).forEach((child) => {
      if (child.tagName !== 'LI') return;
      const text = Array.from(child.childNodes)
        .filter((node) => !(node.nodeType === Node.ELEMENT_NODE && (node.tagName === 'UL' || node.tagName === 'OL')))
        .map(getInlineText)
        .join('');
      pushText(text || child.textContent || '', {
        marker: ordered ? `${index}.` : '•',
        listType: ordered ? 'ordered' : 'unordered',
        level
      });
      index += 1;
      Array.from(child.children).forEach((nested) => {
        if (nested.tagName === 'UL' || nested.tagName === 'OL') walkList(nested, level + 1);
      });
    });
  };

  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      pushText(node.textContent || '');
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const tag = node.tagName;
    if (tag === 'UL' || tag === 'OL') {
      walkList(node, 0);
      return;
    }
    if (tag === 'P' || tag === 'DIV') {
      pushText(getInlineText(node));
      Array.from(node.children).forEach((child) => {
        if (child.tagName === 'UL' || child.tagName === 'OL') walkList(child, 0);
      });
      return;
    }
    if (tag === 'BR') return;
    pushText(getInlineText(node));
    Array.from(node.children).forEach((child) => {
      if (child.tagName === 'UL' || child.tagName === 'OL') walkList(child, 0);
    });
  };

  Array.from(template.content.childNodes).forEach(walk);
  return blocks;
}

function getTextLineRuns(textNode, range) {
  const text = textNode.textContent || '';
  const runs = [];
  let current = null;
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

function getFirstTextRect(root) {
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

function getListMarker(li) {
  const parent = li.parentElement;
  if (!parent) return '';
  const tag = parent.tagName;
  if (tag === 'UL') return '•';
  if (tag !== 'OL') return '';
  const start = Number.parseInt(parent.getAttribute('start') || '1', 10);
  const index = Array.from(parent.children).filter((child) => child.tagName === 'LI').indexOf(li);
  return `${(Number.isFinite(start) ? start : 1) + Math.max(0, index)}.`;
}

function applyTextTransform(text, transform) {
  if (transform === 'uppercase') return text.toUpperCase();
  if (transform === 'lowercase') return text.toLowerCase();
  if (transform === 'capitalize') return text.replace(/(^|\s)(\S)/g, (match) => match.toUpperCase());
  return text;
}

async function fetchImageBytes(src) {
  if (src.startsWith('data:')) {
    const [, payload = ''] = src.split(',');
    return base64ToUint8Array(payload);
  }
  const res = await fetch(src);
  if (!res.ok) throw new Error(`IMAGE_LOAD_FAILED:${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

function getBlockMarker(block) {
  if (block.marker) return block.marker;
  return block.bullet ? '•' : '';
}

function getBlockLevelIndent(block, size) {
  return Math.max(0, Number(block.level || 0)) * size * 1.6;
}

function getMarkerWidth(marker, size, font) {
  return font.widthOfTextAtSize(marker, size) + size * 0.7;
}

function wrapText(value, maxWidth, size, font) {
  const rawLines = String(value ?? '').replace(/\r/g, '').split('\n');
  const lines = [];
  rawLines.forEach((rawLine) => {
    const text = rawLine.trim();
    if (!text) {
      lines.push('');
      return;
    }
    let line = '';
    Array.from(text).forEach((char) => {
      const candidate = `${line}${char}`;
      if (!line || font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
      } else {
        lines.push(line);
        line = char;
      }
    });
    if (line) lines.push(line);
  });
  return lines.length ? lines : [''];
}

function truncateText(value, maxWidth, size, font) {
  const text = String(value ?? '');
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  const ellipsis = '…';
  let output = '';
  for (const char of Array.from(text)) {
    const candidate = `${output}${char}${ellipsis}`;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth) break;
    output += char;
  }
  return output ? `${output}${ellipsis}` : ellipsis;
}

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export const exportNodesAsLandscapePdf = async (nodes, filename = 'portfolio.pdf') => {
  const list = Array.from(nodes).filter(Boolean);
  if (!list.length) return;
  const pdf = new jsPDF('l', 'mm', 'a4');

  for (const [index, node] of list.entries()) {
    if (index > 0) pdf.addPage('a4', 'l');
    const canvas = await getCanvas(node);
    addCanvasToPdfPage(pdf, canvas, 'landscape');
  }

  pdf.save(filename);
};

export const exportResumeAsPng = async (node, filename = 'resume.png') => {
  const canvas = await getCanvas(node);
  await saveCanvasAsPng(canvas, filename, downloadBlob);
};

export const exportResumeAsJson = (resume, settings, filename = 'resume-data.json') => {
  const blob = new Blob([JSON.stringify({ resume, settings }, null, 2)], {
    type: 'application/json;charset=utf-8'
  });
  downloadBlob(blob, filename);
};

export const exportResumeAsDoc = (node, filename = 'resume.doc') => {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Resume</title></head><body>${node.outerHTML}</body></html>`;
  const blob = new Blob(['\ufeff', html], {
    type: 'application/msword;charset=utf-8'
  });
  downloadBlob(blob, filename);
};
