import { openText } from '../lib/open-copy.js';
import { useEffect, useRef, useState } from 'react';
import { EyeOff, FileText, LayoutTemplate, Loader2, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { navigate } from '../lib/router.js';
import { createResume, deleteResume, listResumes } from '../lib/storage.js';
import { buildBlankResume, DEFAULT_SETTINGS, RESUME_TEMPLATES } from '../data.js';
import { Button } from '../components/ui/button.jsx';
import { Card, CardContent, CardFooter } from '../components/ui/card.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog.jsx';
import { Skeleton } from '../components/ui/skeleton.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useTheme } from '../lib/theme.jsx';
import { ResumePreview } from './Editor.jsx';
import { SiteHeader, SiteFooter } from '../components/SiteChrome.jsx';

const A4_PREVIEW_WIDTH = 794;
const A4_PREVIEW_HEIGHT = 1123;
const HIDDEN_RESUMES_STORAGE_PREFIX = 'openresume_hidden_resumes';

function formatDateTime(timestamp, lang, t) {
  if (!timestamp) return t('Not saved yet');
  return new Date(timestamp).toLocaleDateString(lang, { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function getStorageKey(user) {
  return `${HIDDEN_RESUMES_STORAGE_PREFIX}:${user?.id || 'anonymous'}`;
}

function readHiddenIds(user) {
  if (typeof window === 'undefined' || !user) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(getStorageKey(user)) || '[]');
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function writeHiddenIds(user, ids) {
  if (typeof window !== 'undefined' && user) window.localStorage.setItem(getStorageKey(user), JSON.stringify(ids));
}

function ResumeThumb({ resume, settings }) {
  const ref = useRef(null);
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

function ResumeCard({ entry, onOpen, onHide, onDelete }) {
  const { lang, t } = useTheme();
  return (
    <Card className="group overflow-hidden rounded-md shadow-none transition hover:border-primary/45">
      <CardContent className="p-0">
        <button type="button" className="relative block aspect-[210/297] w-full overflow-hidden bg-white text-left" onClick={onOpen}>
          <ResumeThumb resume={entry.resume} settings={entry.settings} />
          <span className="absolute inset-x-0 bottom-0 translate-y-full border-t border-border bg-white/96 py-3 text-center text-sm font-medium text-primary transition-transform group-hover:translate-y-0 group-focus-within:translate-y-0">{t('Continue editing')}</span>
        </button>
      </CardContent>
      <CardFooter className="gap-3 border-t border-border p-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{entry.title || t('Untitled resume')}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(entry.updatedAt, lang, t)}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={onHide} aria-label={t('Hide {name}', { name: entry.title || t('Untitled resume') })}>
            <EyeOff />
          </Button>
          <Button variant="destructive" size="icon-sm" onClick={onDelete} aria-label={t('Delete {name}', { name: entry.title || t('Untitled resume') })}>
            <Trash2 />
          </Button>
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
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hideTarget, setHideTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [hiddenIds, setHiddenIds] = useState([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    listResumes().then((items) => {
      if (!cancelled) setResumes(items);
    }).catch(() => {
      if (!cancelled) setResumes([]);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [authLoading, user]);

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

  const visibleResumes = resumes.filter((entry) => !hiddenIds.includes(entry.id));

  const createBlank = async () => {
    const settings = DEFAULT_SETTINGS;
    const entry = await createResume(buildBlankResume(lang), settings);
    navigate(`/editor/${entry.id}`);
  };

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
      window.sessionStorage.removeItem(`draft_${deleteTarget.id}`);
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
            {hiddenIds.length ? (
              <Button variant="outline" onClick={restoreHidden}>
                <RotateCcw data-icon="inline-start" />
                {t('Restore hidden resumes ({count})', { count: hiddenIds.length })}
              </Button>
            ) : null}
            <Button onClick={createBlank}>
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


        {visibleResumes.length ? (
          <div className="mt-8 grid gap-x-5 gap-y-8 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <button
              type="button"
              className="flex aspect-[210/297] flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-transparent text-muted-foreground transition hover:border-primary/50 hover:text-primary disabled:opacity-50"
              onClick={createBlank}

            >
              <Plus className="size-7" />
              <span className="text-sm font-medium">{t('Create a blank resume')}</span>
            </button>
            {visibleResumes.map((entry) => (
              <ResumeCard
                key={entry.id}
                entry={entry}
                onOpen={() => navigate(`/editor/${entry.id}`)}
                onHide={() => setHideTarget(entry)}
                onDelete={() => { setDeleteError(''); setDeleteTarget(entry); }}
              />
            ))}
          </div>
        ) : (
          <div className="mx-auto flex max-w-lg flex-col items-center py-24 text-center">
            <span className="grid size-12 place-items-center rounded-lg border border-border bg-card"><FileText className="size-5" /></span>
            <h2 className="mt-5 text-xl font-semibold">{t('Create your first resume')}</h2>
            <div className="mt-6 flex gap-3">
              <Button onClick={() => navigate('/templates')}><LayoutTemplate data-icon="inline-start" />{t('Browse templates')}</Button>
              <Button variant="outline" onClick={createBlank}><Plus data-icon="inline-start" />{t('Blank resume')}</Button>
            </div>
          </div>
        )}
      </section>

      <SiteFooter />

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
