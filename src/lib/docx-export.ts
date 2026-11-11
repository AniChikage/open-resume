import { getPaperSize } from './paper.ts';
import { BorderStyle, Document, ExternalHyperlink, HeadingLevel, ImageRun, Packer, Paragraph, TextRun, UnderlineType } from 'docx';
import type { ParagraphChild } from 'docx';
import type { EditorDocument, ResumeItem } from '../types.ts';
import { downloadFile, EMPTY_IMPORT_AVATAR } from './resume-transfer.ts';

const decode = (value: string) => value.replace(/&(?:amp|lt|gt|quot|apos|nbsp|#\d+|#x[\da-f]+);/gi, (entity) => {
  const named: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ' };
  if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
  const hex = entity[2]?.toLowerCase() === 'x';
  const code = Number.parseInt(entity.slice(hex ? 3 : 2, -1), hex ? 16 : 10);
  return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
});

/** Convert the editor's small rich-text vocabulary into editable Word runs. */
export function richTextParagraphs(html: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  let runs: ParagraphChild[] = [];
  let bold = 0; let italics = 0; let underline = 0; let listDepth = 0; let bullet = false;
  let href = '';
  const flush = () => {
    if (runs.length) paragraphs.push(new Paragraph({ children: runs, ...(bullet ? { bullet: { level: Math.min(8, Math.max(0, listDepth - 1)) } } : {}), spacing: { after: 80 } }));
    runs = [];
  };
  for (const token of html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, '').split(/(<[^>]*>)/g)) {
    if (!token) continue;
    if (token[0] !== '<') {
      const text = decode(token);
      if (!text) continue;
      const run = new TextRun({ text, bold: bold > 0, italics: italics > 0, underline: underline > 0 ? { type: UnderlineType.SINGLE } : undefined });
      runs.push(href ? new ExternalHyperlink({ link: href, children: [run] }) : run);
      continue;
    }
    const tag = token.match(/^<\s*(\/?)\s*([\w]+)/);
    if (!tag) continue;
    const closing = !!tag[1]; const name = tag[2].toLowerCase(); const direction = closing ? -1 : 1;
    if (name === 'strong' || name === 'b') bold = Math.max(0, bold + direction);
    if (name === 'em' || name === 'i') italics = Math.max(0, italics + direction);
    if (name === 'u') underline = Math.max(0, underline + direction);
    if (name === 'ul' || name === 'ol') { flush(); listDepth = Math.max(0, listDepth + direction); }
    if (name === 'li') { flush(); bullet = !closing; }
    if (name === 'br' || name === 'p' || name === 'div') flush();
    if (name === 'a') {
      const target = token.match(/href\s*=\s*["']([^"']*)["']/i)?.[1] || '';
      href = !closing && /^(https?:\/\/|mailto:)/i.test(target) ? decode(target) : '';
    }
  }
  flush();
  return paragraphs;
}

function itemParagraphs(item: ResumeItem, type: string, present: string) {
  const paragraphs: Paragraph[] = [];
  const title = type === 'education' ? item.school : item.org || item.title;
  const period = item.startDate || item.endDate || item.current ? [item.startDate, item.current ? present : item.endDate].filter(Boolean).join(' – ') : item.period;
  if (title || period || item.meta) paragraphs.push(new Paragraph({ children: [new TextRun({ text: title || '', bold: true }), new TextRun({ text: [period, item.meta].filter(Boolean).map((part) => `  |  ${part}`).join('') })], keepNext: true, spacing: { before: 100, after: 60 } }));
  const meta = [item.role, item.department, item.major, item.degree, item.location].filter(Boolean).join(' · ');
  if (meta) paragraphs.push(new Paragraph({ text: meta, keepNext: true, spacing: { after: 80 } }));
  if (item.body) paragraphs.push(...richTextParagraphs(item.body));
  else for (const text of type === 'education' ? item.details || [] : item.bullets || []) paragraphs.push(...richTextParagraphs(text));
  if (item.description) paragraphs.push(new Paragraph({ text: item.description, spacing: { after: 80 } }));
  for (const value of item.values || []) paragraphs.push(new Paragraph({ text: value, bullet: { level: 0 }, spacing: { after: 60 } }));
  return paragraphs;
}

export async function buildResumeDocx({ resume, settings }: EditorDocument, lang = 'en'): Promise<Blob> {
  const paper = getPaperSize(settings.paperSize);
  const accent = /^#[\da-f]{6}$/i.test(settings.accent) ? settings.accent.slice(1) : '333333';
  const font = /serif|songti|simsun/i.test(settings.fontFamily) ? 'Noto Serif CJK SC' : /yahei|pingfang/i.test(settings.fontFamily) ? 'Noto Sans CJK SC' : 'Arial';
  const children: Paragraph[] = [];
  // Embedded photos keep DOCX generation local and work offline.
  const photo = resume.profile.avatar.match(/^data:image\/(png|jpe?g);base64,([\s\S]+)$/i);
  if (photo && resume.profile.avatar !== EMPTY_IMPORT_AVATAR) {
    const data = Uint8Array.from(atob(photo[2]), (character) => character.charCodeAt(0));
    children.push(new Paragraph({ children: [new ImageRun({ type: photo[1].toLowerCase() === 'png' ? 'png' : 'jpg', data, transformation: { width: 72, height: 90 } })], keepNext: true }));
  }
  children.push(new Paragraph({ text: resume.profile.name || resume.title, heading: HeadingLevel.TITLE, keepNext: true }));
  if (resume.profile.headline) children.push(new Paragraph({ text: resume.profile.headline, keepNext: true, spacing: { after: 100 } }));
  const contact = [resume.profile.email, resume.profile.phone, resume.profile.website, resume.profile.city, resume.profile.birthday, resume.profile.status].filter(Boolean).join('  |  ');
  if (contact) children.push(new Paragraph({ text: contact, spacing: { after: 180 } }));
  for (const section of resume.sections.filter((entry) => entry.visible && entry.items.length)) {
    children.push(new Paragraph({ text: section.label, heading: HeadingLevel.HEADING_1, keepNext: true, spacing: { before: 220, after: 120 }, border: { bottom: { color: accent, style: BorderStyle.SINGLE, size: 5, space: 6 } } }));
    for (const item of section.items) children.push(...itemParagraphs(item, section.type, lang.startsWith('zh') ? '至今' : 'Present'));
  }
  const document = new Document({ title: resume.title, creator: 'Resume Builder', description: 'Editable resume',
    styles: { default: {
      document: { run: { font, size: Math.round(settings.fontSize * 2) }, paragraph: { spacing: { line: Math.round(settings.lineHeight * 240) } } },
      title: { run: { font, size: 40, bold: true, color: accent }, paragraph: { spacing: { after: 120 } } },
      heading1: { run: { font, size: Math.round(settings.fontSize * 2 + 2), bold: true, color: accent } },
    } },
    sections: [{ properties: { page: { size: { width: Math.round(paper.widthMm * 1440 / 25.4), height: Math.round(paper.heightMm * 1440 / 25.4) }, margin: { top: 850, right: 850, bottom: 850, left: 850 } } }, children }],
  });
  return Packer.toBlob(document);
}

export async function exportResumeAsDocx(document: EditorDocument, filename = 'resume.docx', lang = 'en') {
  downloadFile(await buildResumeDocx(document, lang), filename);
}
