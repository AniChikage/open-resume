import type { EditorDocument, ResumeProfile, ResumeSettings } from '../types.ts';
import type { VersionComparison } from './version-types.ts';

// Compare JSON by content so an import's object-key order does not create false changes.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  return JSON.stringify(value) ?? '';
}

export const sameVersionValue = (left: unknown, right: unknown): boolean => canonical(left) === canonical(right);

export function compareVersionDocuments(current: EditorDocument, historical: EditorDocument): VersionComparison {
  // Imported documents can carry extra metadata that the resume renderer ignores.
  // Only compare the known string fields that the editor can display safely.
  const visibleProfileFields: (keyof ResumeProfile)[] = ['name', 'email', 'phone', 'website', 'city', 'birthday', 'status', 'headline', 'avatar'];
  const profileFields = visibleProfileFields.filter(key => current.resume.profile[key] !== historical.resume.profile[key]);
  const currentSections = new Map(current.resume.sections.map((section, index) => [section.id, { section, index }]));
  const previousSections = new Map(historical.resume.sections.map((section, index) => [section.id, { section, index }]));
  const changedSections: string[] = [];
  for (const id of new Set([...currentSections.keys(), ...previousSections.keys()])) {
    const present = currentSections.get(id);
    const previous = previousSections.get(id);
    if (present?.index !== previous?.index || !sameVersionValue(present?.section, previous?.section)) {
      changedSections.push(present?.section.label || previous?.section.label || id);
    }
  }
  const appearanceFields: (keyof ResumeSettings)[] = ['template', 'accent', 'fontFamily', 'fontSize', 'lineHeight', 'compact'];
  return {
    profileFields,
    changedSections: [...new Set(changedSections)],
    appearanceChanged: appearanceFields.some(key => current.settings[key] !== historical.settings[key]),
    titleChanged: current.resume.title !== historical.resume.title,
  };
}
