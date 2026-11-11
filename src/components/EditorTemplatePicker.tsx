import type * as React from 'react';
import { memo,useEffect,useRef,useState } from 'react';
import { RESUME_TEMPLATES,localizeTemplateTag } from '../data.ts';
import { useTheme } from '../lib/theme.tsx';
import type { ResumePreview } from './ResumePreview.tsx';
import type { Resume,ResumeSettings,ResumeTemplate,Setter } from '../types.ts';
import { Badge } from './ui/badge.tsx';
import { Button } from './ui/button.tsx';
import { Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle } from './ui/dialog.tsx';
import { Input } from './ui/input.tsx';
import { NativeSelect,NativeSelectOption } from './ui/native-select.tsx';
type PreviewCardProps={template:ResumeTemplate;resume:Resume;settings:ResumeSettings;Preview:React.ComponentType<React.ComponentProps<typeof ResumePreview>>};

const RECENT_KEY = 'openresume_recent_templates';
const PAGE_SIZE = 9;
const readRecent = () => {
  try { const value = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); return Array.isArray(value) ? value.filter((id) => typeof id === 'string').slice(0, 4) : []; }
  catch { return []; }
};

const Thumbnail = memo(function Thumbnail({ template, resume, settings, Preview }: PreviewCardProps) {
  const frame = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.2);
  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    const observer = new ResizeObserver(() => setScale(node.clientWidth / 794));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return <div ref={frame} aria-hidden="true" className="pointer-events-none relative aspect-[210/297] overflow-hidden bg-white">
    <div style={{ width: 794, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
      <Preview resume={resume} settings={{ ...settings, template: template.id, accent: template.accent }} paperStyle={{ width: 794, minHeight: 1123, borderRadius: 0, boxShadow: 'none' }} />
    </div>
  </div>;
});

export function EditorTemplatePicker({ resume, settings, onSettings, Preview }: {resume:Resume;settings:ResumeSettings;onSettings:Setter<ResumeSettings>;Preview:React.ComponentType<React.ComponentProps<typeof ResumePreview>>}) {
  const { lang, t } = useTheme();
  const [recent, setRecent] = useState(readRecent);
  const [candidate, setCandidate] = useState<ResumeTemplate|null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const current = RESUME_TEMPLATES.find((template) => template.id === settings.template) || RESUME_TEMPLATES[0];
  const shortlist = [...new Set([current.id, ...recent, ...RESUME_TEMPLATES.filter((template) => template.free).map((template) => template.id), ...RESUME_TEMPLATES.map((template) => template.id)])]
    .map((id) => RESUME_TEMPLATES.find((template) => template.id === id)).filter((template): template is ResumeTemplate => Boolean(template)).slice(0, 3);
  const matches = RESUME_TEMPLATES.filter((template) => {
    const text = [template.label[lang], template.description[lang], ...template.tags.map((tag) => localizeTemplateTag(tag, lang))].join(' ').toLowerCase();
    return text.includes(query.trim().toLowerCase()) && (filter === 'all' || (filter === 'free' ? template.free : !template.free));
  }).sort((a, b) => Number(b.id === current.id) - Number(a.id === current.id) || Number(Boolean(b.free)) - Number(Boolean(a.free)));
  const openPicker = (template = current) => { setCandidate(template); setQuery(''); setFilter('all'); setPage(0); setOpen(true); };
  const apply = () => {
    if (!candidate) return;
    onSettings((value) => ({ ...value, template: candidate.id, accent: candidate.accent }));
    const next = [candidate.id, ...recent.filter((id) => id !== candidate.id)].slice(0, 4);
    setRecent(next);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* Preview remains usable without storage. */ }
    setOpen(false);
  };
  const card = (template: ResumeTemplate, selected: boolean, choose: ()=>void) => <button type="button" key={template.id} onClick={choose}
    aria-pressed={selected} aria-label={template.label[lang]}
    className={`min-w-0 overflow-hidden rounded-md border text-left outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? 'border-primary ring-1 ring-primary' : 'border-border'}`}>
    <div className="relative"><Thumbnail template={template} resume={resume} settings={settings} Preview={Preview} />
      {!template.free && <Badge className="absolute right-1 top-1" variant="secondary">PRO</Badge>}
    </div>
    <div className="flex items-center gap-1 border-t border-border p-2">
      <span className="min-w-0 flex-1 truncate text-xs">{template.label[lang]}</span>
    </div>
  </button>;

  return <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
    <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">{t('Resume Templates')}</h3><Button variant="link" size="sm" onClick={() => openPicker()}>{t('Browse all templates')}</Button></div>
    <p className="text-xs text-muted-foreground">{t('Your content, in every template')}</p>
    <div className="grid grid-cols-3 gap-2">{shortlist.map((template) => card(template, template.id === current.id, () => openPicker(template)))}</div>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent closeLabel={t('Close')} className="flex h-[90dvh] max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-6xl">
        <DialogHeader className="shrink-0 border-b border-border p-4 pr-12">
          <DialogTitle>{t('Choose a template')}</DialogTitle>
          <DialogDescription>{t('Preview with your content. Apply when ready.')}</DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:grid-rows-1">
          <div className="flex min-h-0 flex-col border-b border-border md:border-r md:border-b-0">
            <div className="flex shrink-0 flex-wrap gap-2 p-3">
              <Input className="min-w-0 flex-1" aria-label={t('Search templates')} placeholder={t('Search templates')} value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} />
              <NativeSelect aria-label={t('Filters')} value={filter} onChange={(event) => { setFilter(event.target.value); setPage(0); }}>
                <NativeSelectOption value="all">{t('All')}</NativeSelectOption><NativeSelectOption value="free">{t('Free')}</NativeSelectOption><NativeSelectOption value="pro">{t('Professional')}</NativeSelectOption>
              </NativeSelect>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3 pt-0" key={`${query}-${filter}-${page}`}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{matches.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((template) => card(template, template.id === candidate?.id, () => setCandidate(template)))}</div>
              {!matches.length && <p className="py-8 text-center text-sm text-muted-foreground">{t('No matching templates')}</p>}
            </div>
            <div className="flex shrink-0 items-center justify-between border-t border-border p-2">
              <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>{t('Previous page')}</Button>
              <span className="text-xs text-muted-foreground">{page + 1} / {Math.max(1, Math.ceil(matches.length / PAGE_SIZE))}</span>
              <Button variant="ghost" size="sm" disabled={(page + 1) * PAGE_SIZE >= matches.length} onClick={() => setPage((value) => value + 1)}>{t('Next page')}</Button>
            </div>
          </div>
          <div className="min-h-0 overflow-auto bg-muted p-4">
            {candidate && <><h3 className="mb-2 text-sm font-semibold">{candidate.label[lang]}</h3>
              <div className="editor-template-detail mx-auto max-w-[480px] overflow-hidden border border-border bg-white"><FullPreview template={candidate} resume={resume} settings={settings} Preview={Preview} /></div></>}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border p-3">
          <Button variant="outline" onClick={() => setOpen(false)}>{t('Cancel')}</Button>
          <Button disabled={!candidate} onClick={apply}>{t('Apply template')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  </section>;
}

