import { ArrowRight,ChevronLeft,ChevronRight,FileText,Search,SlidersHorizontal } from 'lucide-react';
import { useEffect,useMemo,useRef,useState } from 'react';
import { Badge } from '../components/ui/badge.tsx';
import { Button } from '../components/ui/button.tsx';
import { Checkbox } from '../components/ui/checkbox.tsx';
import {
Dialog,
DialogContent,
DialogDescription,
DialogHeader,
DialogTitle,
} from '../components/ui/dialog.tsx';
import { Input } from '../components/ui/input.tsx';
import { NativeSelect,NativeSelectOption } from '../components/ui/native-select.tsx';
import {
Sheet,
SheetContent,
SheetDescription,
SheetFooter,
SheetHeader,
SheetTitle,
} from '../components/ui/sheet.tsx';
import { Skeleton } from '../components/ui/skeleton.tsx';
import { useAuth } from '../lib/auth.tsx';
import { openText } from '../lib/open-copy.ts';
import { navigate,useRouter } from '../lib/router.ts';
import { useTheme } from '../lib/theme.tsx';
import type { Language,ResumeEntry,ResumeTemplate,Translate } from '../types.ts';

import { SiteFooter,SiteHeader } from '../components/SiteChrome.tsx';
import {
buildResumeFromTemplate,DEFAULT_SETTINGS,localizeTemplateLanguage,localizeTemplateTag,RESUME_TEMPLATES,
} from '../data.ts';
import { createResume,listResumes } from '../lib/storage.ts';
import { ResumePreview } from '../components/ResumePreview.tsx';

const A4_PREVIEW_WIDTH = 794;
const A4_PREVIEW_HEIGHT = 1123;
const PAGE_SIZE = 12;

const FILTER_GROUPS = [
  { label: 'Career stage', items: ['校招', '实习生', '应届生', '社招', '留学申请'] },
  { label: 'Style', items: ['商务', '创意', '极简', '学术'] },
  { label: 'Industry', items: ['互联网', '金融', '咨询', '教育', '医疗健康', '制造'] },
  { label: 'Role', items: ['产品经理', '程序员', '设计师', '市场营销', '数据分析', '销售'] },
];

function templateText(template: ResumeTemplate) {
  return [
    template.label.zh, template.label.en, template.description.zh, template.description.en,
    template.language, localizeTemplateLanguage(template.language),
    ...template.tags, ...template.tags.map((tag) => localizeTemplateTag(tag)),
  ].join(' ').toLowerCase();
}

function formatRelativeTime(timestamp: number, t: Translate) {
  const distance = Date.now() - Number(timestamp || 0);
  if (distance < 60_000) return t('Saved just now');
  if (distance < 3_600_000) return t('{count} minutes ago', { count: Math.max(1, Math.floor(distance / 60_000)) });
  if (distance < 86_400_000) return t('{count} hours ago', { count: Math.max(1, Math.floor(distance / 3_600_000)) });
  return t('{count} days ago', { count: Math.max(1, Math.floor(distance / 86_400_000)) });
}

