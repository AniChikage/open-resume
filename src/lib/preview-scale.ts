/** How the preview fits the page in its panel before the user's own zoom is applied. */
export type FitMode = 'page' | 'width';

export interface PreviewSpace {
  /** Room available in the panel, in pixels (already without the padding). */
  width: number;
  height: number;
  /** The page's size, in pixels at 100%. */
  pageWidth: number;
  pageHeight: number;
}

// Past these the page would be enlarged beyond what looks sharp.
const MAX_PAGE_FIT = 1.1;
const MAX_WIDTH_FIT = 1.6;
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 1.6;

/**
 * The scale of the page. "page" shows a whole page at once (it can be small on a wide, short
 * window); "width" fills the panel's width and lets the pages scroll, which reads better.
 * `zoom` is the user's adjustment on top of either (1 = exactly the fit).
 */
export function previewScale(mode: FitMode, space: PreviewSpace, zoom: number): number {
  const byWidth = space.width / space.pageWidth;
  const fit = mode === 'width' ? Math.min(MAX_WIDTH_FIT, byWidth) : Math.min(MAX_PAGE_FIT, byWidth, space.height / space.pageHeight);
  return fit * Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

const STORAGE_KEY = 'open-resume:preview-fit';

/** The fit mode chosen last time in this browser; the whole page by default. */
export function readFitMode(): FitMode {
  try { return window.localStorage.getItem(STORAGE_KEY) === 'width' ? 'width' : 'page'; } catch { return 'page'; }
}

export function writeFitMode(mode: FitMode): void {
  try { window.localStorage.setItem(STORAGE_KEY, mode); } catch { /* storage can be unavailable: the choice then lasts for this visit */ }
}