// Unlike first-page thumbnails, the detail view exposes the entire resume.
function FullPreview({ template, resume, settings, Preview }: PreviewCardProps) {
  const container = useRef<HTMLDivElement | null>(null);
  const content = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ scale: 0.5, height: 1123 });
  useLayoutPreview(container, content, setSize);
  return <div ref={container} style={{ height: size.height * size.scale }}>
    <div ref={content} style={{ width: 794, transform: `scale(${size.scale})`, transformOrigin: 'top left' }}>
      <Preview resume={resume} settings={{ ...settings, template: template.id, accent: template.accent }} paperStyle={{ width: 794, minHeight: 1123, boxShadow: 'none', borderRadius: 0 }} />
    </div>
  </div>;
}
function useLayoutPreview(container: React.RefObject<HTMLDivElement>, content: React.RefObject<HTMLDivElement>, setSize: React.Dispatch<React.SetStateAction<{scale:number;height:number}>>) {
  useEffect(() => {
    const root = container.current, body = content.current;
    if (!root || !body) return;
    const update = () => setSize({ scale: root.clientWidth / 794, height: body.offsetHeight });
    const observer = new ResizeObserver(update);
    observer.observe(root); observer.observe(body); update();
    return () => observer.disconnect();
  }, [container, content, setSize]);
}
