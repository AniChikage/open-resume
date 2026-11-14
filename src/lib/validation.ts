import type { EditorDocument,ItemText,ItemTranslation,Preset,Resume,ResumeItem,ResumeSettings,SectionType,Translation,Variants } from '../types.ts';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
const sectionTypes: readonly SectionType[] = ['summary','education','work','project','organization','awards','skills','custom'];

// Upper bounds keep a hostile or corrupted document from growing without limit.
const MAX_PRESETS = 50;
const MAX_VERSIONS_PER_ITEM = 20;
const MAX_LOCALES = 20;
const MAX_ID_LENGTH = 200;
const MAX_NAME_LENGTH = 200;
// BCP 47-like language tags such as "en", "fr", "zh-TW".
const LOCALE_PATTERN = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8}){0,3}$/;
const ITEM_TEXT_KEYS = ['title','body','school','major','degree','org','role','department','location','meta','description','period'] as const;
const ITEM_LIST_KEYS = ['bullets','details','values'] as const;

export function isLocale(value: unknown): value is string {
  return typeof value === 'string' && value.length <= 35 && LOCALE_PATTERN.test(value);
}
const isId = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= MAX_ID_LENGTH;
const isName = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= MAX_NAME_LENGTH;
const isOptional = <T>(value: unknown, check: (input: unknown) => input is T): boolean => value === undefined || check(value);
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
const isString = (value: unknown): value is string => typeof value === 'string';
const everyValue = <T>(value: unknown, check: (input: unknown) => input is T): boolean =>
  isRecord(value) && Object.values(value).every(check);

// Text fields shared by items, item versions and item translations. Unknown keys are tolerated
// (older and newer editors may add fields); known keys must have the right type.
function hasValidItemText(value: Record<string, unknown>): boolean {
  return ITEM_TEXT_KEYS.every(key => value[key] === undefined || typeof value[key] === 'string')
    && ITEM_LIST_KEYS.every(key => value[key] === undefined || (Array.isArray(value[key]) && value[key].every((item:unknown) => typeof item === 'string')));
}
export function isItemText(value: unknown): value is ItemText {
  return isRecord(value) && hasValidItemText(value);
}
export function isItemVersions(value: unknown): boolean {
  if (!Array.isArray(value) || value.length > MAX_VERSIONS_PER_ITEM) return false;
  const ids = new Set<string>();
  for (const version of value) {
    if (!isRecord(version) || !isId(version.id) || !isName(version.name) || !isItemText(version.content) || ids.has(version.id)) return false;
    ids.add(version.id);
  }
  return true;
}
export function isResumeItem(value: unknown): value is ResumeItem {
  if (!isRecord(value) || typeof value.id !== 'string') return false;
  return hasValidItemText(value)
    && ['startDate','endDate'].every(key => value[key] === undefined || typeof value[key] === 'string')
    && (value.current === undefined || typeof value.current === 'boolean')
    && (value.versions === undefined || isItemVersions(value.versions));
}

function isItemTranslation(value: unknown): value is ItemTranslation {
  return isRecord(value) && isOptional(value.base, isItemText) && isOptional(value.same, isBoolean)
    && (value.versions === undefined || everyValue(value.versions, isItemText));
}
function isProfileTranslation(value: unknown): boolean {
  return isRecord(value) && ['headline','city','status'].every(key => value[key] === undefined || typeof value[key] === 'string');
}
function isTranslation(value: unknown): value is Translation {
  return isRecord(value)
    && (value.profile === undefined || isProfileTranslation(value.profile))
    && (value.sections === undefined || everyValue(value.sections, (section): section is { label?: string } => isRecord(section) && isOptional(section.label, isString)))
    && (value.items === undefined || everyValue(value.items, isItemTranslation));
}
function isPreset(value: unknown): value is Preset {
  return isRecord(value) && isId(value.id) && isName(value.name)
    && everyValue(value.items, (choice): choice is { hidden?: boolean; version?: string } => isRecord(choice) && isOptional(choice.hidden, isBoolean) && isOptional(choice.version, isString))
    && (value.sections === undefined || everyValue(value.sections, (section): section is { hidden?: boolean } => isRecord(section) && isOptional(section.hidden, isBoolean)));
}
export function isVariants(value: unknown): value is Variants {
  if (!isRecord(value) || value.v !== 1 || !isLocale(value.sourceLocale)) return false;
  if (!Array.isArray(value.presets) || value.presets.length > MAX_PRESETS || !value.presets.every(isPreset)) return false;
  const presetIds = new Set(value.presets.map(preset => preset.id));
  if (presetIds.size !== value.presets.length) return false;
  if (!isRecord(value.translations)) return false;
  const locales = Object.keys(value.translations);
  return locales.length <= MAX_LOCALES && locales.every(isLocale) && Object.values(value.translations).every(isTranslation);
}

export function isResume(value: unknown): value is Resume {
  if (!isRecord(value) || typeof value.title !== 'string' || !isRecord(value.profile) || !Array.isArray(value.sections)) return false;
  const profile = value.profile;
  return ['name','email','phone','website','city','birthday','status','headline','avatar'].every(key => typeof profile[key] === 'string')
    && value.sections.every((section:unknown) => isRecord(section)
      && typeof section.id === 'string' && typeof section.label === 'string'
      && typeof section.type === 'string' && sectionTypes.some(type => type === section.type)
      && typeof section.visible === 'boolean' && Array.isArray(section.items) && section.items.every(isResumeItem))
    && (value.variants === undefined || isVariants(value.variants));
}
export function isResumeSettings(value: unknown): value is ResumeSettings {
  return isRecord(value) && ['template','accent','fontFamily'].every(key => typeof value[key] === 'string')
    && typeof value.fontSize === 'number' && Number.isFinite(value.fontSize) && value.fontSize >= 8 && value.fontSize <= 32
    && typeof value.lineHeight === 'number' && Number.isFinite(value.lineHeight) && value.lineHeight >= 1 && value.lineHeight <= 3
    && typeof value.compact === 'boolean'
    && (value.paperSize === undefined || value.paperSize === 'a4' || value.paperSize === 'letter')
    && (value.titleMode === undefined || value.titleMode === 'auto' || value.titleMode === 'custom')
    && (value.titleKind === undefined || value.titleKind === 'blank' || value.titleKind === 'template' || value.titleKind === 'custom');
}
export function isEditorDocument(value: unknown): value is EditorDocument {
  return isRecord(value) && isResume(value.resume) && isResumeSettings(value.settings);
}
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
