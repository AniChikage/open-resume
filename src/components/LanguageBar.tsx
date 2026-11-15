import { Trash2 } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { useAuth } from '../lib/auth.tsx';
import { SUPPORTED_LANGUAGES, useTheme } from '../lib/theme.tsx';
import { buildLanguageOptions, fetchEngineLanguages, isPdfRenderable, languageLabel, languagesErrorMessage } from '../lib/translation-languages.ts';
import type { EngineLanguageInfo } from '../lib/translation-languages.ts';
import { cn } from '../lib/utils.ts';
import { useVariants } from '../lib/variants-context.ts';
import { Button } from './ui/button.tsx';

// Languages the interface itself is translated into keep their shipped names.
const SHIPPED = SUPPORTED_LANGUAGES.map(language => ({ code: language.code as string, label: language.label }));
export const languageName = (code: string) => languageLabel(code, SHIPPED);

/** Declares the language of the content and switches between it and its translations. */
export function LanguageBar() {
  const { t } = useTheme();
  const { config } = useAuth();
  const variants = useVariants();
  const sourceId = useId();
  const addId = useId();
  const [confirmRemove, setConfirmRemove] = useState(false);
  // The languages the translation engine offers, when one is configured on the server.
  const [engineLanguages, setEngineLanguages] = useState<EngineLanguageInfo[]>([]);
  const [engineError, setEngineError] = useState<string | null>(null);
  const hasEngine = Boolean(config?.translateProvider);
  const sourceLocale = variants?.sourceLocale;
  useEffect(() => {
    setEngineError(null);
    if (!hasEngine || !sourceLocale) { setEngineLanguages([]); return; }
    let cancelled = false;
    void fetchEngineLanguages(sourceLocale).then(result => {
      if (cancelled) return;
      setEngineLanguages(result.languages);
      setEngineError(result.error ?? null);
    });
    return () => { cancelled = true; };
  }, [hasEngine, sourceLocale]);
  if (!variants) return null;
  const { translatedLocales, localeId } = variants;
  const view = (locale: string | null) => { setConfirmRemove(false); variants.selectLocale(locale); };

  // With an engine the list is everything it can translate into; otherwise the languages the app ships.
  const known = engineLanguages.length > 0 ? engineLanguages : SHIPPED;
  const addable = buildLanguageOptions(known, SHIPPED, new Set([variants.sourceLocale, ...translatedLocales]));
  // The content language may be any language, including ones the engine offers and the interface does not.
  const sourceOptions = buildLanguageOptions([...SHIPPED, ...engineLanguages, { code: variants.sourceLocale }], SHIPPED);
  const optionText = (option: { label: string; pdf: boolean }) => option.pdf ? option.label : t('{language} (Word export only)', { language: option.label });
  const noPdf = [variants.sourceLocale, ...translatedLocales].filter(code => !isPdfRenderable(code));

  return <section className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3" aria-label={t('Languages')} data-editor-target="languages">
    <div className="flex items-center gap-2">
      <label htmlFor={sourceId} className="shrink-0 text-xs font-medium">{t('Resume language')}</label>
      <select id={sourceId} className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1.5 text-xs" value={variants.sourceLocale} onChange={event => variants.setSourceLocale(event.target.value)}>
        {sourceOptions.map(option => <option key={option.code} value={option.code}>{optionText(option)}</option>)}
      </select>
    </div>
    {translatedLocales.length > 0 && <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t('Language shown')}>
      {[null, ...translatedLocales].map(locale => {
        const code = locale ?? variants.sourceLocale;
        const selected = (localeId ?? null) === locale;
        return <button key={code} type="button" aria-pressed={selected} onClick={() => view(locale)}
          className={cn('rounded-md border px-2.5 py-1 text-xs font-medium', selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-muted')}>{languageName(code)}</button>;
      })}
    </div>}
    {localeId && <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className={cn('rounded px-2 py-0.5 font-medium', variants.missingCount > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900')} role="status">
        {variants.missingCount > 0 ? t('{count} texts not translated yet', { count: variants.missingCount }) : t('Fully translated')}
      </span>
      {variants.staleCount > 0 && <span className="rounded bg-sky-100 px-2 py-0.5 font-medium text-sky-900" role="status">{t('{count} translations possibly outdated', { count: variants.staleCount })}</span>}
      {!confirmRemove
        ? <Button type="button" variant="ghost" size="xs" onClick={() => setConfirmRemove(true)}><Trash2 data-icon="inline-start" />{t('Remove this translation')}</Button>
        : <span className="flex items-center gap-2" role="alertdialog" aria-label={t('Remove this translation')}>
          {t('Delete the {language} translation?', { language: languageName(localeId) })}
          <Button type="button" variant="destructive" size="xs" onClick={() => { setConfirmRemove(false); variants.removeLocale(localeId); }}>{t('Delete')}</Button>
          <Button type="button" variant="ghost" size="xs" onClick={() => setConfirmRemove(false)}>{t('Cancel')}</Button>
        </span>}
    </div>}
    {addable.length > 0 && <div className="flex items-center gap-2">
      <label htmlFor={addId} className="shrink-0 text-xs font-medium">{t('Add a translation')}</label>
      <select id={addId} className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1.5 text-xs" value="" onChange={event => { if (event.target.value) { setConfirmRemove(false); variants.addLocale(event.target.value); } }}>
        <option value="">{t('Choose a language…')}</option>
        {addable.map(option => <option key={option.code} value={option.code}>{optionText(option)}</option>)}
      </select>
    </div>}
    {hasEngine && engineError && <p className="rounded-md border border-amber-300 bg-amber-50/70 p-2 text-xs leading-5" role="alert">
      {t('Could not load the list of languages from the translation service ({provider}); the default languages are shown.', { provider: config?.translateProvider === 'deepl' ? 'DeepL' : 'LibreTranslate' })}{' '}
      {t(languagesErrorMessage(engineError))}{' '}
      <span className="text-muted-foreground">{t('Reload the page to try again.')} ({engineError})</span>
    </p>}
    {noPdf.length > 0 && <p className="rounded-md border border-amber-300 bg-amber-50/70 p-2 text-xs leading-5" role="note">
      {t('The PDF and PNG exports cannot draw the alphabet of {languages} yet (no font for it), so use the Word export for them.', { languages: noPdf.map(languageName).join(', ') })}
    </p>}
    <p className="text-xs leading-5 text-muted-foreground">{localeId
      ? t('Texts you have not translated are shown in {language}. Exports warn you when some remain.', { language: languageName(variants.sourceLocale) })
      : t('Your content stays in {language}. Add a translation to produce the same resume in another language.', { language: languageName(variants.sourceLocale) })}</p>
  </section>;
}
