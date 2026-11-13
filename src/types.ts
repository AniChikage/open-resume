export type Language = 'en' | 'zh' | 'zh-TW' | 'ja' | 'ko' | 'fr' | 'ru';
export type LocalizedText = Record<string, string>;
export type Translate = (message: string, values?: Record<string, string | number>) => string;
export type SectionType = 'summary' | 'education' | 'work' | 'project' | 'organization' | 'awards' | 'skills' | 'custom';
export interface ResumeProfile {
  name: string; email: string; phone: string; website: string; city: string;
  birthday: string; status: string; headline: string; avatar: string;
}
// Fields are optional because each section uses a different subset, and older
// saved documents can omit fields introduced by a newer editor.
export interface ResumeItem {
  id: string; title?: string; body?: string; school?: string; major?: string;
  degree?: string; org?: string; role?: string; department?: string;
  startDate?: string; endDate?: string; current?: boolean; period?: string;
  location?: string; meta?: string; description?: string;
  bullets?: string[]; details?: string[]; values?: string[];
  // Alternative wordings of this item (e.g. "Short", "Backend focus"), selected by presets.
  versions?: ItemVersion[];
}
// Text fields of an item that a version or a translation may override.
// Dates and flags are language-neutral, so they are deliberately excluded.
export type ItemText = Partial<Pick<ResumeItem,
  'title' | 'body' | 'school' | 'major' | 'degree' | 'org' | 'role' | 'department' | 'location'
  | 'meta' | 'description' | 'period' | 'bullets' | 'details' | 'values'>>;
// A named, user-written alternative of an item. `content` only lists the fields
// that differ from the item itself; every other field is inherited.
export interface ItemVersion { id: string; name: string; content: ItemText }
export interface ItemTranslation {
  base?: ItemText;                          // translation of the item's own text
  versions?: Record<string, ItemText>;      // translation of each version's overridden text, by version id
  same?: boolean;                           // the item needs no translation (names, technical terms...)
}
export interface Translation {
  profile?: Partial<Pick<ResumeProfile, 'headline' | 'city' | 'status'>>;
  sections?: Record<string, { label?: string }>;
  items?: Record<string, ItemTranslation>;
}
export interface PresetItemChoice { hidden?: boolean; version?: string }
// A named selection used to tailor the resume to a target job. Anything not
// listed shows the item's default content.
export interface Preset {
  id: string; name: string;
  items: Record<string, PresetItemChoice>;
  sections?: Record<string, { hidden?: boolean }>;
}
// Everything needed to produce several renderings of one resume. It lives inside
// the resume JSON because the server only persists the `resume` and `settings` columns.
export interface Variants {
  v: 1;
  sourceLocale: string;                      // language the resume content is written in
  presets: Preset[];
  translations: Record<string, Translation>; // by locale, e.g. "fr"
}
export interface ResumeSection {
  id: string; type: SectionType; label: string; visible: boolean; items: ResumeItem[];
}
export interface Resume { title: string; profile: ResumeProfile; sections: ResumeSection[]; variants?: Variants }
export interface ResumeSettings {
  template: string; accent: string; fontFamily: string; fontSize: number;
  lineHeight: number; compact: boolean; paperSize?: 'a4' | 'letter';
  titleMode?: 'auto' | 'custom'; titleKind?: 'blank' | 'template' | 'custom';
}
export interface EditorDocument { resume: Resume; settings: ResumeSettings }
export interface ResumeEntry extends EditorDocument { id: string; title: string; updatedAt: number }
export interface StoredResume extends EditorDocument { id: string; title: string; updated_at: number }
export interface ResumeTemplate {
  id: string; label: LocalizedText; description: LocalizedText; accent: string;
  variant: string; tags: string[]; usage: number; language: string; free?: boolean;
}
export interface SectionCopy { label: string; empty: string; itemTitle?: string }
export interface SectionTemplate extends SectionCopy { kind: string; icon: string; item: () => ResumeItem }
export interface WorkspaceUser { id: string; username: string; email: string; name: string; picture: string }
export interface AppConfig { demoLogin: boolean; demoUsername: string; demoPassword: string; aiConfigured: boolean }
export interface TailoringTarget { id: string; sectionIndex: number; itemIndex: number; type: string; label: string; title: string; text: string }
export interface TailoringSuggestion { id: string; label: string; title: string; before: string; after: string; evidence: string; reason: string }
export interface TailoringResult { role: string; summary: string; gaps: string[]; suggestions: TailoringSuggestion[] }
export type Update<T> = T | ((current: T) => T);
export type Setter<T> = (value: Update<T>, group?: string | null) => void;

export interface SampleCase { id: string; match: string[]; profile: Omit<ResumeProfile, "avatar"> & { avatar?: string }; summary: string; education: Omit<ResumeItem,"id">[]; work: Omit<ResumeItem,"id">[]; project: Omit<ResumeItem,"id">[]; skills: string[]; awards: Omit<ResumeItem,"id">[] }
