import type { Update } from '../types.ts';
// A document is one unit: content and appearance always undo together.
export function createEditorHistory<T>(initial: T, { limit = 60, now = Date.now } = {}) {
  let past: T[] = [], future: T[] = [], group: string | null = null, lastEdit = 0;
  let snapshot = { present: initial, canUndo: false, canRedo: false };
  const listeners = new Set<() => void>();
  const publish = (present: T) => {
    snapshot = { present, canUndo: past.length > 0, canRedo: future.length > 0 };
    listeners.forEach((listener) => listener());
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    commit(update: Update<T>, editGroup: string | null = null) {
      const next = typeof update === 'function' ? (update as (current:T) => T)(snapshot.present) : update;
      if (JSON.stringify(next) === JSON.stringify(snapshot.present)) return;
      const time = now();
      if (!editGroup || editGroup !== group || time - lastEdit > 750 || future.length) {
        past = [...past, snapshot.present].slice(-limit);
      }
      future = [];
      group = editGroup;
      lastEdit = time;
      publish(next);
    },
    // Localisation applies to every snapshot so undo never restores old-language labels.
    map(transform: (value:T) => T) {
      past = past.map(transform);
      future = future.map(transform);
      publish(transform(snapshot.present));
    },
    reset(present: T) {
      past = []; future = []; group = null;
      publish(present);
    },
    undo() {
      if (!past.length) return;
      const previous = past[past.length - 1];
      past = past.slice(0, -1);
      future = [snapshot.present, ...future];
      group = null;
      publish(previous);
    },
    redo() {
      if (!future.length) return;
      const next = future[0];
      future = future.slice(1);
      past = [...past, snapshot.present].slice(-limit);
      group = null;
      publish(next);
    },
  };
}
