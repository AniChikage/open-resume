import type { ItemText, Resume, Translation } from '../types.ts';
import { isLocale } from './validation.ts';
import { ensureVariants } from './variants-edit.ts';

/**
 * Editing helpers for the translations of a resume. Like the other variants helpers
 * they mutate the draft they receive and ignore unknown ids and invalid locales.
 */

type ProfileField = 'headline' | 'city' | 'status';

// Keys come from stored data: never let one of them reach the object prototype.
const isSafeKey = (key: string) => key !== '__proto__';

function translationFor(resume: Resume, locale: string): Translation | undefined {
  if (!isLocale(locale) || !isSafeKey(locale)) return undefined;
  const variants = ensureVariants(resume);
  return variants.translations[locale] ??= {};
}

/** Declares the language the resume content is written in. */
export function setSourceLocale(resume: Resume, locale: string): void {
  if (isLocale(locale)) ensureVariants(resume).sourceLocale = locale;
}

/** Starts a translation into `locale` (a no-op for the source language). */
export function addTranslationLocale(resume: Resume, locale: string): void {
  if (!isLocale(locale) || locale === resume.variants?.sourceLocale) return;
  translationFor(resume, locale);
}

export function removeTranslationLocale(resume: Resume, locale: string): void {
  if (resume.variants && Object.hasOwn(resume.variants.translations, locale)) delete resume.variants.translations[locale];
}

export function setProfileTranslation(resume: Resume, locale: string, field: ProfileField, value: string): void {
  const translation = translationFor(resume, locale);
  if (!translation) return;
  if (value.trim()) (translation.profile ??= {})[field] = value;
  else if (translation.profile) {
    delete translation.profile[field];
    if (Object.keys(translation.profile).length === 0) delete translation.profile;
  }
}

export function setSectionLabelTranslation(resume: Resume, locale: string, sectionId: string, value: string): void {
  const translation = translationFor(resume, locale);
  if (!translation || !isSafeKey(sectionId) || !resume.sections.some(section => section.id === sectionId)) return;
  if (value.trim()) (translation.sections ??= {})[sectionId] = { label: value };
  else if (translation.sections) {
    delete translation.sections[sectionId];
    if (Object.keys(translation.sections).length === 0) delete translation.sections;
  }
}

const isBlank = (value: string | string[]) => Array.isArray(value) ? value.every(entry => !entry.trim()) : !value.trim();

/**
 * Sets the translation of one item field. `versionId` selects the translation of a
 * version's own wording (null = the item's own text). A blank value removes it.
 */
export function setItemTranslation<K extends keyof ItemText>(
  resume: Resume, locale: string, itemId: string, versionId: string | null, field: K, value: NonNullable<ItemText[K]>,
): void {
  const translation = translationFor(resume, locale);
  if (!translation || !isSafeKey(itemId) || (versionId !== null && !isSafeKey(versionId))) return;
  const items = translation.items ??= {};
  const entry = items[itemId] ??= {};
  const target: ItemText = versionId === null ? (entry.base ??= {}) : ((entry.versions ??= {})[versionId] ??= {});
  if (isBlank(value)) delete target[field];
  else (target as Record<string, unknown>)[field] = value;
  // Drop containers that became empty so the document does not accumulate dead keys.
  if (versionId === null && Object.keys(entry.base!).length === 0) delete entry.base;
  if (versionId !== null && entry.versions && Object.keys(entry.versions[versionId]).length === 0) delete entry.versions[versionId];
  if (entry.versions && Object.keys(entry.versions).length === 0) delete entry.versions;
  if (Object.keys(entry).length === 0) delete items[itemId];
  if (Object.keys(items).length === 0) delete translation.items;
}

/** Marks an item as needing no translation (names, technical terms), or clears the mark. */
export function setItemSame(resume: Resume, locale: string, itemId: string, same: boolean): void {
  const translation = translationFor(resume, locale);
  if (!translation || !isSafeKey(itemId)) return;
  const items = translation.items ??= {};
  const entry = items[itemId] ??= {};
  if (same) entry.same = true;
  else delete entry.same;
  if (Object.keys(entry).length === 0) delete items[itemId];
  if (Object.keys(items).length === 0) delete translation.items;
}
