import { readBoundedJson } from './tailoring.ts';
import { isLocale, isRecord } from './lib/validation.ts';

/**
 * Optional machine translation. The administrator picks one engine with environment
 * variables (nothing is sent anywhere unless they do):
 *
 *   TRANSLATE_PROVIDER = libretranslate | deepl
 *   TRANSLATE_URL      = LibreTranslate base URL (required); DeepL API URL (optional)
 *   TRANSLATE_API_KEY  = DeepL key (required); LibreTranslate key (optional)
 *
 * The key stays on the server. The browser only asks `/api/translate` and learns, from
 * `/api/config`, which engine (if any) is configured.
 */
export type TranslateProvider = 'libretranslate' | 'deepl';
export interface TranslateEngine { provider: TranslateProvider; url: string; apiKey: string }
export interface TranslateItem { text: string; format: 'text' | 'html' }

export const TRANSLATE_MAX_ITEMS = 200;
export const TRANSLATE_MAX_ITEM_LENGTH = 20_000;
export const TRANSLATE_MAX_TOTAL_LENGTH = 100_000;
const BATCH_SIZE = 50; // DeepL accepts at most 50 texts per request; the same size suits LibreTranslate.
const REQUEST_TIMEOUT_MS = 60_000;

const json = (body: unknown, status: number = 200, headers: Record<string, string> = {}) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
const failure = (code: string, status: number, headers?: Record<string, string>) => json({ error: code }, status, headers);

/** Reads the engine from the environment; null when none is (fully) configured. */
export function translateEngine(env: NodeJS.ProcessEnv): TranslateEngine | null {
  const provider = env.TRANSLATE_PROVIDER?.trim().toLowerCase();
  const apiKey = env.TRANSLATE_API_KEY?.trim() ?? '';
  let url = env.TRANSLATE_URL?.trim() ?? '';
  if (provider === 'libretranslate') { if (!url) return null; }
  else if (provider === 'deepl') {
    if (!apiKey) return null;
    url ||= apiKey.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
  } else return null;
  try { if (!/^https?:$/.test(new URL(url).protocol)) return null; } catch { return null; }
  return { provider, url: url.replace(/\/+$/, ''), apiKey };
}

// ---- Language codes ---------------------------------------------------------

const lower = (locale: string) => locale.toLowerCase();
const isTraditionalChinese = (locale: string) => ['zh-tw', 'zh-hant', 'zh-hk'].includes(lower(locale));

/** LibreTranslate uses two-letter codes, with "zt" for Traditional Chinese. */
export function libreCode(locale: string): string {
  return isTraditionalChinese(locale) ? 'zt' : lower(locale).split('-')[0];
}
export function deeplSourceCode(locale: string): string {
  return lower(locale).startsWith('zh') ? 'ZH' : lower(locale).split('-')[0].toUpperCase();
}
/** DeepL needs a regional variant for English and Portuguese targets. */
export function deeplTargetCode(locale: string): string {
  const code = lower(locale);
  if (isTraditionalChinese(code)) return 'ZH-HANT';
  if (code.startsWith('zh')) return 'ZH-HANS';
  if (code === 'en' || code === 'en-us') return 'EN-US';
  if (code === 'en-gb') return 'EN-GB';
  if (code === 'pt' || code === 'pt-pt') return 'PT-PT';
  if (code === 'pt-br') return 'PT-BR';
  return code.split('-')[0].toUpperCase();
}

// ---- Engines ----------------------------------------------------------------

class ProviderError extends Error {}

