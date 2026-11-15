/**
 * The language tag documents expect ("fr-FR") for an app language code ("fr"). Word and PDF files
 * declare it so that readers, spell checkers and scanning robots know which language the text is in.
 */
export function languageTag(lang: string): string {
  const known: Record<string, string> = { en: 'en-US', fr: 'fr-FR', zh: 'zh-CN', 'zh-TW': 'zh-TW', ja: 'ja-JP', ko: 'ko-KR', ru: 'ru-RU' };
  return known[lang] ?? lang;
}
