import { useEffect, useMemo, useRef, useState } from 'react';
import type { EditorDocument } from '../types.ts';
import { readResumeFile } from '../lib/import-file.ts';
import { parseResumeText } from '../lib/resume-import.ts';
import { createResume } from '../lib/storage.ts';
import { useTheme } from '../lib/theme.tsx';
import { Button } from './ui/button.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog.tsx';
import { Input } from './ui/input.tsx';

const errors: Record<string, string> = {
  IMPORT_FILE_TOO_LARGE: 'Choose a resume file smaller than 10 MB.',
  BACKUP_TOO_LARGE: 'Choose a resume file smaller than 10 MB.',
  IMPORT_TEXT_TOO_LARGE: 'The extracted text is too long. Use a resume with fewer than 100,000 characters.',
  IMPORT_EMPTY: 'No readable text was found. Paste your resume text or choose another file.',
  IMPORT_PDF_NO_TEXT: 'This PDF has no selectable text. For a scanned resume, use OCR first or paste its text.',
  IMPORT_PDF_PASSWORD: 'This PDF is password protected. Upload an unlocked copy or paste its text.',
  IMPORT_PDF_TOO_MANY_PAGES: 'Choose a PDF with 30 pages or fewer.',
  IMPORT_INVALID_PDF: 'This PDF could not be read. Try a different PDF or paste its text.',
  IMPORT_DOCX_TOO_LARGE: 'This Word document is too complex to import. Save a smaller copy or paste its text.',
  IMPORT_INVALID_DOCX: 'This Word document could not be read. Choose a DOCX file or paste its text.',
  IMPORT_UNSUPPORTED_FILE: 'Choose a PDF, DOCX, TXT, Markdown or Open Resume JSON file.',
  INVALID_BACKUP: 'This file is not a supported resume backup. Choose a JSON file exported by Open Resume.',
  UNSUPPORTED_BACKUP: 'This file is not a supported resume backup. Choose a JSON file exported by Open Resume.',
};

interface ReviewFields { title: string; name: string; headline: string; email: string; phone: string }
const textareaClassName = 'min-h-36 w-full resize-y rounded-lg border border-input bg-transparent px-3 py-2 text-sm leading-6 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50';