async function post(fetchImpl: typeof fetch, url: string, headers: Record<string, string>, body: unknown): Promise<unknown> {
  const response = await fetchImpl(url, { method: 'POST', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS), headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  if (!response.ok) {
    await response.body?.cancel();
    throw new ProviderError(response.status === 429 || response.status === 456 ? 'PROVIDER_BUSY' : 'TRANSLATE_UNAVAILABLE');
  }
  try { return await readBoundedJson(response, 2_000_000); } catch { throw new ProviderError('TRANSLATE_UNAVAILABLE'); }
}

const stringArray = (value: unknown, length: number): string[] => {
  if (!Array.isArray(value) || value.length !== length || !value.every(entry => typeof entry === 'string')) throw new ProviderError('TRANSLATE_UNAVAILABLE');
  return value;
};

async function translateWithLibre(engine: TranslateEngine, texts: string[], format: 'text' | 'html', source: string, target: string, fetchImpl: typeof fetch): Promise<string[]> {
  const data = await post(fetchImpl, `${engine.url}/translate`, {}, {
    q: texts, source: libreCode(source), target: libreCode(target), format, ...(engine.apiKey ? { api_key: engine.apiKey } : {}),
  });
  const translated = isRecord(data) ? data.translatedText : undefined;
  // A one-text request may come back as a plain string from older servers.
  return stringArray(typeof translated === 'string' ? [translated] : translated, texts.length);
}

async function translateWithDeepl(engine: TranslateEngine, texts: string[], format: 'text' | 'html', source: string, target: string, fetchImpl: typeof fetch): Promise<string[]> {
  const data = await post(fetchImpl, `${engine.url}/v2/translate`, { Authorization: `DeepL-Auth-Key ${engine.apiKey}` }, {
    text: texts, source_lang: deeplSourceCode(source), target_lang: deeplTargetCode(target), ...(format === 'html' ? { tag_handling: 'html' } : {}),
  });
  const translations = isRecord(data) && Array.isArray(data.translations) ? data.translations.map(entry => isRecord(entry) ? entry.text : undefined) : undefined;
  return stringArray(translations, texts.length);
}

/** Translates every item, keeping order. Items are grouped by format (the engines take one format per request) and batched. */
export async function translateItems(engine: TranslateEngine, items: TranslateItem[], source: string, target: string, fetchImpl: typeof fetch = fetch): Promise<string[]> {
  const results: string[] = new Array(items.length);
  const send = engine.provider === 'deepl' ? translateWithDeepl : translateWithLibre;
  for (const format of ['text', 'html'] as const) {
    const indexes = items.flatMap((item, index) => item.format === format ? [index] : []);
    for (let start = 0; start < indexes.length; start += BATCH_SIZE) {
      const batch = indexes.slice(start, start + BATCH_SIZE);
      const translated = await send(engine, batch.map(index => items[index].text), format, source, target, fetchImpl);
      batch.forEach((index, position) => { results[index] = translated[position]; });
    }
  }
  return results;
}

// ---- Request handler --------------------------------------------------------

export async function handleTranslation(request: Request, env: NodeJS.ProcessEnv, user: { id: string } | null, { fetchImpl = fetch }: { fetchImpl?: typeof fetch } = {}) {
  if (!user?.id) return failure('UNAUTHORIZED', 401);
  if (request.method !== 'POST') return failure('METHOD_NOT_ALLOWED', 405, { Allow: 'POST' });
  const origin = request.headers.get('origin');
  if ((origin && new URL(origin).host !== new URL(request.url).host) || request.headers.get('sec-fetch-site') === 'cross-site') return failure('FORBIDDEN', 403);
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return failure('INVALID_JSON', 415);

  let items: TranslateItem[], source: string, target: string;
  try {
    const input = await readBoundedJson(request, 300_000);
    if (!isRecord(input) || input.consent !== true || !isLocale(input.source) || !isLocale(input.target) || lower(input.source) === lower(input.target)) return failure('INVALID_INPUT', 400);
    if (!Array.isArray(input.items) || input.items.length === 0 || input.items.length > TRANSLATE_MAX_ITEMS) return failure('INVALID_INPUT', 400);
    let total = 0;
    items = input.items.map((entry: unknown) => {
      if (!isRecord(entry) || typeof entry.text !== 'string' || !entry.text.trim() || entry.text.length > TRANSLATE_MAX_ITEM_LENGTH || (entry.format !== 'text' && entry.format !== 'html')) throw new Error('INVALID_INPUT');
      total += entry.text.length;
      return { text: entry.text, format: entry.format };
    });
    if (total > TRANSLATE_MAX_TOTAL_LENGTH) return failure('INVALID_INPUT', 400);
    source = input.source;
    target = input.target;
  } catch (error) {
    return failure(error instanceof Error && error.message === 'BODY_TOO_LARGE' ? 'BODY_TOO_LARGE' : 'INVALID_INPUT', error instanceof Error && error.message === 'BODY_TOO_LARGE' ? 413 : 400);
  }

  const engine = translateEngine(env);
  if (!engine) return failure('TRANSLATE_UNAVAILABLE', 503);
  try {
    const translations = await translateItems(engine, items, source, target, fetchImpl);
    return json({ translations, provider: engine.provider });
  } catch (error) {
    if (error instanceof ProviderError && error.message === 'PROVIDER_BUSY') return failure('PROVIDER_BUSY', 429, { 'Retry-After': '30' });
    return failure('TRANSLATE_UNAVAILABLE', 503);
  }
}
