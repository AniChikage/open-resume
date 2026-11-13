import type { ItemText, ItemVersion, Preset, PresetItemChoice, Resume, ResumeItem, ResumeProfile, ResumeSection, Translation } from '../types.ts';

/**
 * Pure resolution of a resume into one concrete rendering.
 *
 * A stored resume holds its content in a single "source" language plus optional
 * layers: named item versions, presets (which items/versions to show) and
 * translations. `resolveResume` applies those layers and returns a plain `Resume`
 * that previews and exporters can consume without knowing about any of them.
 * The input is never mutated.
 */

/** Language assumed for resumes that do not declare one. */
export const DEFAULT_SOURCE_LOCALE = 'en';

/** Item text fields that a version or a translation may override. */
export const ITEM_TEXT_FIELDS: readonly (keyof ItemText)[] = [
  'title', 'body', 'school', 'major', 'degree', 'org', 'role', 'department',
  'location', 'meta', 'description', 'period', 'bullets', 'details', 'values',
];
// Prose-like fields reported as "missing" when untranslated. Proper nouns and
// short labels (organisation, school, location, meta) can legitimately stay as
// they are, so they are translatable but never reported.
const REPORTED_ITEM_FIELDS: ReadonlySet<keyof ItemText> = new Set<keyof ItemText>([
  'title', 'body', 'major', 'degree', 'role', 'department', 'description', 'period', 'bullets', 'details', 'values',
]);
const TRANSLATABLE_PROFILE_FIELDS = ['headline', 'city', 'status'] as const;

export interface ResolveOptions {
  /** Preset to apply. Unknown or missing ids show every item's default content. */
  presetId?: string;
  /** Target language. Defaults to the resume's source language. */
  locale?: string;
}
export interface MissingTranslation {
  scope: 'profile' | 'section' | 'item';
  field: string;
  sectionId?: string;
  itemId?: string;
  /** Set when the untranslated text belongs to a version rather than to the item itself. */
  versionId?: string;
}
export interface ResolvedResume {
  resume: Resume;
  locale: string;
  /** Source text shown instead of a translation. Always empty for the source language. */
  missing: MissingTranslation[];
}

/** Reads an own property only, so keys such as "__proto__" in stored data are harmless. */
function own<T>(record: Record<string, T> | undefined, key: string): T | undefined {
  return record && Object.hasOwn(record, key) ? record[key] : undefined;
}

/** A value counts as written when it is non-blank text or a list with some non-blank text. */
function isFilled(value: unknown): boolean {
  if (typeof value === 'string') return value.trim() !== '';
  return Array.isArray(value) && value.some(entry => typeof entry === 'string' && entry.trim() !== '');
}

function copyValue<T>(value: T): T {
  return Array.isArray(value) ? value.slice() as T : value;
}

function setText(item: ResumeItem, field: keyof ItemText, value: unknown): void {
  (item as unknown as Record<string, unknown>)[field] = value;
}

/** Copies an item without its versions, so consumers only ever see resolved content. */
function plainItem(item: ResumeItem): ResumeItem {
  const copy: ResumeItem = { ...item };
  delete copy.versions;
  for (const field of ITEM_TEXT_FIELDS) {
    const value = copy[field];
    if (Array.isArray(value)) setText(copy, field, value.slice());
  }
  return copy;
}

function hasStructuredDates(item: ResumeItem): boolean {
  return Boolean(item.startDate || item.endDate || item.current);
}

function resolveItem(
  item: ResumeItem, choice: PresetItemChoice | undefined, translation: Translation | undefined,
  translating: boolean, sectionId: string, missing: MissingTranslation[],
): ResumeItem {
  const result = plainItem(item);
  const version: ItemVersion | undefined = choice?.version ? item.versions?.find(candidate => candidate.id === choice.version) : undefined;
  const overrides = (field: keyof ItemText) => version !== undefined && version.content[field] !== undefined;

  // 1. Source-language wording of the selected version, on top of the item's own text.
  if (version) {
    for (const field of ITEM_TEXT_FIELDS) {
      if (overrides(field)) setText(result, field, copyValue(version.content[field]));
    }
  }
  if (!translating) return result;

  // 2. Translation. A field overridden by the version is translated under that version.
  const itemTranslation = own(translation?.items, item.id);
  for (const field of ITEM_TEXT_FIELDS) {
    if (!isFilled(result[field])) continue;
    const overridden = version !== undefined && overrides(field);
    const translated = overridden ? own(itemTranslation?.versions, version.id)?.[field] : itemTranslation?.base?.[field];
    if (isFilled(translated)) {
      setText(result, field, copyValue(translated));
    } else if (!itemTranslation?.same && REPORTED_ITEM_FIELDS.has(field) && (field !== 'period' || !hasStructuredDates(item))) {
      missing.push({ scope: 'item', sectionId, itemId: item.id, field, ...(overridden ? { versionId: version.id } : {}) });
    }
  }
  return result;
}

function resolveSection(
  section: ResumeSection, preset: Preset | undefined, translation: Translation | undefined,
  translating: boolean, missing: MissingTranslation[],
): ResumeSection {
  // Hidden sections are kept (marked invisible) so the output keeps the same shape.
  if (!section.visible || own(preset?.sections, section.id)?.hidden === true) {
    return { ...section, visible: false, items: section.items.map(plainItem) };
  }
  let label = section.label;
  if (translating && isFilled(label)) {
    const translated = own(translation?.sections, section.id)?.label;
    if (isFilled(translated)) label = translated as string;
    else missing.push({ scope: 'section', sectionId: section.id, field: 'label' });
  }
  const items: ResumeItem[] = [];
  for (const item of section.items) {
    const choice = own(preset?.items, item.id);
    if (choice?.hidden === true) continue;
    items.push(resolveItem(item, choice, translation, translating, section.id, missing));
  }
  return { ...section, label, items };
}

export function resolveResume(source: Resume, options: ResolveOptions = {}): ResolvedResume {
  const variants = source.variants;
  const sourceLocale = variants?.sourceLocale ?? DEFAULT_SOURCE_LOCALE;
  const locale = options.locale ?? sourceLocale;
  const translating = locale !== sourceLocale;
  const translation = translating ? own(variants?.translations, locale) : undefined;
  const preset = options.presetId ? variants?.presets.find(candidate => candidate.id === options.presetId) : undefined;
  const missing: MissingTranslation[] = [];

  const profile: ResumeProfile = { ...source.profile };
  if (translating) {
    for (const field of TRANSLATABLE_PROFILE_FIELDS) {
      if (!isFilled(profile[field])) continue;
      const translated = translation?.profile?.[field];
      if (isFilled(translated)) profile[field] = translated as string;
      else missing.push({ scope: 'profile', field });
    }
  }

  const resume: Resume = {
    ...source,
    profile,
    sections: source.sections.map(section => resolveSection(section, preset, translation, translating, missing)),
  };
  delete resume.variants;
  return { resume, locale, missing };
}
