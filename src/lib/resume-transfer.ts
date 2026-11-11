import { buildBlankResume, DEFAULT_SETTINGS, FONT_OPTIONS, RESUME_TEMPLATES, getSectionCopy } from '../data.ts';
import type { EditorDocument, ResumeItem, ResumeSection, SectionType } from '../types.ts';

export const MAX_TRANSFER_BYTES = 25 * 1024 * 1024;
export const MAX_BACKUP_DOCUMENTS = 100;
// A text-only import must never acquire the sample person's portrait.
export const EMPTY_IMPORT_AVATAR = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=';
export class TransferError extends Error {}
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, max = 200_000) => {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string' || value.length > max) throw new TransferError('invalidBackup');
  return value;
};
const types = new Set<SectionType>(['summary', 'education', 'work', 'project', 'organization', 'awards', 'skills', 'custom']);
const itemFields = ['title', 'body', 'school', 'major', 'degree', 'org', 'role', 'department', 'startDate', 'endDate', 'period', 'location', 'meta', 'description'] as const;

/** Accept the original single-resume JSON as well as versioned workspace backups. */
export function normalizeDocument(value: unknown): EditorDocument {
  if (!record(value) || !record(value.resume) || !record(value.resume.profile) || !Array.isArray(value.resume.sections)) throw new TransferError('invalidBackup');
  const source = value.resume;
  const sourceSections = value.resume.sections;
  const sourceProfile = value.resume.profile;
  if (sourceSections.length > 100) throw new TransferError('invalidBackup');
  const blank = buildBlankResume();
  const profile = { ...blank.profile };
  for (const key of Object.keys(profile) as (keyof typeof profile)[]) profile[key] = text(sourceProfile[key], key === 'avatar' ? 6_000_000 : 2_000);
  // Never execute an imported URL. Embedded photos and ordinary HTTP(S) photos are retained.
  if (profile.avatar && !/^(?:data:image\/(?:png|jpe?g|webp);base64,|https?:\/\/|\/[^/])/i.test(profile.avatar)) profile.avatar = '';
  const sections: ResumeSection[] = sourceSections.map((section: unknown) => {
    if (!record(section) || !types.has(section.type as SectionType) || !Array.isArray(section.items) || section.items.length > 500) throw new TransferError('invalidBackup');
    const type = section.type as SectionType;
    return { id: crypto.randomUUID(), type, label: text(section.label, 200) || getSectionCopy(type, 'en').label, visible: section.visible !== false,
      items: section.items.map((item: unknown) => {
        if (!record(item)) throw new TransferError('invalidBackup');
        const result: ResumeItem = { id: crypto.randomUUID() };
        for (const key of itemFields) if (item[key] !== undefined) result[key] = text(item[key]);
        for (const key of ['bullets', 'details', 'values'] as const) {
          if (item[key] === undefined) continue;
          if (!Array.isArray(item[key]) || item[key].length > 500) throw new TransferError('invalidBackup');
          result[key] = item[key].map((part: unknown) => text(part, 10_000));
        }
        if (item.current !== undefined) {
          if (typeof item.current !== 'boolean') throw new TransferError('invalidBackup');
          result.current = item.current;
        }
        return result;
      }),
    };
  });
  if (value.settings !== undefined && !record(value.settings)) throw new TransferError('invalidBackup');
  const settings = record(value.settings) ? value.settings : {};
  return {
    resume: { title: text(source.title, 500) || profile.name || 'Imported resume', profile, sections },
    settings: {
      ...DEFAULT_SETTINGS,
      template: RESUME_TEMPLATES.some((template) => template.id === settings.template) ? String(settings.template) : DEFAULT_SETTINGS.template,
      fontFamily: FONT_OPTIONS.some((font) => font.value === settings.fontFamily) ? String(settings.fontFamily) : DEFAULT_SETTINGS.fontFamily,
      accent: typeof settings.accent === 'string' && /^#[\da-f]{6}$/i.test(settings.accent) ? settings.accent : DEFAULT_SETTINGS.accent,
      fontSize: typeof settings.fontSize === 'number' && Number.isFinite(settings.fontSize) ? Math.min(20, Math.max(10, settings.fontSize)) : DEFAULT_SETTINGS.fontSize,
      lineHeight: typeof settings.lineHeight === 'number' && Number.isFinite(settings.lineHeight) ? Math.min(2.2, Math.max(1, settings.lineHeight)) : DEFAULT_SETTINGS.lineHeight,
      paperSize: settings.paperSize === 'letter' ? 'letter' : 'a4',
      compact: typeof settings.compact === 'boolean' ? settings.compact : DEFAULT_SETTINGS.compact,
      titleMode: 'custom', titleKind: 'custom',
    },
  };
}

