import type { EditorDocument,Resume,ResumeItem,ResumeSettings,SectionType } from '../types.ts';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
const sectionTypes: readonly SectionType[] = ['summary','education','work','project','organization','awards','skills','custom'];
export function isResumeItem(value: unknown): value is ResumeItem {
  if (!isRecord(value) || typeof value.id !== 'string') return false;
  const text = ['title','body','school','major','degree','org','role','department','startDate','endDate','period','location','meta','description'];
  return text.every(key => value[key] === undefined || typeof value[key] === 'string')
    && (value.current === undefined || typeof value.current === 'boolean')
    && ['bullets','details','values'].every(key => value[key] === undefined || (Array.isArray(value[key]) && value[key].every((item:unknown) => typeof item === 'string')));
}
export function isResume(value: unknown): value is Resume {
  if (!isRecord(value) || typeof value.title !== 'string' || !isRecord(value.profile) || !Array.isArray(value.sections)) return false;
  const profile = value.profile;
  return ['name','email','phone','website','city','birthday','status','headline','avatar'].every(key => typeof profile[key] === 'string')
    && value.sections.every((section:unknown) => isRecord(section)
      && typeof section.id === 'string' && typeof section.label === 'string'
      && typeof section.type === 'string' && sectionTypes.some(type => type === section.type)
      && typeof section.visible === 'boolean' && Array.isArray(section.items) && section.items.every(isResumeItem));
}
export function isResumeSettings(value: unknown): value is ResumeSettings {
  return isRecord(value) && ['template','accent','fontFamily'].every(key => typeof value[key] === 'string')
    && typeof value.fontSize === 'number' && Number.isFinite(value.fontSize)
    && typeof value.lineHeight === 'number' && Number.isFinite(value.lineHeight)
    && typeof value.compact === 'boolean'
    && (value.titleMode === undefined || value.titleMode === 'auto' || value.titleMode === 'custom')
    && (value.titleKind === undefined || value.titleKind === 'blank' || value.titleKind === 'template' || value.titleKind === 'custom');
}
export function isEditorDocument(value: unknown): value is EditorDocument {
  return isRecord(value) && isResume(value.resume) && isResumeSettings(value.settings);
}
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
