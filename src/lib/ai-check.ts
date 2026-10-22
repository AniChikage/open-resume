import type { Resume, ResumeItem, SectionType, Translate } from '../types.ts';

export interface CheckResult {
  type: 'error' | 'warning' | 'suggestion';
  category: string;
  message: string;
  targetId?: string;
}

const HTML_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ensp: ' ', emsp: ' ', thinsp: ' ', NewLine: '\n', Tab: '\t',
};

const normalizeText = (value: unknown) => String(value ?? '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();

// Use the same extraction in the browser and Node. Preserve block boundaries so
// a rich-text list is checked as individual descriptions.
function descriptionLines(value: unknown): string[] {
  return String(value ?? '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?(?:br|p|div|li|ul|ol)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, name: string) => {
      if (!name.startsWith('#')) return HTML_ENTITIES[name] ?? entity;
      const point = name[1].toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1));
      return point > 0 && point <= 0x10FFFF ? String.fromCodePoint(point) : '';
    })
    .split(/\r?\n/)
    .map(normalizeText)
    .filter(Boolean);
}

function itemDescriptions(item: ResumeItem, fallback: 'bullets' | 'details' = 'bullets') {
  const body = descriptionLines(item.body);
  return body.length ? body : (item[fallback] ?? []).flatMap(descriptionLines);
}

export function hasResumeItemContent(type: SectionType, item: ResumeItem): boolean {
  if (type === 'summary') return descriptionLines(item.body).length > 0;
  if (type === 'skills') return (item.values ?? []).some(value => normalizeText(value).length > 0);
  if (type === 'awards') return [item.title, item.meta, item.description].some(value => normalizeText(value).length > 0);
  if (type === 'education') {
    return [item.school, item.major, item.degree].some(value => normalizeText(value).length > 0)
      || itemDescriptions(item, 'details').length > 0;
  }
  return [item.org, item.role, item.department].some(value => normalizeText(value).length > 0)
    || itemDescriptions(item).length > 0;
}

function monthValue(value: string | undefined) {
  const match = normalizeText(value).match(/^(\d{4})[-.](\d{1,2})$/);
  if (!match) return null;
  const month = Number(match[2]);
  return month >= 1 && month <= 12 ? Number(match[1]) * 12 + month : null;
}

const EXPERIENCE_TYPES = new Set<SectionType>(['work', 'project', 'organization', 'custom']);
const ACTION_VERBS = ['负责', '主导', '开发', '设计', '优化', '搭建', '推动', '参与', '完成', '实现', '提升', '降低', 'led', 'built', 'owned', 'created', 'designed', 'developed', 'improved', 'reduced', 'increased', 'delivered', 'launched'];

export function runChecks(resume: Resume, t: Translate = (message, values = {}) => String(message).replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`))) {
  const results: CheckResult[] = [];
  const add = (type: CheckResult['type'], category: string, message: string, targetId?: string, values?: Record<string, string | number>) => {
    results.push({ type, category: t(category), message: t(message, values), ...(targetId ? { targetId } : {}) });
  };
  const phone = normalizeText(resume.profile.phone);
  const email = normalizeText(resume.profile.email);

  if (!phone && !email) {
    add('error', 'Profile information', 'Add at least one contact method: phone or email.', 'profile');
  } else if (!phone || !email) {
    add('warning', 'Profile information', 'Add both phone and email so recruiters can reach you easily.', 'profile');
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    add('error', 'Profile information', 'Enter a valid email address.', 'profile');
  }
  if (!normalizeText(resume.profile.name)) add('error', 'Profile information', 'Add your name.', 'profile');
  if (!normalizeText(resume.profile.headline)) {
    add('warning', 'Profile information', 'Add a target role so recruiters understand your goal immediately.', 'profile');
  }

  const visibleSections = resume.sections.filter(section => section.visible);
  const requiredSections = [
    ['summary', 'suggestion', 'Add a professional summary to surface your strongest qualifications.'],
    ['work', 'warning', 'Add an experience section.'],
    ['education', 'warning', 'Add an education section.'],
  ] as const;
  for (const [type, severity, message] of requiredSections) {
    const sections = visibleSections.filter(section => section.type === type);
    if (!sections.some(section => section.items.some(item => hasResumeItemContent(type, item)))) {
      add(severity, 'Structure', message, sections[0] ? `section:${sections[0].id}` : undefined);
    }
  }

  const emptySections = visibleSections.filter(section => !section.items.some(item => hasResumeItemContent(section.type, item)));
  if (emptySections.length) {
    add('warning', 'Structure', '{sections} is empty. Add content or hide the section.', `section:${emptySections[0].id}`,
      { sections: emptySections.map(section => section.label).join(', ') });
  }
  const blankItems = visibleSections.flatMap(section => emptySections.includes(section) ? []
    : section.items.filter(item => !hasResumeItemContent(section.type, item)));
  if (blankItems.length) {
    add('warning', 'Structure', '{count} entries are blank. Fill them in or remove them.', blankItems[0].id, { count: blankItems.length });
  }

  for (const section of visibleSections) {
    if (section.type !== 'education' && !EXPERIENCE_TYPES.has(section.type)) continue;
    for (const item of section.items) {
      if (item.current) continue;
      const start = monthValue(item.startDate);
      const end = monthValue(item.endDate);
      if (start !== null && end !== null && end < start) {
        add('warning', 'Dates', 'The end date is earlier than the start date. Check this entry.', item.id);
      }
    }
  }

  const descriptions = visibleSections.filter(section => EXPERIENCE_TYPES.has(section.type))
    .flatMap(section => section.items.flatMap(item => itemDescriptions(item).map(text => ({ text, targetId: item.id }))));
  const long = descriptions.filter(({ text }) => text.length > 80);
  if (long.length) {
    add('warning', 'Content quality', '{count} descriptions are over 80 characters. Consider making them more concise.', long[0].targetId, { count: long.length });
  }
  const short = descriptions.filter(({ text }) => text.length < 10);
  if (short.length) {
    add('suggestion', 'Content quality', '{count} descriptions are very short. Add specific outcomes.', short[0].targetId, { count: short.length });
  }
  const withoutNumbers = descriptions.filter(({ text }) => text.length > 15 && !/\d/.test(text));
  if (withoutNumbers.length >= 3) {
    add('suggestion', 'Measurable impact', '{count} descriptions lack numbers. Quantifying results can make them more convincing.', withoutNumbers[0].targetId, { count: withoutNumbers.length });
  }
  const withoutActionVerbs = descriptions.filter(({ text }) => !ACTION_VERBS.some(verb => text.toLowerCase().startsWith(verb)));
  if (descriptions.length > 3 && withoutActionVerbs.length > descriptions.length * 0.5) {
    add('suggestion', 'STAR method', 'Start more descriptions with strong action verbs to emphasize actions and results.', withoutActionVerbs[0].targetId);
  }

  const penalties = { error: 20, warning: 10, suggestion: 3 };
  const score = Math.max(0, 100 - results.reduce((total, result) => total + penalties[result.type], 0));
  return { score, results };
}
