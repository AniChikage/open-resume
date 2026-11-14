import { useCallback, useState } from 'react';

/**
 * A per-resume choice remembered in this browser only (never in the document: saving it
 * there would create a stored version every time someone switches).
 */
function read(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

function write(key: string, value: string | null): void {
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch { /* storage can be unavailable (private mode, blocked data): the choice then lasts for the session only */ }
}

export function useStoredChoice(prefix: string, resumeId: string): readonly [string | null, (value: string | null) => void] {
  const key = `open-resume:${prefix}:${resumeId}`;
  const [state, setState] = useState(() => ({ key, value: read(key) }));
  // The editor can switch to another resume without remounting: load that resume's choice.
  if (state.key !== key) setState({ key, value: read(key) });
  const select = useCallback((value: string | null) => {
    write(key, value);
    setState({ key, value });
  }, [key]);
  return [state.key === key ? state.value : null, select] as const;
}