function TemplateFilters({ lang, t, selectedTags, onToggle, onClear }: {lang:Language;t:Translate;selectedTags:string[];onToggle:(tag:string)=>void;onClear:()=>void}) {
  return (
    <div className="flex flex-col gap-7">
      {FILTER_GROUPS.map((group) => (
        <fieldset key={group.label}>
          <legend className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t(group.label)}</legend>
          <div className="flex flex-col gap-2.5">
            {group.items.map((item) => {
              const checked = selectedTags.includes(item);
              return (
                <label key={item} className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                  <Checkbox checked={checked} onCheckedChange={() => onToggle(item)} />
                  {localizeTemplateTag(item, lang)}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
      {selectedTags.length ? <Button variant="link" className="justify-start px-0" onClick={onClear}>{t('Clear filters')}</Button> : null}
    </div>
  );
}

function TemplateThumb({ template, lang }: {template:ResumeTemplate;lang:Language}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [scale, setScale] = useState(0.25);
  const resume = useMemo(() => visible ? buildResumeFromTemplate(template, lang) : null, [lang, template, visible]);
  const settings = useMemo(() => ({ ...DEFAULT_SETTINGS, template: template.id, accent: template.accent }), [template]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '200px' });
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
    <div ref={ref} className="relative aspect-[210/297] w-full overflow-hidden bg-white">
      {resume ? (
        <div style={{ width: A4_PREVIEW_WIDTH, height: A4_PREVIEW_HEIGHT, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <ResumePreview resume={resume} settings={settings} paperStyle={{ width: A4_PREVIEW_WIDTH, minHeight: A4_PREVIEW_HEIGHT, boxShadow: 'none', borderRadius: 0 }} />
        </div>
      ) : <Skeleton className="absolute inset-0 rounded-none" />}
    </div>
  );
}

function TemplateCard({ template, lang, t, onPreview, onUse }: {template:ResumeTemplate;lang:Language;t:Translate;onPreview:()=>void;onUse:()=>void}) {
  return (
    <article className="group min-w-0">
      <div className="relative overflow-hidden rounded-md border border-border bg-white transition hover:border-primary/45">
        <div aria-hidden="true"><TemplateThumb template={template} lang={lang} /></div>
        <div className="absolute inset-x-0 bottom-0 flex gap-2 border-t border-border bg-white/96 p-3 transition-transform md:translate-y-full group-hover:translate-y-0 group-focus-within:translate-y-0">
          <Button variant="outline" className="flex-1" onClick={onPreview}>{t('Preview')}</Button>
          <Button className="flex-1" onClick={onUse}>{t('Use')}</Button>
        </div>
        <Badge className="absolute right-2 top-2" variant="secondary">{t('Free')}</Badge>
      </div>
      <div className="mt-3">
        <h3 className="truncate text-sm font-semibold">{template.label[lang]}</h3>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          {template.tags.slice(0, 3).map((tag) => <span key={tag}>{localizeTemplateTag(tag, lang)}</span>)}
        </div>
      </div>
    </article>
  );
}

function TemplatePreviewDialog({ template, lang, t, onClose, onUse }: {template:ResumeTemplate;lang:Language;t:Translate;onClose:()=>void;onUse:()=>void}) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent closeLabel={t('Close')} className="h-[84vh] max-w-[calc(100%-2rem)] gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{template.label[lang]}</DialogTitle>
          <DialogDescription>{template.description[lang]}</DialogDescription>
        </DialogHeader>
        <div className="grid h-full min-h-0 md:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-h-0 overflow-y-auto bg-muted p-5 md:p-10">
            <div className="mx-auto max-w-[620px] overflow-hidden border border-border bg-white shadow-[0_18px_50px_rgba(20,18,12,0.12)]">
              <TemplateThumb template={template} lang={lang} />
            </div>
          </div>
          <aside className="flex min-h-0 flex-col border-l border-border bg-card p-6">
            <h2 className="pr-8 text-xl font-semibold tracking-tight">{template.label[lang]}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{template.description[lang]}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {template.tags.map((tag) => <Badge key={tag} variant="secondary">{localizeTemplateTag(tag, lang)}</Badge>)}
            </div>
            <div className="mt-6 border-y border-border py-4 text-sm">
              <div className="flex justify-between gap-4"><span className="text-muted-foreground">{t('Language')}</span><span>{localizeTemplateLanguage(template.language, lang)}</span></div>
              <div className="mt-3 flex justify-between gap-4"><span className="text-muted-foreground">{t('Access')}</span><span>{t('Available now')}</span></div>
            </div>
            <Button size="lg" className="mt-auto w-full" onClick={onUse}>
              {t('Use this template')}
              <ArrowRight data-icon="inline-end" />
            </Button>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Templates() {
  const { params } = useRouter();
  const { lang, t } = useTheme();
  const { user, login, loading: authLoading } = useAuth();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState(params.q || '');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const creatingRef = useRef(false);

  const [sort, setSort] = useState('recommended');
  const [currentPage, setCurrentPage] = useState(1);
  const [preview, setPreview] = useState<ResumeTemplate|null>(null);
  const [recentResumes, setRecentResumes] = useState<ResumeEntry[]>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    if (params.q !== undefined) setSearchTerm(params.q);
  }, [params.q]);

  useEffect(() => {
    if (!user) {
      setRecentResumes([]);
      return;
    }
    let cancelled = false;
    listResumes().then((items) => {
      if (!cancelled) setRecentResumes(items.slice(0, 2));
    }).catch(() => {
      if (!cancelled) setRecentResumes([]);
    });
    return () => { cancelled = true; };
  }, [user]);

  const filteredTemplates = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const list = RESUME_TEMPLATES.filter((template) => {
      const haystack = templateText(template);
      if (query && !haystack.includes(query)) return false;
      return selectedTags.every((tag) => haystack.includes(tag.toLowerCase()));
    });
    if (sort === 'popular') return [...list].sort((a, b) => b.usage - a.usage);
    if (sort === 'newest') return [...list].reverse();
    return [...list].sort((a, b) => Number(Boolean(b.free)) - Number(Boolean(a.free)));
  }, [searchTerm, selectedTags, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredTemplates.length / PAGE_SIZE));
  const pageTemplates = filteredTemplates.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, selectedTags, sort]);
  useEffect(() => { setCurrentPage((page) => Math.min(page, totalPages)); }, [totalPages]);


  const toggleTag = (tag: string) => setSelectedTags((tags) => tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag]);

  const useTemplate = async (template: ResumeTemplate) => {
    if (creatingRef.current) return;
    if (!user) {
      login(`/templates?use=${template.id}`);
      return;
    }
    creatingRef.current = true;
    setCreating(true);
    setCreateError('');
    try {
      const entry = await createResume(
        buildResumeFromTemplate(template, lang),
        { ...DEFAULT_SETTINGS, template: template.id, accent: template.accent },
      );
      navigate(`/editor/${entry.id}`);
    } catch {
      setCreateError(t('Something went wrong. Please try again.'));
    } finally { creatingRef.current = false; setCreating(false); }
  };

  useEffect(() => {
    if (authLoading || !params.use) return;
    const template = RESUME_TEMPLATES.find((item) => item.id === params.use);
    if (!user) {
      if (template) login(`/templates?use=${template.id}`);
      return;
    }
    // Remove the one-shot action before starting; rerenders cannot create duplicates.
    window.history.replaceState(null, '', '/#/templates');
    if (template) void useTemplate(template);
  }, [user, authLoading, params.use]);

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <SiteHeader current="templates" />
      <div className="site-shell mx-auto grid flex-1 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border px-6 py-9 lg:block">
          <div className="flex items-center gap-2 text-sm font-semibold"><SlidersHorizontal className="size-4" />{t('Filters')}</div>
          <div className="mt-7"><TemplateFilters lang={lang} t={t} selectedTags={selectedTags} onToggle={toggleTag} onClear={() => setSelectedTags([])} /></div>
        </aside>

        <section className="min-w-0 px-5 py-9 lg:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-[-0.045em]">{openText(lang, 'templates')}</h1>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Button variant="outline" size="lg" className="lg:hidden" onClick={() => setMobileFiltersOpen(true)}><SlidersHorizontal data-icon="inline-start" />{t('Filters')}{selectedTags.length ? ` (${selectedTags.length})` : ''}</Button>
              <Button size="lg" onClick={() => navigate('/dashboard')}>{t('New resume')}</Button>
            </div>
          </div>

          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">{openText(lang, 'description')}</p>
          {creating ? <p role="status" className="mt-4 text-sm">{t('Loading...')}</p> : null}
          {createError ? <p role="alert" className="mt-4 text-sm text-destructive">{createError}</p> : null}
          {recentResumes.length ? (
            <div className="mt-8 rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold">{t('My Resumes')}</h2>
                <Button variant="link" size="sm" onClick={() => navigate('/dashboard')}>{t('View all')}</Button>
              </div>
              <div className="divide-y divide-border">
                {recentResumes.map((entry) => (
                  <button key={entry.id} type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/60" onClick={() => navigate(`/editor/${entry.id}`)}>
                    <span className="grid size-8 place-items-center rounded-md border border-border bg-background"><FileText className="size-4" /></span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{entry.title || t('Untitled resume')}</span>
                    <span className="text-xs text-muted-foreground">{formatRelativeTime(entry.updatedAt, t)}</span>
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 border-b border-border pb-4 xl:flex-row xl:items-center">
            <label className="relative block flex-1">
              <span className="sr-only">{t('Search templates')}</span>
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={t('Search templates')} className="h-9 bg-card pl-8" />
            </label>
            <NativeSelect value={sort} onChange={(event) => setSort(event.target.value)} className="w-full xl:w-36">
              <NativeSelectOption value="recommended">{t('Recommended')}</NativeSelectOption>
              <NativeSelectOption value="popular">{t('Most popular')}</NativeSelectOption>
              <NativeSelectOption value="newest">{t('Newest')}</NativeSelectOption>
            </NativeSelect>
          </div>

          <div className="mt-5 flex items-center justify-between text-sm text-muted-foreground">
            <span>{t('{count} templates', { count: filteredTemplates.length })}</span>
            <span>{openText(lang, 'templates')}</span>
          </div>

          {pageTemplates.length ? (
            <div className="mt-5 grid gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {pageTemplates.map((template) => (
                <TemplateCard key={template.id} template={template} lang={lang} t={t} onPreview={() => setPreview(template)} onUse={() => void useTemplate(template)} />
              ))}
            </div>
          ) : (
            <div className="mt-10 border-y border-border py-16 text-center">
              <h2 className="text-lg font-semibold">{t('No matching templates')}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{t('Try another keyword or remove some filters.')}</p>
              <Button variant="outline" className="mt-5" onClick={() => { setSearchTerm(''); setSelectedTags([]); setCurrentPage(1); }}>{t('Reset filters')}</Button>
            </div>
          )}

          {totalPages > 1 ? (
            <div className="mt-10 flex items-center justify-center gap-2">
              <Button variant="outline" size="icon" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} aria-label={t('Previous page')}><ChevronLeft /></Button>
              <span className="px-3 text-sm text-muted-foreground">{currentPage} / {totalPages}</span>
              <Button variant="outline" size="icon" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} aria-label={t('Next page')}><ChevronRight /></Button>
            </div>
          ) : null}
        </section>
      </div>
      <SiteFooter />

      {preview ? (
        <TemplatePreviewDialog
          template={preview}
          lang={lang}
          t={t}

          onClose={() => setPreview(null)}
          onUse={() => { void useTemplate(preview); setPreview(null); }}
        />
      ) : null}

      <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
        <SheetContent side="left" closeLabel={t('Close')} className="w-[min(88vw,360px)]">
          <SheetHeader>
            <SheetTitle>{t('Filter templates')}</SheetTitle>
            <SheetDescription>{t('Combine filters to update results instantly.')}</SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <TemplateFilters lang={lang} t={t} selectedTags={selectedTags} onToggle={toggleTag} onClear={() => setSelectedTags([])} />
          </div>
          <SheetFooter><Button onClick={() => setMobileFiltersOpen(false)}>{t('View {count} templates', { count: filteredTemplates.length })}</Button></SheetFooter>
        </SheetContent>
      </Sheet>
    </main>
  );
}
