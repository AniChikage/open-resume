import { Copy,EyeOff,FileText,Upload,LayoutTemplate,Loader2,Pencil,Plus,RotateCcw,Search,Trash2 } from 'lucide-react';
import { useEffect,useRef,useState } from 'react';
import { ImportResumeDialog } from '../components/ImportResumeDialog.tsx';
import { removeDraft } from '../lib/drafts.ts';
import { SiteFooter,SiteHeader } from '../components/SiteChrome.tsx';
import { Button } from '../components/ui/button.tsx';
import { Card,CardContent,CardFooter } from '../components/ui/card.tsx';
import {
Dialog,
DialogContent,
DialogDescription,
DialogFooter,
DialogHeader,
DialogTitle,
} from '../components/ui/dialog.tsx';
import { Skeleton } from '../components/ui/skeleton.tsx';
import { Input } from '../components/ui/input.tsx';
import { NativeSelect,NativeSelectOption } from '../components/ui/native-select.tsx';
import { buildBlankResume,DEFAULT_SETTINGS } from "../data.ts";
import { useAuth } from '../lib/auth.tsx';
import { openText } from '../lib/open-copy.ts';
import { navigate } from '../lib/router.ts';
import { createResume,deleteResume,duplicateResume,listResumes,renameResume } from '../lib/storage.ts';
import { renameDashboardDraft,selectDashboardResumes } from '../lib/dashboard.ts';
import type { ResumeSort } from '../lib/dashboard.ts';
import { useTheme } from '../lib/theme.tsx';
import type { EditorDocument,ResumeEntry,Translate,WorkspaceUser } from '../types.ts';
import { ResumePreview } from '../components/ResumePreview.tsx';

const A4_PREVIEW_WIDTH = 794;
const A4_PREVIEW_HEIGHT = 1123;
const HIDDEN_RESUMES_STORAGE_PREFIX = 'openresume_hidden_resumes';

