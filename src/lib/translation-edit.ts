import type { ItemText, Resume, Translation } from '../types.ts';
import { parseStoredFingerprint, storedFingerprint } from './fingerprint.ts';
import { isLocale } from './validation.ts';
import { ensureVariants, tidyItemTranslation } from './variants-edit.ts';

/**
 * Editing helpers for the translations of a resume. Like the other variants helpers
 * they mutate the draft they receive and ignore unknown ids and invalid locales.
 *
 * Setters take an optional `source`: the source text being translated. When given, its
 * fingerprint is stored so a later edit of the source can be noticed (see translation-rows).
 * `machine` flags the text as an unreviewed automatic translation; a person's own edit
 * (machine omitted) clears the flag.
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

/** Assigns a property, or removes it when the value is undefined (so no key is left holding undefined). */
function assignOrDelete<T extends object, K extends keyof T>(target: T, key: K, value: T[K] | undefined): void {
  if (value === undefined) delete target[key];
  else target[key] = value;
}

/** Sets or removes one entry of a fingerprint map; returns the map, or undefined when it became empty. */
function withHash(map: Record<string, string> | undefined, field: string, hash: string | undefined): Record<string, string> | undefined {
  if (hash === undefined) {
    if (map) delete map[field];
  } else (map ??= {})[field] = hash;
  return map && Object.keys(map).length ? map : undefined;
}

export function setProfileTranslation(resume: Resume, locale: string, field: ProfileField, value: string, source?: string, machine = false): void {
  const translation = translationFor(resume, locale);
  if (!translation) return;
  if (value.trim()) {
    (translation.profile ??= {})[field] = value;
    if (source !== undefined) translation.profileSources = withHash(translation.profileSources, field, storedFingerprint(source, machine));
  } else {
    if (translation.profile) {
      delete translation.profile[field];
      if (Object.keys(translation.profile).length === 0) delete translation.profile;
    }
    translation.profileSources = withHash(translation.profileSources, field, undefined);
  }
  if (!translation.profileSources) delete translation.profileSources;
}

export function setSectionLabelTranslation(resume: Resume, locale: string, sectionId: string, value: string, source?: string, machine = false): void {
  const translation = translationFor(resume, locale);
  if (!translation || !isSafeKey(sectionId) || !resume.sections.some(section => section.id === sectionId)) return;
  if (value.trim()) {
    const previous = translation.sections && Object.hasOwn(translation.sections, sectionId) ? translation.sections[sectionId].source : undefined;
    const sourceHash = source !== undefined ? storedFingerprint(source, machine) : previous;
    (translation.sections ??= {})[sectionId] = { label: value, ...(sourceHash ? { source: sourceHash } : {}) };
  } else if (translation.sections) {
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
  resume: Resume, locale: string, itemId: string, versionId: string | null, field: K, value: NonNullable<ItemText[K]>, source?: string, machine = false,
): void {
  const translation = translationFor(resume, locale);
  if (!translation || !isSafeKey(itemId) || (versionId !== null && !isSafeKey(versionId))) return;
  const items = translation.items ??= {};
  const entry = items[itemId] ??= {};
  const blank = isBlank(value);
  const target: ItemText = versionId === null ? (entry.base ??= {}) : ((entry.versions ??= {})[versionId] ??= {});
  if (blank) delete target[field];
  else (target as Record<string, unknown>)[field] = value;

  // Fingerprint of the source this text answers: set with the text, dropped with it, kept when no source is given.
  if (blank || source !== undefined) {
    const hash = blank ? undefined : storedFingerprint(source!, machine);
    const sources = entry.sources ??= {};
    if (versionId === null) assignOrDelete(sources, 'base', withHash(sources.base, field, hash));
    else {
      const versions = sources.versions ??= {};
      const hashes = withHash(versions[versionId], field, hash);
      if (hashes) versions[versionId] = hashes; else delete versions[versionId];
    }
  }
  tidyItemTranslation(translation, itemId);
}

/** Where a translated text lives; the same coordinates a translation row carries. */
export interface TranslationTarget {
  scope: 'profile' | 'section' | 'item';
  field: string;
  sectionId?: string;
  itemId?: string;
  versionId?: string;
}

/**
 * Reads and rewrites the stored fingerprint of an existing translation. `update` receives
 * the current stored value (if any) and returns the new one. Nothing happens when there is
 * no translation text to attach a fingerprint to.
 */
function updateStoredFingerprint(resume: Resume, locale: string, target: TranslationTarget, update: (current: string | undefined) => string | undefined): void {
  const translation = resume.variants && Object.hasOwn(resume.variants.translations, locale) ? resume.variants.translations[locale] : undefined;
  if (!translation) return;
  if (target.scope === 'profile') {
    if (!translation.profile?.[target.field as ProfileField]) return;
    translation.profileSources = withHash(translation.profileSources, target.field, update(translation.profileSources?.[target.field]));
    if (!translation.profileSources) delete translation.profileSources;
  } else if (target.scope === 'section') {
    const entry = target.sectionId && translation.sections && Object.hasOwn(translation.sections, target.sectionId) ? translation.sections[target.sectionId] : undefined;
    if (!entry?.label) return;
    const next = update(entry.source);
    if (next === undefined) delete entry.source; else entry.source = next;
  } else if (target.itemId && isSafeKey(target.itemId) && translation.items && Object.hasOwn(translation.items, target.itemId)) {
    const entry = translation.items[target.itemId];
    const text = target.versionId ? (Object.hasOwn(entry.versions ?? {}, target.versionId) ? entry.versions![target.versionId] : undefined) : entry.base;
    if (!text || (text as Record<string, unknown>)[target.field] === undefined) return;
    const sources = entry.sources ??= {};
    if (!target.versionId) assignOrDelete(sources, 'base', withHash(sources.base, target.field, update(sources.base?.[target.field])));
    else if (isSafeKey(target.versionId)) {
      const versions = sources.versions ??= {};
      const hashes = withHash(versions[target.versionId], target.field, update(versions[target.versionId]?.[target.field]));
      if (hashes) versions[target.versionId] = hashes; else delete versions[target.versionId];
    }
    tidyItemTranslation(translation, target.itemId);
  }
}

/**
 * Declares an existing translation up to date with the current source text, without
 * changing it (the "I checked, it is still right" action). The automatic-translation flag,
 * if any, is kept: being up to date is not the same as having been reviewed.
 */
export function markTranslationCurrent(resume: Resume, locale: string, target: TranslationTarget, source: string): void {
  updateStoredFingerprint(resume, locale, target, current => storedFingerprint(source, parseStoredFingerprint(current)?.machine ?? false));
}

/** Clears the automatic-translation flag of a translation a person has read and accepted. */
export function markTranslationReviewed(resume: Resume, locale: string, target: TranslationTarget): void {
  updateStoredFingerprint(resume, locale, target, current => parseStoredFingerprint(current)?.hash);
}

/** Marks an item as needing no translation (names, technical terms), or clears the mark. */
export function setItemSame(resume: Resume, locale: string, itemId: string, same: boolean): void {
  const translation = translationFor(resume, locale);
  if (!translation || !isSafeKey(itemId)) return;
  const items = translation.items ??= {};
  const entry = items[itemId] ??= {};
  if (same) entry.same = true;
  else delete entry.same;
  tidyItemTranslation(translation, itemId);
}
