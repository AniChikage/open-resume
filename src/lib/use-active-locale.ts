import { useStoredChoice } from './use-stored-choice.ts';

/** The language being viewed (and exported) for a resume, remembered per browser. */
export function useActiveLocale(resumeId: string) {
  return useStoredChoice('active-locale', resumeId);
}
