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
}
export interface ResumeSection {
  id: string; type: SectionType; label: string; visible: boolean; items: ResumeItem[];
}
export interface Resume { title: string; profile: ResumeProfile; sections: ResumeSection[] }
export interface ResumeSettings {
  template: string; accent: string; fontFamily: string; fontSize: number;
  lineHeight: number; compact: boolean;
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
