import { Eye, Loader2, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, PDFWorker, RenderTask } from 'pdfjs-dist';
import type { PdfSnapshot } from '../lib/pdf-snapshot.ts';
import { workspaceText } from '../lib/editor-workspace-copy.ts';
import { useTheme } from '../lib/theme.tsx';
import { cn } from '../lib/utils.ts';
import { Button } from './ui/button.tsx';

export default function PdfResumePreview({ snapshot, pending, error, onRetry, activeItemId, onLocate, className }: { snapshot: PdfSnapshot | null; pending: boolean; error: boolean; onRetry: () => void; activeItemId: string | null; onLocate: (id: string) => void; className?: string }) {
  const { lang, t } = useTheme();
  const [rendered, setRendered] = useState<{ pdf: PDFDocumentProxy; snapshot: PdfSnapshot; revision: number; release: () => void } | null>(null);
  const sequence = useRef(0);
  const sharedWorker = useRef<PDFWorker | null>(null);
  useEffect(() => () => {
    const worker = sharedWorker.current;
    sharedWorker.current = null;
    queueMicrotask(() => worker?.destroy());
  }, []);
  const [painted, setPainted] = useState({ revision: 0, count: 0 });
  const pdf = rendered?.pdf || null;
  const shown = rendered?.snapshot || null;
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [renderError, setRenderError] = useState(false);
  const [width, setWidth] = useState(600);
  const [height, setHeight] = useState(800);
  const [zoom, setZoom] = useState(1);
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = stage.current;
    if (!node) return;
    const observer = new ResizeObserver(() => {
      setWidth(Math.max(160, node.clientWidth - 40));
      setHeight(Math.max(240, node.clientHeight - 40));
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!snapshot) return;
    let cancelled = false;
    let published = false;
    let task: ReturnType<typeof import('pdfjs-dist')['getDocument']> | undefined;
    setRenderError(false);
    void Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]).then(async ([pdfjs, worker]) => {
      if (cancelled) return;
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      // PDF.js transfers its buffer to the worker. Keep the download buffer intact.
      // A document changes on every edit; the worker runtime does not.
      sharedWorker.current ||= new pdfjs.PDFWorker();
      task = pdfjs.getDocument({ data: snapshot.bytes.slice(), worker: sharedWorker.current });
      const loaded = await task.promise;
      if (cancelled) return;
      if (loaded.numPages !== snapshot.cuts.length - 1) throw new Error('PDF_PAGE_COUNT_MISMATCH');
      const revision = ++sequence.current;
      published = true;
      setPainted({ revision, count: 0 });
      setRendered({ pdf: loaded, snapshot, revision, release: () => { void task?.destroy().catch(() => {}); } });
    }).catch(() => {
      if (!cancelled) {
        setRenderError(true);
        sharedWorker.current?.destroy();
        sharedWorker.current = null;
      }
      if (!published) void task?.destroy().catch(() => {});
    });
    return () => { cancelled = true; if (!published) void task?.destroy().catch(() => {}); };
  }, [snapshot, loadAttempt]);
  useEffect(() => () => { rendered?.release(); }, [rendered]);
  const scale = shown ? Math.min(1.1, width / shown.width, height / shown.height) * zoom : 0.7;
  const count = pdf?.numPages || Math.max(0, (snapshot?.cuts.length || 1) - 1);
  const painting = !rendered || painted.revision !== rendered.revision || painted.count < count;
  const failed = error || renderError;
  return <section className={cn('pdf-preview-surface min-h-0 min-w-0 flex-col bg-muted/55', className)} aria-label={workspaceText(lang, 'pdfPreview')} aria-busy={pending}>
    <header className="flex min-h-12 shrink-0 items-center justify-between gap-2 border-b border-border bg-card px-3">
      <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground"><Eye size={14} className="shrink-0 text-primary" /><span>{workspaceText(lang, 'pdfPreview')}{snapshot ? ` · ${snapshot.paper}` : ''}</span>{count > 0 && <span className="whitespace-nowrap">· {workspaceText(lang, 'pages', { count })}</span>}</span>
      <div className="flex shrink-0 items-center gap-1">{[{ icon: ZoomOut, label: 'Zoom out', action: () => setZoom(value => Math.max(0.5, value - 0.1)) }, { icon: Maximize2, label: 'Fit to screen', action: () => setZoom(1) }, { icon: ZoomIn, label: 'Zoom in', action: () => setZoom(value => Math.min(1.6, value + 0.1)) }].map(control => <button key={control.label} className="grid h-10 w-10 place-items-center rounded-md hover:bg-muted focus-visible:outline-2 focus-visible:outline-primary" title={t(control.label)} aria-label={t(control.label)} onClick={control.action}><control.icon size={15} /></button>)}</div>
    </header>
    <div className="border-b border-border bg-card/70 px-4 py-2 text-xs leading-5 text-muted-foreground" role={failed ? 'alert' : 'status'}>
      {failed ? <span>{workspaceText(lang, 'previewError')} <Button variant="outline" size="sm" className="ml-2 text-xs" onClick={() => { setLoadAttempt(value => value + 1); onRetry(); }}>{workspaceText(lang, 'retry')}</Button></span> : pending || !pdf || shown !== snapshot || painting ? <span className="inline-flex items-center gap-2"><Loader2 size={13} className="animate-spin" />{workspaceText(lang, snapshot ? 'updating' : 'preparing')}</span> : workspaceText(lang, 'current')}
    </div>
    {count > 1 && !pending && <p className="border-b border-border bg-card/70 px-4 py-2 text-xs leading-5 text-muted-foreground">{workspaceText(lang, 'multiple', { count })}</p>}
    <div ref={stage} className="min-h-0 flex-1 overflow-auto p-5">
      {shown && pdf && rendered && <div className="resume-pages mx-auto" data-pdf-fingerprint={pdf.fingerprints[0]}>{Array.from({ length: pdf.numPages }, (_, index) => <PdfPage key={`${rendered.revision}-${index}`} pdf={pdf} index={index} snapshot={shown} scale={scale} activeItemId={activeItemId} onLocate={onLocate} onError={() => setRenderError(true)} onReady={() => setPainted(current => current.revision === rendered.revision ? { revision: current.revision, count: current.count + 1 } : current)} />)}</div>}
      {!pdf && !failed && <div className="mx-auto flex min-h-80 max-w-lg items-center justify-center rounded border border-border bg-card"><Loader2 className="animate-spin text-muted-foreground" /></div>}
    </div>
  </section>;
}

