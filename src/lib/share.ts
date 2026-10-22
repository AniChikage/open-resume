import type { EditorDocument,Resume,ResumeItem,ResumeSettings } from '../types.ts';
import { isEditorDocument } from './validation.ts';

// A share is a URL snapshot, so keep both its encoded input and expanded JSON bounded.
// Legacy links use base64(encodeURIComponent(json)), which can take four bytes per byte.
export const SHARE_MAX_BYTES = 1024 * 1024;
export const SHARE_MAX_ENCODED_LENGTH = SHARE_MAX_BYTES * 4;

async function readLimitedStream(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > SHARE_MAX_BYTES) {
        await reader.cancel();
        throw new Error('SHARE_TOO_LARGE');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

async function compressData(data: EditorDocument) {
  const json = JSON.stringify(data);
  const encoder = new TextEncoder();
  const input = encoder.encode(json);
  if (input.byteLength > SHARE_MAX_BYTES) throw new Error('SHARE_TOO_LARGE');

  if (typeof CompressionStream !== 'undefined') {
    const stream = new Blob([input]).stream().pipeThrough(new CompressionStream('deflate'));
    const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
    return uint8ToBase64url(compressed);
  }

  return btoa(encodeURIComponent(json));
}

async function decompressData(encoded: string) {
  try {
    if (typeof DecompressionStream !== 'undefined') {
      const compressed = base64urlToUint8(encoded);
      const stream = new Blob([new Uint8Array(compressed)]).stream().pipeThrough(new DecompressionStream('deflate'));
      const bytes = await readLimitedStream(stream);
      return JSON.parse(new TextDecoder().decode(bytes));
    }
  } catch {
    // fallback
  }

  try {
    const json = decodeURIComponent(atob(encoded));
    if (new TextEncoder().encode(json).byteLength > SHARE_MAX_BYTES) return null;
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function uint8ToBase64url(uint8: Uint8Array) {
  let binary = '';
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToUint8(str: string) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const binary = atob(base64);
  const uint8 = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    uint8[i] = binary.charCodeAt(i);
  }
  return uint8;
}

export interface ShareOptions { includeContact?: boolean; includePersonal?: boolean }

export function buildShareDocument(resume: Resume, settings: ResumeSettings, { includeContact = true, includePersonal = false }: ShareOptions = {}): EditorDocument {
  const fields: (keyof ResumeItem)[] = ['id','title','body','school','major','degree','org','role','department','startDate','endDate','current','period','location','meta','description','bullets','details','values'];
  return { resume: {
    title: resume.title,
    profile: {
      name: resume.profile.name,
      headline: resume.profile.headline,
      email: includeContact ? resume.profile.email : '',
      phone: includeContact ? resume.profile.phone : '',
      website: includeContact ? resume.profile.website : '',
      city: includePersonal ? resume.profile.city : '',
      birthday: includePersonal ? resume.profile.birthday : '',
      status: includePersonal ? resume.profile.status : '',
      avatar: resume.profile.avatar?.startsWith('data:') ? '' : (resume.profile.avatar || '')
    },
    sections: resume.sections.filter(section => section.visible).map(section => ({
      id: section.id, type: section.type, label: section.label, visible: true,
      items: section.items.map(item => Object.fromEntries(fields.filter(key => item[key] !== undefined).map(key => [key, item[key]])) as unknown as ResumeItem),
    })),
  }, settings: { template: settings.template, accent: settings.accent, fontFamily: settings.fontFamily, fontSize: settings.fontSize, lineHeight: settings.lineHeight, compact: settings.compact } };
}

export async function generateShareUrl(resume: Resume, settings: ResumeSettings, options: ShareOptions = {}) {
  const encoded = await compressData(buildShareDocument(resume, settings, options));
  const base = window.location.origin + window.location.pathname;
  return `${base}#/share?d=${encoded}`;
}

export async function parseShareData(encoded: string | undefined) {
  if (!encoded || encoded.length > SHARE_MAX_ENCODED_LENGTH) return null;
  const value: unknown = await decompressData(encoded);
  return isEditorDocument(value) ? value : null;
}
