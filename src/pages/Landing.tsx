import { ArrowRight,Check,Download,ExternalLink,Infinity,Server } from 'lucide-react';
import { useEffect,useMemo,useRef,useState } from 'react';
import { SiteFooter,SiteHeader } from '../components/SiteChrome.tsx';
import { Button } from '../components/ui/button.tsx';
import { buildResumeFromTemplate,DEFAULT_SETTINGS,RESUME_TEMPLATES } from '../data.ts';
import { useAuth } from '../lib/auth.tsx';
import { openText } from '../lib/open-copy.ts';
import { navigate } from '../lib/router.ts';
import { useTheme } from '../lib/theme.tsx';
import { ResumePreview } from './Editor.tsx';

export default function Landing() {
  const { lang, t } = useTheme();
  const { user, login } = useAuth();
  const template = RESUME_TEMPLATES.find((item) => item.id === 'blue') || RESUME_TEMPLATES[0];
  const resume = useMemo(() => buildResumeFromTemplate(template, lang), [template, lang]);
  const previewRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / 794));
    observer.observe(previewRef.current!);
    return () => observer.disconnect();
  }, []);
  const features = [{ icon: Check, key: 'templates' }, { icon: Infinity, key: 'unlimited' }, { icon: Download, key: 'exports' }, { icon: Server, key: 'private' }];
  return <main className="min-h-screen bg-background">
    <SiteHeader />
    <section className="site-shell mx-auto grid items-center gap-12 px-5 py-14 md:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-20 lg:px-8">
      <div>
        <p className="mb-6 text-xs font-semibold tracking-[0.18em] text-primary">{openText(lang, 'eyebrow')}</p>
        <h1 className="max-w-xl text-balance text-5xl font-bold leading-[1.06] tracking-[-0.055em] sm:text-6xl xl:text-7xl">{openText(lang, 'headline')}</h1>
        <p className="mt-6 max-w-lg text-lg leading-8 text-muted-foreground">{openText(lang, 'description')}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button size="lg" onClick={() => user ? navigate('/dashboard') : login('/dashboard')}>{openText(lang, 'start')}<ArrowRight /></Button>
          <Button size="lg" variant="outline" nativeButton={false} render={<a href="#/templates" />}>{t('Browse templates')}</Button>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">{features.map(({ icon: Icon, key }) => <div key={key} className="flex items-center gap-2.5 text-sm"><Icon className="size-4 shrink-0 text-primary" /><span>{openText(lang, key)}</span></div>)}</div>
      </div>
      <div className="relative mx-auto min-w-0 w-full max-w-[490px] rounded-xl border border-border bg-muted/60 p-5 sm:p-8" aria-label={t('Resume preview')}>
        <div className="mb-4 flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>Open Resume</span><span>{RESUME_TEMPLATES.length} {t('Templates')}</span></div>
        <div ref={previewRef} className="relative aspect-[210/297] overflow-hidden border border-border bg-white shadow-lg">
          <div className="absolute left-0 top-0" style={{ width: 794, height: 1123, transform: `scale(${scale})`, transformOrigin: 'top left' }} aria-hidden="true">
            <ResumePreview resume={resume} settings={{ ...DEFAULT_SETTINGS, template: template.id, accent: template.accent }} paperStyle={{ width: 794, minHeight: 1123, boxShadow: 'none', borderRadius: 0 }} />
          </div>
        </div>
      </div>
    </section>
    <section className="border-y border-border bg-card">
      <div className="site-shell mx-auto flex flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <div className="max-w-2xl"><h2 className="text-2xl font-semibold tracking-tight">{openText(lang, 'hosted')}</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{openText(lang, 'hostedDescription')}</p></div>
        <Button size="lg" variant="outline" nativeButton={false} render={<a href="https://justcv.org" target="_blank" rel="noopener noreferrer" />} className="w-full whitespace-normal sm:w-auto">{openText(lang, 'support')}<ExternalLink className="shrink-0" /></Button>
      </div>
    </section>
    <SiteFooter />
  </main>;
}
