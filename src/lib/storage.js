import { buildBlankResume, DEFAULT_SETTINGS, inferSystemResumeTitleKind } from '../data.js';
import { analyticsRequestHeaders, trackAnalyticsEvent } from '../../public/analytics.js';

const clone = (value) =>
  typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));

async function api(path, options = {}) {
  const res = await fetch(`/api/resumes${path}`, {
    headers: { 'Content-Type': 'application/json', ...analyticsRequestHeaders() },
    ...options,
  });
  if (res.status === 401) throw new Error('UNAUTHORIZED');
  if (res.status === 404) throw new Error('NOT_FOUND');
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function migrateFromLegacy() {
  // No-op: data now lives in D1
}

export async function listResumes() {
  const data = await api('');
  return data.resumes.map((r) => ({
    id: r.id,
    title: r.title,
    updatedAt: r.updated_at,
    resume: r.resume,
    settings: r.settings,
  })).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getResume(id, { signal } = {}) {
  try {
    const r = await api(`/${id}`, { signal: signal || AbortSignal.timeout(20_000) });
    return { id: r.id, title: r.title, updatedAt: r.updated_at, resume: r.resume, settings: r.settings };
  } catch (error) {
    if (error.message === 'NOT_FOUND') return null;
    throw error;
  }
}

export async function createResume(resume = null, settings = null) {
  const resolvedResume = resume || buildBlankResume();
  const resolvedSettings = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  const inferredTitleKind = inferSystemResumeTitleKind(resolvedResume.title, resolvedSettings.template);
  if (!resolvedSettings.titleMode) resolvedSettings.titleMode = inferredTitleKind === 'custom' ? 'custom' : 'auto';
  if (!resolvedSettings.titleKind) resolvedSettings.titleKind = inferredTitleKind;
  const data = {
    title: resolvedResume.title || 'Untitled resume',
    resume: clone(resolvedResume),
    settings: resolvedSettings,
  };
  const result = await api('', { method: 'POST', body: JSON.stringify(data) });
  void trackAnalyticsEvent('resume_created');
  return { id: result.id, title: data.title, updatedAt: result.updated_at || Date.now(), resume: data.resume, settings: data.settings };
}

export async function saveResume(id, resume, settings) {
  await api(`/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ title: resume.title, resume, settings }),
  });
}

export async function duplicateResume(id) {
  const source = await getResume(id);
  if (!source) return null;
  return createResume(
    { ...source.resume, title: `${source.title} (copy)` },
    { ...source.settings, titleMode: 'custom', titleKind: 'custom' },
  );
}

export async function deleteResume(id) {
  await api(`/${id}`, { method: 'DELETE' });
}

export async function renameResume(id, title) {
  await api(`/${id}`, { method: 'PUT', body: JSON.stringify({ title }) });
}
