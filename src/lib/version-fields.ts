import type { ItemText } from '../types.ts';

/** How a version field is typed: one line, a paragraph, rich text, or one entry per line. */
export type FieldInputKind = 'line' | 'text' | 'rich' | 'lines';
export interface FieldInputProps { input: FieldInputKind; label: string; value: string; onChange(value: string): void }
export interface VersionFieldSpec { field: keyof ItemText; label: string; input: FieldInputKind }

// Fields a version can reword, by section kind. Labels reuse the editor's own wording.
// Dates and other language-neutral fields are deliberately absent.
const VERSION_FIELDS: Record<string, VersionFieldSpec[]> = {
  text: [{ field: 'body', label: 'Body', input: 'rich' }],
  education: [
    { field: 'major', label: 'Field of study', input: 'line' },
    { field: 'degree', label: 'Degree', input: 'line' },
    { field: 'body', label: 'Additional details', input: 'rich' },
  ],
  simpleList: [
    { field: 'title', label: 'Name', input: 'line' },
    { field: 'description', label: 'Description', input: 'text' },
  ],
  chips: [
    { field: 'title', label: 'Title', input: 'line' },
    { field: 'values', label: 'Skills, one per line', input: 'lines' },
  ],
  experience: [
    { field: 'role', label: 'Role / title', input: 'line' },
    { field: 'body', label: 'Content', input: 'rich' },
  ],
};

/** Unknown kinds (custom sections) are edited like experiences. */
export function versionFieldSpecs(kind: string): VersionFieldSpec[] {
  return VERSION_FIELDS[kind] ?? VERSION_FIELDS.experience;
}

/** Text typed in an input, as stored in a version: lists are one entry per non-blank line. */
export function toStoredValue(input: FieldInputKind, text: string): string | string[] {
  return input === 'lines' ? text.split('\n').map(line => line.trim()).filter(Boolean) : text;
}

/** A stored version value, as shown in an input. */
export function toDisplayValue(value: unknown): string {
  return Array.isArray(value) ? value.join('\n') : typeof value === 'string' ? value : '';
}
