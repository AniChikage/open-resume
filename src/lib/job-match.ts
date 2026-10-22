import type { Resume } from '../types.ts';

export const JOB_DESCRIPTION_MAX_LENGTH = 12_000;
export const JOB_KEYWORD_MAX_LENGTH = 64;
export const JOB_MANUAL_KEYWORD_LIMIT = 20;
const MAX_IGNORED_KEYWORDS = 150;

export interface JobMatchContext {
  version: 1;
  company: string;
  jobTitle: string;
  jobDescription: string;
  manualKeywords: string[];
  ignoredKeywords: string[];
}
export interface JobMatchEvidence { text: string; targetId: string; section: string }
export interface JobKeywordMatch {
  id: string;
  label: string;
  source: 'detected' | 'manual';
  jobExcerpt: string | null;
  evidence: JobMatchEvidence | null;
}
interface Skill { id: string; label: string; aliases: string[]; exactCase?: boolean }

// A deliberately bounded vocabulary: ordinary words from a posting do not become
// requirements. Unrecognized domain skills can be added explicitly by the user.
const SKILLS: Skill[] = [
  { id: 'javascript', label: 'JavaScript', aliases: ['JavaScript', 'JS', 'ECMAScript'] },
  { id: 'typescript', label: 'TypeScript', aliases: ['TypeScript', 'TS'] },
  { id: 'react', label: 'React', aliases: ['React', 'React.js', 'ReactJS'] },
  { id: 'vue', label: 'Vue', aliases: ['Vue', 'Vue.js', 'VueJS'] },
  { id: 'angular', label: 'Angular', aliases: ['Angular', 'AngularJS'] },
  { id: 'nodejs', label: 'Node.js', aliases: ['Node.js', 'NodeJS', 'Node JS'] },
  { id: 'nextjs', label: 'Next.js', aliases: ['Next.js', 'NextJS'] },
  { id: 'html', label: 'HTML', aliases: ['HTML', 'HTML5'] },
  { id: 'css', label: 'CSS', aliases: ['CSS', 'CSS3'] },
  { id: 'tailwind', label: 'Tailwind CSS', aliases: ['Tailwind', 'Tailwind CSS'] },
  { id: 'python', label: 'Python', aliases: ['Python'] },
  { id: 'java', label: 'Java', aliases: ['Java'] },
  { id: 'cpp', label: 'C++', aliases: ['C++', 'CPP'] },
  { id: 'csharp', label: 'C#', aliases: ['C#', 'C Sharp', 'CSharp'] },
  { id: 'c', label: 'C', aliases: ['C'], exactCase: true },
  { id: 'dotnet', label: '.NET', aliases: ['.NET', 'dotnet', 'ASP.NET'] },
  { id: 'golang', label: 'Go', aliases: ['Go', 'Golang', 'Go语言'], exactCase: true },
  { id: 'rust', label: 'Rust', aliases: ['Rust'] },
  { id: 'swift', label: 'Swift', aliases: ['Swift'] },
  { id: 'kotlin', label: 'Kotlin', aliases: ['Kotlin'] },
  { id: 'php', label: 'PHP', aliases: ['PHP'] },
  { id: 'ruby', label: 'Ruby', aliases: ['Ruby', 'Ruby on Rails'] },
  { id: 'sql', label: 'SQL', aliases: ['SQL'] },
  { id: 'mysql', label: 'MySQL', aliases: ['MySQL'] },
  { id: 'postgresql', label: 'PostgreSQL', aliases: ['PostgreSQL', 'Postgres'] },
  { id: 'mongodb', label: 'MongoDB', aliases: ['MongoDB'] },
  { id: 'redis', label: 'Redis', aliases: ['Redis'] },
  { id: 'graphql', label: 'GraphQL', aliases: ['GraphQL'] },
  { id: 'rest', label: 'REST API', aliases: ['REST API', 'RESTful', 'REST APIs'] },
  { id: 'git', label: 'Git', aliases: ['Git'] },
  { id: 'docker', label: 'Docker', aliases: ['Docker'] },
  { id: 'kubernetes', label: 'Kubernetes', aliases: ['Kubernetes', 'K8s'] },
  { id: 'linux', label: 'Linux', aliases: ['Linux'] },
  { id: 'aws', label: 'AWS', aliases: ['AWS', 'Amazon Web Services'] },
  { id: 'azure', label: 'Azure', aliases: ['Azure'] },
  { id: 'gcp', label: 'Google Cloud', aliases: ['GCP', 'Google Cloud'] },
  { id: 'cicd', label: 'CI/CD', aliases: ['CI/CD', 'CI CD', 'continuous integration', '持续集成'] },
  { id: 'testing', label: 'Automated testing', aliases: ['unit testing', 'automated testing', 'test automation', '单元测试', '自动化测试'] },
  { id: 'playwright', label: 'Playwright', aliases: ['Playwright'] },
  { id: 'jest', label: 'Jest', aliases: ['Jest'] },
  { id: 'spring', label: 'Spring', aliases: ['Spring Boot', 'Spring Framework'] },
  { id: 'django', label: 'Django', aliases: ['Django'] },
  { id: 'flask', label: 'Flask', aliases: ['Flask'] },
  { id: 'figma', label: 'Figma', aliases: ['Figma'] },
  { id: 'ux', label: 'UX design', aliases: ['UX', 'user experience', '用户体验', '使用者體驗'] },
  { id: 'accessibility', label: 'Accessibility', aliases: ['accessibility', 'WCAG', '无障碍', '無障礙'] },
  { id: 'excel', label: 'Excel', aliases: ['Excel'] },
  { id: 'tableau', label: 'Tableau', aliases: ['Tableau'] },
  { id: 'powerbi', label: 'Power BI', aliases: ['Power BI', 'PowerBI'] },
  { id: 'data-analysis', label: 'Data analysis', aliases: ['data analysis', 'data analytics', '数据分析', '數據分析', 'データ分析', '데이터 분석', 'analyse de données', 'анализ данных'] },
  { id: 'machine-learning', label: 'Machine learning', aliases: ['machine learning', '机器学习', '機器學習', '機械学習', '머신 러닝', 'apprentissage automatique', 'машинное обучение'] },
  { id: 'pytorch', label: 'PyTorch', aliases: ['PyTorch'] },
  { id: 'tensorflow', label: 'TensorFlow', aliases: ['TensorFlow'] },
  { id: 'project-management', label: 'Project management', aliases: ['project management', '项目管理', '專案管理', 'プロジェクト管理', '프로젝트 관리', 'gestion de projet', 'управление проектами'] },
  { id: 'product-management', label: 'Product management', aliases: ['product management', '产品管理', '產品管理'] },
  { id: 'agile', label: 'Agile', aliases: ['Agile', 'Scrum', '敏捷开发', '敏捷開發'] },
  { id: 'communication', label: 'Communication', aliases: ['communication skills', '沟通能力', '溝通能力', 'コミュニケーション', '의사소통', 'compétences en communication', 'навыки общения'] },
  { id: 'leadership', label: 'Leadership', aliases: ['leadership', '领导力', '領導力', 'リーダーシップ', '리더십'] },
  { id: 'collaboration', label: 'Collaboration', aliases: ['teamwork', 'cross-functional collaboration', '团队协作', '團隊協作', 'チームワーク', '팀워크', 'travail en équipe', 'командная работа'] },
  { id: 'seo', label: 'SEO', aliases: ['SEO', 'search engine optimization', '搜索引擎优化', '搜尋引擎最佳化'] },
  { id: 'salesforce', label: 'Salesforce', aliases: ['Salesforce'] },
];
const STOPWORDS = new Set(['the', 'a', 'an', 'and', 'or', 'with', 'for', 'to', 'in', 'of', 'is', 'are', 'we', 'you', 'your', 'our', 'experience', 'required', 'requirements', 'responsibilities', 'skills', 'job', 'work', 'team', '岗位', '要求', '工作', '负责', '经验', '能力', '技能', '以及', '具有']);
const escapePattern = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalized = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
// Normalize a small set of attached language versions to their skill family.
// Other suffixes still fail the token boundary (JavaScript is never Java).
const LANGUAGE_VERSION_SUFFIXES: Record<string, string> = {
  python: '(?:[23](?:\\.\\d{1,2}){0,2})?',
  java: '(?:8|11|17|21)?',
  'c++': '(?:98|03|11|14|17|20|23|26)?',
  cpp: '(?:98|03|11|14|17|20|23|26)?',
};

