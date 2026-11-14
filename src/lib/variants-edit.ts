import type { ItemText, ItemVersion, Preset, Resume, ResumeItem, Variants } from '../types.ts';
import { DEFAULT_SOURCE_LOCALE } from './variants.ts';

/**
 * Editing helpers for the variants of a resume.
 *
 * Every function mutates the resume it receives, in the same way as the editor's
 * `updateResume` recipes (which hand them a private copy). They never throw on
 * unknown ids: a stale id from the UI simply does nothing.
 */

export const MAX_NAME_LENGTH = 200;

/** What a preset does with one item. */
export type ItemChoice = 'default' | 'hidden' | { version: string };

const cleanName = (name: string) => name.trim().slice(0, MAX_NAME_LENGTH);

export function ensureVariants(resume: Resume): Variants {
  if (!resume.variants) resume.variants = { v: 1, sourceLocale: DEFAULT_SOURCE_LOCALE, presets: [], translations: {} };
  return resume.variants;
}

export function findItem(resume: Resume, itemId: string): ResumeItem | undefined {
  for (const section of resume.sections) {
    const item = section.items.find(candidate => candidate.id === itemId);
    if (item) return item;
  }
  return undefined;
}

export function findPreset(resume: Resume, presetId: string | null | undefined): Preset | undefined {
  return presetId ? resume.variants?.presets.find(preset => preset.id === presetId) : undefined;
}

// ---- Presets ----------------------------------------------------------------

/** Adds an empty preset (everything shown). Returns it, or undefined when the name is blank. */
export function createPreset(resume: Resume, name: string, id: string = crypto.randomUUID()): Preset | undefined {
  const trimmed = cleanName(name);
  if (!trimmed) return undefined;
  const preset: Preset = { id, name: trimmed, items: {} };
  ensureVariants(resume).presets.push(preset);
  return preset;
}

export function renamePreset(resume: Resume, presetId: string, name: string): void {
  const preset = findPreset(resume, presetId);
  const trimmed = cleanName(name);
  if (preset && trimmed) preset.name = trimmed;
}

/** Copies a preset under a new name. Returns the copy, or undefined for an unknown preset or blank name. */
export function duplicatePreset(resume: Resume, presetId: string, name: string, id: string = crypto.randomUUID()): Preset | undefined {
  const source = findPreset(resume, presetId);
  const trimmed = cleanName(name);
  if (!source || !trimmed) return undefined;
  const copy: Preset = { ...structuredClone(source), id, name: trimmed };
  resume.variants!.presets.push(copy);
  return copy;
}

export function deletePreset(resume: Resume, presetId: string): void {
  if (resume.variants) resume.variants.presets = resume.variants.presets.filter(preset => preset.id !== presetId);
}

/** Sets what a preset does with an item. "default" removes the entry so new fields stay inherited. */
export function setItemChoice(resume: Resume, presetId: string, itemId: string, choice: ItemChoice): void {
  const preset = findPreset(resume, presetId);
  if (!preset || itemId === '__proto__') return;
  if (choice === 'default') delete preset.items[itemId];
  else if (choice === 'hidden') preset.items[itemId] = { hidden: true };
  else preset.items[itemId] = { version: choice.version };
}

export function setSectionHidden(resume: Resume, presetId: string, sectionId: string, hidden: boolean): void {
  const preset = findPreset(resume, presetId);
  if (!preset || sectionId === '__proto__') return;
  if (hidden) (preset.sections ??= {})[sectionId] = { hidden: true };
  else if (preset.sections) {
    delete preset.sections[sectionId];
    if (Object.keys(preset.sections).length === 0) delete preset.sections;
  }
}

// ---- Item versions ----------------------------------------------------------

/** Adds an empty version (it inherits every field) to an item. Returns it, or undefined if impossible. */
export function addItemVersion(resume: Resume, itemId: string, name: string, id: string = crypto.randomUUID()): ItemVersion | undefined {
  const item = findItem(resume, itemId);
  const trimmed = cleanName(name);
  if (!item || !trimmed) return undefined;
  const version: ItemVersion = { id, name: trimmed, content: {} };
  (item.versions ??= []).push(version);
  return version;
}

export function renameItemVersion(resume: Resume, itemId: string, versionId: string, name: string): void {
  const version = findItem(resume, itemId)?.versions?.find(candidate => candidate.id === versionId);
  const trimmed = cleanName(name);
  if (version && trimmed) version.name = trimmed;
}

