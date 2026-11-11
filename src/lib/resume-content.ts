import type { ResumeItem as ResumeItemData, ResumeProfile, Translate } from '../types.ts';

const escapeHtml = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));

const canonicalRichTags: Record<string,string> = { B: 'strong', STRONG: 'strong', I: 'em', EM: 'em', U: 'u' };
const canonicalListTags: Record<string,string> = { UL: 'ul', OL: 'ol', LI: 'li' };

export function sanitizeRichText(value: unknown) {
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

export function getRichTextText(value: unknown) {
  const s = sanitizeRichText(value);
  if (typeof document === 'undefined') return s.replace(/<[^>]+>/g, '');
  const tpl = document.createElement('template');
  tpl.innerHTML = s;
  return tpl.content.textContent ?? '';
}

export function isRichTextEmpty(value: unknown) {
  return getRichTextText(value).replace(/\u00a0/g, ' ').trim().length === 0;
}

function richLinesToHtml(lines: string[] = []) {
  return lines.map(sanitizeRichText).filter((line) => !isRichTextEmpty(line)).join('<br>');
}

export function getExperienceBody(item: ResumeItemData) {
  const body = sanitizeRichText(item.body);
  if (!isRichTextEmpty(body)) return body;
  return richLinesToHtml(item.bullets ?? []);
}

export function getEducationBody(item: ResumeItemData) {
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

export function parsePeriodText(period: string | undefined) {
  const raw = String(period ?? '').trim();
  if (!raw) return { startDate: '', endDate: '', current: false };
  const matches = [...raw.matchAll(/(\d{4})(?:[.\-\/年]\s*(\d{1,2}))?/g)];
  if (!matches.length) return { startDate: '', endDate: '', current: false };
  const toMonthValue = (match: RegExpMatchArray | undefined, side: 'start'|'end') => {
    const year = match?.[1];
    if (!year) return '';
    const month = match?.[2] ? String(Number(match[2])).padStart(2, '0') : (side === 'start' ? '01' : '12');
    return `${year}-${month}`;
  };
  const current = /至今|现在|目前/.test(raw);
  const startDate = toMonthValue(matches[0], 'start');
  const endDate = current ? '' : toMonthValue(matches[1], 'end');
  return { startDate, endDate, current };
}

export function getItemPeriodLabel(item: ResumeItemData, t: Translate = message => message) {
  if (item.startDate || item.endDate || item.current) return formatPeriod(item.startDate, item.endDate, item.current, t);
  return item.period || '';
}


export function getAgeLabel(birthday: string | undefined, t: Translate = (message, values) => `${values?.age} years old`) {
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

export function getProfileInfoItems(profile: ResumeProfile, t: Translate) {
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
