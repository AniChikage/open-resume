import { ArrowRight, ExternalLink } from 'lucide-react';
import { useMemo } from 'react';
import { ProductFeatures, ProductHero } from '../components/ProductIntro.tsx';
import ResumePaperThumb from '../components/ResumePaperThumb.tsx';
import { SiteFooter, SiteHeader } from '../components/SiteChrome.tsx';
import { Button } from '../components/ui/button.tsx';
import { buildResumeFromTemplate, DEFAULT_SETTINGS, RESUME_TEMPLATES } from '../data.ts';
import { useAuth } from '../lib/auth.tsx';
import { openText } from '../lib/open-copy.ts';
import { navigate } from '../lib/router.ts';
import { useTheme } from '../lib/theme.tsx';
import { visualText } from '../lib/visual-copy.ts';

export default function Landing() {
  const { lang, t } = useTheme();
  const { user, login } = useAuth();
  const examples = useMemo(() => ['wc-clean-campus', 'slate', 'exec-charcoal'].map(id => {
    const template = RESUME_TEMPLATES.find(item => item.id === id) || RESUME_TEMPLATES[0];
    return { template, resume: buildResumeFromTemplate(template, lang), settings: { ...DEFAULT_SETTINGS, template: template.id, accent: '#6d28d9' } };
  }), [lang]);
  return <main className="product-home min-h-screen bg-background">
    <SiteHeader />
    <ProductHero
      headline={lang === 'en' ? 'Your resume.\nOn your\nterms.' : openText(lang, 'headline')}
      description={visualText(lang, 'description')}
      note={visualText(lang, 'note')}
      primary={<Button size="lg" onClick={() => user ? navigate('/dashboard') : login('/dashboard')}>{openText(lang, 'start')}<ArrowRight data-icon="inline-end" /></Button>}
      secondary={<Button size="lg" variant="outline" onClick={() => navigate('/templates')}>{t('Browse templates')}</Button>}
    />
    <ProductFeatures />
    <section className="product-gallery site-shell mx-auto">
      <div className="product-section-heading"><div><h2>{visualText(lang, 'gallery')}</h2><p>{visualText(lang, 'galleryHelp')}</p></div><Button variant="link" onClick={() => navigate('/templates')}>{t('View all templates')}<ArrowRight data-icon="inline-end" /></Button></div>
      <div className="product-template-grid">{examples.map(({ template, resume, settings }) => <article key={template.id}>
        <button type="button" className="product-template-preview" aria-label={t('Browse templates') + ': ' + template.label[lang]} onClick={() => navigate('/templates')}><ResumePaperThumb resume={resume} settings={settings} /></button>
        <h3>{template.label[lang]}</h3>
      </article>)}</div>
    </section>
    <section className="hosted-support"><div className="site-shell mx-auto"><div><h2>{openText(lang, 'hosted')}</h2><p>{openText(lang, 'hostedDescription')}</p></div><Button size="lg" variant="outline" nativeButton={false} render={<a href="https://justcv.org" target="_blank" rel="noopener noreferrer" />}>{openText(lang, 'support')}<ExternalLink data-icon="inline-end" /></Button></div></section>
    <SiteFooter />
  </main>;
}
