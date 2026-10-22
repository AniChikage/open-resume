import type { EditorDocument } from '../types.ts';
import { isEditorDocument } from './validation.ts';

const keyFor = (id: string, username: string) => `draft_${encodeURIComponent(username)}_${id}`;

export function readDraft(id: string, username: string): EditorDocument | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(keyFor(id, username)) || sessionStorage.getItem(`draft_${id}`) || 'null');
    return isEditorDocument(value) ? value : null;
  } catch { return null; }
}

export function writeDraft(id: string, username: string, document: EditorDocument) {
  try { localStorage.setItem(keyFor(id, username), JSON.stringify(document)); return true; }
  catch { return false; }
}

export function removeDraft(id: string, username: string, saved?: EditorDocument) {
  try {
    const key = keyFor(id, username);
    // Another tab may already have written a newer local draft.
    if (!saved || localStorage.getItem(key) === JSON.stringify(saved)) localStorage.removeItem(key);
    sessionStorage.removeItem(`draft_${id}`);
  } catch { /* Saving still works when browser storage is unavailable. */ }
}

export function clearDrafts() {
  for (const name of ['localStorage', 'sessionStorage'] as const) {
    try {
      const storage = window[name];
      for (const key of Object.keys(storage)) if (key.startsWith('draft_')) storage.removeItem(key);
    }
    catch { /* Storage may be disabled. */ }
  }
}
