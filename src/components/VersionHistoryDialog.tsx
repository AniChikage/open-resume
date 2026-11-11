import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { History, Loader2, Save } from 'lucide-react';
import type { EditorDocument, ResumeProfile, ResumeSection, Translate } from '../types.ts';
import { getRichTextText } from '../lib/resume-content.ts';
import { useTheme } from '../lib/theme.tsx';
import { compareVersionDocuments, sameVersionValue } from '../lib/version-diff.ts';
import { createResumeVersion, getResumeVersion, listResumeVersions, restoreResumeVersion } from '../lib/versions.ts';
import { VERSION_AUTO_LIMIT, VERSION_MANUAL_LIMIT, type ResumeVersion, type ResumeVersionSummary } from '../lib/version-types.ts';
import { cn } from '../lib/utils.ts';
import { ResponsiveResumePreview } from './ResponsiveResumePreview.tsx';
import { Button } from './ui/button.tsx';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog.tsx';
import { Input } from './ui/input.tsx';

const PROFILE_LABELS: Record<string, string> = { name: 'Name', email: 'Email', phone: 'Phone', headline: 'Target role', website: 'Personal website', city: 'Current city', birthday: 'Date of birth', status: 'Current status' };

function sectionText(section: ResumeSection | undefined, t: Translate): string {
  if (!section) return '';
  return [t(section.visible ? 'Visible' : 'Hidden'), ...section.items.map(item => Object.entries(item)
    .filter(([key, value]) => key !== 'id' && typeof value !== 'boolean' && value)
    .map(([, value]) => getRichTextText(Array.isArray(value) ? value.join('\n') : String(value)))
    .concat(item.current ? [t('Present')] : [])
    .filter(Boolean).join(' · '))].join('\n').slice(0, 4000);
}

