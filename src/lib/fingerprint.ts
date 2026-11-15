/**
 * A short fingerprint of a source text, used to notice that a text changed after it was
 * translated. It is not a security hash: 32-bit FNV-1a over the trimmed text is plenty to
 * tell an edited paragraph from an untouched one, and keeps stored documents small.
 */
export function fingerprint(text: string): string {
  let hash = 0x811c9dc5;
  const value = text.trim();
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** Marks a stored fingerprint as belonging to a machine translation that a person has not reviewed yet. */
const MACHINE_PREFIX = '~';

/** The value stored next to a translation: the source fingerprint, prefixed when the translation is automatic. */
export function storedFingerprint(sourceText: string, machine = false): string {
  return (machine ? MACHINE_PREFIX : '') + fingerprint(sourceText);
}

export function parseStoredFingerprint(stored: string | undefined): { hash: string; machine: boolean } | undefined {
  if (stored === undefined) return undefined;
  return stored.startsWith(MACHINE_PREFIX) ? { hash: stored.slice(MACHINE_PREFIX.length), machine: true } : { hash: stored, machine: false };
}
