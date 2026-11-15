import { isPdfRenderable } from './translation-languages.ts';

export interface ExportWarnings {
  /** Texts that would be exported in the source language because they are not translated yet. */
  untranslated: number;
  /** The PDF/PNG fonts cannot draw the alphabet of the language being exported. */
  noFont: boolean;
}

/**
 * What to warn about before exporting. The JSON backup is the whole resume, so it never
 * warns; only PDF and PNG are drawn with the bundled fonts (Word supplies its own).
 */
export function exportWarnings(type: string, shownLocale: string | null, sourceLocale: string, missing: number): ExportWarnings {
  return {
    untranslated: shownLocale && type !== 'json' ? missing : 0,
    noFont: (type === 'pdf' || type === 'png') && !isPdfRenderable(shownLocale ?? sourceLocale),
  };
}