export function readBackup(json: string): EditorDocument[] {
  if (new TextEncoder().encode(json).length > MAX_TRANSFER_BYTES) throw new TransferError('fileTooLarge');
  let value: unknown;
  try { value = JSON.parse(json); } catch { throw new TransferError('invalidBackup'); }
  if (!record(value)) throw new TransferError('invalidBackup');
  if ('format' in value) {
    if (value.format !== 'resume-workspace' || value.version !== 1) throw new TransferError('unsupportedBackup');
    if (!Array.isArray(value.documents) || !value.documents.length || value.documents.length > MAX_BACKUP_DOCUMENTS) throw new TransferError('invalidBackup');
    return value.documents.map(normalizeDocument);
  }
  return [normalizeDocument(value)];
}

export function createBackup(documents: EditorDocument[]) {
  if (!documents.length || documents.length > MAX_BACKUP_DOCUMENTS) throw new TransferError('backupCount');
  const json = JSON.stringify({ format: 'resume-workspace', version: 1, exportedAt: new Date().toISOString(), documents: documents.map(({ resume, settings }) => ({ resume, settings })) }, null, 2);
  if (new TextEncoder().encode(json).length > MAX_TRANSFER_BYTES) throw new TransferError('backupTooLarge');
  return json;
}

export function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-');
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

const headingRules: [SectionType, RegExp][] = [
  ['summary', /^(?:summary|profile|about(?: me)?|objective|professional summary|个人简介|個人簡介|个人总结|自我评价|求职意向)$/i],
  ['work', /^(?:(?:professional |work |employment )?experience|employment history|工作经历|工作經歷|工作经验|实习经历|職務経歴)$/i],
  ['education', /^(?:education(?:al background)?|academic background|教育背景|教育经历|教育經歷|学历|学歴)$/i],
  ['project', /^(?:(?:selected |personal |key )?projects?(?: experience)?|项目经历|項目經歷|项目经验|项目介绍)$/i],
  ['skills', /^(?:(?:technical |professional |key )?skills?(?: & (?:tools|technologies))?|technologies|技能|专业技能|專業技能|技能清单|技术栈)$/i],
  ['awards', /^(?:awards?(?: & honors)?|honou?rs?|certifications?|荣誉奖项|荣誉|获奖经历|证书|資格)$/i],
  ['organization', /^(?:volunteering|activities|organizations?|校园经历|社团经历|志愿经历)$/i],
];
const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const body = (lines: string[]) => lines.filter(Boolean).map((line) => escapeHtml(line)).join('<br>');

