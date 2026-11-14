import type { ItemText, Resume, Translation } from '../types.ts';
import { fingerprint } from './fingerprint.ts';
import { isLocale } from './validation.ts';
import { ensureVariants, tidyItemTranslation } from './variants-edit.ts';

/**
 * Editing helpers for the translations of a resume. Like the other variants helpers
 * they mutate the draft they receive and ignore unknown ids and invalid locales.
 *
 * Setters take an optional `source`: the source text being translated. When given, its
 * fingerprint is stored so a later edit of the source can be noticed (see translation-rows).
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

export function setProfileTranslation(resume: Resume, locale: string, field: ProfileField, value: string, source?: string): void {
  const translation = translationFor(resume, locale);
  if (!translation) return;
  if (value.trim()) {
    (translation.profile ??= {})[field] = value;
    if (source !== undefined) translation.profileSources = withHash(translation.profileSources, field, fingerprint(source));
  } else {
    if (translation.profile) {
      delete translation.profile[field];
      if (Object.keys(translation.profile).length === 0) delete translation.profile;
    }
    translation.profileSources = withHash(translation.profileSources, field, undefined);
  }
  if (!translation.profileSources) delete translation.profileSources;
}

export function setSectionLabelTranslation(resume: Resume, locale: string, sectionId: string, value: string, source?: string): void {
  const translation = translationFor(resume, locale);
  if (!translation || !isSafeKey(sectionId) || !resume.sections.some(section => section.id === sectionId)) return;
  if (value.trim()) {
    const previous = translation.sections && Object.hasOwn(translation.sections, sectionId) ? translation.sections[sectionId].source : undefined;
    const sourceHash = source !== undefined ? fingerprint(source) : previous;
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
  resume: Resume, locale: string, itemId: string, versionId: string | null, field: K, value: NonNullable<ItemText[K]>, source?: string,
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
    const hash = blank ? undefined : fingerprint(source!);
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
 * Declares an existing translation up to date with the current source text, without
 * changing it (the "I checked, it is still right" action). Does nothing when there is
 * no translation to vouch for.
 */
export function markTranslationCurrent(resume: Resume, locale: string, target: TranslationTarget, source: string): void {
  const translation = resume.variants && Object.hasOwn(resume.variants.translations, locale) ? resume.variants.translations[locale] : undefined;
  if (!translation) return;
  const hash = fingerprint(source);
  if (target.scope === 'profile') {
    if (translation.profile?.[target.field as ProfileField]) translation.profileSources = withHash(translation.profileSources, target.field, hash);
    if (!translation.profileSources) delete translation.profileSources;
  } else if (target.scope === 'section') {
    const entry = target.sectionId && translation.sections && Object.hasOwn(translation.sections, target.sectionId) ? translation.sections[target.sectionId] : undefined;
    if (entry?.label) entry.source = hash;
  } else if (target.itemId && isSafeKey(target.itemId) && translation.items && Object.hasOwn(translation.items, target.itemId)) {
    const entry = translation.items[target.itemId];
    const text = target.versionId ? (Object.hasOwn(entry.versions ?? {}, target.versionId) ? entry.versions![target.versionId] : undefined) : entry.base;
    if (!text || (text as Record<string, unknown>)[target.field] === undefined) return;
    const sources = entry.sources ??= {};
    if (!target.versionId) assignOrDelete(sources, 'base', withHash(sources.base, target.field, hash));
    else if (isSafeKey(target.versionId)) {
      const versions = sources.versions ??= {};
      versions[target.versionId] = withHash(versions[target.versionId], target.field, hash)!;
    }
    tidyItemTranslation(translation, target.itemId);
  }
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
