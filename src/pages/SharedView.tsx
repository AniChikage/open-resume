import { Home } from 'lucide-react';
import type * as React from 'react';
import { useEffect,useState } from 'react';
import { LanguageMenu } from '../components/SiteChrome.tsx';
import { Button } from '../components/ui/button.tsx';
import { Skeleton } from '../components/ui/skeleton.tsx';
import { DEFAULT_SETTINGS,SECTION_TEMPLATES,TEMPLATE_ACCENTS,TEMPLATE_VARIANTS,resolveResumeAvatar } from '../data.ts';
import { navigate } from '../lib/router.ts';
import { parseShareData } from '../lib/share.ts';
import { useTheme } from '../lib/theme.tsx';
import type { EditorDocument,ResumeItem as ResumeItemData,ResumeProfile,ResumeSection as ResumeSectionData,Translate } from '../types.ts';

function sanitizeRichText(value: unknown) {
  const raw = String(value ?? '');
  if (!raw) return '';
  if (typeof document === 'undefined') return raw.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));
  const tpl = document.createElement('template');
  tpl.innerHTML = raw;
  const canonicalRichTags: Record<string,string> = { B: 'strong', STRONG: 'strong', I: 'em', EM: 'em', U: 'u' };
  const canonicalListTags: Record<string,string> = { UL: 'ul', OL: 'ol', LI: 'li' };
  const clean = (node: Node): string => {
    if (node.nodeType === 3) return String(node.textContent ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));
    if (!(node instanceof Element)) return '';
    const tag = node.tagName;
    if (tag === 'BR') return '<br>';
    const children = Array.from(node.childNodes).map(clean).join('');
    const ct = canonicalRichTags[tag];
    if (ct) return `<${ct}>${children}</${ct}>`;
    const lt = canonicalListTags[tag];
    if (lt) return `<${lt}>${children}</${lt}>`;
    if (tag === 'DIV' || tag === 'P') return `${children}<br>`;
    return children;
  };
  return Array.from(tpl.content.childNodes).map(clean).join('').replace(/(<br>\s*){2,}/g, '<br>').replace(/^(<br>\s*)+|(\s*<br>)+$/g, '').trim();
}

function isRichTextEmpty(value: unknown) {
  const s = sanitizeRichText(value);
  if (typeof document === 'undefined') return s.replace(/<[^>]+>/g, '').trim().length === 0;
  const tpl = document.createElement('template');
  tpl.innerHTML = s;
  return (tpl.content.textContent ?? '').replace(/\u00a0/g, ' ').trim().length === 0;
}

function richLinesToHtml(lines: string[] = []) {
  return lines.map(sanitizeRichText).filter((line) => !isRichTextEmpty(line)).join('<br>');
}

function getExperienceBody(item: ResumeItemData) {
  const body = sanitizeRichText(item.body);
  if (!isRichTextEmpty(body)) return body;
  return richLinesToHtml(item.bullets ?? []);
}

function getEducationBody(item: ResumeItemData) {
  const body = sanitizeRichText(item.body);
  if (!isRichTextEmpty(body)) return body;
  return richLinesToHtml(item.details ?? []);
}

function formatPeriod(startDate: string | undefined, endDate: string | undefined, current: boolean | undefined, t: Translate) {
  if (!startDate && !endDate && !current) return '';
  const fmt = (d: string | undefined) => d ? d.replace('-', '.') : '';
  const s = fmt(startDate);
  const e = current ? t('Present') : fmt(endDate);
  if (s && e) return `${s} – ${e}`;
  return s || e;
}

function getItemPeriodLabel(item: ResumeItemData, t: Translate) {
  if (item.startDate || item.endDate || item.current) return formatPeriod(item.startDate, item.endDate, item.current, t);
  return item.period || '';
}