/** Deletes a version and everything that pointed at it (preset choices and its translations). */
export function deleteItemVersion(resume: Resume, itemId: string, versionId: string): void {
  const item = findItem(resume, itemId);
  if (!item?.versions) return;
  item.versions = item.versions.filter(version => version.id !== versionId);
  if (item.versions.length === 0) delete item.versions;
  for (const preset of resume.variants?.presets ?? []) {
    if (preset.items[itemId]?.version === versionId) delete preset.items[itemId];
  }
  for (const translation of Object.values(resume.variants?.translations ?? {})) {
    const versions = translation.items?.[itemId]?.versions;
    if (versions) delete versions[versionId];
  }
}

/**
 * Overrides one field of a version, or restores inheritance when `value` is undefined.
 * An empty string or list is a deliberate override that blanks the field.
 */
export function setVersionField<K extends keyof ItemText>(resume: Resume, itemId: string, versionId: string, field: K, value: ItemText[K] | undefined): void {
  const version = findItem(resume, itemId)?.versions?.find(candidate => candidate.id === versionId);
  if (!version) return;
  if (value === undefined) delete version.content[field];
  else (version.content as Record<string, unknown>)[field] = value;
}

// ---- Consistency ------------------------------------------------------------

/**
 * Rewrites the section and item ids inside variants after an import gave the resume
 * new ids. References to ids missing from the maps are dropped. The input must already
 * be valid variants; the output is valid too.
 */
export function remapVariantIds(variants: Variants, sectionIds: ReadonlyMap<string, string>, itemIds: ReadonlyMap<string, string>): Variants {
  const remap = <T>(record: Record<string, T> | undefined, ids: ReadonlyMap<string, string>): Record<string, T> => {
    const result: Record<string, T> = {};
    for (const [key, value] of Object.entries(record ?? {})) {
      const next = ids.get(key);
      if (next !== undefined) result[next] = value;
    }
    return result;
  };
  const withoutEmpty = <T>(record: Record<string, T>): Record<string, T> | undefined => Object.keys(record).length ? record : undefined;
  return {
    ...variants,
    presets: variants.presets.map(preset => {
      const sections = withoutEmpty(remap(preset.sections, sectionIds));
      return { id: preset.id, name: preset.name, items: remap(preset.items, itemIds), ...(sections ? { sections } : {}) };
    }),
    translations: Object.fromEntries(Object.entries(variants.translations).map(([locale, translation]) => {
      const sections = withoutEmpty(remap(translation.sections, sectionIds));
      const items = withoutEmpty(remap(translation.items, itemIds));
      return [locale, { ...(translation.profile ? { profile: translation.profile } : {}), ...(sections ? { sections } : {}), ...(items ? { items } : {}) }];
    })),
  };
}

/**
 * Drops references to items, sections and versions that no longer exist (after a
 * deletion), so stored presets and translations do not grow stale data.
 */
export function pruneVariants(resume: Resume): void {
  const variants = resume.variants;
  if (!variants) return;
  const sectionIds = new Set(resume.sections.map(section => section.id));
  const versionsByItem = new Map<string, Set<string>>();
  for (const section of resume.sections) {
    for (const item of section.items) versionsByItem.set(item.id, new Set((item.versions ?? []).map(version => version.id)));
  }
  for (const preset of variants.presets) {
    for (const [itemId, choice] of Object.entries(preset.items)) {
      const versions = versionsByItem.get(itemId);
      if (!versions || (choice.version !== undefined && !versions.has(choice.version))) delete preset.items[itemId];
    }
    if (preset.sections) {
      for (const sectionId of Object.keys(preset.sections)) if (!sectionIds.has(sectionId)) delete preset.sections[sectionId];
      if (Object.keys(preset.sections).length === 0) delete preset.sections;
    }
  }
  for (const translation of Object.values(variants.translations)) {
    if (translation.sections) for (const sectionId of Object.keys(translation.sections)) if (!sectionIds.has(sectionId)) delete translation.sections[sectionId];
    if (!translation.items) continue;
    for (const [itemId, itemTranslation] of Object.entries(translation.items)) {
      const versions = versionsByItem.get(itemId);
      if (!versions) { delete translation.items[itemId]; continue; }
      if (itemTranslation.versions) for (const versionId of Object.keys(itemTranslation.versions)) if (!versions.has(versionId)) delete itemTranslation.versions[versionId];
    }
  }
}
