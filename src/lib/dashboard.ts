import type { ResumeEntry } from '../types.ts';
import { readDraft, writeDraft } from './drafts.ts';

export type ResumeSort = 'recent' | 'oldest' | 'name';

const normalizeSearch = (value: string) => value.normalize('NFKC').toLocaleLowerCase();

export function renameDashboardDraft(id: string, username: string, title: string) {
  const draft = readDraft(id, username);
  if (!draft) return;
  writeDraft(id, username, {
    resume: { ...draft.resume, title },
    settings: { ...draft.settings, titleMode: 'custom', titleKind: 'custom' },
  });
}

export function selectDashboardResumes(entries: readonly ResumeEntry[], { query = '', sort = 'recent', hiddenIds = [], locale = 'en' }: {
  query?: string;
  sort?: ResumeSort;
  hiddenIds?: readonly string[];
  locale?: string;
} = {}): ResumeEntry[] {
  const hidden = new Set(hiddenIds);
  const terms = normalizeSearch(query).trim().split(/\s+/).filter(Boolean);
  const matches = entries.filter(entry => {
    if (hidden.has(entry.id)) return false;
    if (!terms.length) return true;
    const text = normalizeSearch([entry.title, entry.resume.profile.name, entry.resume.profile.headline].join(' '));
    return terms.every(term => text.includes(term));
  });
  const collator = new Intl.Collator(locale, { numeric: true, sensitivity: 'base' });
  return matches.sort((a, b) => {
    if (sort === 'name') return collator.compare(a.title, b.title) || b.updatedAt - a.updatedAt || a.id.localeCompare(b.id);
    return (sort === 'oldest' ? a.updatedAt - b.updatedAt : b.updatedAt - a.updatedAt) || collator.compare(a.title, b.title) || a.id.localeCompare(b.id);
  });
}