function getAgeLabel(birthday: string | undefined, t: Translate) {
  const text = String(birthday ?? '').trim();
  if (!text) return '';
  const match = text.match(/(\d{4})(?:\D+(\d{1,2}))?(?:\D+(\d{1,2}))?/);
  if (!match) return '';
  const year = Number(match[1]);
  const month = match[2] ? Number(match[2]) - 1 : null;
  const day = match[3] ? Number(match[3]) : 1;
  const now = new Date();
  let age = now.getFullYear() - year;
  if (month !== null && (now.getMonth() < month || (now.getMonth() === month && now.getDate() < day))) age -= 1;
  if (!Number.isFinite(age) || age < 0 || age > 100) return '';
  return t('{age} years old', { age });
}

function getProfileInfoItems(profile: ResumeProfile, t: Translate) {
  const age = getAgeLabel(profile.birthday, t);
  return [
    profile.phone && `${t('Phone')}: ${profile.phone}`,
    profile.email && `${t('Email')}: ${profile.email}`,
    profile.city && `${t('City')}: ${profile.city}`,
    age && `${t('Age')}: ${age}`,
    profile.status && `${t('Status')}: ${profile.status}`,
    profile.website && `${t('Website')}: ${profile.website}`
  ].filter(Boolean);
}

export default function SharedView({ encodedData }: {encodedData:string}) {
  const { t } = useTheme();
  const [data, setData] = useState<EditorDocument|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    parseShareData(encodedData).then((result) => {
      setData(result);
      setLoading(false);
    });
  }, [encodedData]);

  if (loading) return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-5"><Skeleton className="h-8 w-28" /><Skeleton className="h-5 w-16" /></div>
      <div className="flex flex-1 justify-center px-5 pb-16 pt-4"><Skeleton className="aspect-[210/297] w-full max-w-[794px]" /></div>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <p className="text-sm text-muted-foreground">{t('This link is invalid or has expired')}</p>
      <Button onClick={() => navigate('/')}>{t('Back to home')}</Button>
    </div>
  );

  const { resume, settings = DEFAULT_SETTINGS } = data;
  const accent = TEMPLATE_ACCENTS[settings.template] ?? settings.accent;
  const templateVariant = TEMPLATE_VARIANTS[settings.template] ?? 'classic';
  const visible = resume.sections.filter((s) => s.visible);
  const style: React.CSSProperties & Record<`--${string}`, string | number> = { '--accent': accent, '--resume-font': `"${settings.fontFamily}", "Microsoft YaHei", Arial, sans-serif`, '--resume-size': `${settings.fontSize}px`, '--resume-line': settings.lineHeight, '--resume-gap': settings.compact ? '11px' : '18px' };

  return (
    <main className="min-h-screen bg-background">
      <header className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between border-b border-border px-5">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <Home size={14} /> {t('Resume builder')}
        </Button>
        <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">{t('Read-only preview')}</span><LanguageMenu /></div>
      </header>
      <div className="flex justify-center pb-16 px-6">
        <article className={`resume-paper template-${templateVariant} ${settings.compact ? 'compact' : ''}`} style={style}>
          <SharedBackground />
          <SharedHeader profile={resume.profile} template={templateVariant} />
          <div className="resume-body">{visible.map((s) => <SharedSection key={s.id} section={s} />)}</div>
        </article>
      </div>
      <footer className="pb-8 text-center">
        <a href="#/" className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-4 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary">
          {t('Made with')} <span className="font-semibold text-foreground">Open Resume</span> — {t('Create your professional resume for free')}
        </a>
      </footer>
    </main>
  );
}

function SharedBackground() {
  const { t } = useTheme();
  return (
    <div className="resume-bg" aria-hidden="true">
      <span className="resume-bg-arc resume-bg-arc-1" />
      <span className="resume-bg-arc resume-bg-arc-2" />
      <span className="resume-bg-watermark">{t('Resume')}</span>
      <span className="resume-bg-grid" />
      <span className="resume-bg-side" />
      <span className="resume-bg-corner" />
    </div>
  );
}