/** Deterministic, local extraction. Unknown text remains editable instead of being discarded. */
export function resumeFromText(source: string, filename: string, lang = 'en'): EditorDocument {
  if (source.length > 200_000) throw new TransferError('tooMuchText');
  const lines = source.replace(/\r/g, '').split('\n').map((line) => line.trim()).filter(Boolean);
  if (!lines.length) throw new TransferError('noText');
  const resume = buildBlankResume(lang);
  resume.title = filename.replace(/\.pdf$/i, '') || 'Imported resume';
  const groups: { type: SectionType; label: string; lines: string[] }[] = [];
  const intro: string[] = [];
  let group: typeof groups[number] | undefined;
  for (const line of lines) {
    const heading = line.replace(/[：:|\-–—]+$/, '').trim();
    const type = heading.length < 70 ? headingRules.find(([, rule]) => rule.test(heading))?.[0] : undefined;
    if (type) { group = { type, label: heading, lines: [] }; groups.push(group); }
    else if (group) group.lines.push(line);
    else intro.push(line);
  }
  const email = source.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0] || '';
  const phone = intro.join('\n').match(/(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-])?\d[\d ()-]{6,}\d/)?.[0]?.trim() || '';
  const website = source.match(/https?:\/\/[^\s|<>]+|(?:www\.|(?:github|linkedin)\.com\/)[^\s|<>]+/i)?.[0] || '';
  const name = intro.find((line) => line.length < 65 && !/[@\d|:/]/.test(line) && !/^(?:resume|curriculum vitae|简历|个人简历)$/i.test(line)) || '';
  resume.profile = { ...resume.profile, avatar: EMPTY_IMPORT_AVATAR, name, email, phone, website, headline: intro.find((line) => line !== name && line.length < 100 && !/[@|]/.test(line) && !line.includes(phone || '\u0000') && !line.includes(website || '\u0000')) || '' };
  const sections: ResumeSection[] = groups.filter((entry) => entry.lines.length).map(({ type, label, lines: content }) => {
    let items: ResumeItem[];
    if (type === 'summary') items = [{ id: crypto.randomUUID(), body: content.join('\n') }];
    else if (type === 'skills') items = [{ id: crypto.randomUUID(), values: content.map((line) => line.replace(/^[•·●▪\-*]\s*/, '')) }];
    else {
      // Keep source order and every line; the editor lets the user split multiple roles afterwards.
      const first = content[0];
      const period = content.find((line) => /(?:19|20)\d{2}.*(?:[-–—~至]|present|至今)/i.test(line)) || '';
      const dates = [...period.matchAll(/((?:19|20)\d{2})(?:[.\-/年]\s*(\d{1,2}))?/g)];
      const month = (index: number, end = false) => dates[index] ? `${dates[index][1]}-${String(dates[index][2] ? Number(dates[index][2]) : end ? 12 : 1).padStart(2, '0')}` : '';
      const current = /present|current|ongoing|至今|现在|目前/i.test(period);
      const details = content.slice(1).filter((line) => line !== period);
      items = [{ id: crypto.randomUUID(), ...(type === 'education' ? { school: first } : type === 'awards' ? { title: first, meta: period, description: details.join('\n') } : { org: first, title: first }), period, startDate: month(0), endDate: current ? '' : month(1, true), current, body: body(details) }];
    }
    return { id: crypto.randomUUID(), type, label, visible: true, items };
  });
  // Contact lines may contain a location or other useful details. Retain them in the source section.
  if (intro.length || !sections.length) sections.unshift({ id: crypto.randomUUID(), type: 'custom', label: lang.startsWith('zh') ? '导入信息' : 'Imported information', visible: true, items: [{ id: crypto.randomUUID(), body: body(intro.length ? intro : lines) }] });
  resume.sections = sections;
  return { resume, settings: { ...DEFAULT_SETTINGS, titleMode: 'custom', titleKind: 'custom' } };
}

export interface PdfTextItem { str: string; transform: number[]; width: number; height: number; hasEOL?: boolean }
/** Rebuild lines from coordinates, retaining intentional spaces between nearby fragments. */
export function pdfItemsToText(items: PdfTextItem[]) {
  const rows: { y: number; height: number; items: PdfTextItem[] }[] = [];
  for (const item of items) {
    if (!item.str.trim()) continue;
    const y = item.transform[5];
    let row = rows.find((entry) => Math.abs(entry.y - y) <= Math.max(2, Math.min(entry.height, item.height || 10) * 0.3));
    if (!row) { row = { y, height: item.height || 10, items: [] }; rows.push(row); }
    row.items.push(item);
  }
  return rows.sort((a, b) => b.y - a.y).map((row) => {
    const sorted = row.items.sort((a, b) => a.transform[4] - b.transform[4]);
    return sorted.map((item, index) => {
      const previous = sorted[index - 1];
      const gap = previous ? item.transform[4] - previous.transform[4] - previous.width : 0;
      return `${previous && gap > Math.max(1, row.height * 0.12) ? ' ' : ''}${item.str}`;
    }).join('').trim();
  }).join('\n');
}
