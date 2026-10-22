import type * as React from 'react';
import { memo } from 'react';
import { resolveResumeAvatar, SECTION_TEMPLATES, TEMPLATE_ACCENTS, TEMPLATE_VARIANTS } from '../data.ts';
import { getAgeLabel, getEducationBody, getExperienceBody, getItemPeriodLabel, getProfileInfoItems, isRichTextEmpty } from '../lib/resume-content.ts';
import { useTheme } from '../lib/theme.tsx';
import { cn } from '../lib/utils.ts';
import type { Resume, ResumeItem as ResumeItemData, ResumeProfile, ResumeSection as ResumeSectionData, ResumeSettings } from '../types.ts';

export const ResumePreview = memo(function ResumePreview({ resume, settings, refNode, className, paperStyle, profileHeading = 'h1' }: {resume:Resume;settings:ResumeSettings;refNode?:React.Ref<HTMLElement>;className?:string;paperStyle?:React.CSSProperties;profileHeading?:'h1'|'h2'}) {
  const accent = settings.accent ?? TEMPLATE_ACCENTS[settings.template];
  const templateVariant = TEMPLATE_VARIANTS[settings.template] ?? 'classic';
  const visible = resume.sections.filter((s) => s.visible);
  const style: React.CSSProperties & Record<`--${string}`, string | number> = { '--accent': accent, '--resume-font': `"${settings.fontFamily}", "Microsoft YaHei", Arial, sans-serif`, '--resume-size': `${settings.fontSize}px`, '--resume-line': settings.lineHeight, '--resume-gap': settings.compact ? '11px' : '18px' };
  return (
    <article className={cn('resume-paper', `template-${templateVariant}`, settings.compact && 'compact', className)} style={{ ...style, ...paperStyle }} ref={refNode}>
      <ResumeBackground />
      <ResumeHeader profile={resume.profile} template={templateVariant} profileHeading={profileHeading} />
      <div className="resume-body">{visible.map((s) => <ResumeSection key={s.id} section={s} />)}</div>
    </article>
  );
});

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

function ResumeHeader({ profile, template, profileHeading }: {profile:ResumeProfile;template:string;profileHeading?:'h1'|'h2'}) {
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
