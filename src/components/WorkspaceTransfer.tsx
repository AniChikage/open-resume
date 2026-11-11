import { useEffect, useRef, useState } from 'react';
import { Download, FileUp, Loader2 } from 'lucide-react';
import type { EditorDocument, ResumeEntry, ResumeProfile } from '../types.ts';
import { createResume } from '../lib/storage.ts';
import { useTheme } from '../lib/theme.tsx';
import { createBackup, downloadFile, MAX_TRANSFER_BYTES, readBackup, resumeFromText, TransferError } from '../lib/resume-transfer.ts';
import { transferError, transferText } from '../lib/transfer-copy.ts';
import { Button } from './ui/button.tsx';
import { Input } from './ui/input.tsx';
import { Textarea } from './ui/textarea.tsx';
import { Field, FieldDescription, FieldGroup, FieldLabel } from './ui/field.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog.tsx';

export default function WorkspaceTransfer({ resumes, onImported }: { resumes: ResumeEntry[]; onImported: (entries: ResumeEntry[], openEditor: boolean) => void }) {
  const { lang } = useTheme();
  const copy = (key: Parameters<typeof transferText>[1]) => transferText(lang, key);
  const [open, setOpen] = useState(false);
  const [documents, setDocuments] = useState<EditorDocument[]>([]);
  const [source, setSource] = useState('');
  const [filename, setFilename] = useState('');
  const [kind, setKind] = useState<'pdf' | 'backup'>('pdf');
  const [busy, setBusy] = useState<'reading' | 'creating' | ''>('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [progress, setProgress] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  const changeOpen = (next: boolean) => {
    if (busy === 'creating') return;
    if (!next) controller.current?.abort();
    setOpen(next);
    if (!next) { setDocuments([]); setSource(''); setError(''); setNotice(''); setBusy(''); setProgress(''); }
  };
  const choose = async (file: File | undefined) => {
    if (!file) return;
    controller.current?.abort();
    const operation = new AbortController(); controller.current = operation;
    setBusy('reading'); setError(''); setNotice(''); setDocuments([]); setSource(''); setFilename(file.name); setProgress('');
    try {
      if (file.size > MAX_TRANSFER_BYTES) throw new TransferError('fileTooLarge');
      if (/\.pdf$/i.test(file.name) || file.type === 'application/pdf') {
        const { extractPdfText } = await import('../lib/pdf-import.ts');
        const text = await extractPdfText(file, (page, total) => setProgress(`${page} / ${total}`), operation.signal);
        if (operation.signal.aborted) return;
        setKind('pdf'); setSource(text); setDocuments([resumeFromText(text, file.name, lang)]);
      } else {
        const json = await file.text();
        if (operation.signal.aborted) return;
        setDocuments(readBackup(json)); setKind('backup');
      }
    } catch (failure) {
      if (!operation.signal.aborted) setError(transferError(lang, failure));
    } finally { if (!operation.signal.aborted) setBusy(''); }
  };
  const backup = () => {
    setError(''); setNotice('');
    try {
      if (!resumes.length) { setNotice(copy('empty')); return; }
      downloadFile(new Blob([createBackup(resumes)], { type: 'application/json;charset=utf-8' }), `resumes-${new Date().toISOString().slice(0, 10)}.json`);
    } catch (failure) { setError(transferError(lang, failure)); }
  };
  const update = (key: keyof ResumeProfile | 'title', value: string) => setDocuments((current) => current.map((document, index) => index ? document : { ...document, resume: key === 'title' ? { ...document.resume, title: value } : { ...document.resume, profile: { ...document.resume.profile, [key]: value } } }));
  const restore = async () => {
    if (busy || !documents.length) return;
    setBusy('creating'); setError(''); setNotice('');
    const created: ResumeEntry[] = [];
    let complete = false;
    try {
      const pending = kind === 'pdf' ? documents.map((document) => ({ ...document, resume: { ...document.resume, sections: resumeFromText(source, filename, lang).resume.sections } })) : documents;
      for (const document of pending) {
        const entry = await createResume(document.resume, document.settings);
        created.push(entry);
        setDocuments((current) => current.slice(1));
      }
      complete = true;
      setOpen(false); setDocuments([]); setSource(''); setNotice(copy('done'));
    } catch (failure) {
      setError(transferError(lang, failure));
      if (created.length) setNotice(copy('partial'));
    } finally {
      setBusy('');
      if (created.length) onImported(created, complete && created.length === 1);
    }
  };
  const draft = documents[0];
  return <>
    <Button variant="outline" onClick={() => { setError(''); setNotice(''); setOpen(true); }}><FileUp data-icon="inline-start" />{copy('import')}</Button>
    <Button variant="outline" onClick={backup}><Download data-icon="inline-start" />{copy('backup')}</Button>
    {!open && (error || notice) && <p role={error ? 'alert' : 'status'} className={`basis-full text-sm ${error ? 'text-destructive' : 'text-muted-foreground'}`}>{error || notice}</p>}
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl" closeLabel={copy('close')} showCloseButton={busy !== 'creating'}>
        <DialogHeader><DialogTitle>{copy('title')}</DialogTitle><DialogDescription>{copy('intro')}</DialogDescription></DialogHeader>
        <FieldGroup>
          <Field><FieldLabel htmlFor="resume-import-file">{copy('file')}</FieldLabel><Input id="resume-import-file" type="file" accept=".pdf,.json,application/pdf,application/json" disabled={!!busy} onChange={(event) => { void choose(event.target.files?.[0]); event.target.value = ''; }} /><FieldDescription>PDF / JSON · 25 MB · PDF ≤ 30 {lang.startsWith('zh') ? '页' : 'pages'}</FieldDescription></Field>
          {busy && <p role="status" className="flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin" />{copy(busy)} {progress && <span>{copy('progress')}: {progress}</span>}</p>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
          {draft && kind === 'pdf' && <>
            <p className="font-medium">{copy('review')}</p><p className="text-sm text-muted-foreground">{copy('pdfNote')}</p>
            <Field><FieldLabel htmlFor="import-title">{copy('resumeTitle')}</FieldLabel><Input id="import-title" value={draft.resume.title} maxLength={500} onChange={(event) => update('title', event.target.value)} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">{(['name', 'headline', 'email', 'phone'] as const).map((key) => <Field key={key}><FieldLabel htmlFor={`import-${key}`}>{copy(key)}</FieldLabel><Input id={`import-${key}`} value={draft.resume.profile[key]} maxLength={2000} onChange={(event) => update(key, event.target.value)} /></Field>)}</div>
            <Field><FieldLabel htmlFor="import-source">{copy('source')}</FieldLabel><Textarea id="import-source" value={source} className="min-h-40 max-h-64 text-xs" maxLength={200_000} onChange={(event) => setSource(event.target.value)} /><Button variant="outline" size="sm" onClick={() => { try { const next = resumeFromText(source, filename, lang); setDocuments([{ ...next, resume: { ...next.resume, title: draft.resume.title, profile: draft.resume.profile } }]); setError(''); } catch (failure) { setError(transferError(lang, failure)); } }}>{copy('reparse')}</Button></Field>
            <div className="rounded-lg border border-border p-3 text-sm"><p className="font-medium">{copy('sections')}</p><ul className="mt-2 flex flex-wrap gap-2">{draft.resume.sections.map((section) => <li key={section.id} className="rounded bg-muted px-2 py-1 text-xs">{section.label}</li>)}</ul></div>
          </>}
          {documents.length > 0 && kind === 'backup' && <div className="flex flex-col gap-3"><p className="font-medium">{copy('copies')} ({documents.length})</p><p className="text-sm text-muted-foreground">{copy('safe')}</p><ul className="max-h-56 overflow-y-auto rounded-lg border border-border">{documents.map((document, index) => <li key={index} className="border-b border-border px-3 py-2 text-sm last:border-b-0"><p className="font-medium">{document.resume.title}</p><p className="text-xs text-muted-foreground">{document.resume.profile.name} · {document.resume.sections.length} {copy('sections')}</p></li>)}</ul></div>}
        </FieldGroup>
        <DialogFooter><Button variant="outline" disabled={busy === 'creating'} onClick={() => changeOpen(false)}>{copy('cancel')}</Button><Button disabled={!documents.length || !!busy} onClick={restore}>{busy === 'creating' && <Loader2 data-icon="inline-start" className="animate-spin" />}{copy(kind === 'pdf' ? 'create' : 'restore')}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