function formatDateTime(timestamp: number, lang: string, t: Translate) {
  if (!timestamp) return t('Not saved yet');
  return new Date(timestamp).toLocaleDateString(lang, { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function getStorageKey(user: WorkspaceUser | null) {
  return `${HIDDEN_RESUMES_STORAGE_PREFIX}:${user?.id || 'anonymous'}`;
}

function readHiddenIds(user: WorkspaceUser | null) {
  if (typeof window === 'undefined' || !user) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(getStorageKey(user)) || '[]');
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function writeHiddenIds(user: WorkspaceUser | null, ids: string[]) {
  try { if (typeof window !== 'undefined' && user) window.localStorage.setItem(getStorageKey(user), JSON.stringify(ids)); } catch { /* Hidden state still works for this visit. */ }
}

function ResumeThumb({ resume, settings }: EditorDocument) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [scale, setScale] = useState(0.25);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '160px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    const node = ref.current;
    if (!node) return undefined;
    const update = () => {
      const { width, height } = node.getBoundingClientRect();
      if (width && height) setScale(Math.min(width / A4_PREVIEW_WIDTH, height / A4_PREVIEW_HEIGHT));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden bg-white">
      {visible ? (
        <div style={{ width: A4_PREVIEW_WIDTH, height: A4_PREVIEW_HEIGHT, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <ResumePreview resume={resume || { profile: {}, sections: [] }} settings={settings || DEFAULT_SETTINGS} paperStyle={{ width: A4_PREVIEW_WIDTH, minHeight: A4_PREVIEW_HEIGHT, boxShadow: 'none', borderRadius: 0 }} />
        </div>
      ) : <Skeleton className="absolute inset-0 rounded-none" />}
    </div>
  );
}

function ResumeCard({ entry, onOpen, onHide, onDelete, onDuplicate, onRename, busy }: {entry:ResumeEntry;onOpen:()=>void;onHide:()=>void;onDelete:()=>void;onDuplicate:()=>void;onRename:()=>void;busy:boolean}) {
  const { lang, t } = useTheme();
  return (
    <Card className="group overflow-hidden rounded-md shadow-none transition hover:border-primary/45">
      <CardContent className="p-0">
        <button type="button" className="relative block aspect-[210/297] w-full overflow-hidden bg-white text-left" onClick={onOpen} aria-label={t('Edit {name}', { name: entry.title || t('Untitled resume') })}>
          <ResumeThumb resume={entry.resume} settings={entry.settings} />
          <span className="absolute inset-x-0 bottom-0 translate-y-full border-t border-border bg-white/96 py-3 text-center text-sm font-medium text-primary transition-transform group-hover:translate-y-0 group-focus-within:translate-y-0">{t('Continue editing')}</span>
        </button>
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2 border-t border-border p-3">
        <div className="min-w-0">
          <h3><Button type="button" variant="ghost" size="sm" className="h-auto max-w-full justify-start p-0" disabled={busy} onClick={onRename} aria-label={t('Rename {name}', { name: entry.title || t('Untitled resume') })} title={t('Rename resume')}><span className="truncate">{entry.title || t('Untitled resume')}</span><Pencil data-icon="inline-end" /></Button></h3>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">{formatDateTime(entry.updatedAt, lang, t)}</p>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" disabled={busy} onClick={onDuplicate} aria-label={t('Duplicate {name}', { name: entry.title || t('Untitled resume') })} title={t('Duplicate resume')}><Copy /></Button>
            <Button variant="ghost" size="icon-sm" onClick={onHide} aria-label={t('Hide {name}', { name: entry.title || t('Untitled resume') })}>
              <EyeOff />
            </Button>
            <Button variant="destructive" size="icon-sm" onClick={onDelete} aria-label={t('Delete {name}', { name: entry.title || t('Untitled resume') })}>
              <Trash2 />
            </Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

function LoadingDashboard() {
  return (
    <main className="min-h-screen bg-background">
      <SiteHeader current="dashboard" />
      <section className="site-shell mx-auto px-5 py-10 lg:px-8">
        <div className="flex items-center justify-between">
          <div><Skeleton className="h-10 w-52" /><Skeleton className="mt-3 h-4 w-72" /></div>
          <Skeleton className="h-9 w-28" />
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="aspect-[210/297] w-full" />)}
        </div>
      </section>
    </main>
  );
}

export default function Dashboard() {
  const { lang, t } = useTheme();
  const { user, loading: authLoading, login } = useAuth();
  const [resumes, setResumes] = useState<ResumeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hideTarget, setHideTarget] = useState<ResumeEntry|null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ResumeEntry|null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [actionError, setActionError] = useState('');
  const [creating, setCreating] = useState(false);
  const creatingRef = useRef(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<ResumeSort>('recent');
  const [renameTarget, setRenameTarget] = useState<ResumeEntry|null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [renameError, setRenameError] = useState('');
  const [renaming, setRenaming] = useState(false);
  const renamingRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    listResumes().then((items) => {
      if (!cancelled) setResumes(items);
    }).catch(() => {
      if (!cancelled) setLoadError(true);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [authLoading, user, loadAttempt]);

  useEffect(() => { setHiddenIds(readHiddenIds(user)); }, [user]);

  if (authLoading || loading) return <LoadingDashboard />;

  if (!user) {
    return (
      <main className="flex min-h-screen flex-col bg-background">
        <SiteHeader current="dashboard" />
        <section className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-5 py-20 text-center">
          <span className="grid size-12 place-items-center rounded-lg border border-border bg-card"><FileText className="size-5" /></span>
          <h1 className="mt-5 text-3xl font-bold tracking-tight">{t('Sign in to view your resumes')}</h1>
          <div className="mt-7 flex gap-3">
            <Button size="lg" onClick={login}>{t('Sign in / Register')}</Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/')}>{t('Back to home')}</Button>
          </div>
        </section>
        <SiteFooter />
      </main>
    );
  }

  const visibleResumes = selectDashboardResumes(resumes, { hiddenIds, locale: lang });
  const matchingResumes = selectDashboardResumes(visibleResumes, { query, sort, locale: lang });
  const hiddenCount = resumes.length - visibleResumes.length;

  const confirmRename = async () => {
    if (!renameTarget || renamingRef.current) return;
    const title = renameTitle.trim();
    if (!title || title.length > 1000) {
      setRenameError(t('Enter a resume name between 1 and 1000 characters.'));
      return;
    }
    if (title === renameTarget.title) { setRenameTarget(null); return; }
    renamingRef.current = true; setRenaming(true); setRenameError('');
    try {
      await renameResume(renameTarget.id, title);
      renameDashboardDraft(renameTarget.id, user.username, title);
      setResumes(current => current.map(entry => entry.id === renameTarget.id ? {
        ...entry, title, updatedAt: Date.now(), resume: { ...entry.resume, title },
        settings: { ...entry.settings, titleMode: 'custom', titleKind: 'custom' },
      } : entry));
      setRenameTarget(null);
    } catch { setRenameError(t('Could not rename the resume. Please try again.')); }
    finally { renamingRef.current = false; setRenaming(false); }
  };

  const createDocument = async (source?: ResumeEntry) => {
    if (creatingRef.current) return;
    creatingRef.current = true; setCreating(true); setActionError('');
    try {
      const entry = source
        ? await duplicateResume(source.id, t('{name} (copy)', { name: source.title }))
        : await createResume(buildBlankResume(lang), DEFAULT_SETTINGS);
      if (!entry) throw new Error('NOT_FOUND');
      navigate(`/editor/${entry.id}`);
    } catch { setActionError(t('Could not create the resume. Please try again.')); }
    finally { creatingRef.current = false; setCreating(false); }
  };
  const createBlank = () => { void createDocument(); };

  const confirmHide = () => {
    if (!hideTarget) return;
    const next = hiddenIds.includes(hideTarget.id) ? hiddenIds : [...hiddenIds, hideTarget.id];
    setHiddenIds(next);
    writeHiddenIds(user, next);
    setHideTarget(null);
  };

  const restoreHidden = () => {
    setHiddenIds([]);
    writeHiddenIds(user, []);
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteResume(deleteTarget.id);
      setResumes((current) => current.filter((entry) => entry.id !== deleteTarget.id));
      const nextHiddenIds = hiddenIds.filter((id) => id !== deleteTarget.id);
      setHiddenIds(nextHiddenIds);
      writeHiddenIds(user, nextHiddenIds);
      removeDraft(deleteTarget.id, user?.username || '');
      setDeleteTarget(null);
    } catch {
      setDeleteError(t('Could not delete resume. Please try again.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <SiteHeader current="dashboard" />

      <section className="site-shell mx-auto flex-1 px-5 py-10 lg:px-8">
        <div className="flex flex-col gap-5 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-[-0.045em]">{t('My Resumes')}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            {hiddenCount ? (
              <Button variant="outline" onClick={restoreHidden}>
                <RotateCcw data-icon="inline-start" />
                {t('Restore hidden resumes ({count})', { count: hiddenCount })}
              </Button>
            ) : null}
            <Button variant="outline" disabled={creating} onClick={() => setImportOpen(true)}><Upload data-icon="inline-start" />{t('Import resume')}</Button>
            <Button onClick={createBlank} disabled={creating}>
              <Plus data-icon="inline-start" />
              {t('Create resume')}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-border py-4 text-sm text-muted-foreground">
          <span>{t('{count} visible resumes', { count: visibleResumes.length })}</span>
          <span>{t('Last updated')} <strong className="font-semibold text-foreground">{visibleResumes[0] ? formatDateTime(visibleResumes[0].updatedAt, lang, t) : '--'}</strong></span>
          <span>{openText(lang, 'unlimited')}</span>
        </div>

        {!loadError && resumes.length > 0 ? <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex min-w-0 flex-1 flex-col gap-2 text-sm font-medium" htmlFor="resume-search">
            {t('Search resumes')}
            <Input id="resume-search" type="search" value={query} placeholder={t('Search by title, name or headline')} onChange={event => setQuery(event.target.value)} />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium" htmlFor="resume-sort">
            {t('Sort resumes')}
            <NativeSelect id="resume-sort" value={sort} onChange={event => setSort(event.target.value as ResumeSort)} className="w-full sm:w-44">
              <NativeSelectOption value="recent">{t('Recently updated')}</NativeSelectOption>
              <NativeSelectOption value="oldest">{t('Oldest updated')}</NativeSelectOption>
              <NativeSelectOption value="name">{t('Name (A–Z)')}</NativeSelectOption>
            </NativeSelect>
          </label>
        </div> : null}
        {!loadError && query.trim() && visibleResumes.length > 0 ? <p role="status" className="mt-4 text-sm text-muted-foreground">{t('{count} of {total} resumes match', { count: matchingResumes.length, total: visibleResumes.length })}</p> : null}

        {actionError && <p role="alert" className="mt-5 text-sm text-destructive">{actionError}</p>}
        {loadError ? (
          <div role="alert" className="mt-8 flex flex-col items-start gap-3 rounded-lg border border-border bg-card p-5">
            <p className="font-medium">{t('Could not load your resumes. Your saved data has not been deleted.')}</p>
            <Button variant="outline" onClick={() => setLoadAttempt(value => value + 1)}>{t('Retry')}</Button>
          </div>
        ) : matchingResumes.length ? (
          <div className="mt-8 grid gap-x-5 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {!query.trim() && <button
              type="button"
              className="flex aspect-[210/297] flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-transparent text-muted-foreground transition hover:border-primary/50 hover:text-primary disabled:opacity-50"
              onClick={createBlank}
              disabled={creating}

            >
              <Plus className="size-7" />
              <span className="text-sm font-medium">{t('Create a blank resume')}</span>
            </button>}
            {matchingResumes.map((entry) => (
              <ResumeCard
                key={entry.id}
                entry={entry}
                busy={creating}
                onDuplicate={() => { void createDocument(entry); }}
                onRename={() => { setRenameTarget(entry); setRenameTitle(entry.title); setRenameError(''); }}
                onOpen={() => navigate(`/editor/${entry.id}`)}
                onHide={() => setHideTarget(entry)}
                onDelete={() => { setDeleteError(''); setDeleteTarget(entry); }}
              />
            ))}
          </div>
        ) : visibleResumes.length > 0 ? (
          <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-20 text-center">
            <Search className="size-8 text-muted-foreground" />
            <h2 className="text-xl font-semibold">{t('No matching resumes')}</h2>
            <p className="text-sm text-muted-foreground">{t('Try a different title, name or headline.')}</p>
            <Button variant="outline" onClick={() => setQuery('')}>{t('Clear search')}</Button>
          </div>
        ) : hiddenCount > 0 ? (
          <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-20 text-center">
            <EyeOff className="size-8 text-muted-foreground" />
            <h2 className="text-xl font-semibold">{t('All your resumes are hidden')}</h2>
            <p className="text-sm text-muted-foreground">{t('Your saved resumes are still here. Restore them to see them in this list.')}</p>
            <Button variant="outline" onClick={restoreHidden}><RotateCcw data-icon="inline-start" />{t('Restore hidden resumes ({count})', { count: hiddenCount })}</Button>
          </div>
        ) : (
          <div className="mx-auto flex max-w-lg flex-col items-center py-24 text-center">
            <span className="grid size-12 place-items-center rounded-lg border border-border bg-card"><FileText className="size-5" /></span>
            <h2 className="mt-5 text-xl font-semibold">{t('Create your first resume')}</h2>
            <div className="mt-6 flex gap-3">
              <Button onClick={() => navigate('/templates')}><LayoutTemplate data-icon="inline-start" />{t('Browse templates')}</Button>
              <Button variant="outline" disabled={creating} onClick={createBlank}><Plus data-icon="inline-start" />{t('Blank resume')}</Button>
            </div>
          </div>
        )}
      </section>

      <SiteFooter />

      {importOpen && <ImportResumeDialog onClose={() => setImportOpen(false)} onImported={id => { setImportOpen(false); navigate(`/editor/${id}`); }} />}

      <Dialog open={Boolean(renameTarget)} onOpenChange={open => { if (!open && !renamingRef.current) setRenameTarget(null); }}>
        <DialogContent closeLabel={t('Close')} showCloseButton={!renaming}>
          <DialogHeader>
            <DialogTitle>{t('Rename resume')}</DialogTitle>
            <DialogDescription>{t('Give this resume a name so you can find it easily.')}</DialogDescription>
          </DialogHeader>
          <form className="flex flex-col gap-4" onSubmit={event => { event.preventDefault(); void confirmRename(); }}>
            <label className="flex flex-col gap-2 text-sm font-medium" htmlFor="rename-title">
              {t('Resume name')}
              <Input id="rename-title" value={renameTitle} maxLength={1000} disabled={renaming} aria-invalid={Boolean(renameError)} aria-describedby={renameError ? 'rename-error' : undefined} onChange={event => { setRenameTitle(event.target.value); setRenameError(''); }} />
            </label>
            {renameError ? <p id="rename-error" role="alert" className="text-sm text-destructive">{renameError}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" disabled={renaming} onClick={() => setRenameTarget(null)}>{t('Cancel')}</Button>
              <Button type="submit" disabled={renaming || !renameTitle.trim()}>{renaming ? <Loader2 data-icon="inline-start" className="animate-spin" /> : null}{t(renaming ? 'Saving…' : 'Save name')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(hideTarget)} onOpenChange={(open) => { if (!open) setHideTarget(null); }}>
        <DialogContent closeLabel={t('Close')}>
          <DialogHeader>
            <DialogTitle>{t('Hide this resume from the list?')}</DialogTitle>
            <DialogDescription>{t('"{name}" will not be deleted, and you can restore it at any time.', { name: hideTarget?.title || t('Untitled resume') })}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHideTarget(null)}>{t('Cancel')}</Button>
            <Button onClick={confirmHide}>{t('Hide resume')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => {
        if (!open && !deleting) {
          setDeleteTarget(null);
          setDeleteError('');
        }
      }}>
        <DialogContent closeLabel={t('Close')} showCloseButton={!deleting}>
          <DialogHeader>
            <span className="mb-1 grid size-10 place-items-center rounded-lg bg-destructive/10 text-destructive"><Trash2 className="size-5" /></span>
            <DialogTitle>{t('Delete this resume permanently?')}</DialogTitle>
            <DialogDescription>
              {t('"{name}" and its saved content will be permanently deleted. This cannot be undone.', { name: deleteTarget?.title || t('Untitled resume') })}
            </DialogDescription>
          </DialogHeader>
          {deleteError ? <p className="text-sm text-destructive" role="alert">{deleteError}</p> : null}
          <DialogFooter>
            <Button variant="outline" disabled={deleting} onClick={() => setDeleteTarget(null)}>{t('Cancel')}</Button>
            <Button variant="destructive" disabled={deleting} onClick={() => { void confirmDelete(); }}>
              {deleting ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Trash2 data-icon="inline-start" />}
              {deleting ? t('Deleting') : t('Delete resume')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
