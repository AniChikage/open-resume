import { Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { useId, useState } from 'react';
import { useTheme } from '../lib/theme.tsx';
import { useVariants } from '../lib/variants-context.ts';
import { Button } from './ui/button.tsx';

type Mode = 'create' | 'rename' | 'duplicate' | 'delete' | null;

/** Picks, creates, renames, duplicates and deletes the presets of the resume being edited. */
export function PresetBar() {
  const { t } = useTheme();
  const variants = useVariants();
  const selectId = useId();
  const [mode, setMode] = useState<Mode>(null);
  const [name, setName] = useState('');
  if (!variants) return null;
  const active = variants.presets.find(preset => preset.id === variants.presetId);

  const start = (next: Exclude<Mode, null>, initialName: string) => { setMode(next); setName(initialName); };
  const cancel = () => setMode(null);
  const confirm = () => {
    const trimmed = name.trim();
    if (mode === 'delete') variants.deleteActivePreset();
    else if (trimmed && mode === 'create') variants.createPreset(trimmed);
    else if (trimmed && mode === 'rename') variants.renameActivePreset(trimmed);
    else if (trimmed && mode === 'duplicate') variants.duplicateActivePreset(trimmed);
    else return;
    setMode(null);
  };

  return <section className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3" aria-label={t('Presets')} data-editor-target="presets">
    <div className="flex items-center gap-2">
      <label htmlFor={selectId} className="shrink-0 text-xs font-medium">{t('Preset')}</label>
      <select id={selectId} className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1.5 text-xs" value={active?.id ?? ''} onChange={event => { cancel(); variants.selectPreset(event.target.value || null); }}>
        <option value="">{t('Full resume (no preset)')}</option>
        {variants.presets.map(preset => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
      </select>
      <Button type="button" variant="outline" size="icon-sm" aria-label={t('New preset')} title={t('New preset')} onClick={() => start('create', '')}><Plus /></Button>
      {active && <>
        <Button type="button" variant="outline" size="icon-sm" aria-label={t('Rename preset')} title={t('Rename preset')} onClick={() => start('rename', active.name)}><Pencil /></Button>
        <Button type="button" variant="outline" size="icon-sm" aria-label={t('Duplicate preset')} title={t('Duplicate preset')} onClick={() => start('duplicate', t('{name} (copy)', { name: active.name }))}><Copy /></Button>
        <Button type="button" variant="outline" size="icon-sm" aria-label={t('Delete preset')} title={t('Delete preset')} onClick={() => start('delete', '')}><Trash2 /></Button>
      </>}
    </div>
    {(mode === 'create' || mode === 'rename' || mode === 'duplicate') && <form className="flex items-center gap-2" onSubmit={event => { event.preventDefault(); confirm(); }}>
      <input autoFocus aria-label={t('Preset name')} placeholder={t('Preset name, e.g. Backend roles')} maxLength={200} className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1.5 text-xs"
        value={name} onChange={event => setName(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); cancel(); } }} />
      <Button type="submit" size="sm" disabled={!name.trim()}>{t('Save')}</Button>
      <Button type="button" variant="ghost" size="sm" onClick={cancel}>{t('Cancel')}</Button>
    </form>}
    {mode === 'delete' && active && <div role="alertdialog" aria-label={t('Delete preset')} className="flex flex-wrap items-center gap-2 text-xs">
      <span className="min-w-0 flex-1">{t('Delete the preset "{name}"? Your items and versions are kept.', { name: active.name })}</span>
      <Button type="button" variant="destructive" size="sm" onClick={confirm}>{t('Delete')}</Button>
      <Button type="button" variant="ghost" size="sm" onClick={cancel}>{t('Cancel')}</Button>
    </div>}
    <p className="text-xs leading-5 text-muted-foreground">{active ? t('The preview and the exports use this preset.') : t('Create a preset to hide items, or show another version of them, for a specific job.')}</p>
  </section>;
}
