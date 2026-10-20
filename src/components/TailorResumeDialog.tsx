import { ArrowRight,CheckCircle2,Loader2,Sparkles } from 'lucide-react';
import type * as React from 'react';
import { useEffect,useRef,useState } from 'react';
import { useAuth } from '../lib/auth.tsx';
import { openText } from '../lib/open-copy.ts';
import { navigate } from '../lib/router.ts';
import { createResume } from '../lib/storage.ts';
import { applyTailoring,JD_MAX_LENGTH,tailoringTargets } from '../lib/tailoring.ts';
import { useTheme } from '../lib/theme.tsx';
import { errorMessage } from '../lib/validation.ts';
import type { EditorDocument,Resume,TailoringResult } from '../types.ts';
import { Button } from './ui/button.tsx';
import { Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle } from './ui/dialog.tsx';

const ERROR_COPY: Record<string,string> = {
  UNAUTHORIZED: 'Sign in again to tailor your resume.',
  INVALID_JD: 'Paste a job description between 80 and 12,000 characters.',
  EMPTY_RESUME: 'Add your experience, summary, or skills before tailoring.',
  RESUME_TOO_LONG: 'Your resume is too long to analyze. Shorten the descriptions and try again.',
  BODY_TOO_LARGE: 'Your resume is too long to analyze. Shorten the descriptions and try again.',
  PROVIDER_BUSY: 'The AI service is busy. Wait a minute and try again.',
  AI_UNAVAILABLE: 'Job tailoring is temporarily unavailable. Please try again later.',
  AI_TIMEOUT: 'The analysis took too long. Please try again.',
  INVALID_AI_RESPONSE: 'The AI response could not be verified. No changes were made. Please try again.',
};

