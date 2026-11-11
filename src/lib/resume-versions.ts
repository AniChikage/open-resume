import type { EditorDocument } from '../types.ts';

export interface ResumeVersion { id: string; scope: string; savedAt: number; document: EditorDocument; fingerprint: string }
const DATABASE = 'open-resume-version-history-v1';
const STORE = 'versions';
export const VERSION_LIMIT = 30;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => { request.result.createObjectStore(STORE, { keyPath: 'id' }).createIndex('scope', 'scope'); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('HISTORY_BLOCKED'));
  });
}

export async function listVersions(scope: string): Promise<ResumeVersion[]> {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE, 'readonly');
      const request = transaction.objectStore(STORE).index('scope').getAll(scope);
      request.onsuccess = () => resolve((request.result as ResumeVersion[]).sort((a, b) => b.savedAt - a.savedAt));
      request.onerror = () => reject(request.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally { database.close(); }
}

export async function recordVersion(scope: string, document: EditorDocument): Promise<void> {
  const snapshot = structuredClone(document);
  const serialized = new TextEncoder().encode(JSON.stringify(snapshot));
  const digest = await crypto.subtle.digest('SHA-256', serialized);
  const fingerprint = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      // Read + dedupe + retention run in one transaction, including concurrent tabs.
      const transaction = database.transaction(STORE, 'readwrite');
      const store = transaction.objectStore(STORE);
      const request = store.index('scope').getAll(scope);
      request.onsuccess = () => {
        const previous = (request.result as ResumeVersion[]).sort((a, b) => b.savedAt - a.savedAt);
        if (previous[0]?.fingerprint === fingerprint) return;
        const savedAt = Math.max(Date.now(), (previous[0]?.savedAt || 0) + 1);
        store.put({ id: crypto.randomUUID(), scope, savedAt, document: snapshot, fingerprint });
        for (const version of previous.slice(VERSION_LIMIT - 1)) store.delete(version.id);
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally { database.close(); }
}
