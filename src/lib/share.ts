import type { EditorDocument,Resume,ResumeSettings } from '../types.ts';
import { isEditorDocument } from './validation.ts';
async function compressData(data: EditorDocument) {
  const json = JSON.stringify(data);
  const encoder = new TextEncoder();
  const input = encoder.encode(json);

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
      const bytes = await new Response(stream).arrayBuffer();
      return JSON.parse(new TextDecoder().decode(bytes));
    }
  } catch {
    // fallback
  }

  try {
    return JSON.parse(decodeURIComponent(atob(encoded)));
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

export async function generateShareUrl(resume: Resume, settings: ResumeSettings) {
  const shareResume = {
    ...resume,
    profile: {
      ...resume.profile,
      avatar: resume.profile.avatar?.startsWith('data:') ? '' : (resume.profile.avatar || '')
    }
  };
  const data = { resume: shareResume, settings };
  const encoded = await compressData(data);
  const base = window.location.origin + window.location.pathname;
  return `${base}#/share?d=${encoded}`;
}

export async function parseShareData(encoded: string | undefined) {
  if (!encoded) return null;
  const value: unknown = await decompressData(encoded);
  return isEditorDocument(value) ? value : null;
}
