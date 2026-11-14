import { TRANSLATE_MAX_ITEM_LENGTH, TRANSLATE_MAX_ITEMS, TRANSLATE_MAX_TOTAL_LENGTH } from './translate-limits.ts';
import type { TranslationRow } from './translation-rows.ts';

/**
 * Decides which texts to send to the translation service and how to put the answers
 * back. Pure: the network part lives in translate-client.ts.
 *
 * Only texts that have no translation yet are planned, so a text someone wrote (or an
 * earlier automatic translation) is never overwritten.
 */
export interface PlannedItem {
  rowKey: string;
  /** Position of this line inside a list row (bullets, skills); undefined for single-text rows. */
  line?: number;
  text: string;
  format: 'text' | 'html';
}
export interface TranslationPlan {
  items: PlannedItem[];
  /** Rows left out because one of their texts is longer than the service accepts. */
  skipped: string[];
}

// A margin under the server's total keeps a chunk valid even with multi-byte characters counted differently.
const CHUNK_TOTAL_LIMIT = Math.floor(TRANSLATE_MAX_TOTAL_LENGTH * 0.9);

/** `rowKeys` restricts the plan to some rows (the per-row "Translate" button). */
export function planTranslation(rows: TranslationRow[], rowKeys?: ReadonlySet<string>): TranslationPlan {
  const items: PlannedItem[] = [];
  const skipped: string[] = [];
  for (const row of rows) {
    if (rowKeys && !rowKeys.has(row.key)) continue;
    // Optional rows (company, school, place) are sent too: a name such as "Career break" does need translating.
    if (!(row.missing || row.optional) || row.translated.trim() || !row.source.trim()) continue;
    const parts = row.input === 'lines' ? row.source.split('\n').map(line => line.trim()).filter(Boolean) : [row.source];
    if (parts.some(part => part.length > TRANSLATE_MAX_ITEM_LENGTH)) { skipped.push(row.key); continue; }
    const format = row.input === 'rich' ? 'html' : 'text';
    parts.forEach((text, index) => items.push({ rowKey: row.key, ...(row.input === 'lines' ? { line: index } : {}), text, format }));
  }
  return { items, skipped };
}

/** Splits a plan into requests that respect the server's limits, keeping order. */
export function chunkPlan(items: PlannedItem[]): PlannedItem[][] {
  const chunks: PlannedItem[][] = [];
  let current: PlannedItem[] = [];
  let size = 0;
  for (const item of items) {
    if (current.length && (current.length >= TRANSLATE_MAX_ITEMS || size + item.text.length > CHUNK_TOTAL_LIMIT)) { chunks.push(current); current = []; size = 0; }
    current.push(item);
    size += item.text.length;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

/**
 * Puts translated texts back into one value per row. `translations[i]` answers `items[i]`;
 * a row is returned only when every one of its texts has an answer.
 */
export function assembleTranslations(items: PlannedItem[], translations: ReadonlyArray<string | undefined>): Map<string, string> {
  const byRow = new Map<string, { line: number; text: string | undefined }[]>();
  items.forEach((item, index) => {
    const parts = byRow.get(item.rowKey) ?? [];
    parts.push({ line: item.line ?? 0, text: translations[index] });
    byRow.set(item.rowKey, parts);
  });
  const result = new Map<string, string>();
  for (const [rowKey, parts] of byRow) {
    if (parts.some(part => typeof part.text !== 'string' || !part.text.trim())) continue;
    result.set(rowKey, parts.sort((a, b) => a.line - b.line).map(part => (part.text as string).trim()).join('\n'));
  }
  return result;
}
