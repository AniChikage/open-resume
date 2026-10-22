import type { EditorDocument } from '../types.ts';

export const VERSION_AUTO_LIMIT = 20;
export const VERSION_MANUAL_LIMIT = 30;
export const VERSION_AUTOSAVE_WINDOW_MS = 60_000;

export type ResumeVersionKind = 'initial' | 'auto' | 'manual';

export interface ResumeVersionSummary {
  id: string;
  resumeId: string;
  title: string;
  label: string;
  kind: ResumeVersionKind;
  createdAt: number;
  updatedAt: number;
}

export interface ResumeVersion extends ResumeVersionSummary, EditorDocument {}

export interface VersionComparison {
  profileFields: string[];
  changedSections: string[];
  appearanceChanged: boolean;
  titleChanged: boolean;
}
