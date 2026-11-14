import { useStoredChoice } from './use-stored-choice.ts';

/** The preset being viewed for a resume, remembered per browser. */
export function useActivePreset(resumeId: string) {
  return useStoredChoice('active-preset', resumeId);
}
