import type { Resume } from '../types.ts';
import { buildTranslationRows } from './translation-rows.ts';
import { DEFAULT_SOURCE_LOCALE } from './variants.ts';

/** What a resume card in the library shows about the variants of a resume. */
export interface LanguageStatus {
  code: string;
  /** Texts still shown in the source language. */
  missing: number;
  /** Translations whose source changed since they were written. */
  stale: number;
}
export interface ResumeSummary {
  sourceLocale: string;
  translations: LanguageStatus[];
  presets: number;
  /** Item versions across the whole resume. */
  versions: number;
  /** True when the resume has anything beyond plain content, so the card has something to show. */
  hasVariants: boolean;
}

export function summarizeResume(resume: Resume): ResumeSummary {
  const variants = resume.variants;
  const sourceLocale = variants?.sourceLocale ?? DEFAULT_SOURCE_LOCALE;
  const translations = Object.keys(variants?.translations ?? {})
    .filter(code => code !== sourceLocale)
    .map(code => {
      const rows = buildTranslationRows(resume, code);
      return { code, missing: rows.filter(row => row.missing).length, stale: rows.filter(row => row.stale).length };
    });
  const versions = resume.sections.reduce((total, section) => total + section.items.reduce((sum, item) => sum + (item.versions?.length ?? 0), 0), 0);
  const presets = variants?.presets.length ?? 0;
  return { sourceLocale, translations, presets, versions, hasVariants: translations.length > 0 || presets > 0 || versions > 0 };
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * "2 hours ago" in the interface language for recent edits, and a plain date for older ones.
 * `now` is a parameter so the result can be tested. Returns an empty string for a resume never saved.
 */
export function relativeTime(timestamp: number, now: number, lang: string, justNow: string): string {
  if (!timestamp) return '';
  const elapsed = now - timestamp;
  const date = () => new Date(timestamp).toLocaleDateString(lang, { year: 'numeric', month: '2-digit', day: '2-digit' });
  if (elapsed < 0) return date();
  if (elapsed < MINUTE) return justNow;
  try {
    const formatter = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
    if (elapsed < HOUR) return formatter.format(-Math.floor(elapsed / MINUTE), 'minute');
    if (elapsed < DAY) return formatter.format(-Math.floor(elapsed / HOUR), 'hour');
    if (elapsed < 30 * DAY) return formatter.format(-Math.floor(elapsed / DAY), 'day');
  } catch { /* an unknown language tag: fall back to the date */ }
  return date();
}
