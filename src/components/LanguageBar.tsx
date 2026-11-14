import { Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { SUPPORTED_LANGUAGES, useTheme } from '../lib/theme.tsx';
import { cn } from '../lib/utils.ts';
import { useVariants } from '../lib/variants-context.ts';
import { Button } from './ui/button.tsx';

export const languageName = (code: string) => SUPPORTED_LANGUAGES.find(language => language.code === code)?.label ?? code;

/** Declares the language of the content and switches between it and its translations. */
export function LanguageBar() {
  const { t } = useTheme();
  const variants = useVariants();
  const sourceId = useId();
  const addId = useId();
  const [confirmRemove, setConfirmRemove] = useState(false);
  if (!variants) return null;
  const { sourceLocale, translatedLocales, localeId } = variants;
  const addable = SUPPORTED_LANGUAGES.filter(language => language.code !== sourceLocale && !translatedLocales.includes(language.code));
  const view = (locale: string | null) => { setConfirmRemove(false); variants.selectLocale(locale); };

  return <section className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3" aria-label={t('Languages')} data-editor-target="languages">
    <div className="flex items-center gap-2">
      <label htmlFor={sourceId} className="shrink-0 text-xs font-medium">{t('Resume language')}</label>
      <select id={sourceId} className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1.5 text-xs" value={sourceLocale} onChange={event => variants.setSourceLocale(event.target.value)}>
        {SUPPORTED_LANGUAGES.map(language => <option key={language.code} value={language.code}>{language.label}</option>)}
      </select>
    </div>
    {translatedLocales.length > 0 && <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t('Language shown')}>
      {[null, ...translatedLocales].map(locale => {
        const code = locale ?? sourceLocale;
        const selected = (localeId ?? null) === locale;
        return <button key={code} type="button" aria-pressed={selected} onClick={() => view(locale)}
          className={cn('rounded-md border px-2.5 py-1 text-xs font-medium', selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-muted')}>{languageName(code)}</button>;
      })}
    </div>}
    {localeId && <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className={cn('rounded px-2 py-0.5 font-medium', variants.missingCount > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900')} role="status">
        {variants.missingCount > 0 ? t('{count} texts not translated yet', { count: variants.missingCount }) : t('Fully translated')}
      </span>
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
        {addable.map(language => <option key={language.code} value={language.code}>{language.label}</option>)}
      </select>
    </div>}
    <p className="text-xs leading-5 text-muted-foreground">{localeId
      ? t('Texts you have not translated are shown in {language}. Exports warn you when some remain.', { language: languageName(sourceLocale) })
      : t('Your content stays in {language}. Add a translation to produce the same resume in another language.', { language: languageName(sourceLocale) })}</p>
  </section>;
}
