import { useEffect, useRef, useState } from 'react';
import { History, Download, RotateCcw } from 'lucide-react';
import type { EditorDocument } from '../types.ts';
import { useAuth } from '../lib/auth.tsx';
import { useTheme } from '../lib/theme.tsx';
import { listVersions, recordVersion } from '../lib/resume-versions.ts';
import type { ResumeVersion } from '../lib/resume-versions.ts';
import { createBackup, downloadFile } from '../lib/resume-transfer.ts';
import { transferText } from '../lib/transfer-copy.ts';
import { Button } from './ui/button.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog.tsx';

export default function ResumeHistory({ resumeId, document, onRestore }: { resumeId: string; document: EditorDocument; onRestore: (document: EditorDocument) => void }) {
  const { user } = useAuth();
  const { lang } = useTheme();
  const copy = (key: Parameters<typeof transferText>[1]) => transferText(lang, key);
  const scope = `${user?.id || 'anonymous'}:${resumeId}`;
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const initialized = useRef('');

  useEffect(() => {
    if (!user) return;
    const first = initialized.current !== scope;
    initialized.current = scope;
    const timer = setTimeout(() => { recordVersion(scope, document).catch(() => setError(true)); }, first ? 0 : 1500);
    return () => clearTimeout(timer);
  }, [scope, document.resume, document.settings, user]);

  const show = async () => {
    setOpen(true); setBusy(true); setError(false);
    try {
      await recordVersion(scope, document);
      const items = await listVersions(scope);
      setVersions(items); setSelected(items[1]?.id || items[0]?.id || '');
    } catch { setError(true); } finally { setBusy(false); }
  };
  const version = versions.find((item) => item.id === selected);
  const restore = async () => {
    if (!version || busy) return;
    setBusy(true);
    try {
      await recordVersion(scope, document);
      onRestore(structuredClone(version.document));
      setOpen(false);
    } catch { setError(true); } finally { setBusy(false); }
  };
  return <>
    <Button variant="ghost" size="icon-sm" onClick={show} aria-label={copy('history')} title={copy('history')} disabled={!user}><History /></Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-xl" closeLabel={copy('close')}>
        <DialogHeader><DialogTitle>{copy('history')}</DialogTitle><DialogDescription>{copy('historyNote')}</DialogDescription></DialogHeader>
        {error && <p role="alert" className="text-sm text-destructive">{copy('historyError')}</p>}
        {busy ? <p role="status">{copy('reading')}</p> : <>
          <p className="text-xs text-muted-foreground">{copy('versionCount')}: {versions.length}</p>
          <div className="flex max-h-52 flex-col gap-2 overflow-y-auto" aria-label={copy('history')}>
            {versions.map((item) => <Button key={item.id} variant={selected === item.id ? 'secondary' : 'outline'} className="h-auto justify-between gap-3 py-3 text-left" onClick={() => setSelected(item.id)} aria-pressed={selected === item.id}>
              <span className="truncate">{item.document.resume.title}</span><time className="shrink-0 text-xs" dateTime={new Date(item.savedAt).toISOString()}>{new Date(item.savedAt).toLocaleString(lang)}</time>
            </Button>)}
          </div>
          {!versions.length && <p>{copy('historyEmpty')}</p>}
          {version && <div className="rounded-lg border border-border p-3 text-sm"><p className="font-medium">{version.document.resume.profile.name || version.document.resume.title}</p><p className="mt-1 text-muted-foreground">{version.document.resume.profile.headline}</p><p className="mt-2 text-xs">{version.document.resume.sections.filter((section) => section.visible).map((section) => section.label).join(' · ')}</p></div>}
        </>}
        <p className="text-xs text-muted-foreground">{copy('restoreNote')}</p>
        <DialogFooter className="flex-wrap">
          <Button variant="outline" disabled={!version || busy} onClick={() => { try { if (version) downloadFile(new Blob([createBackup([version.document])], { type: 'application/json' }), `${version.document.resume.title}-version.json`); } catch { setError(true); } }}><Download data-icon="inline-start" />{copy('downloadVersion')}</Button>
          <Button disabled={!version || busy} onClick={restore}><RotateCcw data-icon="inline-start" />{copy('restoreVersion')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
