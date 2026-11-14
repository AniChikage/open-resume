import { SECTION_TEMPLATES } from '../data.ts';
import type { ItemText, Resume, ResumeItem } from '../types.ts';
import type { FieldInputKind } from './version-fields.ts';
import { fingerprint, parseStoredFingerprint } from './fingerprint.ts';
import { toDisplayValue, versionFieldSpecs } from './version-fields.ts';

/**
 * The flat list of texts a translator has to fill in for one language, with the source
 * text next to each. It drives the translation panel; `resolveResume` stays the single
 * authority on what is rendered.
 */
export interface TranslationRow {
  /** Stable key, unique within the list. */
  key: string;
  scope: 'profile' | 'section' | 'item';
  field: string;
  /** English UI label of the field (passed through the editor's translator). */
  label: string;
  input: FieldInputKind;
  sectionId?: string;
  itemId?: string;
  /** Set when the text is a version's own wording rather than the item's. */
  versionId?: string;
  source: string;
  translated: string;
  /** The text is written in the source but not yet translated, and the item is not marked as "same". */
  missing: boolean;
  /** Translated, but the source text changed since it was written: the translation may be outdated. */
  stale: boolean;
  /** An automatic translation that nobody has reviewed yet. */
  machine: boolean;
}

const PROFILE_FIELDS = [['headline', 'Target role'], ['city', 'Current city'], ['status', 'Current status']] as const;
// Prose-like fields beyond what a section kind's version form offers, still worth translating.
const EXTRA_FIELDS: { field: keyof ItemText; label: string; input: FieldInputKind }[] = [
  { field: 'title', label: 'Title', input: 'line' },
  { field: 'department', label: 'Department', input: 'line' },
  { field: 'description', label: 'Description', input: 'text' },
  { field: 'bullets', label: 'Content', input: 'lines' },
  { field: 'details', label: 'Additional details', input: 'lines' },
  { field: 'values', label: 'Skills, one per line', input: 'lines' },
  { field: 'period', label: 'Dates', input: 'line' },
];

const isFilled = (value: string) => value.trim() !== '';
/** A translation is stale when it exists, a fingerprint of its source was kept, and the source no longer matches it. */
const isStale = (translated: string, source: string, stored: string | undefined) => {
  const parsed = parseStoredFingerprint(stored);
  return isFilled(translated) && parsed !== undefined && parsed.hash !== fingerprint(source);
};
const isMachine = (translated: string, stored: string | undefined) => isFilled(translated) && Boolean(parseStoredFingerprint(stored)?.machine);

function fieldsFor(kind: string, item: ResumeItem) {
  const specs = versionFieldSpecs(kind).map(spec => ({ ...spec }));
  const hasDates = Boolean(item.startDate || item.endDate || item.current);
  for (const extra of EXTRA_FIELDS) {
    if (specs.some(spec => spec.field === extra.field)) continue;
    if (extra.field === 'period' && hasDates) continue;
    specs.push(extra);
  }
  return specs;
}

export function isItemMarkedSame(resume: Resume, locale: string, itemId: string): boolean {
  const items = resume.variants?.translations[locale]?.items;
  return Boolean(items && Object.hasOwn(items, itemId) && items[itemId].same);
}

export function buildTranslationRows(resume: Resume, locale: string): TranslationRow[] {
  const translation = resume.variants && Object.hasOwn(resume.variants.translations, locale) ? resume.variants.translations[locale] : undefined;
  const rows: TranslationRow[] = [];
  const own = <T,>(record: Record<string, T> | undefined, key: string) => record && Object.hasOwn(record, key) ? record[key] : undefined;

  for (const [field, label] of PROFILE_FIELDS) {
    const source = resume.profile[field];
    if (!isFilled(source)) continue;
    const translated = translation?.profile?.[field] ?? '';
    rows.push({ key: `profile:${field}`, scope: 'profile', field, label, input: 'line', source, translated, missing: !isFilled(translated), stale: isStale(translated, source, own(translation?.profileSources, field)), machine: isMachine(translated, own(translation?.profileSources, field)) });
  }

  for (const section of resume.sections) {
    if (!section.visible) continue;
    const kind = SECTION_TEMPLATES[section.type]?.kind ?? 'experience';
    if (isFilled(section.label)) {
      const sectionTranslation = own(translation?.sections, section.id);
      const translated = sectionTranslation?.label ?? '';
      rows.push({ key: `section:${section.id}:label`, scope: 'section', field: 'label', label: 'Title', input: 'line', sectionId: section.id, source: section.label, translated, missing: !isFilled(translated), stale: isStale(translated, section.label, sectionTranslation?.source), machine: isMachine(translated, sectionTranslation?.source) });
    }
    for (const item of section.items) {
      const itemTranslation = own(translation?.items, item.id);
      const same = Boolean(itemTranslation?.same);
      for (const spec of fieldsFor(kind, item)) {
        const source = toDisplayValue(item[spec.field]);
        if (isFilled(source)) {
          const translated = toDisplayValue(itemTranslation?.base?.[spec.field]);
          rows.push({ key: `item:${item.id}:${spec.field}`, scope: 'item', field: spec.field, label: spec.label, input: spec.input, sectionId: section.id, itemId: item.id, source, translated, missing: !same && !isFilled(translated), stale: isStale(translated, source, own(itemTranslation?.sources?.base, spec.field)), machine: isMachine(translated, own(itemTranslation?.sources?.base, spec.field)) });
        }
        for (const version of item.versions ?? []) {
          const versionSource = toDisplayValue(version.content[spec.field]);
          if (!isFilled(versionSource)) continue;
          const translated = toDisplayValue(own(itemTranslation?.versions, version.id)?.[spec.field]);
          rows.push({ key: `item:${item.id}:${version.id}:${spec.field}`, scope: 'item', field: spec.field, label: spec.label, input: spec.input, sectionId: section.id, itemId: item.id, versionId: version.id, source: versionSource, translated, missing: !same && !isFilled(translated), stale: isStale(translated, versionSource, own(own(itemTranslation?.sources?.versions, version.id), spec.field)), machine: isMachine(translated, own(own(itemTranslation?.sources?.versions, version.id), spec.field)) });
        }
      }
    }
  }
  return rows;
}
