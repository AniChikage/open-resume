import { Download, FileText, SlidersHorizontal } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode, type CSSProperties, type PointerEvent } from 'react';
import { buildResumeFromTemplate, DEFAULT_SETTINGS, RESUME_TEMPLATES } from '../data.ts';
import { useTheme } from '../lib/theme.tsx';
import { visualText } from '../lib/visual-copy.ts';
import { cn } from '../lib/utils.ts';
import type { ResumeTemplate } from '../types.ts';
import ResumePaperThumb from './ResumePaperThumb.tsx';

export function ProductHero({ headline, description, note, primary, secondary, onPreview }: { headline: string; description: string; note?: string; primary: ReactNode; secondary: ReactNode; onPreview?: (template: ResumeTemplate) => void }) {
  const { lang, t } = useTheme();
  const [accent, setAccent] = useState('#7c3aed');
  const stage = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  const move = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const { clientX, clientY } = event;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const node = stage.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      node.style.setProperty('--tilt-x', `${(clientY - rect.top - rect.height / 2) / rect.height * -5}deg`);
      node.style.setProperty('--tilt-y', `${(clientX - rect.left - rect.width / 2) / rect.width * 7}deg`);
    });
  };
  const reset = () => {
    cancelAnimationFrame(frame.current);
    stage.current?.style.setProperty('--tilt-x', '0deg');
    stage.current?.style.setProperty('--tilt-y', '0deg');
  };
  const examples = useMemo(() => ['wc-clean-campus', 'slate', 'exec-charcoal'].map((id) => {
    const template = RESUME_TEMPLATES.find(item => item.id === id) || RESUME_TEMPLATES[0];
    const resume = buildResumeFromTemplate(template, lang);
    if (lang === 'en') Object.assign(resume.profile, { name: 'Alex Morgan', email: 'alex.morgan@example.com', phone: '+1 415 555 0138' });
    return { template, resume, settings: { ...DEFAULT_SETTINGS, template: template.id, accent, fontSize: 16, compact: true } };
  }), [lang, accent]);
  const lines = headline.includes('\n') ? headline.split('\n') : [headline];
  return <section className="product-hero" style={{ '--hero-accent': accent } as CSSProperties}>
    <div className="product-hero-grid site-shell mx-auto">
    <div className="product-hero-copy">
      <h1 aria-label={headline.replace(/\n/g, ' ')} className={headline.length > 35 ? 'hero-title-long' : undefined}>{lines.map((line, index) => <span key={index} className={lines.length > 1 && index === lines.length - 1 ? 'hero-title-accent' : undefined}>{line}</span>)}</h1>
      <p className="product-hero-description">{description}</p>
      <div className="product-hero-actions">{primary}{secondary}</div>
      {note && <p className="product-hero-note">{note}</p>}
    </div>
    <div className="hero-stage" ref={stage} onPointerMove={move} onPointerLeave={reset}>
    <div className="hero-disc" aria-hidden="true" />
    <div className="hero-papers" role={onPreview ? 'group' : 'img'} aria-label={t('Resume preview')}>
      {examples.map(({ template, resume, settings }, index) => onPreview ?
        <button type="button" key={template.id} className={cn('hero-paper', 'hero-paper-' + index)} aria-label={t('Preview template') + ': ' + template.label[lang]} onClick={() => onPreview(template)}><ResumePaperThumb resume={resume} settings={settings} /></button> :
        <div key={template.id} className={cn('hero-paper', 'hero-paper-' + index)}><ResumePaperThumb resume={resume} settings={settings} /></div>)}
    </div>
    <div className="hero-swatches" role="group" aria-label={t('Accent color')}>
      {['#7c3aed', '#2563eb', '#be185d', '#0f766e'].map(color => <button type="button" key={color} style={{ background: color }} aria-label={`${t('Accent color')}: ${color}`} aria-pressed={accent === color} onClick={() => setAccent(color)} />)}
    </div>
    </div>
    </div>
  </section>;
}

export function ProductFeatures() {
  const { lang } = useTheme();
  const features = [{ icon: FileText, title: 'story', help: 'storyHelp' }, { icon: SlidersHorizontal, title: 'design', help: 'designHelp' }, { icon: Download, title: 'export', help: 'exportHelp' }] as const;
  return <section className="product-features site-shell mx-auto">
    {features.map(({ icon: Icon, title, help }, index) => <div key={title}><span className="feature-number" aria-hidden="true">0{index + 1}</span><div><Icon aria-hidden="true" strokeWidth={1.6} /><h2>{visualText(lang, title)}</h2><p>{visualText(lang, help)}</p></div></div>)}
  </section>;
}
