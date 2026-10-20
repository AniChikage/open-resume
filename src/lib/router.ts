import { useSyncExternalStore } from "react";

function parseHash() {
  const fragment = (typeof window === 'undefined' ? '' : window.location.hash).replace(/^#/, '');
  // Ordinary section anchors (#about, #faq) still belong to the homepage.
  const hash = fragment.startsWith('/') ? fragment : '/';
  const [path, query] = hash.split('?');
  const params: Record<string,string> = {};
  if (query) {
    new URLSearchParams(query).forEach((v, k) => { params[k] = v; });
  }
  return { path, params };
}

let listeners: Array<() => void> = [];
function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => { listeners = listeners.filter((l) => l !== listener); };
}
function getSnapshot() {
  return window.location.hash;
}

function notify() {
  listeners.forEach((l) => l());
}

if (typeof window !== 'undefined') window.addEventListener('hashchange', notify);

export function navigate(path: string) {
  window.location.hash = path;
}

export function useRouter() {
  useSyncExternalStore(subscribe, getSnapshot, () => '');
  const { path, params } = parseHash();

  const match = (pattern: string) => {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');
    if (patternParts.length !== pathParts.length) return null;
    const result: Record<string,string> = {};
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        result[patternParts[i].slice(1)] = pathParts[i];
      } else if (patternParts[i] !== pathParts[i]) {
        return null;
      }
    }
    return result;
  };

  return { path, params, match, navigate };
}
