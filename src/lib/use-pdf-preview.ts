import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { createPdfCache, createPdfSnapshot } from './pdf-snapshot.ts';
import type { PdfSnapshot } from './pdf-snapshot.ts';

/** Revision keys follow immutable document references without serializing photos. */
export function usePdfDocumentKey(resume: unknown, settings: unknown, language: string) {
  const previous = useRef({ resume, settings, language, revision: 0 });
  if (previous.current.resume !== resume || previous.current.settings !== settings || previous.current.language !== language) {
    previous.current = { resume, settings, language, revision: previous.current.revision + 1 };
  }
  return resume ? `${language}:${previous.current.revision}` : '';
}

export function usePdfPreview(source: RefObject<HTMLElement>, key: string) {
  const cache = useRef(createPdfCache<PdfSnapshot>());
  const currentKey = useRef(key);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  currentKey.current = key;
  useEffect(() => {
    currentKey.current = key;
    return () => { currentKey.current = ''; };
  }, []);
  cache.current.select(key);
  const [result, setResult] = useState<{ key: string; snapshot: PdfSnapshot } | null>(null);
  const [failure, setFailure] = useState('');
  const [attempt, setAttempt] = useState(0);
  const getSnapshot = useCallback(async () => {
    const snapshot = await cache.current.get(key, () => {
      const next = queue.current.catch(() => {}).then(() => {
        if (!source.current || key !== currentKey.current) throw new Error('PREVIEW_CHANGED');
        return createPdfSnapshot(source.current, () => key === currentKey.current);
      });
      queue.current = next;
      return next;
    });
    if (key !== currentKey.current) throw new Error('PREVIEW_CHANGED');
    return snapshot;
  }, [key, source]);
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    setFailure('');
    const timeout = setTimeout(() => {
      void getSnapshot().then(snapshot => {
        if (!cancelled) setResult({ key, snapshot });
      }).catch(() => { if (!cancelled) setFailure(key); });
    }, 300);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [key, getSnapshot, attempt]);
  return {
    snapshot: result?.snapshot || null,
    pending: Boolean(key && result?.key !== key && failure !== key),
    error: Boolean(key && failure === key),
    getSnapshot,
    retry: () => setAttempt(value => value + 1),
  };
}
