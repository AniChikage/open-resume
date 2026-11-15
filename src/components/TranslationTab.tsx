import type { ComponentType } from 'react';
import { useTheme } from '../lib/theme.tsx';
import type { FieldInputProps } from '../lib/version-fields.ts';
import { useVariants } from '../lib/variants-context.ts';
import { languageName, LanguageBar } from './LanguageBar.tsx';
import { TranslationPanel } from './TranslationPanel.tsx';

/**
 * Shown at the top of the Content tab while a translation is displayed in the preview, so
 * nobody mistakes the source text they are editing for the translation they are looking at.
 */
export function TranslationNotice({ onOpen }: { onOpen: () => void }) {
  const { t } = useTheme();
  const variants = useVariants();
  if (!variants?.localeId) return null;
  return <div role="status" className="mb-3 flex flex-col gap-1.5 rounded-md border border-sky-300 bg-sky-50/70 p-3 text-xs leading-5">
    <span>{t('The preview shows the {language} translation. What you edit here is the {source} source text.', { language: languageName(variants.localeId), source: languageName(variants.sourceLocale) })}</span>
    <button type="button" className="self-start font-medium underline underline-offset-2 hover:text-foreground" onClick={onOpen}>{t('Open the Translation tab')}</button>
  </div>;
}

/** The Translation tab: pick the language, then translate text by text beside its source. */
export function TranslationTab({ FieldInput }: { FieldInput: ComponentType<FieldInputProps> }) {
  const { t } = useTheme();
  const variants = useVariants();
  if (!variants) return null;
  return <section className="editor-content-panel" aria-label={t('Translation')}>
    <div className="flex flex-col gap-3">
      <LanguageBar />
      {variants.localeId
        ? <TranslationPanel FieldInput={FieldInput} />
        : <p className="text-xs leading-5 text-muted-foreground" role="status">{variants.translatedLocales.length > 0
          ? t('Choose a language above to see its translation.')
          : t('Add a translation above to start translating.')}</p>}
    </div>
  </section>;
}
