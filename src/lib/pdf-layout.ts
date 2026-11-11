import { getPaperSize } from './paper.ts';
import { getSmartPageCuts } from './pagination.ts';

/** Layout metadata is shared by the PDF renderer and its clickable preview. */
export function getPdfPageLayout(node: HTMLElement) {
  const rect = node.getBoundingClientRect();
  const paper = getPaperSize(node.dataset.paperSize);
  const height = rect.width * paper.heightMm / paper.widthMm;
  const style = node.ownerDocument.defaultView!.getComputedStyle(node);
  const margin = Math.max(24, Number.parseFloat(style.paddingTop) || 8.5 * 96 / 25.4);
  // The paper's min-height and decorative background must not create blank pages.
  const content = [...node.querySelectorAll<HTMLElement>(':scope > .resume-header, :scope > .resume-body')];
  const contentBottom = content.length ? Math.max(...content.map(element => element.getBoundingClientRect().bottom - rect.top)) : rect.height;
  const cuts = getSmartPageCuts(node, height - margin * 2, {
    totalHeight: Math.ceil(contentBottom), scaleY: 1, firstPageHeight: height - margin,
  });
  // First-page top spacing is already part of the source document. Continuation
  // pages receive their own top margin, and all pages reserve bottom spacing.
  const insets = cuts.slice(0, -1).map((_, index) => index ? margin : 0);
  if (cuts.length === 2) cuts[1] = height;
  return { width: rect.width, height, cuts, insets };
}
