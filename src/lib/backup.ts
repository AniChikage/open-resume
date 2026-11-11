import type { EditorDocument, Resume, ResumeSettings } from '../types.ts';
import { downloadBlob } from './download.ts';
import { isEditorDocument, isRecord } from './validation.ts';

export const BACKUP_MAX_BYTES = 10 * 1024 * 1024;

export function parseBackup(text: string): EditorDocument {
  if (new TextEncoder().encode(text).byteLength > BACKUP_MAX_BYTES) throw new Error('BACKUP_TOO_LARGE');
  let value: unknown;
  try { value = JSON.parse(text.replace(/^\uFEFF/, '')); } catch { throw new Error('INVALID_BACKUP'); }
  if (isRecord(value) && value.version !== undefined && value.version !== 1) throw new Error('UNSUPPORTED_BACKUP');
  if (!isEditorDocument(value) || value.resume.title.length > 1000) throw new Error('INVALID_BACKUP');
  return { resume: value.resume, settings: value.settings };
}

export function exportResumeAsJson(resume: Resume, settings: ResumeSettings, filename = 'resume-data.json') {
  downloadBlob(new Blob([JSON.stringify({ version: 1, resume, settings }, null, 2)], { type: 'application/json;charset=utf-8' }), filename);
}
