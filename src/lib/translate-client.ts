import { assembleTranslations, chunkPlan, planTranslation } from './translation-plan.ts';
import type { PlannedItem } from './translation-plan.ts';
import type { TranslationRow } from './translation-rows.ts';

/** A failure reported by /api/translate, with the server's error code (or "NETWORK"). */
export class TranslateError extends Error {
  readonly code: string;
  constructor(code: string) { super(code); this.code = code; }
}

async function requestChunk(items: PlannedItem[], source: string, target: string, fetchImpl: typeof fetch): Promise<string[]> {
  let response: Response;
  try {
    response = await fetchImpl('/api/translate', {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      // Pressing the button, after reading the notice about what is sent, is the consent.
      body: JSON.stringify({ items: items.map(({ text, format }) => ({ text, format })), source, target, consent: true }),
    });
  } catch { throw new TranslateError('NETWORK'); }
  let data: unknown;
  try { data = await response.json(); } catch { data = null; }
  const record = data && typeof data === 'object' ? data as Record<string, unknown> : {};
  if (!response.ok) throw new TranslateError(typeof record.error === 'string' ? record.error : 'TRANSLATE_UNAVAILABLE');
  const translations = record.translations;
  if (!Array.isArray(translations) || translations.length !== items.length || !translations.every(entry => typeof entry === 'string')) throw new TranslateError('TRANSLATE_UNAVAILABLE');
  return translations;
}

export interface TranslateRowsResult {
  /** Translated text by row key, for the rows that were fully translated. */
  translations: Map<string, string>;
  /** Rows not sent because a text is too long for the service. */
  skipped: string[];
  /** Why the run stopped early, if it did; translations already received are still returned. */
  error?: string;
}

/**
 * Translates the untranslated rows (or only `rowKeys`), one request after the other so a
 * slow service is not flooded. Stops at the first failure and returns what it already has.
 */
export async function translateRows(
  rows: TranslationRow[], source: string, target: string,
  { fetchImpl = fetch, rowKeys, onProgress }: { fetchImpl?: typeof fetch; rowKeys?: ReadonlySet<string>; onProgress?: (done: number, total: number) => void } = {},
): Promise<TranslateRowsResult> {
  const plan = planTranslation(rows, rowKeys);
  const chunks = chunkPlan(plan.items);
  const answers: (string | undefined)[] = new Array(plan.items.length);
  let offset = 0;
  let error: string | undefined;
  onProgress?.(0, plan.items.length);
  for (const chunk of chunks) {
    try {
      const translated = await requestChunk(chunk, source, target, fetchImpl);
      translated.forEach((text, index) => { answers[offset + index] = text; });
    } catch (failure) {
      error = failure instanceof TranslateError ? failure.code : 'TRANSLATE_UNAVAILABLE';
      break;
    }
    offset += chunk.length;
    onProgress?.(offset, plan.items.length);
  }
  return { translations: assembleTranslations(plan.items, answers), skipped: plan.skipped, ...(error ? { error } : {}) };
}
