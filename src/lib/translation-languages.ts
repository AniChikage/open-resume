/**
 * Languages offered for translation. The list comes from the translation engine itself, so
 * it follows what the server really supports; the helpers here only name them and flag the
 * ones the PDF export cannot draw.
 */
export interface LanguageOption { code: string; label: string; pdf: boolean }
export interface EngineLanguageInfo { code: string; name?: string }

// Scripts the bundled PDF fonts do not cover (they cover Latin, Greek, Cyrillic and Chinese/Japanese/Korean).
// Arabic-script and Hebrew languages are also written right to left, which the layout does not handle.
// The Word export is not affected: Word supplies its own fonts.
const NO_PDF_FONT = new Set([
  'ar', 'he', 'iw', 'fa', 'ur', 'ps', 'sd', 'ug', 'ckb', 'dv', 'yi',      // Arabic and Hebrew scripts
  'hi', 'bn', 'ta', 'te', 'kn', 'ml', 'mr', 'gu', 'pa', 'ne', 'si', 'or', 'as', 'sa', // Indian scripts
  'th', 'lo', 'km', 'my',                                                  // South-East Asian scripts
  'ka', 'hy', 'am', 'ti', 'bo',                                            // Georgian, Armenian, Ethiopic, Tibetan
]);

/** Whether the PDF and PNG exports can draw this language's alphabet. */
export function isPdfRenderable(code: string): boolean {
  return !NO_PDF_FONT.has(code.toLowerCase().split('-')[0]);
}

/**
 * A language's name in that language ("Deutsch", "日本語"). Names the app already ships are
 * used as they are, so the interface stays consistent; the rest come from the browser's own
 * language data, then from the engine's English name.
 */
export function languageLabel(code: string, known: readonly { code: string; label: string }[] = [], engineName?: string): string {
  const shipped = known.find(language => language.code === code);
  if (shipped) return shipped.label;
  try {
    const name = new Intl.DisplayNames([code], { type: 'language' }).of(code);
    if (name && name !== code) return name.charAt(0).toLocaleUpperCase(code) + name.slice(1);
  } catch { /* an unknown code: fall through to the engine's name */ }
  return engineName || code;
}

/** Options for a language picker, sorted by name. `exclude` removes the source and the languages already added. */
export function buildLanguageOptions(languages: readonly EngineLanguageInfo[], known: readonly { code: string; label: string }[], exclude: ReadonlySet<string> = new Set()): LanguageOption[] {
  const seen = new Set<string>();
  return languages
    .filter(language => !exclude.has(language.code) && !seen.has(language.code) && seen.add(language.code))
    .map(language => ({ code: language.code, label: languageLabel(language.code, known, language.name), pdf: isPdfRenderable(language.code) }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

const cache = new Map<string, Promise<EngineLanguageInfo[]>>();

/**
 * The languages the server's translation engine can translate into from `source`. Remembered
 * for the page's lifetime; any failure returns an empty list so callers fall back to the
 * languages the app ships.
 */
export function fetchEngineLanguages(source: string, fetchImpl: typeof fetch = fetch): Promise<EngineLanguageInfo[]> {
  const cached = cache.get(source);
  if (cached) return cached;
  const request = (async () => {
    const response = await fetchImpl(`/api/translate/languages?source=${encodeURIComponent(source)}`, { credentials: 'same-origin' });
    if (!response.ok) return [];
    const data: unknown = await response.json();
    const list = data && typeof data === 'object' ? (data as { languages?: unknown }).languages : undefined;
    return Array.isArray(list)
      ? list.filter((entry): entry is EngineLanguageInfo => !!entry && typeof entry === 'object' && typeof (entry as EngineLanguageInfo).code === 'string')
      : [];
  })().catch(() => { cache.delete(source); return []; });
  cache.set(source, request);
  return request;
}

/** Forgets remembered lists (used by tests). */
export function clearEngineLanguageCache(): void {
  cache.clear();
}
