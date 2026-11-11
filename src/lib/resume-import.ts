import { DEFAULT_SETTINGS, getSectionCopy } from '../data.ts';
import type { EditorDocument, ResumeItem, ResumeProfile, ResumeSection, SectionType } from '../types.ts';

export const IMPORT_MAX_TEXT_LENGTH = 100_000;

const headings: Record<SectionType, readonly string[]> = {
  summary: ['summary', 'professional summary', 'profile', 'about me', 'objective', '个人总结', '个人简介', '自我评价', '职业目标', '個人簡介', '自我評價', '自己紹介', '自己pr', 'プロフィール', '소개', '자기소개', 'profil', 'résumé professionnel', 'à propos', 'о себе', 'профиль'],
  education: ['education', 'academic background', '教育经历', '教育背景', '教育經歷', '学历', '學歷', '学歴', '학력', 'formation', 'études', 'образование'],
  work: ['experience', 'work experience', 'professional experience', 'employment', '工作经历', '工作经验', '工作經歷', '工作經驗', '实习经历', '實習經歷', '職歴', '職務経歴', '경력', '경력 사항', 'expérience', 'expérience professionnelle', 'опыт работы', 'опыт'],
  project: ['projects', 'project experience', 'selected projects', '项目经历', '项目经验', '项目', '專案經歷', '項目經歷', 'プロジェクト', '프로젝트', 'projets', 'проекты'],
  organization: ['activities', 'leadership', 'volunteering', 'organizations', '社团经历', '组织经历', '志愿经历', '社團經歷', '組織經歷', 'ボランティア', '활동', '대외활동', 'bénévolat', 'activités', 'волонтёрство', 'общественная деятельность'],
  awards: ['awards', 'honors', 'certifications', 'certificates', '荣誉奖项', '获奖经历', '证书', '榮譽獎項', '獲獎經歷', '證書', '受賞歴', '資格', '수상', '자격증', 'distinctions', 'certifications et prix', 'награды', 'сертификаты'],
  skills: ['skills', 'technical skills', 'languages', '技能', '专业技能', '技能清单', '技能清單', '專業技能', 'スキル', '기술', '보유 기술', 'compétences', 'langues', 'навыки', 'языки'],
  custom: [],
};

const headingKey = (line: string) => line.normalize('NFKC').replace(/^\s*#{1,6}\s*/, '').replace(/^[\s*]+|[\s*:：]+$/g, '').toLowerCase();
const headingTypes = new Map(Object.entries(headings).flatMap(([type, values]) => values.map(value => [headingKey(value), type as SectionType] as const)));
const plainLine = (line: string) => line.replace(/^\s*#{1,6}\s*/, '').trim();
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]!));
const richBody = (lines: string[]) => lines.map(escapeHtml).join('<br>');

export function validateImportText(text: string) {
  if (text.length > IMPORT_MAX_TEXT_LENGTH) throw new Error('IMPORT_TEXT_TOO_LARGE');
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').replace(/\u0000/g, '');
  if (!normalized.trim()) throw new Error('IMPORT_EMPTY');
  return normalized;
}

function sectionItems(type: SectionType, lines: string[]): ResumeItem[] {
  if (!lines.length) return [];
  const id = crypto.randomUUID();
  if (type === 'summary') return [{ id, body: lines.join('\n') }];
  if (type === 'education') return [{ id, school: lines[0], body: richBody(lines.slice(1)) }];
  if (type === 'skills') return [{ id, title: '', values: lines }];
  if (type === 'awards') return [{ id, title: lines[0], description: lines.slice(1).join('\n') }];
  return [{ id, org: '', body: richBody(lines) }];
}

