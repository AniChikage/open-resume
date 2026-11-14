import { Languages, Loader2 } from 'lucide-react';
import type { ComponentType } from 'react';
import { useState } from 'react';
import { useAuth } from '../lib/auth.tsx';
import { useTheme } from '../lib/theme.tsx';
import { translateRows } from '../lib/translate-client.ts';
import type { TranslationRow } from '../lib/translation-rows.ts';
import { cn } from '../lib/utils.ts';
import type { FieldInputProps } from '../lib/version-fields.ts';
import { useVariants } from '../lib/variants-context.ts';
import { languageName } from './LanguageBar.tsx';
import { Button } from './ui/button.tsx';

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

const PROVIDER_NAMES: Record<string, string> = { libretranslate: 'LibreTranslate', deepl: 'DeepL' };
// What the user is told for each failure of the translation service.
const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: 'Your session expired. Sign in again to save.',
  PROVIDER_BUSY: 'The translation service is busy or its quota is used up. Try again later.',
  NETWORK: 'Could not reach the server. Check your connection and try again.',
};

/**
 * Replaces the content editor while a translation is shown: each written text appears
 * read-only in the source language, with an input for its translation next to it. When the
 * server has a translation engine configured, untranslated texts can be translated
 * automatically; those translations are flagged until someone reviews them.
 */
export function TranslationPanel({ FieldInput }: { FieldInput: ComponentType<FieldInputProps> }) {
  const { t } = useTheme();
  const { config } = useAuth();
  const variants = useVariants();
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<{ error: boolean; message: string } | null>(null);
  if (!variants?.localeId) return null;
  const locale = variants.localeId;
  const groups = groupRows(variants.rows, variants.itemLabel, t);
  const provider = config?.translateProvider ?? null;
  const providerName = provider ? PROVIDER_NAMES[provider] ?? provider : '';
  const canTranslate = (row: TranslationRow) => row.missing && !row.translated.trim();
  const untranslated = variants.rows.filter(canTranslate).length;

  // `only` limits the run to one row (its own button); otherwise every untranslated text is sent.
  const translate = async (only?: TranslationRow) => {
    setBusy(only?.key ?? 'all');
    setStatus(null);
    const result = await translateRows(variants.rows, variants.sourceLocale, locale, { rowKeys: only ? new Set([only.key]) : undefined });
    const entries = variants.rows.filter(row => result.translations.has(row.key)).map(row => ({ row, value: result.translations.get(row.key)! }));
    if (entries.length) variants.applyMachineTranslations(entries);
    const parts: string[] = [];
    if (entries.length) parts.push(t('{count} texts translated automatically. Please review them.', { count: entries.length }));
    if (result.skipped.length) parts.push(t('{count} texts were too long to translate automatically.', { count: result.skipped.length }));
    if (result.error) parts.push(t(ERROR_MESSAGES[result.error] ?? 'The translation service is not available. Check its configuration.'));
    setStatus({ error: Boolean(result.error), message: parts.join(' ') });
    setBusy(null);
  };

  return <section className="flex flex-col gap-3" aria-label={t('Translation')}>
    <div>
      <h3 className="text-sm font-semibold">{t('Translation into {language}', { language: languageName(locale) })}</h3>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{t('The text on the left is your resume in {language}. Write its translation on the right; the preview shows the result.', { language: languageName(variants.sourceLocale) })}</p>
    </div>
    {provider && <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs leading-5 text-muted-foreground">{t('Texts that are not translated yet are sent to the translation service configured on your server ({provider}). Texts you have already translated are never replaced.', { provider: providerName })}</p>
      <Button type="button" variant="outline" size="sm" className="self-start" disabled={busy !== null || untranslated === 0} onClick={() => void translate()}>
        {busy === 'all' ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Languages data-icon="inline-start" />}
        {t('Translate missing texts')}{untranslated > 0 && ` (${untranslated})`}
      </Button>
      {status?.message && <p className={cn('text-xs leading-5', status.error ? 'text-destructive' : 'text-muted-foreground')} role={status.error ? 'alert' : 'status'}>{status.message}</p>}
    </div>}
    {groups.length === 0 && <p className="text-xs text-muted-foreground">{t('There is nothing to translate yet.')}</p>}
    {groups.map(group => <div key={group.key} className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <div className="flex items-center gap-2">
        <h4 className="min-w-0 flex-1 truncate text-xs font-semibold">{group.title}</h4>
        {group.itemId && <label className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          <input type="checkbox" checked={variants.isItemSame(group.itemId)} onChange={event => variants.setItemSame(group.itemId!, event.target.checked)} />
          {t('No translation needed')}
        </label>}
      </div>
      {group.rows.map(row => <div key={row.key} className={cn('flex flex-col gap-1 rounded-md border p-2', row.missing ? 'border-amber-400 bg-amber-50/60' : row.stale ? 'border-sky-400 bg-sky-50/60' : row.machine ? 'border-violet-400 bg-violet-50/60' : 'border-border')} data-untranslated={row.missing || undefined} data-stale={row.stale || undefined} data-machine={row.machine || undefined}>
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          <span>{t(row.label)}</span>
          {row.versionId && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-normal text-primary">{variants.versionName(row.itemId!, row.versionId)}</span>}
          {row.missing && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">{t('Not translated')}</span>}
          {provider && canTranslate(row) && <button type="button" className="text-[10px] font-normal underline underline-offset-2 hover:text-foreground disabled:opacity-50" disabled={busy !== null} onClick={() => void translate(row)}>{busy === row.key ? t('Translating…') : t('Translate with {provider}', { provider: providerName })}</button>}
          {row.machine && <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-900">{t('Automatic translation: please review')}</span>}
          {row.machine && <button type="button" className="text-[10px] font-normal underline underline-offset-2 hover:text-foreground" onClick={() => variants.markRowReviewed(row)}>{t('Mark as reviewed')}</button>}
          {row.stale && <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-900">{t('Source changed since translated')}</span>}
          {row.stale && <button type="button" className="text-[10px] font-normal underline underline-offset-2 hover:text-foreground" onClick={() => variants.markRowCurrent(row)}>{t('Mark as up to date')}</button>}
        </div>
        <p className="max-h-32 overflow-y-auto whitespace-pre-line rounded bg-muted/40 p-2 text-xs leading-5 text-muted-foreground" aria-label={t('Source text')}>{plainText(row.source)}</p>
        <FieldInput key={row.key} input={row.input} label={t('Translation')} value={row.translated} onChange={value => variants.setRowTranslation(row, value)} />
      </div>)}
    </div>)}
  </section>;
}
