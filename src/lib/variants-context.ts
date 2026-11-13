import { createContext, useContext } from 'react';
import type { ItemText, Preset, PresetItemChoice } from '../types.ts';
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
}

const VariantsContext = createContext<VariantsApi | null>(null);
export const VariantsProvider = VariantsContext.Provider;
/** Returns null outside the editor, so the controls simply render nothing there. */
export function useVariants(): VariantsApi | null {
  return useContext(VariantsContext);
}
