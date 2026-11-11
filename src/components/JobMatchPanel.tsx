import { ArrowRight, CheckCircle2, CircleDashed, Plus, RotateCcw, Sparkles, Target, X } from 'lucide-react';
import { Field } from '@base-ui/react/field';
import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { Resume } from '../types.ts';
import { useAuth } from '../lib/auth.tsx';
import {
  JOB_DESCRIPTION_MAX_LENGTH, JOB_KEYWORD_MAX_LENGTH, JOB_MANUAL_KEYWORD_LIMIT,
  matchJobDescription, normalizeManualKeywords, readJobMatchContext, writeJobMatchContext,
} from '../lib/job-match.ts';
import type { JobMatchContext } from '../lib/job-match.ts';
import { useTheme } from '../lib/theme.tsx';
import { Badge } from './ui/badge.tsx';
import { Button } from './ui/button.tsx';
import { Input } from './ui/input.tsx';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from './ui/sheet.tsx';

export interface JobMatchPanelProps {
  resumeId: string;
  resume: Resume;
  onClose: () => void;
  onLocate: (id: string) => void;
  onTailor: (context: { company: string; jobTitle: string; jobDescription: string }) => void;
}

export default function JobMatchPanel({ resumeId, resume, onClose, onLocate, onTailor }: JobMatchPanelProps) {
  const { t } = useTheme();
  const descriptionId = useId();
  const locating = useRef(false);
  const { user } = useAuth();
  const username = user?.username ?? '';
  const [context, setContext] = useState(() => readJobMatchContext(resumeId, username));
  const [manualInput, setManualInput] = useState('');
  const [manualError, setManualError] = useState('');
  const [persisted, setPersisted] = useState(true);
  const deferredDescription = useDeferredValue(context.jobDescription);
  const result = useMemo(() => matchJobDescription(resume, deferredDescription, context), [resume, deferredDescription, context.manualKeywords, context.ignoredKeywords]);
  const checking = deferredDescription !== context.jobDescription;

  useEffect(() => { setPersisted(writeJobMatchContext(resumeId, username, context)); }, [resumeId, username, context]);

  function update<K extends keyof JobMatchContext>(field: K, value: JobMatchContext[K]) {
    setContext(current => ({ ...current, [field]: value }));
  }
  function addManual(event: React.FormEvent) {
    event.preventDefault();
    const additions = normalizeManualKeywords([manualInput]);
    if (!additions.length || context.manualKeywords.length >= JOB_MANUAL_KEYWORD_LIMIT) {
      setManualError(t('Add a specific skill or phrase, up to 64 characters. You can add 20 keywords.'));
      return;
    }
    update('manualKeywords', normalizeManualKeywords([...context.manualKeywords, ...additions]));
    setManualInput(''); setManualError('');
  }
  function ignore(id: string) {
    update('ignoredKeywords', [...new Set([...context.ignoredKeywords, id])]);
  }
  function removeManual(label: string) {
    update('manualKeywords', context.manualKeywords.filter(keyword => keyword !== label));
  }
  function locate(id: string) {
    locating.current = true; onClose(); onLocate(id);
  }
  const matched = result.keywords.filter(keyword => keyword.evidence);
  const missing = result.keywords.filter(keyword => !keyword.evidence);

  return (
    <Sheet open onOpenChange={open => { if (!open) onClose(); }}>
      <SheetContent side="right" finalFocus={() => !locating.current} closeLabel={t('Close')} className="w-full gap-0 data-[side=right]:sm:max-w-xl data-[side=right]:w-full">
        <SheetHeader className="shrink-0 border-b border-border p-5 pr-12">
          <SheetTitle className="flex items-center gap-2"><Target className="size-5 text-primary" />{t('Job matching')}</SheetTitle>
          <SheetDescription>{t('Compare a job posting with the evidence in your visible resume. No API key needed.')}</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5">
          <fieldset className="flex min-w-0 flex-col gap-3">
            <legend className="sr-only">{t('Target job')}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field.Root className="flex flex-col gap-1.5">
                <Field.Label>{t('Company (optional)')}</Field.Label>
                <Input value={context.company} maxLength={200} onChange={event => update('company', event.target.value)} autoComplete="organization" />
              </Field.Root>
              <Field.Root className="flex flex-col gap-1.5">
                <Field.Label>{t('Job title (optional)')}</Field.Label>
                <Input value={context.jobTitle} maxLength={200} onChange={event => update('jobTitle', event.target.value)} autoComplete="organization-title" />
              </Field.Root>
            </div>
            <Field.Root className="flex flex-col gap-1.5">
              <Field.Label htmlFor={descriptionId}>{t('Job description')}</Field.Label>
              <textarea id={descriptionId} aria-label={t('Job description')} value={context.jobDescription} maxLength={JOB_DESCRIPTION_MAX_LENGTH} rows={7}
                onChange={event => update('jobDescription', event.target.value)}
                placeholder={t('Paste the responsibilities and requirements from the job posting…')}
                className="min-h-32 w-full resize-y rounded-lg border border-input bg-background p-3 leading-6 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50" />
              <span className="text-right text-xs text-muted-foreground">{context.jobDescription.length.toLocaleString()} / {JOB_DESCRIPTION_MAX_LENGTH.toLocaleString()}</span>
            </Field.Root>
          </fieldset>
          <p role="status" className="text-xs leading-5 text-muted-foreground">{t(persisted ? 'Saved in this browser for this resume. Matching runs on this device.' : 'Browser storage is unavailable. You can still compare during this visit.')}</p>
          <section aria-busy={checking} className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">{t('Keyword coverage')}</h3>
              <strong className="text-2xl tabular-nums">{result.coverage === null ? '—' : `${result.coverage}%`}</strong>
            </div>
            <p aria-live="polite" className="text-sm text-muted-foreground">{result.total ? t('{matched} of {total} selected keywords appear in your resume.', { matched: result.matchedCount, total: result.total }) : t('Paste a posting or add keywords to start comparing.')}</p>
            <p className="text-xs leading-5 text-muted-foreground">{t('This is keyword coverage, not an ATS score or a hiring prediction. Add only skills you actually have.')}</p>
          </section>
          {!result.total && context.jobDescription.trim() ? <p className="text-sm leading-6 text-muted-foreground">{t('No supported skill keywords were found. Add the specific skills or phrases that matter for this role.')}</p> : null}
          {([
            { label: 'Missing keywords', keywords: missing, icon: CircleDashed },
            { label: 'Matched keywords', keywords: matched, icon: CheckCircle2 },
          ]).map(({ label, keywords, icon: Icon }) => keywords.length ? (
            <section key={label} className="flex flex-col gap-2">
              <h3 className="flex items-center gap-2 font-semibold"><Icon className="size-4" />{t(label)} <Badge variant="secondary">{keywords.length}</Badge></h3>
              {keywords.map(keyword => (
                <article key={keyword.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <strong>{keyword.label}</strong>
                    <Button size="xs" variant="ghost" onClick={() => ignore(keyword.id)} aria-label={t('Ignore {keyword}', { keyword: keyword.label })}>{t('Ignore')}</Button>
                  </div>
                  {keyword.jobExcerpt ? <div className="text-xs leading-5"><span className="text-muted-foreground">{t('In the posting')}</span><p className="mt-1 break-words">“{keyword.jobExcerpt}”</p></div> : <p className="text-xs text-muted-foreground">{t('Manually selected requirement')}</p>}
                  {keyword.evidence ? <div className="text-xs leading-5"><span className="text-muted-foreground">{t('In your resume')}</span><p className="mt-1 break-words">“{keyword.evidence.text}”</p><Button size="xs" variant="outline" className="mt-2" onClick={() => locate(keyword.evidence!.targetId)}>{t('Go to evidence')}<ArrowRight data-icon="inline-end" /></Button></div> : <Button size="xs" variant="outline" className="self-start" onClick={() => { const target = resume.sections.find(section => section.visible && section.type === 'skills') ?? resume.sections.find(section => section.visible); locate(target ? `section:${target.id}` : 'profile'); }}>{t('Review resume')}<ArrowRight data-icon="inline-end" /></Button>}
                </article>
              ))}
            </section>
          ) : null)}
          <section className="flex flex-col gap-3">
            <h3 className="font-semibold">{t('Add keywords')}</h3>
            <form onSubmit={addManual} className="flex flex-col gap-2">
              <Field.Root className="flex flex-col gap-1.5" data-invalid={Boolean(manualError) || undefined}>
                <Field.Label className="text-xs text-muted-foreground">{t('Specific skill or phrase')}</Field.Label>
                <Input value={manualInput} maxLength={JOB_KEYWORD_MAX_LENGTH} onChange={event => { setManualInput(event.target.value); setManualError(''); }} aria-invalid={Boolean(manualError)} />
              </Field.Root>
              <Button type="submit" variant="outline" className="self-start" disabled={!manualInput.trim() || context.manualKeywords.length >= JOB_MANUAL_KEYWORD_LIMIT}><Plus data-icon="inline-start" />{t('Add keyword')}</Button>
              {manualError ? <p role="alert" className="text-xs text-destructive">{manualError}</p> : null}
            </form>
            {context.manualKeywords.length ? <ul className="flex flex-wrap gap-2">{context.manualKeywords.map(keyword => <li key={keyword}><Button size="xs" variant="secondary" onClick={() => removeManual(keyword)} aria-label={t('Remove {keyword}', { keyword })}>{keyword}<X data-icon="inline-end" /></Button></li>)}</ul> : null}
            {result.ignored.length ? <div className="flex flex-col gap-2"><p className="text-xs text-muted-foreground">{t('Ignored keywords are excluded from coverage.')}</p><div className="flex flex-wrap gap-2">{result.ignored.map(keyword => <Button size="xs" variant="outline" key={keyword.id} onClick={() => update('ignoredKeywords', context.ignoredKeywords.filter(id => id !== keyword.id))} aria-label={t('Restore {keyword}', { keyword: keyword.label })}><RotateCcw data-icon="inline-start" />{keyword.label}</Button>)}</div></div> : null}
          </section>
        </div>
        <SheetFooter className="shrink-0 border-t border-border">
          <Button disabled={context.jobDescription.trim().length < 80} onClick={() => { locating.current = true; onClose(); onTailor({ company: context.company, jobTitle: context.jobTitle, jobDescription: context.jobDescription }); }}><Sparkles data-icon="inline-start" />{t('Continue with AI tailoring')}</Button>
          <p className="text-xs text-muted-foreground">{t('AI tailoring asks for consent before sending content to your configured provider.')}</p>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
