import { CheckCircle2, ClipboardCheck, Download, Eye, FileJson, FileText, ImageDown, LayoutTemplate, Link2, Loader2, PencilLine, Share2, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { runChecks } from '../lib/ai-check.ts';
import { workspaceText } from '../lib/editor-workspace-copy.ts';
import { useTheme } from '../lib/theme.tsx';
import { cn } from '../lib/utils.ts';
import type { Resume, SectionType } from '../types.ts';
import { Button } from './ui/button.tsx';

const modes = [
  { id: 'edit', label: 'content', icon: PencilLine },
  { id: 'template', label: 'design', icon: LayoutTemplate },
  { id: 'check', label: 'check', icon: ClipboardCheck },
  { id: 'share', label: 'share', icon: Share2 },
] as const;

export function EditorModes({ activeView, onActiveView, previewOnly, onPreview, onTailor }: { activeView: string; onActiveView: (view: string) => void; previewOnly: boolean; onPreview: () => void; onTailor: () => void }) {
  const { lang, t } = useTheme();
  return <div className="editor-modes flex shrink-0 items-center gap-2 border-b border-border bg-card px-2 sm:px-4">
    <nav role="tablist" aria-label={workspaceText(lang, 'workflow')} className="flex min-w-0 flex-1 gap-1 py-1.5 sm:flex-none">
      {modes.map((mode, index) => <button key={mode.id} id={`editor-tab-${mode.id}`} type="button" role="tab" aria-selected={activeView === mode.id} aria-controls="editor-workspace-panel" tabIndex={activeView === mode.id ? 0 : -1}
        className={cn('inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:flex-none sm:px-5', activeView === mode.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}
        onClick={() => onActiveView(mode.id)} onKeyDown={event => {
          const next = event.key === 'ArrowRight' ? (index + 1) % modes.length : event.key === 'ArrowLeft' ? (index + modes.length - 1) % modes.length : event.key === 'Home' ? 0 : event.key === 'End' ? modes.length - 1 : -1;
          if (next < 0) return;
          event.preventDefault(); onActiveView(modes[next].id);
          document.getElementById(`editor-tab-${modes[next].id}`)?.focus();
        }}><mode.icon size={15} className="hidden min-[380px]:block" />{workspaceText(lang, mode.label)}</button>)}
    </nav>
    <Button variant="ghost" size="sm" className="ml-auto hidden shrink-0 text-xs lg:inline-flex" onClick={onTailor}><Sparkles size={14} />{t('Tailor to a job')}</Button>
    <Button variant="outline" size="sm" className="min-h-11 shrink-0 px-2 text-xs lg:hidden" onClick={onPreview} aria-pressed={previewOnly}><Eye size={14} /><span>{workspaceText(lang, previewOnly ? 'back' : 'preview')}</span></Button>
  </div>;
}

export function ResumeCheckPanel({ resume, onLocate, onAddSection }: { resume: Resume; onLocate: (id: string, field?: string) => void; onAddSection: (type: SectionType) => void }) {
  const { lang, t } = useTheme();
  const result = useMemo(() => runChecks(resume, t), [resume, t]);
  return <section className="flex h-full min-w-0 flex-col gap-4 overflow-y-auto p-4" aria-label={t('Resume check')}>
    <div><h2 className="text-base font-semibold">{workspaceText(lang, 'checkTitle')}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{workspaceText(lang, 'checkHelp')}</p></div>
    <p className="rounded-md border border-border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">{workspaceText(lang, 'caveat')}</p>
    {result.results.length === 0 && <p className="flex items-center gap-2 rounded-lg border border-emerald-200 p-4 text-sm"><CheckCircle2 size={18} />{t('Great—no issues found!')}</p>}
    {result.results.map((finding, index) => <article key={`${finding.targetId}-${index}`} className="editor-finding">
      <div className="flex items-center gap-2 text-xs"><span className={cn('rounded px-2 py-1 font-medium', finding.type === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground')}>{t(finding.type === 'error' ? 'Error' : finding.type === 'warning' ? 'Warning' : 'Suggestion')}</span><span className="text-muted-foreground">{finding.category}</span></div>
      <p className="my-3 text-sm leading-6">{finding.message}</p>
      {finding.targetId && <Button variant="outline" size="sm" onClick={() => onLocate(finding.targetId!, finding.field)}>{workspaceText(lang, 'editField')}</Button>}
      {!finding.targetId && finding.sectionType && <Button variant="outline" size="sm" onClick={() => onAddSection(finding.sectionType!)}>{workspaceText(lang, 'addSection')}</Button>}
    </article>)}
  </section>;
}

export function ResumeSharePanel({ url, onShare, onExport, isExporting }: { url: string; onShare: () => Promise<boolean>; onExport: (format: string) => void; isExporting: string }) {
  const { lang, t } = useTheme();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [failed, setFailed] = useState(false);
  const formats = [
    { type: 'pdf', label: workspaceText(lang, 'pdf'), help: 'pdfHelp', icon: Download },
    { type: 'docx', label: 'Word (.docx)', help: 'wordHelp', icon: FileText },
    { type: 'png', label: 'PNG', help: 'pngHelp', icon: ImageDown },
    { type: 'json', label: t('JSON backup'), help: 'jsonHelp', icon: FileJson },
  ] as const;
  return <section className="flex h-full min-w-0 flex-col gap-4 overflow-y-auto p-4" aria-label={workspaceText(lang, 'shareTitle')}>
    <div><h2 className="text-base font-semibold">{workspaceText(lang, 'shareTitle')}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{workspaceText(lang, 'shareHelp')}</p></div>
    <div className="grid gap-2">{formats.map(format => <button key={format.type} type="button" aria-label={format.label} aria-describedby={`export-${format.type}-help`} disabled={Boolean(isExporting)} onClick={() => onExport(format.type)} className="editor-share-format w-full focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60">
      {isExporting === format.type ? <Loader2 size={20} className="shrink-0 animate-spin" /> : <format.icon size={20} className="shrink-0 text-primary" />}<span><strong className="block text-sm font-medium">{format.label}</strong><span id={`export-${format.type}-help`} className="mt-1 block text-xs leading-5 text-muted-foreground">{workspaceText(lang, format.help)}</span></span>
    </button>)}</div>
    <div className="rounded-lg border border-border p-4"><h3 className="flex items-center gap-2 text-sm font-semibold"><Link2 size={16} />{workspaceText(lang, 'link')}</h3><p className="my-3 text-xs leading-5 text-muted-foreground">{workspaceText(lang, 'linkHelp')}</p>
      <Button variant="outline" className="min-h-11 w-full text-xs" disabled={busy} onClick={async () => {
        setBusy(true); setStatus(''); setFailed(false);
        try { const copied = await onShare(); setStatus(workspaceText(lang, copied ? 'copied' : 'manualCopy')); }
        catch { setFailed(true); setStatus(workspaceText(lang, 'linkError')); }
        finally { setBusy(false); }
      }}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}{workspaceText(lang, 'createLink')}</Button>
      {url && <input className="mt-3 w-full min-w-0 rounded-md border border-border bg-background p-2 text-xs" aria-label={workspaceText(lang, 'link')} readOnly value={url} onFocus={event => event.target.select()} />}
      {status && <p className="mt-2 text-xs leading-5" role={failed ? 'alert' : 'status'}>{status}</p>}
    </div>
  </section>;
}
