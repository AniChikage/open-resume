import { useMemo, useSyncExternalStore } from 'react';
import { createEditorHistory } from './editor-history.js';

export function useEditorHistory(initial, key) {
  const history = useMemo(() => createEditorHistory(initial), [key]);
  const snapshot = useSyncExternalStore(history.subscribe, history.getSnapshot, history.getSnapshot);
  const setters = useMemo(() => Object.fromEntries(['resume', 'settings'].map((field) => [
    field === 'resume' ? 'setResume' : 'setSettings',
    (value, group) => history.commit((current) => ({
      ...current, [field]: typeof value === 'function' ? value(current[field]) : value,
    }), group),
  ])), [history]);
  return { ...snapshot.present, ...setters, history, canUndo: snapshot.canUndo, canRedo: snapshot.canRedo };
}