function PdfPage({ pdf, index, snapshot, scale, activeItemId, onLocate, onError, onReady }: { pdf: PDFDocumentProxy; index: number; snapshot: PdfSnapshot; scale: number; activeItemId: string | null; onLocate: (id: string) => void; onError: () => void; onReady: () => void }) {
  const { t } = useTheme();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let task: RenderTask | undefined;
    setReady(false);
    void pdf.getPage(index + 1).then(async page => {
      if (cancelled || !canvas.current) return;
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: snapshot.width / base.width * Math.max(2, Math.min(3, window.devicePixelRatio || 1)) });
      canvas.current.width = Math.ceil(viewport.width);
      canvas.current.height = Math.ceil(viewport.height);
      task = page.render({ canvas: canvas.current, viewport });
      await task.promise;
      if (!cancelled) { setReady(true); onReady(); }
    }).catch(failure => { if (!cancelled && failure?.name !== 'RenderingCancelledException') onError(); });
    return () => { cancelled = true; task?.cancel(); };
  }, [pdf, index, snapshot.width]);
  const top = snapshot.cuts[index];
  const bottom = snapshot.cuts[index + 1];
  return <div className="resume-page-shell" data-pdf-page={index + 1} data-rendered={ready} style={{ width: snapshot.width * scale, height: snapshot.height * scale }}>
    <canvas ref={canvas} className="block h-full w-full" aria-label={`${t('Resume preview')} ${index + 1}`} />
    {snapshot.targets.filter(target => target.top < bottom && target.top + target.height > top).map((target, i) => {
      const start = Math.max(top, target.top);
      const end = Math.min(bottom, target.top + target.height);
      return <button key={`${target.id}-${i}`} type="button" data-pdf-target={target.id} aria-label={`${t('Edit this section')}: ${target.label}`} onClick={() => onLocate(target.id)} className={cn('absolute rounded-sm border border-transparent bg-transparent text-transparent hover:border-primary/60 hover:bg-primary/5 focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary', target.id === activeItemId && 'border-primary/40')} style={{ left: target.left * scale, top: (start - top + snapshot.insets[index]) * scale, width: target.width * scale, height: (end - start) * scale }} />;
    })}
  </div>;
}
