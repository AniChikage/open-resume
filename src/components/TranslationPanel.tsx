import type { ComponentType } from 'react';
import { useTheme } from '../lib/theme.tsx';
import type { TranslationRow } from '../lib/translation-rows.ts';
import { cn } from '../lib/utils.ts';
import type { FieldInputProps } from '../lib/version-fields.ts';
import { toStoredValue } from '../lib/version-fields.ts';
import { useVariants } from '../lib/variants-context.ts';
import { languageName } from './LanguageBar.tsx';

/** The source text as plain text, for the read-only reference next to each field. */
function plainText(source: string): string {
  if (!/[<&]/.test(source)) return source;
  return new DOMParser().parseFromString(source.replace(/<\/(p|div|li)>|<br\s*\/?>/gi, '\n'), 'text/html').body.textContent?.trim() ?? '';
}

interface Group { key: string; title: string; itemId?: string; rows: TranslationRow[] }

function groupRows(rows: TranslationRow[], itemLabel: (itemId: string) => string, t: (message: string) => string): Group[] {
  const groups: Group[] = [];
  const add = (key: string, title: string, itemId: string | undefined, row: TranslationRow) => {
    const last = groups[groups.length - 1];
    if (last?.key === key) last.rows.push(row);
    else groups.push({ key, title, itemId, rows: [row] });
  };
  for (const row of rows) {
    if (row.scope === 'profile') add('profile', t('Profile'), undefined, row);
    else if (row.scope === 'section') add(`section:${row.sectionId}`, row.source, undefined, row);
    else add(`item:${row.itemId}`, itemLabel(row.itemId!), row.itemId, row);
  }
  return groups;
}

/**
 * Replaces the content editor while a translation is shown: each written text appears
 * read-only in the source language, with an input for its translation next to it.
 */
export function TranslationPanel({ FieldInput }: { FieldInput: ComponentType<FieldInputProps> }) {
  const { t } = useTheme();
  const variants = useVariants();
  if (!variants?.localeId) return null;
  const locale = variants.localeId;
  const groups = groupRows(variants.rows, variants.itemLabel, t);

  const save = (row: TranslationRow, value: string) => {
    const stored = toStoredValue(row.input, value);
    if (row.scope === 'profile') variants.setProfileTranslation(row.field as 'headline' | 'city' | 'status', value);
    else if (row.scope === 'section') variants.setSectionLabelTranslation(row.sectionId!, value);
    else variants.setItemTranslation(row.itemId!, row.versionId ?? null, row.field as never, stored);
  };

  return <section className="flex flex-col gap-3" aria-label={t('Translation')}>
    <div>
      <h3 className="text-sm font-semibold">{t('Translation into {language}', { language: languageName(locale) })}</h3>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('The text on the left is your resume in {language}. Write its translation on the right; the preview shows the result.', { language: languageName(variants.sourceLocale) })}</p>
    </div>
    {groups.length === 0 && <p className="text-xs text-muted-foreground">{t('There is nothing to translate yet.')}</p>}
    {groups.map(group => <div key={group.key} className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <div className="flex items-center gap-2">
        <h4 className="min-w-0 flex-1 truncate text-xs font-semibold">{group.title}</h4>
        {group.itemId && <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          <input type="checkbox" checked={variants.isItemSame(group.itemId)} onChange={event => variants.setItemSame(group.itemId!, event.target.checked)} />
          {t('No translation needed')}
        </label>}
      </div>
      {group.rows.map(row => <div key={row.key} className={cn('flex flex-col gap-1 rounded-md border p-2', row.missing ? 'border-amber-400 bg-amber-50/60' : 'border-border')} data-untranslated={row.missing || undefined}>
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          <span>{t(row.label)}</span>
          {row.versionId && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-normal text-primary">{variants.versionName(row.itemId!, row.versionId)}</span>}
          {row.missing && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">{t('Not translated')}</span>}
        </div>
        <p className="max-h-32 overflow-y-auto whitespace-pre-line rounded bg-muted/40 p-2 text-xs leading-5 text-muted-foreground" aria-label={t('Source text')}>{plainText(row.source)}</p>
        <FieldInput key={row.key} input={row.input} label={t('Translation')} value={row.translated} onChange={value => save(row, value)} />
      </div>)}
    </div>)}
  </section>;
}
