import { Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import type { ComponentType } from 'react';
import { useEffect, useId, useState } from 'react';
import { SECTION_TEMPLATES } from '../data.ts';
import { useTheme } from '../lib/theme.tsx';
import { cn } from '../lib/utils.ts';
import { toDisplayValue, toStoredValue, versionFieldSpecs } from '../lib/version-fields.ts';
import type { FieldInputProps } from '../lib/version-fields.ts';
import { useVariants } from '../lib/variants-context.ts';
import type { ItemText, ResumeItem, ResumeSection } from '../types.ts';
import { Button } from './ui/button.tsx';

export type { FieldInputKind, FieldInputProps, VersionFieldSpec } from '../lib/version-fields.ts';

const inputClass = 'min-w-0 rounded border border-border bg-background px-2 py-1.5 text-xs';

/** Small controls shown on an item's summary row while a preset is active: its version and an eye toggle. */
export function ItemPresetBadge({ item }: { item: ResumeItem }) {
  const { t } = useTheme();
  const variants = useVariants();
  if (!variants?.presetId) return null;
  const choice = variants.choiceFor(item.id);
  const hidden = choice?.hidden === true;
  const version = choice?.version ? item.versions?.find(candidate => candidate.id === choice.version) : undefined;
  const toggle = () => variants.setChoice(item.id, hidden ? 'default' : 'hidden');
  const label = hidden ? t('Show in this preset') : t('Hide in this preset');
  return <>
    {version && <span className="max-w-24 shrink-0 truncate rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary" title={t('Version shown by this preset')}>{version.name}</span>}
    <span role="button" aria-pressed={hidden} aria-label={label} title={label} tabIndex={0} className="p-1 text-muted-foreground hover:text-foreground"
      onClick={event => { event.preventDefault(); event.stopPropagation(); toggle(); }}
      onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); toggle(); } }}>
      {hidden ? <EyeOff size={13} /> : <Eye size={13} />}
    </span>
  </>;
}

/** A text input that only commits on blur or Enter, so a name can be cleared while it is being retyped. */
function NameInput({ value, label, onCommit }: { value: string; label: string; onCommit(value: string): void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => { if (draft.trim() && draft.trim() !== value) onCommit(draft); else setDraft(value); };
  return <input aria-label={label} className={cn(inputClass, 'flex-1')} maxLength={200} value={draft} onChange={event => setDraft(event.target.value)} onBlur={commit}
    onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); commit(); } }} />;
}

/**
 * Lets the user keep several named wordings of one item and choose which one the active
 * preset shows. A version only lists the fields it rewords; the rest is inherited.
 */
export function ItemVersionsEditor({ section, item, FieldInput, defaultText }: {
  section: ResumeSection;
  item: ResumeItem;
  /** The editor's own inputs, so versions are edited with the same controls as the item itself. */
  FieldInput: ComponentType<FieldInputProps>;
  /** The item's current text for a field, used as the starting point when a field is reworded. */
  defaultText(field: keyof ItemText): string;
}) {
  const { t } = useTheme();
  const variants = useVariants();
  const selectId = useId();
  const [newName, setNewName] = useState('');
  if (!variants) return null;
  const specs = versionFieldSpecs(SECTION_TEMPLATES[section.type]?.kind ?? 'experience');
  const versions = item.versions ?? [];
  const choice = variants.choiceFor(item.id);
  const selected = choice?.hidden ? 'hidden' : choice?.version && versions.some(version => version.id === choice.version) ? `version:${choice.version}` : 'default';
  const add = () => { if (!newName.trim()) return; variants.addVersion(item.id, newName); setNewName(''); };

  return <details className="editor-section-options">
    <summary>{t('Versions')}{versions.length > 0 && <span className="ml-1 text-muted-foreground">({versions.length})</span>}</summary>
    <div className="flex flex-col gap-3 py-2">
      <p className="text-xs leading-5 text-muted-foreground">{t('Write other wordings of this item, for example a shorter one or one that stresses other strengths. A preset chooses which one to show.')}</p>
      {variants.presetId && <div className="flex items-center gap-2">
        <label htmlFor={selectId} className="shrink-0 text-xs font-medium">{t('In the active preset')}</label>
        <select id={selectId} className={cn(inputClass, 'flex-1')} value={selected} onChange={event => {
          const value = event.target.value;
          variants.setChoice(item.id, value === 'hidden' ? 'hidden' : value.startsWith('version:') ? { version: value.slice('version:'.length) } : 'default');
        }}>
          <option value="default">{t('Default text')}</option>
          {versions.map(version => <option key={version.id} value={`version:${version.id}`}>{version.name}</option>)}
          <option value="hidden">{t('Hidden')}</option>
        </select>
      </div>}
      {versions.map(version => <div key={version.id} className="flex flex-col gap-2 rounded-md border border-border p-2">
        <div className="flex items-center gap-2">
          <NameInput label={t('Version name')} value={version.name} onCommit={name => variants.renameVersion(item.id, version.id, name)} />
          <Button type="button" variant="ghost" size="icon-sm" aria-label={t('Delete version')} title={t('Delete version')} onClick={() => variants.deleteVersion(item.id, version.id)}><Trash2 /></Button>
        </div>
        {specs.map(spec => {
          const overridden = version.content[spec.field] !== undefined;
          return <div key={spec.field} className="flex flex-col gap-1">
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={overridden} onChange={event => variants.setVersionField(item.id, version.id, spec.field, event.target.checked ? toStoredValue(spec.input, defaultText(spec.field)) : undefined)} />
              <span>{t('Reword: {field}', { field: t(spec.label) })}</span>
            </label>
            {overridden && <FieldInput key={`${version.id}:${spec.field}`} input={spec.input} label={t(spec.label)} value={toDisplayValue(version.content[spec.field])}
              onChange={value => variants.setVersionField(item.id, version.id, spec.field, toStoredValue(spec.input, value))} />}
          </div>;
        })}
      </div>)}
      <form className="flex items-center gap-2" onSubmit={event => { event.preventDefault(); add(); }}>
        <input aria-label={t('New version name')} placeholder={t('Version name, e.g. Short')} maxLength={200} className={cn(inputClass, 'flex-1')} value={newName} onChange={event => setNewName(event.target.value)} />
        <Button type="submit" variant="outline" size="sm" disabled={!newName.trim()}><Plus data-icon="inline-start" />{t('Add version')}</Button>
      </form>
    </div>
  </details>;
}
