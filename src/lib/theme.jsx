import { translate } from './i18n.js';
export { translate } from './i18n.js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);
const LANGUAGE_STORAGE_KEY = 'openresume_language';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', shortLabel: 'EN', htmlLang: 'en' },
  { code: 'zh', label: '简体中文', shortLabel: '中文', htmlLang: 'zh-CN' },
  { code: 'zh-TW', label: '繁體中文', shortLabel: '繁中', htmlLang: 'zh-TW' },
  { code: 'ja', label: '日本語', shortLabel: '日本語', htmlLang: 'ja' },
  { code: 'ko', label: '한국어', shortLabel: '한국어', htmlLang: 'ko' },
  { code: 'fr', label: 'Français', shortLabel: 'FR', htmlLang: 'fr' },
  { code: 'ru', label: 'Русский', shortLabel: 'RU', htmlLang: 'ru' },
];

export function readStoredLanguage() {
  if (typeof window === 'undefined') return 'en';
  try {
    const requested = new URLSearchParams(window.location.search).get('lang');
    if (SUPPORTED_LANGUAGES.some(({ code }) => code === requested)) return requested;
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return SUPPORTED_LANGUAGES.some(({ code }) => code === stored) ? stored : 'en';
  } catch {
    return 'en';
  }
}

export function ThemeProvider({ children, initialLanguage }) {
  const [lang, setLangState] = useState(() => initialLanguage || readStoredLanguage());

  const setLang = useCallback((nextLanguage) => {
    const language = SUPPORTED_LANGUAGES.some(({ code }) => code === nextLanguage) ? nextLanguage : 'en';
    // Keep an explicit landing-page language consistent with later user choices.
    const url = new URL(window.location.href);
    if (url.searchParams.has('lang')) {
      url.searchParams.set('lang', language);
      window.history.replaceState(window.history.state, '', url);
    }
    setLangState(language);
  }, []);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.lang = SUPPORTED_LANGUAGES.find(({ code }) => code === lang)?.htmlLang || 'en';
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // Language still works for this session when storage is unavailable.
    }
  }, [lang]);

  const t = useCallback((message, values) => translate(lang, message, values), [lang]);
  const value = useMemo(() => ({
    theme: 'light',
    lang,
    setLang,
    t,
    toggleTheme: () => {},
    toggleLang: () => setLang(lang === 'en' ? 'zh' : 'en'),
  }), [lang, setLang, t]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
