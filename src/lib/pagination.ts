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
  '.resume-bullets li'
].join(',');

export function getSmartPageCuts(node: HTMLElement | null, pageHeightPx: number, options: {totalHeight?:number; scaleY?:number} = {}) {
  if (!node || !pageHeightPx) return [0, pageHeightPx || 0];
  const totalHeight = Math.ceil(options.totalHeight ?? Math.max(node.getBoundingClientRect().height, node.scrollHeight));
  if (totalHeight <= pageHeightPx) return [0, Math.max(pageHeightPx, totalHeight)];

  const ranges = collectBreakAvoidRanges(node, pageHeightPx, totalHeight, options.scaleY);
  const cuts = [0];
  const minUsefulPagePx = Math.floor(pageHeightPx * 0.45);
  const endBufferPx = Math.floor(pageHeightPx * 0.08);
  let currentTop = 0;

  while (currentTop + pageHeightPx < totalHeight) {
    const maxCut = Math.min(currentTop + pageHeightPx, totalHeight);
    let cut = maxCut;

    for (let guard = 0; guard < 8; guard += 1) {
      const conflict = ranges.find((range) => range.top < cut && range.bottom > cut);
      if (!conflict) break;

      const cutBefore = conflict.top;
      const cutAfter = conflict.bottom;
      const canCutBefore = cutBefore - currentTop >= minUsefulPagePx;
      const canCutAfter = cutAfter <= maxCut && cutAfter - currentTop >= minUsefulPagePx;

      if (canCutBefore) cut = cutBefore;
      else if (canCutAfter) cut = cutAfter;
      else break;
    }

    if (cut <= currentTop || cut - currentTop < minUsefulPagePx) cut = maxCut;
    if (totalHeight - cut < endBufferPx) cut = totalHeight;
    cuts.push(Math.round(cut));
    currentTop = cut;
  }

  if (cuts[cuts.length - 1] !== totalHeight) cuts.push(totalHeight);
  return cuts;
}

function collectBreakAvoidRanges(node: HTMLElement, pageHeightPx: number, totalHeight: number, explicitScaleY: number | undefined) {
  const rootRect = node.getBoundingClientRect();
  const cssHeight = Math.ceil(Math.max(rootRect.height, node.scrollHeight));
  const scaleY = explicitScaleY ?? (cssHeight ? totalHeight / cssHeight : 1);
  const pad = Math.max(4, Math.round(4 * scaleY));

  return Array.from(node.querySelectorAll(BREAK_AVOID_SELECTOR))
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
