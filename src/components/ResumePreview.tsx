import { SECTION_TEMPLATES, TEMPLATE_ACCENTS, TEMPLATE_VARIANTS, resolveResumeAvatar } from '../data.ts';
import { getPaperSize } from '../lib/paper.ts';
import { useTheme } from '../lib/theme.tsx';
import { cn } from '../lib/utils.ts';
import type * as React from 'react';
import type { Resume,ResumeItem as ResumeItemData,ResumeProfile,ResumeSection as ResumeSectionData,ResumeSettings,Translate } from '../types.ts';

const escapeHtml = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));

const canonicalRichTags: Record<string,string> = { B: 'strong', STRONG: 'strong', I: 'em', EM: 'em', U: 'u' };
const canonicalListTags: Record<string,string> = { UL: 'ul', OL: 'ol', LI: 'li' };

function sanitizeRichText(value: unknown) {
  const raw = String(value ?? '');
  if (!raw) return '';
  if (typeof document === 'undefined') return escapeHtml(raw);
  const tpl = document.createElement('template');
  tpl.innerHTML = raw;
  const clean = (node: Node): string => {
    if (node.nodeType === 3) return escapeHtml(node.textContent ?? '');
    if (!(node instanceof Element)) return '';
    const tag = node.tagName;
    if (tag === 'BR') return '<br>';
    const children = Array.from(node.childNodes).map(clean).join('');
    if (tag === 'A') {
      const href = node.getAttribute('href') || '';
      if (href && /^https?:\/\//.test(href)) return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener">${children}</a>`;
      return children;
    }
    const ct = canonicalRichTags[tag];
    if (ct) return `<${ct}>${children}</${ct}>`;
    const lt = canonicalListTags[tag];
    if (lt) return `<${lt}>${children}</${lt}>`;
    if (tag === 'DIV' || tag === 'P') return `${children}<br>`;
    return children;
  };
  return Array.from(tpl.content.childNodes).map(clean).join('')
    .replace(/(<br>\s*){2,}/g, '<br>').replace(/^(<br>\s*)+|(\s*<br>)+$/g, '').trim();
}

function getRichTextText(value: unknown) {
  const s = sanitizeRichText(value);
  if (typeof document === 'undefined') return s.replace(/<[^>]+>/g, '');
  const tpl = document.createElement('template');
  tpl.innerHTML = s;
  return tpl.content.textContent ?? '';
}

function isRichTextEmpty(value: unknown) {
  return getRichTextText(value).replace(/\u00a0/g, ' ').trim().length === 0;
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

function formatPeriod(startDate: string | undefined, endDate: string | undefined, current: boolean | undefined, t: Translate = (message) => message) {
  if (!startDate && !endDate && !current) return '';
  const fmt = (d: string | undefined) => d ? d.replace('-', '.') : '';
  const s = fmt(startDate);
  const e = current ? t('Present') : fmt(endDate);
  if (s && e) return `${s} – ${e}`;
  return s || e;
}

function getItemPeriodLabel(item: ResumeItemData, t: Translate = message => message) {
  if (item.startDate || item.endDate || item.current) return formatPeriod(item.startDate, item.endDate, item.current, t);
  return item.period || '';
}

function getAgeLabel(birthday: string | undefined, t: Translate = (message, values) => `${values?.age} years old`) {
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


export function ResumePreview({ resume, settings, refNode, className, paperStyle, profileHeading = 'h1' }: {resume:Resume;settings:ResumeSettings;refNode?:React.Ref<HTMLElement>;className?:string;paperStyle?:React.CSSProperties;profileHeading?:'h1'|'h2'|'p'}) {
  const paper = getPaperSize(settings.paperSize);
  const accent = settings.accent ?? TEMPLATE_ACCENTS[settings.template];
  const templateVariant = TEMPLATE_VARIANTS[settings.template] ?? 'classic';
  const visible = resume.sections.filter((s) => s.visible);
  const style: React.CSSProperties & Record<`--${string}`, string | number> = { '--resume-page-width': `${paper.widthMm}mm`, '--resume-page-height': `${paper.heightMm}mm`, '--accent': accent, '--resume-font': `"${settings.fontFamily}", "Microsoft YaHei", Arial, sans-serif`, '--resume-size': `${settings.fontSize}px`, '--resume-line': settings.lineHeight, '--resume-gap': settings.compact ? '11px' : '18px' };
  return (
    <article data-paper-size={settings.paperSize || 'a4'} className={cn('resume-paper', `template-${templateVariant}`, settings.compact && 'compact', className)} style={{ ...style, ...paperStyle }} ref={refNode}>
      <ResumeBackground />
      <ResumeHeader profile={resume.profile} template={templateVariant} profileHeading={profileHeading} />
      <div className="resume-body">{visible.map((s) => <ResumeSection key={s.id} section={s} />)}</div>
    </article>
  );
}

function ResumeBackground() {
  return (
    <div className="resume-bg" aria-hidden="true">
      <span className="resume-bg-arc resume-bg-arc-1" />
      <span className="resume-bg-arc resume-bg-arc-2" />
      <span className="resume-bg-grid" />
      <span className="resume-bg-side" />
      <span className="resume-bg-corner" />
    </div>
  );
}

function ResumeHeader({ profile, template, profileHeading }: {profile:ResumeProfile;template:string;profileHeading?:'h1'|'h2'|'p'}) {
  const NameTag = profileHeading || 'h1';
  const { t } = useTheme();
  const avatar = <img src={resolveResumeAvatar(profile.avatar)} alt={t('Profile photo')} crossOrigin="anonymous" />;
  const profileInfo = getProfileInfoItems(profile, t);
  if (template === 'rose') {
    return (
      <header data-preview-target="profile" className="resume-header rose-header">
        <div className="rose-photo">{avatar}</div>
        <div className="rose-banner">
          <NameTag className="resume-name">{profile.name || t('Name')}</NameTag>
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
      <header data-preview-target="profile" className="resume-header classic-header">
        <div>
          <NameTag className="resume-name">{profile.name || t('Name')}</NameTag>
          <p>{[contactLine, profile.birthday, profile.status].filter(Boolean).join('\n')}</p>
        </div>
        <div className="classic-photo">{avatar}</div>
      </header>
    );
  }
  return (
    <header data-preview-target="profile" className="resume-header classic-header">
      <div>
        <NameTag className="resume-name">{profile.name || t('Name')}</NameTag>
        <p>{profileInfo.join(' | ')}</p>
      </div>
      <div className="classic-photo">{avatar}</div>
    </header>
  );
}

function ResumeSection({ section }: {section:ResumeSectionData}) {
  const kind = SECTION_TEMPLATES[section.type]?.kind ?? 'experience';
  return (
    <section className={`resume-section section-${kind}`}>
      <h2 data-preview-target={`section:${section.id}`}>{section.label}</h2>
      <div className="section-content">{section.items.map((item) => <ResumeItem key={item.id} kind={kind} item={item} />)}</div>
    </section>
  );
}

function ResumeItem({ kind, item }: {kind:string;item:ResumeItemData}) {
  const { t } = useTheme();
  if (kind === 'text') return <p data-preview-target={item.id} className="summary-text">{item.body}</p>;
  if (kind === 'education') {
    const period = getItemPeriodLabel(item, t);
    const metaParts = [item.major, item.degree, item.location].filter(Boolean);
    return (
      <div data-preview-target={item.id} className="experience-item education-item">
        <div className="experience-top"><strong>{item.school}</strong><span>{period}</span></div>
        <div className="experience-meta"><span>{metaParts.join(' · ')}</span></div>
        {!isRichTextEmpty(getEducationBody(item)) && <div className="experience-body" dangerouslySetInnerHTML={{ __html: getEducationBody(item) }} />}
      </div>
    );
  }
  if (kind === 'simpleList') return (
    <div data-preview-target={item.id} className="simple-row"><strong>{item.title}</strong><span>{item.meta}</span>{item.description && <p>{item.description}</p>}</div>
  );
  if (kind === 'chips') return (
    <div data-preview-target={item.id} className="skill-row"><strong>{item.title}</strong><div className="skill-lines">{(item.values ?? []).map((v, i) => <span key={`${v}-${i}`}>{v}</span>)}</div></div>
  );
  const period = getItemPeriodLabel(item, t);
  const metaParts = [item.role, item.department, item.location].filter(Boolean);
  return (
    <div data-preview-target={item.id} className="experience-item">
      <div className="experience-top"><strong>{item.org}</strong><span>{period}</span></div>
      <div className="experience-meta"><span>{metaParts.join(' · ')}</span></div>
      {!isRichTextEmpty(getExperienceBody(item)) && <div className="experience-body" dangerouslySetInnerHTML={{ __html: getExperienceBody(item) }} />}
    </div>
  );
}