export default function TailorResumeDialog({ snapshot, currentResume, onClose }: {snapshot:EditorDocument;currentResume:Resume;onClose:()=>void}) {
  const { lang, t } = useTheme();
  const { config } = useAuth();
  const [jobDescription, setJobDescription] = useState('');
  const [consent, setConsent] = useState(false);
  const [result, setResult] = useState<TailoringResult|null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const requestRef = useRef<AbortController | null>(null);
  const saveRef = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; requestRef.current?.abort(); }; }, []);
  const stale = JSON.stringify(snapshot.resume) !== JSON.stringify(currentResume);

  async function analyze(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requestRef.current || !consent) return;
    setError('');
    try { tailoringTargets(snapshot.resume); } catch (err) { setError(ERROR_COPY[errorMessage(err)] || ERROR_COPY.EMPTY_RESUME); return; }
    const controller = new AbortController();
    requestRef.current = controller;
    const timer = setTimeout(() => controller.abort(), 130000);
    setBusy(true);
    setResult(null);
    setSelected([]);
    try {
      // Send only editable content, omitting the photo, contact information,
      // dates, and other profile fields even from the application request.
      const resume = { sections: snapshot.resume.sections.map((section) => ({
        type: section.type, visible: section.visible, label: section.label,
        items: section.visible === false || !['summary', 'work', 'project', 'skills'].includes(section.type) ? [] : section.items.map((item) => ({ title: item.title, role: item.role, body: item.body, bullets: item.bullets, values: item.values })),
      })) };
      const response = await fetch('/api/tailor', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ resume, jobDescription, language: lang, consent }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'AI_UNAVAILABLE');
      if (!alive.current) return;
      setResult(data);
      setTitle(`${snapshot.resume.title} — ${data.role}`.slice(0, 200));
    } catch (err) {
      if (alive.current) setError(err instanceof Error && err.name === 'AbortError' ? ERROR_COPY.AI_TIMEOUT : ERROR_COPY[errorMessage(err)] || ERROR_COPY.AI_UNAVAILABLE);
    } finally {
      clearTimeout(timer);
      requestRef.current = null;
      if (alive.current) setBusy(false);
    }
  }

  async function saveCopy() {
    if (saveRef.current || !result || stale || !selected.length || !title.trim()) return;
    saveRef.current = true;
    setSaving(true);
    setError('');
    try {
      const next = applyTailoring(snapshot.resume, result.suggestions, selected);
      next.title = title.trim();
      const copy = await createResume(next, { ...snapshot.settings, titleMode: 'custom', titleKind: 'custom' });
      if (alive.current) { onClose(); navigate(`/editor/${copy.id}`); }
    } catch (err) {
      if (alive.current) setError(errorMessage(err) === 'UNAUTHORIZED' ? ERROR_COPY.UNAUTHORIZED : 'Could not save the tailored copy. Your original resume is safe. Try again.');
    } finally { saveRef.current = false; if (alive.current) setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !saveRef.current) onClose(); }}>
      <DialogContent closeLabel={t('Close')} showCloseButton={!saving} className="flex max-h-[90dvh] w-[92vw] flex-col gap-0 overflow-hidden p-0 sm:w-full sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b border-border p-5 pr-12">
          <DialogTitle className="flex items-center gap-2"><Sparkles size={18} className="text-primary" />{t('Tailor to a job')}</DialogTitle>
          <DialogDescription>{t('Bring your relevant experience forward. Review every suggestion before saving a separate copy.')}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto p-5">
          {!config?.aiConfigured && <p role="status" className="mb-4 rounded-md border border-border bg-muted p-3 text-sm leading-6">{openText(lang, 'aiSetup')}</p>}
          {!result ? (
            <form onSubmit={analyze} className="flex flex-col gap-4">
              <label className="flex flex-col gap-2 text-sm font-medium">
                <span>{t('Job description')}</span>
                <textarea autoFocus rows={9} value={jobDescription} minLength={80} maxLength={JD_MAX_LENGTH} required disabled={busy}
                  onChange={(e) => setJobDescription(e.target.value)} placeholder={t('Paste the responsibilities and requirements from the job posting…')}
                  className="block w-full resize-y rounded-lg border border-border bg-background p-3 text-sm font-normal leading-6 outline-none focus:ring-2 focus:ring-primary" />
                <span className="block text-right text-xs font-normal text-muted-foreground">{jobDescription.length.toLocaleString()} / 12,000</span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 text-xs leading-5 text-muted-foreground">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} disabled={busy} className="mt-1 size-4 shrink-0 accent-primary" />
                <span>{openText(lang, 'aiConsent')}</span>
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">{openText(lang, 'aiOwnKey')}</p>
                <Button type="submit" disabled={!config?.aiConfigured || busy || !consent || jobDescription.trim().length < 80}>
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}{t(busy ? 'Analyzing your resume…' : 'Analyze job fit')}
                </Button>
              </div>
              {busy && <p role="status" className="text-sm text-muted-foreground">{t('This can take up to two minutes. Your original resume stays unchanged.')}</p>}
            </form>
          ) : (
            <div className="flex flex-col gap-5">
              <div><h3 className="font-semibold">{result.role}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{result.summary}</p></div>
              {result.gaps.length > 0 && <section className="rounded-lg border border-border bg-muted/50 p-4">
                <h3 className="text-sm font-semibold">{t('Requirements not evidenced in your resume')}</h3>
                <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm leading-6">{result.gaps.map((gap, i) => <li key={i}>{gap}</li>)}</ul>
                <p className="mt-2 text-xs">{t('Add these only if they reflect your actual experience.')}</p>
              </section>}
              {result.suggestions.length === 0 ? <p className="rounded-lg bg-muted p-4 text-sm" role="status">{t('No supported rewrites were found. Review the requirements above or try another job description.')}</p> : <>
                <p className="text-sm text-muted-foreground">{t('Select only changes that remain accurate. AI suggestions can make mistakes.')}</p>
                {result.suggestions.map((suggestion) => <article key={suggestion.id} className="overflow-hidden rounded-lg border border-border">
                  <header className="border-b border-border bg-muted/40 p-3"><h4 className="text-sm font-semibold">{suggestion.label}{suggestion.title ? ` · ${suggestion.title}` : ''}</h4><p className="mt-1 text-xs leading-5 text-muted-foreground">{suggestion.reason}</p></header>
                  <div className="grid gap-4 p-4 sm:grid-cols-2">
                    <div><p className="mb-2 text-xs font-semibold text-muted-foreground">{t('Before')}</p><p className="whitespace-pre-wrap break-words text-sm leading-6">{suggestion.before}</p></div>
                    <div><p className="mb-2 flex items-center gap-1 text-xs font-semibold text-primary"><ArrowRight size={12} />{t('Suggested rewrite')}</p><p className="whitespace-pre-wrap break-words text-sm leading-6">{suggestion.after}</p></div>
                  </div>
                  <details className="px-4 pb-3 text-xs text-muted-foreground"><summary className="cursor-pointer">{t('Source evidence')}</summary><blockquote className="mt-2 whitespace-pre-wrap border-l-2 border-primary/30 pl-3 leading-5">{suggestion.evidence}</blockquote></details>
                  <label className="flex cursor-pointer items-start gap-2 border-t border-border p-3 text-sm">
                    <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-primary" disabled={saving} checked={selected.includes(suggestion.id)} onChange={(e) => setSelected((ids) => e.target.checked ? [...ids, suggestion.id] : ids.filter((id) => id !== suggestion.id))} />
                    {t('This is accurate — include this change')}
                  </label>
                </article>)}
                <label className="flex flex-col gap-2 text-sm font-medium">{t('Resume name')}<input maxLength={200} disabled={saving} value={title} onChange={(e) => setTitle(e.target.value)} className="block w-full rounded-md border border-border bg-background p-2.5 font-normal" /></label>
              </>}
            </div>
          )}
          {stale && <p role="alert" className="mt-4 text-sm text-destructive">{t('Your resume changed. Close this window and analyze again to use the latest version.')}</p>}
          {error && <p role="alert" className="mt-4 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{t(error)}</p>}
        </div>
        {result && <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/20 p-4">
          <Button variant="outline" disabled={saving} onClick={() => { setResult(null); setSelected([]); setError(''); }}>{t('Edit job description')}</Button>
          <Button onClick={saveCopy} disabled={saving || stale || !selected.length || !title.trim()}>{saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}{saving ? t('Saving') : t('Save tailored copy ({count})', { count: selected.length })}</Button>
        </footer>}
      </DialogContent>
    </Dialog>
  );
}