export default function VersionHistoryDialog({ resumeId, document, onClose, beforeRestore, onRestored }: {
  resumeId: string; document: EditorDocument; onClose: () => void; beforeRestore: () => Promise<boolean>; onRestored: (id: string) => void;
}) {
  const { lang, t } = useTheme();
  const [versions, setVersions] = useState<ResumeVersionSummary[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [selected, setSelected] = useState<ResumeVersion | null>(null);
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingVersion, setLoadingVersion] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [detailError, setDetailError] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState<'' | 'snapshot' | 'restore'>('');
  const busyRef = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setLoadError(false);
    listResumeVersions(resumeId).then(items => {
      if (cancelled) return;
      setVersions(items);
      setSelectedId(current => items.some(item => item.id === current) ? current : items[0]?.id || '');
    }).catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [resumeId, loadAttempt]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setSelected(null); setLoadingVersion(true); setDetailError(false);
    getResumeVersion(resumeId, selectedId).then(version => { if (!cancelled) setSelected(version); })
      .catch(() => { if (!cancelled) setDetailError(true); })
      .finally(() => { if (!cancelled) setLoadingVersion(false); });
    return () => { cancelled = true; };
  }, [resumeId, selectedId, loadAttempt]);

  const comparison = useMemo(() => selected ? compareVersionDocuments(document, selected) : null, [document, selected]);
  const sectionChanges = useMemo(() => {
    if (!selected) return [];
    const ids = new Set([...document.resume.sections, ...selected.resume.sections].map(section => section.id));
    return [...ids].flatMap(id => {
      const current = document.resume.sections.find(section => section.id === id);
      const saved = selected.resume.sections.find(section => section.id === id);
      return sameVersionValue(current, saved) ? [] : [{ id, current, saved, label: current?.label || saved?.label || '' }];
    });
  }, [document, selected]);

  async function saveSnapshot(event: FormEvent) {
    event.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true; setBusy('snapshot'); setActionError(''); setNotice('');
    try {
      const snapshot = await createResumeVersion(resumeId, document, label.trim());
      if (!alive.current) return;
      setLabel(''); setNotice(t('Snapshot saved.')); setSelectedId(snapshot.id);
      setLoadAttempt(value => value + 1);
    } catch { if (alive.current) setActionError('Could not save the snapshot. Please try again.'); }
    finally { busyRef.current = false; if (alive.current) setBusy(''); }
  }

  async function restore() {
    if (!selected || busyRef.current) return;
    busyRef.current = true; setBusy('restore'); setActionError('');
    try {
      if (!await beforeRestore()) {
        if (alive.current) setActionError('Save your current changes successfully before restoring a version.');
        return;
      }
      const result = await restoreResumeVersion(resumeId, selected.id);
      if (alive.current) onRestored(result.id);
    }
    catch { if (alive.current) setActionError('Could not restore this version. Please try again.'); }
    finally { busyRef.current = false; if (alive.current) setBusy(''); }
  }

  const kindLabel = (kind: ResumeVersionSummary['kind']) => t(kind === 'initial' ? 'Initial version' : kind === 'auto' ? 'Automatic version' : 'Named snapshot');
  const date = (timestamp: number) => new Date(timestamp).toLocaleString(lang, { dateStyle: 'short', timeStyle: 'short' });
  const hasChanges = comparison && (comparison.titleChanged || comparison.appearanceChanged || comparison.profileFields.length || comparison.changedSections.length);
  const orderChanged = selected && JSON.stringify(document.resume.sections.map(section => section.id)) !== JSON.stringify(selected.resume.sections.map(section => section.id));
  return <Dialog open onOpenChange={open => { if (!open && !busyRef.current) onClose(); }}>
    <DialogContent closeLabel={t('Close')} showCloseButton={!busy} className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-5xl">
      <DialogHeader className="pr-8">
        <DialogTitle className="flex items-center gap-2"><History />{t('Version history')}</DialogTitle>
        <DialogDescription>{t('Save a named snapshot, compare changes, or restore an earlier version as a new resume.')}</DialogDescription>
      </DialogHeader>
      <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={saveSnapshot}>
        <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm" htmlFor="version-label">{t('Snapshot name')}
          <Input id="version-label" value={label} onChange={event => setLabel(event.target.value)} maxLength={120} placeholder={t('For example: before applying')} disabled={Boolean(busy)} />
        </label>
        <Button type="submit" disabled={Boolean(busy)}>{busy === 'snapshot' ? <Loader2 data-icon="inline-start" className="animate-spin" /> : <Save data-icon="inline-start" />}{t(busy === 'snapshot' ? 'Saving snapshot…' : 'Save snapshot')}</Button>
      </form>
      <p className="text-xs text-muted-foreground">{t('Keeps the initial version, {auto} recent automatic versions and {manual} recent snapshots. Automatic changes within one minute are grouped.', { auto: VERSION_AUTO_LIMIT, manual: VERSION_MANUAL_LIMIT })}</p>
      {actionError && <p role="alert" className="text-sm text-destructive">{t(actionError)}</p>}
      {notice && <p role="status" className="text-sm">{notice}</p>}
      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto md:grid-cols-[230px_minmax(0,1fr)] md:overflow-hidden">
        <div className="flex max-h-44 flex-col gap-2 overflow-y-auto md:max-h-none" aria-label={t('Version history')}>
          {loading && <p role="status" className="p-3 text-sm text-muted-foreground">{t('Loading versions…')}</p>}
          {loadError && <div role="alert" className="flex flex-col gap-2 p-3"><p className="text-sm">{t('Could not load version history. Please try again.')}</p><Button variant="outline" onClick={() => setLoadAttempt(value => value + 1)}>{t('Retry')}</Button></div>}
          {!loading && !loadError && versions.map(version => <button key={version.id} type="button" aria-pressed={version.id === selectedId} disabled={Boolean(busy)} onClick={() => { setSelectedId(version.id); if (detailError) setLoadAttempt(value => value + 1); }} className={cn('flex flex-col gap-1 rounded-md border p-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', version.id === selectedId ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted')}>
            <strong className="break-words">{version.label || kindLabel(version.kind)}</strong>
            <span className="text-xs text-muted-foreground">{date(version.updatedAt)}</span>
            {version.label && <span className="text-xs text-muted-foreground">{kindLabel(version.kind)}</span>}
          </button>)}
        </div>
        <div className="min-w-0 overflow-y-auto md:max-h-[55dvh]">
          {loadingVersion ? <p role="status" className="p-3 text-sm text-muted-foreground">{t('Loading versions…')}</p> : detailError ? <p role="alert" className="p-3 text-sm text-destructive">{t('Could not load this version. Please select it again.')}</p> : selected && comparison ? <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0"><h2 className="break-words font-semibold">{selected.label || kindLabel(selected.kind)}</h2><p className="mt-1 text-xs text-muted-foreground">{t('Original resume stays unchanged.')}</p></div>
              <Button variant="outline" disabled={Boolean(busy)} onClick={() => { void restore(); }}>{busy === 'restore' && <Loader2 data-icon="inline-start" className="animate-spin" />}{t(busy === 'restore' ? 'Restoring…' : 'Restore as a new resume')}</Button>
            </div>
            <section className="flex flex-col gap-3 rounded-md border border-border p-3">
              <h3 className="text-sm font-medium">{t('Changes compared with your current editor')}</h3>
              {!hasChanges && <p className="text-sm text-muted-foreground">{t('No differences from your current editor.')}</p>}
              {comparison.titleChanged && <Difference label={t('Resume name')} current={document.resume.title} saved={selected.resume.title} />}
              {comparison.profileFields.map(field => field === 'avatar' ? <p key={field} className="text-sm">{t('Photo changed')}</p> : <Difference key={field} label={t(PROFILE_LABELS[field] || field)} current={document.resume.profile[field as keyof ResumeProfile] || ''} saved={selected.resume.profile[field as keyof ResumeProfile] || ''} />)}
              {comparison.appearanceChanged && <p className="text-sm">{t('Appearance changed')}</p>}
              {orderChanged && <p className="text-sm">{t('Section order changed')}</p>}
              {sectionChanges.map(change => <details key={change.id} className="rounded border border-border p-2"><summary className="cursor-pointer text-sm font-medium">{change.label}</summary><div className="mt-2"><Difference label="" current={change.current ? sectionText(change.current, t) || '—' : t('Section not present')} saved={change.saved ? sectionText(change.saved, t) || '—' : t('Section not present')} /></div></details>)}
            </section>
            <details className="rounded-md border border-border p-3"><summary className="cursor-pointer text-sm font-medium">{t('Preview saved version')}</summary><div className="mt-3 overflow-hidden rounded-md border border-border"><ResponsiveResumePreview resume={selected.resume} settings={selected.settings} /></div></details>
          </div> : !loading && <p className="p-3 text-sm text-muted-foreground">{t('Select a version to compare.')}</p>}
        </div>
      </div>
    </DialogContent>
  </Dialog>;
}

function Difference({ label, current, saved }: { label: string; current: string; saved: string }) {
  const { t } = useTheme();
  return <div className="flex min-w-0 flex-col gap-1.5 text-sm">
    {label && <strong>{label}</strong>}
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="min-w-0 rounded bg-muted p-2"><span className="text-xs text-muted-foreground">{t('Current editor')}</span><p className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap break-words">{current || '—'}</p></div>
      <div className="min-w-0 rounded bg-muted p-2"><span className="text-xs text-muted-foreground">{t('Saved version')}</span><p className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap break-words">{saved || '—'}</p></div>
    </div>
  </div>;
}
