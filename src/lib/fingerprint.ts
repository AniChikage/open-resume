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
