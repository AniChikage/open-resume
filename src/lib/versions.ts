import type { EditorDocument } from '../types.ts';
import type { ResumeVersion, ResumeVersionSummary } from './version-types.ts';

export type { ResumeVersion, ResumeVersionSummary, ResumeVersionKind } from './version-types.ts';
export { VERSION_AUTO_LIMIT, VERSION_MANUAL_LIMIT, VERSION_AUTOSAVE_WINDOW_MS } from './version-types.ts';

async function request<T>(resumeId: string, suffix = '', options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/resumes/${encodeURIComponent(resumeId)}/versions${suffix}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    signal: options.signal || AbortSignal.timeout(20_000),
  });
  if (response.status === 401) throw new Error('UNAUTHORIZED');
  if (response.status === 404) throw new Error('NOT_FOUND');
  if (response.status === 400) throw new Error('INVALID_VERSION');
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

export async function listResumeVersions(resumeId: string, { signal }: { signal?: AbortSignal } = {}): Promise<ResumeVersionSummary[]> {
  return (await request<{ versions: ResumeVersionSummary[] }>(resumeId, '', { signal })).versions;
}

export function getResumeVersion(resumeId: string, versionId: string, { signal }: { signal?: AbortSignal } = {}): Promise<ResumeVersion> {
  return request(resumeId, `/${encodeURIComponent(versionId)}`, { signal });
}

export function createResumeVersion(resumeId: string, document: EditorDocument, label = ''): Promise<ResumeVersion> {
  return request(resumeId, '', { method: 'POST', body: JSON.stringify({ ...document, label }) });
}

export function restoreResumeVersion(resumeId: string, versionId: string): Promise<{ id: string; updated_at: number }> {
  return request(resumeId, `/${encodeURIComponent(versionId)}/restore`, { method: 'POST' });
}
