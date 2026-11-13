import { useCallback, useState } from 'react';

/**
 * Remembers which preset is active for each resume, per browser. It is a viewing
 * choice, not part of the document: storing it in the resume would create a saved
 * version every time someone switches preset.
 */
const storageKey = (resumeId: string) => `open-resume:active-preset:${resumeId}`;

function read(resumeId: string): string | null {
  try { return window.localStorage.getItem(storageKey(resumeId)); } catch { return null; }
}

function write(resumeId: string, presetId: string | null): void {
  try {
    if (presetId) window.localStorage.setItem(storageKey(resumeId), presetId);
    else window.localStorage.removeItem(storageKey(resumeId));
  } catch { /* storage can be unavailable (private mode, blocked data): the choice then lasts for the session only */ }
}

export function useActivePreset(resumeId: string): readonly [string | null, (presetId: string | null) => void] {
  const [state, setState] = useState(() => ({ resumeId, presetId: read(resumeId) }));
  // The editor can switch to another resume without remounting: load that resume's choice.
  if (state.resumeId !== resumeId) setState({ resumeId, presetId: read(resumeId) });
  const select = useCallback((presetId: string | null) => {
    write(resumeId, presetId);
    setState({ resumeId, presetId });
  }, [resumeId]);
  return [state.resumeId === resumeId ? state.presetId : null, select] as const;
}
