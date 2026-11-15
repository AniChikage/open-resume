import { createContext, useContext } from 'react';
import type { ItemText, Preset, PresetItemChoice } from '../types.ts';
import type { TranslationRow } from './translation-rows.ts';
import type { ItemChoice } from './variants-edit.ts';

/**
 * What the editor exposes to the preset and version controls. A context keeps the
 * existing editor components' props unchanged: only the controls that need it read it.
 */
export interface VariantsApi {
  presets: Preset[];
  /** The active preset, or null when the full resume is shown. */
  presetId: string | null;
  selectPreset(presetId: string | null): void;
  createPreset(name: string): void;
  renameActivePreset(name: string): void;
  duplicateActivePreset(name: string): void;
  deleteActivePreset(): void;
  /** What the active preset does with an item (undefined = default content). */
  choiceFor(itemId: string): PresetItemChoice | undefined;
  setChoice(itemId: string, choice: ItemChoice): void;
  isSectionHidden(sectionId: string): boolean;
  setSectionHidden(sectionId: string, hidden: boolean): void;
  addVersion(itemId: string, name: string): void;
  renameVersion(itemId: string, versionId: string, name: string): void;
  deleteVersion(itemId: string, versionId: string): void;
  setVersionField(itemId: string, versionId: string, field: keyof ItemText, value: string | string[] | undefined): void;

  // ---- Languages ----
  /** Language the resume content is written in. */
  sourceLocale: string;
  /** Languages the resume is translated into (never includes the source language). */
  translatedLocales: string[];
  /** The language being viewed and exported; null when it is the source language. */
  localeId: string | null;
  selectLocale(locale: string | null): void;
  setSourceLocale(locale: string): void;
  addLocale(locale: string): void;
  removeLocale(locale: string): void;
  /** Texts to translate for the active language (empty while viewing the source language). */
  rows: TranslationRow[];
  /** Texts of the active language that are not translated yet (every item, whatever the preset). */
  missingCount: number;
  itemLabel(itemId: string): string;
  versionName(itemId: string, versionId: string): string;
  /** Saves the translation typed for a row, remembering which source text it answers. */
  setRowTranslation(row: TranslationRow, value: string): void;
  /** Declares the translation of a row up to date with its current source text. */
  markRowCurrent(row: TranslationRow): void;
  /** Stores automatic translations (one value per row), flagged until reviewed; texts typed in the meantime are kept. */
  applyMachineTranslations(entries: { row: TranslationRow; value: string }[]): void;
  /** Clears the "automatic translation" flag of a row a person has read and accepted. */
  markRowReviewed(row: TranslationRow): void;
  /** Translations whose source text changed since they were written. */
  staleCount: number;
  isItemSame(itemId: string): boolean;
  setItemSame(itemId: string, same: boolean): void;
}

const VariantsContext = createContext<VariantsApi | null>(null);
export const VariantsProvider = VariantsContext.Provider;
/** Returns null outside the editor, so the controls simply render nothing there. */
export function useVariants(): VariantsApi | null {
  return useContext(VariantsContext);
}
