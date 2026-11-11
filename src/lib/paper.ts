export type PaperSize = 'a4' | 'letter';

export const PAPER_SIZES = {
  a4: { widthMm: 210, heightMm: 297, label: 'A4', widthPt: 595.2755905511812, heightPt: 841.8897637795277 },
  letter: { widthMm: 215.9, heightMm: 279.4, label: 'US Letter', widthPt: 612, heightPt: 792 },
} as const;

export function getPaperSize(value?: string) {
  return PAPER_SIZES[value === 'letter' ? 'letter' : 'a4'];
}

export function getPaperPixels(value?: string) {
  const paper = getPaperSize(value);
  return { width: paper.widthMm * 96 / 25.4, height: paper.heightMm * 96 / 25.4 };
}
