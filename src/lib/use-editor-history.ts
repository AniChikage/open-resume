import { useMemo,useSyncExternalStore } from 'react';
import type { EditorDocument,Setter } from '../types.ts';
import { createEditorHistory } from './editor-history.ts';

export function useEditorHistory(initial: {resume:EditorDocument['resume'] | null;settings:EditorDocument['settings']}, key: string) {
  const history = useMemo(() => createEditorHistory(initial), [key]);
  const snapshot = useSyncExternalStore(history.subscribe, history.getSnapshot, history.getSnapshot);
  const setters = useMemo(() => {
    const setResume: Setter<EditorDocument['resume']> = (value, group) => history.commit(current => ({
      ...current, resume: typeof value === 'function' ? current.resume ? value(current.resume) : current.resume : value,
    }), group);
    const setSettings: Setter<EditorDocument['settings']> = (value, group) => history.commit(current => ({
      ...current, settings: typeof value === 'function' ? value(current.settings) : value,
    }), group);
    return { setResume, setSettings };
  }, [history]);
  return { ...snapshot.present, ...setters, history, canUndo: snapshot.canUndo, canRedo: snapshot.canRedo };
}