function SharedHeader({ profile, template }: {profile:ResumeProfile;template:string}) {
  const { t } = useTheme();
  const avatar = <img src={resolveResumeAvatar(profile.avatar)} alt={t('Profile photo')} />;
  const profileInfo = getProfileInfoItems(profile, t);
  if (template === 'rose') {
    return (
      <header className="resume-header rose-header">
        <div className="rose-photo">{avatar}</div>
        <div className="rose-banner">
          <h1>{profile.name || t('Name')}</h1>
          <div className="rose-info-grid">
            {profile.headline && <span className="rose-info-item"><strong>{t('Target role')}</strong><em>{profile.headline}</em></span>}
            {profile.phone && <span className="rose-info-item"><strong>{t('Phone')}</strong><em>{profile.phone}</em></span>}
            {profile.email && <span className="rose-info-item"><strong>{t('Email')}</strong><em>{profile.email}</em></span>}
            {profile.city && <span className="rose-info-item"><strong>{t('City')}</strong><em>{profile.city}</em></span>}
            {getAgeLabel(profile.birthday, t) && <span className="rose-info-item"><strong>{t('Age')}</strong><em>{getAgeLabel(profile.birthday, t)}</em></span>}
            {profile.status && <span className="rose-info-item"><strong>{t('Status')}</strong><em>{profile.status}</em></span>}
            {profile.website && <span className="rose-info-item"><strong>{t('Website')}</strong><em>{profile.website}</em></span>}
          </div>
        </div>
      </header>
    );
  }
  if (template === 'leftline') {
    const contactLine = [profile.phone, profile.email, profile.city].filter(Boolean).join('  |  ');
    return (
      <header className="resume-header classic-header">
        <div>
          <h1>{profile.name || t('Name')}</h1>
          <p>{[contactLine, profile.birthday, profile.status].filter(Boolean).join('\n')}</p>
        </div>
        <div className="classic-photo">{avatar}</div>
      </header>
    );
  }
  return (
    <header className="resume-header classic-header">
      <div>
        <h1>{profile.name || t('Name')}</h1>
        <p>{profileInfo.join(' | ')}</p>
      </div>
      <div className="classic-photo">{avatar}</div>
    </header>
  );
}

function SharedSection({ section }: {section:ResumeSectionData}) {
  const kind = SECTION_TEMPLATES[section.type]?.kind ?? 'experience';
  return (
    <section className={`resume-section section-${kind}`}>
      <h2>{section.label}</h2>
      <div className="section-content">{section.items.map((item) => <SharedItem key={item.id} kind={kind} item={item} />)}</div>
    </section>
  );
}

function SharedItem({ kind, item }: {kind:string;item:ResumeItemData}) {
  const { t } = useTheme();
  if (kind === 'text') return <p className="summary-text">{item.body}</p>;
  if (kind === 'education') {
    const period = getItemPeriodLabel(item, t);
    const metaParts = [item.major, item.degree, item.location].filter(Boolean);
    return (
      <div className="experience-item education-item">
        <div className="experience-top"><strong>{item.school}</strong><span>{period}</span></div>
        <div className="experience-meta"><span>{metaParts.join(' · ')}</span></div>
        {!isRichTextEmpty(getEducationBody(item)) && <div className="experience-body" dangerouslySetInnerHTML={{ __html: getEducationBody(item) }} />}
      </div>
    );
  }
  if (kind === 'simpleList') return <div className="simple-row"><strong>{item.title}</strong><span>{item.meta}</span>{item.description && <p>{item.description}</p>}</div>;
  if (kind === 'chips') return <div className="skill-row"><strong>{item.title}</strong><div className="skill-lines">{(item.values ?? []).map((v, i) => <span key={`${v}-${i}`}>{v}</span>)}</div></div>;
  const period = getItemPeriodLabel(item, t);
  const metaParts = [item.role, item.department, item.location].filter(Boolean);
  return (
    <div className="experience-item">
      <div className="experience-top"><strong>{item.org}</strong><span>{period}</span></div>
      <div className="experience-meta"><span>{metaParts.join(' · ')}</span></div>
      {!isRichTextEmpty(getExperienceBody(item)) && <div className="experience-body" dangerouslySetInnerHTML={{ __html: getExperienceBody(item) }} />}
    </div>
  );
}
