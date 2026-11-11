import { PDF_COMMON_CHARACTERS } from './pdf-common-coverage.ts';
const commonCharacters = new Set(PDF_COMMON_CHARACTERS);
export const PDF_FONT_FAMILIES = {
  sans: { family: 'Resume PDF Sans', normal: '/fonts/NotoSansCJKsc-Regular.otf', bold: '/fonts/NotoSansCJKsc-Bold.otf' },
  serif: { family: 'Resume PDF Serif', normal: '/fonts/NotoSerifCJKsc-Regular.otf', bold: '/fonts/NotoSerifCJKsc-Bold.otf' },
  'sans-latin': { family: 'Resume PDF Sans Latin', normal: '/fonts/ResumeSansLatin-Regular.otf', bold: '/fonts/ResumeSansLatin-Bold.otf' },
  'serif-latin': { family: 'Resume PDF Serif Latin', normal: '/fonts/ResumeSerifLatin-Regular.otf', bold: '/fonts/ResumeSerifLatin-Bold.otf' },
  'sans-common': { family: 'Resume PDF Sans Common', normal: '/fonts/ResumeSansCommon-Regular.otf', bold: '/fonts/ResumeSansCommon-Bold.otf' },
  'serif-common': { family: 'Resume PDF Serif Common', normal: '/fonts/ResumeSerifCommon-Regular.otf', bold: '/fonts/ResumeSerifCommon-Bold.otf' },
} as const;

export function getPdfFontKey(fontFamily = '', text?: string): keyof typeof PDF_FONT_FAMILIES {
  const first = fontFamily.split(',')[0].replace(/["']/g, '').trim().toLowerCase();
  const base = !first.includes('sans') && /serif|georgia|times|simsun|song|kaiti|kai|fang|宋|楷|仿/.test(first) ? 'serif' : 'sans';
  // Check the actual rendered text, including translated contact labels. Never
  // select a Latin subset from the interface language alone.
  const latin = text === undefined ? /resume pdf .* latin/.test(first) : !/[^\t\n\r\u0020-\u024f\u0300-\u052f\u1e00-\u1eff\u2000-\u206f\u20a0-\u20cf\u2100-\u21ff\u2500-\u25ff\ufffd]/u.test(text);
  if (latin) return `${base}-latin`;
  const common = text === undefined ? /resume pdf .* common/.test(first) : [...text].every(char => commonCharacters.has(char));
  return common ? `${base}-common` : base;
}

const bytes = new Map<string, Promise<ArrayBuffer>>();
export function getPdfFontBytes(url: string): Promise<ArrayBuffer> {
  if (!bytes.has(url)) bytes.set(url, fetch(url).then(response => {
    if (!response.ok) throw new Error(`VECTOR_FONT_LOAD_FAILED:${response.status}`);
    return response.arrayBuffer();
  }).catch(error => { bytes.delete(url); throw error; }));
  return bytes.get(url)!;
}

const faces = new Map<string, Promise<FontFace>>();
export async function registerPdfLayoutFonts(doc: Document, fontFamily: string, text: string) {
  const definition = PDF_FONT_FAMILIES[getPdfFontKey(fontFamily, text)];
  const loaded = await Promise.all(([['normal', '400'], ['bold', '700']] as const).map(([weight, cssWeight]) => {
    const key = `${definition.family}/${weight}`;
    if (!faces.has(key)) faces.set(key, getPdfFontBytes(definition[weight]).then(data =>
      new FontFace(definition.family, data, { weight: cssWeight }).load()
    ).catch(error => { faces.delete(key); throw error; }));
    return faces.get(key)!;
  }));
  for (const face of loaded) doc.fonts.add(face);
  return definition.family;
}
