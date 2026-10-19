async function compressData(data) {
  const json = JSON.stringify(data);
  const encoder = new TextEncoder();
  const input = encoder.encode(json);

  if (typeof CompressionStream !== 'undefined') {
    const cs = new CompressionStream('deflate');
    const writer = cs.writable.getWriter();
    writer.write(input);
    writer.close();
    const chunks = [];
    const reader = cs.readable.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const compressed = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0));
    let offset = 0;
    for (const chunk of chunks) {
      compressed.set(chunk, offset);
      offset += chunk.length;
    }
    return uint8ToBase64url(compressed);
  }

  return btoa(encodeURIComponent(json));
}

async function decompressData(encoded) {
  try {
    if (typeof DecompressionStream !== 'undefined') {
      const compressed = base64urlToUint8(encoded);
      const ds = new DecompressionStream('deflate');
      const writer = ds.writable.getWriter();
      writer.write(compressed);
      writer.close();
      const chunks = [];
      const reader = ds.readable.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const merged = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0));
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }
      const decoder = new TextDecoder();
      return JSON.parse(decoder.decode(merged));
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

function uint8ToBase64url(uint8) {
  let binary = '';
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToUint8(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  const binary = atob(base64);
  const uint8 = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    uint8[i] = binary.charCodeAt(i);
  }
  return uint8;
}

export async function generateShareUrl(resume, settings) {
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

export async function parseShareData(encoded) {
  if (!encoded) return null;
  return decompressData(encoded);
}
