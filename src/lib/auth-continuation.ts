import { isRecord } from './validation.ts';
const KEY = 'openresume_auth_continuation_v1';
const MAX_AGE_MS = 15 * 60 * 1000;

export function isSafeContinuation(path: unknown): path is string {
  return typeof path === 'string' && path.length < 220
    && /^\/(?:templates(?:\?use=[a-z0-9-]+)?|dashboard)$/.test(path);
}

export function rememberContinuation(path: unknown, storage: Storage | undefined = undefined, now = Date.now()) {
  if (!isSafeContinuation(path)) return false;
  try { (storage ?? window.sessionStorage).setItem(KEY, JSON.stringify({ path, expiresAt: now + MAX_AGE_MS })); return true; } catch { return false; }
}

export function takeContinuation(storage: Storage | undefined = undefined, now = Date.now()) {
  try {
    storage ??= window.sessionStorage;
    const saved: unknown = JSON.parse(storage.getItem(KEY) || 'null');
    storage.removeItem(KEY);
    return isRecord(saved) && typeof saved.expiresAt === 'number' && saved.expiresAt > now && isSafeContinuation(saved.path) ? saved.path : null;
  } catch { return null; }
}

export function clearContinuation() {
  try { window.sessionStorage.removeItem(KEY); } catch { /* optional storage */ }
}
