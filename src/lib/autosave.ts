export interface AutosaveState { dirty: boolean; saving: boolean; error: unknown; draftAvailable: boolean }

// Serialize writes so a slow response can never overwrite a newer edit.
export function createAutosave<T>({ save, writeDraft, clearDraft, delay = 1000, maxWait = 5000 }: {
  save: (document: T, keepalive: boolean) => Promise<void>;
  writeDraft: (document: T) => boolean;
  clearDraft: (document: T) => void;
  delay?: number; maxWait?: number;
}) {
  let pending: T | null = null;
  let running: Promise<boolean> | null = null;
  let debounce: ReturnType<typeof setTimeout> | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  let state: AutosaveState = { dirty: false, saving: false, error: null, draftAvailable: true };
  const listeners = new Set<() => void>();
  const publish = (patch: Partial<AutosaveState>) => {
    state = { ...state, ...patch };
    listeners.forEach(listener => listener());
  };
  const cancelTimers = () => { clearTimeout(debounce); clearTimeout(deadline); debounce = deadline = undefined; };
  const flush = (keepalive = false): Promise<boolean> => {
    cancelTimers();
    if (running) return running;
    if (pending === null) return Promise.resolve(true);
    publish({ saving: true, error: null });
    running = (async () => {
      try {
        while (pending !== null) {
          const document: T = pending;
          await save(document, keepalive);
          if (pending === document) {
            pending = null;
            clearDraft(document);
          }
        }
        publish({ dirty: false });
        return true;
      } catch (error) {
        publish({ error });
        return false;
      } finally {
        running = null;
        publish({ saving: false });
      }
    })();
    return running;
  };
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    update(document: T) {
      pending = document;
      publish({ dirty: true, draftAvailable: writeDraft(document) });
      clearTimeout(debounce);
      debounce = setTimeout(() => { void flush(); }, delay);
      deadline ??= setTimeout(() => { void flush(); }, maxWait);
    },
    flush,
  };
}