export function ImportResumeDialog({ onClose, onImported }: { onClose: () => void; onImported: (id: string) => void }) {
  const { t, lang } = useTheme();
  const [document, setDocument] = useState<EditorDocument | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [sourceText, setSourceText] = useState<string | null>(null);
  const [review, setReview] = useState<ReviewFields | null>(null);
  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const attempt = useRef(0);
  const saving = useRef(false);
  const extraction = useRef<AbortController | null>(null);
  const manualFields = useRef(new Set<keyof ReviewFields>());
  useEffect(() => () => { attempt.current++; extraction.current?.abort(); }, []);
  const parsedReview = useMemo(() => {
    if (sourceText === null) return null;
    try { return parseResumeText(sourceText, { language: lang }); } catch { return null; }
  }, [sourceText, lang]);

  function prepareText(text: string, title = t('Imported resume')) {
    const next = parseResumeText(text, { title, language: lang });
    manualFields.current.clear();
    setDocument(next); setSourceText(text);
    setReview({ title: next.resume.title, name: next.resume.profile.name, headline: next.resume.profile.headline, email: next.resume.profile.email, phone: next.resume.profile.phone });
  }
  async function select(file: File | undefined) {
    const current = ++attempt.current;
    extraction.current?.abort();
    const controller = new AbortController();
    extraction.current = controller;
    setDocument(null); setReview(null); setSourceText(null); setError(''); setReading(false);
    if (!file) return;
    setReading(true);
    try {
      const next = await readResumeFile(file, { signal: controller.signal });
      if (current !== attempt.current) return;
      if (next.kind === 'backup') setDocument(next.document);
      else prepareText(next.text, next.title);
    } catch (error) {
      if (current === attempt.current && !controller.signal.aborted) setError(t(errors[error instanceof Error ? error.message : ''] || 'Could not read this resume. Try another file or paste its text.'));
    } finally { if (current === attempt.current) setReading(false); }
  }
  function reviewPaste() {
    setError('');
    try { prepareText(pasteText); }
    catch (error) { setError(t(errors[error instanceof Error ? error.message : ''] || 'Could not read this resume. Try another file or paste its text.')); }
  }
  async function restore() {
    if (!document || reading || saving.current) return;
    let next = document;
    if (sourceText !== null && review) {
      if (!review.title.trim() || review.title.trim().length > 1000) { setError(t('Enter a resume name between 1 and 1000 characters.')); return; }
      try {
        next = parseResumeText(sourceText, { title: review.title, language: lang });
        next.resume.profile = { ...next.resume.profile, name: review.name.trim(), headline: review.headline.trim(), email: review.email.trim(), phone: review.phone.trim() };
      } catch (error) { setError(t(errors[error instanceof Error ? error.message : ''] || 'Could not read this resume. Try another file or paste its text.')); return; }
    }
    saving.current = true; setBusy(true); setError('');
    try {
      const entry = await createResume(next.resume, next.settings);
      onImported(entry.id);
    } catch { setError(t('Could not import the resume. Please try again.')); }
    finally { saving.current = false; setBusy(false); }
  }
  const updateReview = (field: keyof ReviewFields, value: string) => { manualFields.current.add(field); setReview(current => current ? { ...current, [field]: value } : current); setError(''); };
  function updateSource(value: string) {
    setSourceText(value); setError('');
    try {
      const next = parseResumeText(value, { language: lang });
      setReview(current => current ? {
        ...current,
        ...Object.fromEntries((['name', 'headline', 'email', 'phone'] as const).filter(field => !manualFields.current.has(field)).map(field => [field, next.resume.profile[field]])),
      } : current);
    } catch { /* The editable source stays available while invalid. */ }
  }
  const sections = sourceText === null ? document?.resume.sections : parsedReview?.resume.sections;
  const fieldCount = review ? [review.name, review.headline, review.email, review.phone].filter(value => value.trim()).length : 0;
  return <Dialog open onOpenChange={open => { if (!open && !saving.current) onClose(); }}>
    <DialogContent closeLabel={t('Close')} showCloseButton={!busy} className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{t('Import resume')}</DialogTitle>
        <DialogDescription>{t('Import an existing resume or restore a JSON backup as a new copy.')}</DialogDescription>
      </DialogHeader>
      <p className="text-xs leading-5 text-muted-foreground">{t('Files are read on this device. Nothing is uploaded until you import the reviewed resume into your workspace.')}</p>
      {!document ? <fieldset className="flex min-w-0 flex-col gap-4" disabled={busy}>
        <legend className="sr-only">{t('Resume source')}</legend>
        <label className="flex flex-col gap-2 text-sm font-medium">{t('Resume file')}
          <Input type="file" accept=".json,.txt,.md,.markdown,.pdf,.docx,application/json,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown" onChange={event => { void select(event.target.files?.[0]); }} />
          <span className="text-xs font-normal text-muted-foreground">{t('PDF, DOCX, TXT, Markdown or JSON · up to 10 MB')}</span>
        </label>
        <label htmlFor="resume-import-paste" className="flex flex-col gap-2 text-sm font-medium">{t('Paste resume text')}
          <textarea id="resume-import-paste" value={pasteText} className={textareaClassName} placeholder={t('Paste the text of your existing resume here…')} disabled={reading} onChange={event => { setPasteText(event.target.value); setError(''); }} />
        </label>
        <Button variant="outline" disabled={reading || !pasteText.trim()} onClick={reviewPaste}>{t('Review imported content')}</Button>
      </fieldset> : sourceText !== null && review ? <fieldset className="flex min-w-0 flex-col gap-4" disabled={busy}>
        <legend className="mb-3 font-medium">{t('Review before importing')}</legend>
        <p role="status" className="text-sm text-muted-foreground">{t('{fields} profile fields and {sections} sections detected', { fields: fieldCount, sections: sections?.length || 0 })}</p>
        <p className="text-xs leading-5 text-muted-foreground">{t('Check the detected fields and edit the source text below. Original layout, photos and dates may need adjustment in the editor.')}</p>
        <label className="flex flex-col gap-2 text-sm font-medium" htmlFor="import-title">{t('Resume name')}<Input id="import-title" value={review.title} maxLength={1000} onChange={event => updateReview('title', event.target.value)} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          {(['name', 'headline', 'email', 'phone'] as const).map(field => <label key={field} className="flex min-w-0 flex-col gap-2 text-sm font-medium" htmlFor={`import-${field}`}>
            {t({ name: 'Name', headline: 'Target role', email: 'Email', phone: 'Phone' }[field])}
            <Input id={`import-${field}`} value={review[field]} onChange={event => updateReview(field, event.target.value)} />
          </label>)}
        </div>
        <label className="flex flex-col gap-2 text-sm font-medium" htmlFor="resume-import-content">{t('Imported content')}
          <textarea id="resume-import-content" value={sourceText} className={textareaClassName} onChange={event => updateSource(event.target.value)} />
        </label>
        {sections?.length ? <p className="text-xs text-muted-foreground">{t('Detected sections')}: {sections.map(section => section.label).join(' · ')}</p> : null}
        {!parsedReview && <p role="alert" className="text-sm text-destructive">{t(sourceText.length > 100_000 ? errors.IMPORT_TEXT_TOO_LARGE : errors.IMPORT_EMPTY)}</p>}
      </fieldset> : <div className="flex flex-col gap-1 rounded-md border border-border p-3 text-sm">
        <strong className="break-words">{document.resume.title || t('Untitled resume')}</strong>
        <span className="text-muted-foreground">{document.resume.profile.name}</span>
        <span className="text-muted-foreground">{t('{count} sections', { count: document.resume.sections.length })}</span>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{t('Restore content and appearance as a new resume. Existing resumes stay unchanged.')}</p>
      </div>}
      {reading && <p role="status" className="text-sm text-muted-foreground">{t('Reading resume…')}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter>
        <Button variant="outline" disabled={busy} onClick={onClose}>{t('Cancel')}</Button>
        {document && <Button variant="outline" disabled={busy} onClick={() => { setDocument(null); setReview(null); setSourceText(null); setError(''); }}>{t('Choose another source')}</Button>}
        <Button disabled={busy || reading || !document || sourceText !== null && (!parsedReview || !review?.title.trim())} onClick={restore}>{t(busy ? 'Importing…' : 'Import as a new resume')}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