function findAlias(text: string, aliases: string[], exactCase = false) {
  let first: { index: number; length: number } | null = null;
  for (const alias of aliases) {
    const pattern = escapePattern(alias).replace(/\s+/g, '\\s+') + (LANGUAGE_VERSION_SUFFIXES[normalized(alias)] ?? '');
    // ASCII boundaries also support English skills embedded in Chinese text.
    const source = /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(alias) ? pattern
      : `(?<![A-Za-z0-9_+#.])${pattern}(?![A-Za-z0-9_+#]|\\.[A-Za-z0-9_])`;
    const hit = new RegExp(source, exactCase && (alias === 'C' || alias === 'Go') ? 'u' : 'iu').exec(text);
    if (hit && (!first || hit.index < first.index || hit.index === first.index && hit[0].length > first.length)) {
      first = { index: hit.index, length: hit[0].length };
    }
  }
  return first;
}

function excerpt(text: string, hit: { index: number; length: number }) {
  const start = Math.max(0, hit.index - 48);
  const end = Math.min(text.length, hit.index + hit.length + 84);
  return `${start ? '…' : ''}${text.slice(start, end).replace(/\s+/g, ' ').trim()}${end < text.length ? '…' : ''}`;
}

function plain(value: unknown) {
  return String(value ?? '').replace(/<\/?(?:p|div|li|br)\b[^>]*>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&(?:nbsp|amp|lt|gt|quot|apos);/g, entity => ({ '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'" }[entity] ?? entity))
    .replace(/&#(x[\da-f]+|\d+);/gi, (_, code: string) => {
      const point = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code);
      return point > 0 && point <= 0x10FFFF ? String.fromCodePoint(point) : '';
    }).replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
}

function resumeSources(resume: Resume) {
  const sources: JobMatchEvidence[] = [];
  if (resume.profile.headline.trim()) sources.push({ text: resume.profile.headline, targetId: 'profile', section: '' });
  for (const section of resume.sections) {
    if (!section.visible) continue;
    for (const item of section.items) {
      const body = plain(item.body);
      const fields = section.type === 'summary' ? [item.body]
        : section.type === 'skills' ? [item.title, ...(item.values ?? [])]
        : section.type === 'awards' ? [item.title, item.meta, item.description]
        : section.type === 'education' ? [item.school, item.major, item.degree, body ? item.body : (item.details ?? []).join('\n')]
        : [item.org, item.role, item.department, body ? item.body : (item.bullets ?? []).join('\n')];
      const text = plain(fields.filter(Boolean).join('\n'));
      if (text) sources.push({ text, targetId: item.id, section: section.label });
    }
  }
  return sources;
}

export function normalizeManualKeywords(values: string[]) {
  const seen = new Set<string>();
  return values.flatMap(value => value.split(/[,，\n]/)).map(value => value.trim().replace(/\s+/g, ' '))
    .filter(value => {
      const key = normalized(value);
      if ((key.length < 2 && key !== 'c') || key.length > JOB_KEYWORD_MAX_LENGTH || STOPWORDS.has(key) || seen.has(key)) return false;
      seen.add(key); return true;
    }).slice(0, JOB_MANUAL_KEYWORD_LIMIT);
}

export function matchJobDescription(resume: Resume, jobDescription: string, options: { manualKeywords?: string[]; ignoredKeywords?: string[] } = {}) {
  const posting = jobDescription.slice(0, JOB_DESCRIPTION_MAX_LENGTH);
  const requirements = new Map<string, Skill & { source: 'detected' | 'manual' }>();
  for (const skill of SKILLS) {
    if (findAlias(posting, skill.aliases, skill.exactCase)) requirements.set(skill.id, { ...skill, source: 'detected' });
  }
  for (const label of normalizeManualKeywords(options.manualKeywords ?? [])) {
    const known = SKILLS.find(skill => skill.aliases.some(alias => normalized(alias) === normalized(label)));
    const skill = known ?? { id: `manual:${normalized(label)}`, label, aliases: [label] };
    if (!requirements.has(skill.id)) requirements.set(skill.id, { ...skill, source: 'manual' });
  }
  const sources = resumeSources(resume);
  const ignoredSet = new Set(options.ignoredKeywords ?? []);
  const keywords: JobKeywordMatch[] = [];
  const ignored: JobKeywordMatch[] = [];
  for (const requirement of requirements.values()) {
    const jobHit = findAlias(posting, requirement.aliases, requirement.exactCase);
    let evidence: JobMatchEvidence | null = null;
    for (const source of sources) {
      const hit = findAlias(source.text, requirement.aliases, requirement.exactCase);
      if (hit) { evidence = { ...source, text: excerpt(source.text, hit) }; break; }
    }
    const match: JobKeywordMatch = { id: requirement.id, label: requirement.label, source: requirement.source, jobExcerpt: jobHit ? excerpt(posting, jobHit) : null, evidence };
    (ignoredSet.has(requirement.id) ? ignored : keywords).push(match);
  }
  const matchedCount = keywords.filter(keyword => keyword.evidence).length;
  return { keywords, ignored, total: keywords.length, matchedCount, coverage: keywords.length ? Math.round(matchedCount / keywords.length * 100) : null };
}

export const emptyJobMatchContext = (): JobMatchContext => ({ version: 1, company: '', jobTitle: '', jobDescription: '', manualKeywords: [], ignoredKeywords: [] });

export function parseJobMatchContext(value: unknown): JobMatchContext | null {
  if (!value || typeof value !== 'object') return null;
  const input = value as Record<string, unknown>;
  const bounded = (entry: unknown, max: number): entry is string => typeof entry === 'string' && entry.length <= max;
  const list = (entry: unknown, max: number) => Array.isArray(entry) && entry.length <= max && entry.every(item => bounded(item, 100));
  if (input.version !== 1 || !bounded(input.company, 200) || !bounded(input.jobTitle, 200) || !bounded(input.jobDescription, JOB_DESCRIPTION_MAX_LENGTH)
    || !list(input.manualKeywords, JOB_MANUAL_KEYWORD_LIMIT) || !list(input.ignoredKeywords, MAX_IGNORED_KEYWORDS)) return null;
  return { version: 1, company: input.company, jobTitle: input.jobTitle, jobDescription: input.jobDescription,
    manualKeywords: normalizeManualKeywords(input.manualKeywords as string[]), ignoredKeywords: [...new Set(input.ignoredKeywords as string[])] };
}

export const jobMatchStorageKey = (resumeId: string, username: string) => `openresume_job_match:${encodeURIComponent(username)}:${encodeURIComponent(resumeId)}`;

export function readJobMatchContext(resumeId: string, username: string): JobMatchContext {
  try {
    const text = localStorage.getItem(jobMatchStorageKey(resumeId, username));
    if (!text || text.length > 64_000) return emptyJobMatchContext();
    return parseJobMatchContext(JSON.parse(text)) ?? emptyJobMatchContext();
  } catch { return emptyJobMatchContext(); }
}

export function writeJobMatchContext(resumeId: string, username: string, context: JobMatchContext): boolean {
  try {
    const valid = parseJobMatchContext(context);
    if (!valid) return false;
    localStorage.setItem(jobMatchStorageKey(resumeId, username), JSON.stringify(valid));
    return true;
  } catch { return false; }
}