export function parseResumeText(text: string, { title = 'Imported resume', language = 'en' }: { title?: string; language?: string } = {}): EditorDocument {
  const normalized = validateImportText(text);
  const lines = normalized.split('\n').map(plainLine);
  const firstHeading = lines.findIndex(line => headingTypes.has(headingKey(line)));
  const preambleEnd = firstHeading < 0 ? Math.min(lines.length, 12) : firstHeading;
  const preamble = lines.slice(0, preambleEnd);
  const profile: ResumeProfile = { name: '', email: '', phone: '', website: '', city: '', birthday: '', status: '', headline: '', avatar: '' };
  const consumed = new Set<number>();
  const findLabel = (pattern: RegExp) => preamble.map((line, index) => ({ index, match: line.match(pattern) })).find(value => value.match?.[1]?.trim());
  const explicitName = findLabel(/^(?:name|full name|姓名|氏名|이름|nom|имя)\s*[:：]\s*(.+)$/i);
  if (explicitName?.match) { profile.name = explicitName.match[1].trim(); consumed.add(explicitName.index); }
  if (!profile.name) {
    const index = preamble.findIndex(line => line && !/^(?:resume|curriculum vitae|cv|个人简历|個人簡歷|简历|履歴書|이력서|резюме)$/i.test(line)
      && !/engineer|developer|designer|manager|consultant|工程师|工程師|设计师|設計師|经理|經理|エンジニア|개발자|инженер/i.test(line)
      && (/^[\p{L}\p{M}][\p{L}\p{M} .'-]{1,49}$/u.test(line)) && line.split(/\s+/).length <= 5
      && (line.includes(' ') || line.length <= 12));
    if (index >= 0) { profile.name = preamble[index]; consumed.add(index); }
  }
  const emailPattern = /[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  const phonePattern = /(?:\+?\d[\d ().\t-]{5,}\d)/;
  preamble.forEach((line, index) => {
    if (!profile.email) {
      const email = line.match(emailPattern)?.[0];
      if (email) {
        profile.email = email;
        if (line === email || /^(?:e-?mail|邮箱|郵箱|邮件|メール|이메일|courriel|почта)\s*[:：]/i.test(line) && line.replace(email, '').replace(/^(?:e-?mail|邮箱|郵箱|邮件|メール|이메일|courriel|почта)\s*[:：]/i, '').trim() === '') consumed.add(index);
      }
    }
    if (!profile.phone) {
      const phone = line.match(phonePattern)?.[0]?.trim();
      if (phone && phone.replace(/\D/g, '').length >= 7 && phone.replace(/\D/g, '').length <= 16 && !/^\d{4}\s*[-.]\s*\d{4}$/.test(phone) && !/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(phone)) {
        profile.phone = phone;
        if (line === phone || /^(?:phone|tel(?:ephone)?|mobile|电话|電話|手机|手機|電話番号|전화|téléphone|телефон)\s*[:：]/i.test(line) && line.replace(phone, '').replace(/^(?:phone|tel(?:ephone)?|mobile|电话|電話|手机|手機|電話番号|전화|téléphone|телефон)\s*[:：]/i, '').trim() === '') consumed.add(index);
      }
    }
    if (!profile.website) profile.website = line.match(/(?:https?:\/\/|www\.)[^\s<>]+/i)?.[0] || '';
  });
  const explicitHeadline = findLabel(/^(?:headline|target role|position|求职意向|求職意向|目标岗位|目標崗位|希望職種|직무|poste|должность)\s*[:：]\s*(.+)$/i);
  if (explicitHeadline?.match) { profile.headline = explicitHeadline.match[1].trim(); consumed.add(explicitHeadline.index); }
  if (!profile.headline && profile.name) {
    const nameIndex = preamble.findIndex(line => line === profile.name);
    const index = preamble.findIndex((line, index) => index > nameIndex && !consumed.has(index) && line.length >= 3 && line.length <= 100
      && !emailPattern.test(line) && !phonePattern.test(line) && !/https?:\/\/|www\.|[:：]/i.test(line));
    if (index >= 0) { profile.headline = preamble[index]; consumed.add(index); }
  }

  const sections: ResumeSection[] = [];
  let current: { type: SectionType; label: string; lines: string[]; explicit?: boolean } = { type: 'custom', label: getSectionCopy('custom', language).label, lines: [] };
  const flush = () => {
    if (current.lines.length || current.explicit) sections.push({ id: crypto.randomUUID(), type: current.type, label: current.label, visible: true, items: sectionItems(current.type, current.lines) });
  };
  lines.forEach((line, index) => {
    const type = headingTypes.get(headingKey(line));
    if (type) { flush(); current = { type, label: line.replace(/[:：]\s*$/, ''), lines: [], explicit: true }; }
    else if (line && !consumed.has(index)) current.lines.push(line);
  });
  flush();
  return { resume: { title: title.trim().slice(0, 1000) || 'Imported resume', profile, sections }, settings: { ...DEFAULT_SETTINGS, titleMode: 'custom', titleKind: 'custom' } };
}
