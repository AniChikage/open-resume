export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
export const A4_RATIO = A4_HEIGHT_MM / A4_WIDTH_MM;

const BREAK_AVOID_SELECTOR = [
  '.resume-section h2',
  '.experience-item',
  '.education-row',
  '.simple-row',
  '.skill-row',
  '.summary-text',
  '.resume-bullets li',
  '.experience-body li',
  '.experience-body p'
].join(',');

export function getSmartPageCuts(node: HTMLElement | null, pageHeightPx: number, options: {totalHeight?:number; scaleY?:number;firstPageHeight?:number} = {}) {
  if (!node || !pageHeightPx) return [0, pageHeightPx || 0];
  const totalHeight = Math.ceil(options.totalHeight ?? Math.max(node.getBoundingClientRect().height, node.scrollHeight));
  const firstHeight = options.firstPageHeight || pageHeightPx;
  if (totalHeight <= firstHeight + 1) return [0, firstHeight];

  const ranges = collectBreakAvoidRanges(node, pageHeightPx, totalHeight, options.scaleY);
  return paginateRanges(totalHeight, pageHeightPx, ranges, { firstPageHeight: firstHeight });
}

export function paginateRanges(totalHeight: number, pageHeightPx: number, ranges: {top:number;bottom:number;line?:boolean}[] = [], options: { firstPageHeight?: number } = {}) {
  if (!Number.isFinite(totalHeight) || !Number.isFinite(pageHeightPx) || pageHeightPx <= 0 || totalHeight <= 0) return [0, Math.max(0, Number.isFinite(pageHeightPx) ? pageHeightPx : 0)];
  let capacity = options.firstPageHeight || pageHeightPx;
  if (totalHeight <= capacity) return [0, capacity];
  const cuts = [0];
  let currentTop = 0;

  while (currentTop + capacity < totalHeight) {
    const minUsefulPagePx = Math.floor(capacity * 0.45);
    const maxCut = Math.min(currentTop + capacity, totalHeight);
    let cut = maxCut;

    for (let guard = 0; guard < ranges.length + 1; guard += 1) {
      const conflict = ranges.find((range) => range.top < cut && range.bottom > cut && (range.line || range.top - currentTop >= minUsefulPagePx));
      if (!conflict) break;

      const cutBefore = conflict.top;
      const canCutBefore = cutBefore > currentTop && (conflict.line || cutBefore - currentTop >= minUsefulPagePx);

      if (canCutBefore) cut = cutBefore;
      else break;
    }

    if (cut <= currentTop) cut = maxCut;
    // Never fold a short trailing page into a page that is already full.
    cuts.push(cut);
    currentTop = cut;
    capacity = pageHeightPx;
  }

  if (cuts[cuts.length - 1] !== totalHeight) cuts.push(totalHeight);
  return cuts;
}

// Font ascender boxes can be taller than line-height. Keep a gap between line
// boundaries so overlapping font metrics cannot push a break back to the
// beginning of a long paragraph.
export function getPaginationLineRange(top: number, bottom: number, lineHeight: number) {
  const middle = (top + bottom) / 2;
  const height = Math.min(bottom - top, Math.max(1, lineHeight - 1));
  return { top: middle - height / 2, bottom: middle + height / 2, line: true as const };
}

function collectBreakAvoidRanges(node: HTMLElement, pageHeightPx: number, totalHeight: number, explicitScaleY: number | undefined) {
  const rootRect = node.getBoundingClientRect();
  const cssHeight = Math.ceil(Math.max(rootRect.height, node.scrollHeight));
  const scaleY = explicitScaleY ?? (cssHeight ? totalHeight / cssHeight : 1);
  const pad = Math.max(4, Math.round(4 * scaleY));

  const blocks = Array.from(node.querySelectorAll(BREAK_AVOID_SELECTOR))
    .map((el) => {
      const rect = getAvoidRect(el);
      const top = Math.max(0, (rect.top - rootRect.top) * scaleY - pad);
      const bottom = Math.min(totalHeight, (rect.bottom - rootRect.top) * scaleY + pad);
      return { top, bottom };
    })
    .filter((range) => {
      const height = range.bottom - range.top;
      return height > 2 && height < pageHeightPx * 0.92;
    })
    .sort((a, b) => a.top - b.top || a.bottom - b.bottom);

  // A paragraph taller than one page must still break between its text lines.
  const lines: {top:number;bottom:number;line:boolean}[] = [];
  const walker = node.ownerDocument.createTreeWalker(node, 4);
  const range = node.ownerDocument.createRange();
  for (let text = walker.nextNode(); text; text = walker.nextNode()) {
    if (!text.textContent?.trim()) continue;
    range.selectNodeContents(text);
    const style = node.ownerDocument.defaultView!.getComputedStyle(text.parentElement!);
    const lineHeight = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.2;
    for (const rect of range.getClientRects()) {
      if (!rect.width || !rect.height) continue;
      const bounds = getPaginationLineRange((rect.top - rootRect.top) * scaleY, (rect.bottom - rootRect.top) * scaleY, lineHeight * scaleY);
      lines.push({ ...bounds, top: Math.max(0, bounds.top), bottom: Math.min(totalHeight, bounds.bottom) });
    }
  }
  return [...blocks, ...lines];
}

function getAvoidRect(el: Element) {
  const rect = el.getBoundingClientRect();
  if (el.matches('.resume-section h2')) {
    const firstItem = el.closest('.resume-section')?.querySelector('.section-content > *');
    if (firstItem) {
      const firstRect = firstItem.getBoundingClientRect();
      const titleBlockBottom = Math.min(firstRect.bottom, rect.bottom + 96);
      return {
        top: rect.top,
        bottom: Math.max(rect.bottom, titleBlockBottom)
      };
    }
  }
  return rect;
}
