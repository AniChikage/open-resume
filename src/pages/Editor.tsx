import {
BadgeCheck,Bold,BriefcaseBusiness,Calendar,CheckCircle2,ChevronLeft,ChevronRight,
CircleAlert,
Download,Eraser,Eye,FileJson,FileText,Gauge,GraduationCap,Home,
ImageDown,Italic,Layers3,LayoutTemplate,Link2,
List,ListOrdered,
Loader2,
Maximize2,MoveDown,MoveUp,Palette,PencilLine,Plus,
PlusCircle,Redo2,Save,Share2,Sparkles,Trash2,Trophy,
Underline,
Undo2,
UsersRound,X,ZoomIn,ZoomOut
} from 'lucide-react';
import type * as React from 'react';
import { useEffect,useLayoutEffect,useRef,useState } from 'react';
import { EditorTemplatePicker } from '../components/EditorTemplatePicker.tsx';
import { LanguageMenu } from '../components/SiteChrome.tsx';
import TailorResumeDialog from '../components/TailorResumeDialog.tsx';
import { Badge } from '../components/ui/badge.tsx';
import { Button } from '../components/ui/button.tsx';
import { Skeleton } from '../components/ui/skeleton.tsx';
import {
createSectionItem,DEFAULT_SETTINGS,FONT_OPTIONS,getSectionCopy,inferSystemResumeTitleKind,
localizeResumeSections,localizeResumeTitle,
resolveResumeAvatar,
RESUME_TEMPLATES,SECTION_TEMPLATES,TEMPLATE_ACCENTS,
TEMPLATE_VARIANTS
} from '../data.ts';
import { runChecks } from '../lib/ai-check.ts';
import { CHINA_MAJOR_OPTIONS,CHINA_SCHOOL_OPTIONS } from '../lib/education-options.ts';
import { A4_RATIO,getSmartPageCuts } from '../lib/pagination.ts';
import { navigate } from '../lib/router.ts';
import { generateShareUrl } from '../lib/share.ts';
import { getResume,saveResume } from '../lib/storage.ts';
import { useTheme } from '../lib/theme.tsx';
import { useEditorHistory } from '../lib/use-editor-history.ts';
import { cn } from '../lib/utils.ts';
import { errorMessage,isEditorDocument } from '../lib/validation.ts';
import type { EditorDocument,Resume,ResumeItem as ResumeItemData,ResumeProfile,ResumeSection as ResumeSectionData,ResumeSettings,SectionType,Setter,Translate } from '../types.ts';

const iconMap: Record<string, import("lucide-react").LucideIcon> = {
  BadgeCheck, BriefcaseBusiness, FileText, GraduationCap,
  Layers3, PlusCircle, Trophy, UsersRound
};

const clone = <T,>(v: T): T => typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v));
const uid = () => crypto.randomUUID();

const QUICK_SECTION_TYPES: SectionType[] = ['summary', 'education', 'work', 'project', 'awards', 'skills'];
const EXPORT_TYPE_LABELS: Record<string,string> = {
  pdf: 'PDF',
  png: 'Image',
  json: 'JSON backup',
};
const PROFILE_REQUIRED_FIELDS: (keyof ResumeProfile)[] = ['name', 'headline', 'phone', 'email', 'city'];
const DEFAULT_A4_WIDTH_PX = 794;
const DEFAULT_A4_HEIGHT_PX = Math.round(DEFAULT_A4_WIDTH_PX * A4_RATIO);
const FONT_OPTION_VALUES = new Set(FONT_OPTIONS.map((font) => font.value));
const DEGREE_OPTIONS: Record<string,string[]> = {
  en: ['High School Diploma', 'Associate Degree', 'Bachelor’s Degree', 'Master’s Degree', 'Doctorate', 'MBA', 'EMBA'],
  zh: ['高中', '大专', '本科', '硕士', '博士', 'MBA', 'EMBA'],
};
const HOT_SCHOOL_OPTIONS: Record<string,string[]> = {
  en: ['Harvard University', 'Stanford University', 'Massachusetts Institute of Technology', 'University of California, Berkeley', 'University of Oxford', 'University of Cambridge', 'Columbia University', 'New York University', 'University of Michigan', 'University of Southern California', 'Northwestern University', 'Boston University'],
  zh: ['北京大学', '清华大学', '复旦大学', '上海交通大学', '浙江大学', '中国人民大学', '南京大学', '武汉大学', '中山大学', '华中科技大学', '四川大学', '西安交通大学', '哈尔滨工业大学', '同济大学', '北京航空航天大学', '南开大学', '厦门大学', '东南大学', '山东大学', '吉林大学'],
};
const HOT_MAJOR_OPTIONS: Record<string,string[]> = {
  en: ['Computer Science', 'Software Engineering', 'Artificial Intelligence', 'Data Science', 'Electrical Engineering', 'Information Systems', 'Mechanical Engineering', 'Biostatistics', 'Medicine', 'Law', 'English', 'Finance', 'Accounting', 'Business Administration', 'Marketing', 'Economics', 'Mathematics', 'Industrial Design'],
  zh: ['计算机科学与技术', '软件工程', '人工智能', '数据科学与大数据技术', '电子信息工程', '信息管理与信息系统', '网络工程', '物联网工程', '自动化', '电气工程及其自动化', '机械设计制造及其自动化', '临床医学', '口腔医学', '护理学', '药学', '法学', '汉语言文学', '英语', '金融学', '会计学', '工商管理', '市场营销', '国际经济与贸易', '数学与应用数学'],
};
const COMBO_OPTION_LIMIT = 80;

function buildComboOptions(options: string[], query: string | undefined, hotOptions: string[] = []) {
  const normalizedQuery = String(query ?? '').trim().toLowerCase();
  const hotSet = new Set(hotOptions);
  const preferred: string[] = [];
  const startsWith: string[] = [];
  const includes: string[] = [];
  const seen = new Set();

  const push = (bucket: string[], option: string) => {
    if (!option || seen.has(option)) return;
    seen.add(option);
    bucket.push(option);
  };

  for (const option of hotOptions) {
    const normalized = option.toLowerCase();
    if (!normalizedQuery || normalized.includes(normalizedQuery)) push(preferred, option);
  }

  for (const option of options) {
    const normalized = option.toLowerCase();
    if (normalizedQuery && !normalized.includes(normalizedQuery)) continue;
    if (hotSet.has(option)) {
      push(preferred, option);
    } else if (normalizedQuery && normalized.startsWith(normalizedQuery)) {
      push(startsWith, option);
    } else {
      push(includes, option);
    }
  }

  return [...preferred, ...startsWith, ...includes];
}

function normalizeLines(value: unknown) {
  if (Array.isArray(value)) return value;
  return String(value ?? '').split('\n').map((l) => l.trim()).filter(Boolean);
}

function normalizeSettingsShape(settings: Partial<ResumeSettings> | null) {
  const next = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  if (!FONT_OPTION_VALUES.has(next.fontFamily)) next.fontFamily = DEFAULT_SETTINGS.fontFamily;
  return next;
}

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

function parsePeriodText(period: string | undefined) {
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

function getItemPeriodLabel(item: ResumeItemData, t: Translate = message => message) {
  if (item.startDate || item.endDate || item.current) return formatPeriod(item.startDate, item.endDate, item.current, t);
  return item.period || '';
}

function normalizeResumeShape(input: Resume) {
  const next = clone(input);
  next.profile = next.profile ?? {};
  next.sections = (next.sections ?? []).map((section) => normalizeSectionShape(section));
  return next;
}

function normalizeSectionShape(section: ResumeSectionData) {
  const tpl = SECTION_TEMPLATES[section.type] ?? SECTION_TEMPLATES.custom;
  return {
    ...section,
    id: section.id || uid(),
    label: section.label || tpl.label,
    visible: section.visible !== false,
    items: (section.items ?? []).map((item) => normalizeItemShape(section.type, item))
  };
}

function normalizeItemShape(type: SectionType, item: ResumeItemData) {
  const tpl = SECTION_TEMPLATES[type] ?? SECTION_TEMPLATES.custom;
  const base = tpl.item();
  const next = { ...base, ...item, id: item?.id || base.id };
  const periodFields = (next.startDate || next.endDate || next.current)
    ? { startDate: next.startDate || '', endDate: next.endDate || '', current: !!next.current }
    : parsePeriodText(next.period);

  if (tpl.kind === 'education') {
    next.startDate = periodFields.startDate;
    next.endDate = periodFields.endDate;
    next.current = periodFields.current;
    next.details = Array.isArray(next.details) ? next.details : normalizeLines(next.details ?? '');
    next.body = next.body ?? '';
    return next;
  }

  if (tpl.kind === 'experience') {
    next.startDate = periodFields.startDate;
    next.endDate = periodFields.endDate;
    next.current = periodFields.current;
    next.bullets = Array.isArray(next.bullets) ? next.bullets : normalizeLines(next.bullets ?? '');
    next.body = next.body ?? '';
  }

  return next;
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

function getResumeStats(resume: Resume) {
  const profileDone = PROFILE_REQUIRED_FIELDS.filter((field) => String(resume.profile?.[field] || '').trim()).length;
  const visibleSections = resume.sections.filter((section) => section.visible);
  const itemCount = visibleSections.reduce((count, section) => count + section.items.length, 0);
  const filledItems = visibleSections.reduce((count, section) => {
    const kind = SECTION_TEMPLATES[section.type]?.kind ?? 'experience';
    return count + section.items.filter((item) => {
      if (kind === 'text') return !isRichTextEmpty(item.body);
      if (kind === 'education') return [item.school, item.major, item.degree, getItemPeriodLabel(item), item.location].some(Boolean) || !isRichTextEmpty(getEducationBody(item));
      if (kind === 'chips') return (item.values ?? []).length > 0;
      if (kind === 'simpleList') return [item.title, item.meta, item.description].some(Boolean);
      return [item.org, item.role, getItemPeriodLabel(item), item.location, item.body, ...(item.bullets ?? [])].some((value) => !isRichTextEmpty(value));
    }).length;
  }, 0);
  const progress = Math.min(100, Math.round((profileDone / PROFILE_REQUIRED_FIELDS.length) * 45 + Math.min(filledItems, 6) / 6 * 40 + Math.min(visibleSections.length, 4) / 4 * 15));
  return { profileDone, visibleSections, itemCount, filledItems, progress };
}

const waitForLayout = (targetWindow: Window = window) => new Promise<void>((resolve) => {
  targetWindow.requestAnimationFrame(() => targetWindow.requestAnimationFrame(() => resolve()));
});

function copyDocumentStyles(targetDocument: Document) {
  const loadPromises: Promise<void>[] = [];
  const sourceNodes = document.querySelectorAll<HTMLLinkElement | HTMLStyleElement>('link[rel="stylesheet"], style');

  sourceNodes.forEach((node) => {
    const copy = targetDocument.importNode(node, true);
    if (copy.tagName === 'LINK') {
      (copy as HTMLLinkElement).href = (node as HTMLLinkElement).href;
      loadPromises.push(new Promise<void>((resolve) => {
        copy.addEventListener('load', () => resolve(), { once: true });
        copy.addEventListener('error', () => resolve(), { once: true });
      }));
    }
    targetDocument.head.appendChild(copy);
  });

  const overrides = targetDocument.createElement('style');
  overrides.textContent = `
    html, body {
      width: 210mm;
      min-height: 297mm;
      margin: 0;
      background: #fff;
    }
    body {
      overflow: visible;
    }
    .resume-paper {
      width: 210mm !important;
      min-height: 297mm !important;
      margin: 0 !important;
      transform: none !important;
      box-shadow: none !important;
      border-radius: 0 !important;
    }
  `;
  targetDocument.head.appendChild(overrides);

  return Promise.all(loadPromises);
}

async function createExportSurface(sourceNode: HTMLElement) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  frame.style.position = 'fixed';
  frame.style.left = '-10000px';
  frame.style.top = '0';
  frame.style.width = '210mm';
  frame.style.height = '297mm';
  frame.style.border = '0';
  frame.style.pointerEvents = 'none';
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  if (!doc) {
    frame.remove();
    throw new Error('EXPORT_FRAME_UNAVAILABLE');
  }

  doc.open();
  doc.write('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');
  doc.close();

  await copyDocumentStyles(doc);
  const clone = doc.importNode(sourceNode, true);
  clone.style.setProperty('--preview-scale', '1');
  clone.style.width = '210mm';
  clone.style.minHeight = '297mm';
  clone.style.transform = 'none';
  clone.style.boxShadow = 'none';
  clone.style.borderRadius = '0';
  doc.body.appendChild(clone);

  const imgs = clone.querySelectorAll('img');
  await Promise.all([...imgs].map((img) => {
    if (!img.src || img.src.startsWith('data:')) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const src = img.src;
      const cvs = document.createElement('canvas');
      const tempImg = new Image();
      tempImg.crossOrigin = 'anonymous';
      tempImg.onload = () => {
        cvs.width = tempImg.naturalWidth || 120;
        cvs.height = tempImg.naturalHeight || 160;
        cvs.getContext('2d')!.drawImage(tempImg, 0, 0);
        try { img.src = cvs.toDataURL('image/png'); } catch {}
        resolve();
      };
      tempImg.onerror = () => resolve();
      tempImg.src = src;
    });
  }));

  await doc.fonts?.ready;
  await waitForLayout(frame.contentWindow || window);

  return {
    node: clone,
    destroy: () => frame.remove()
  };
}

export default function Editor({ resumeId }: {resumeId:string}) {
  const { lang, t } = useTheme();
  const { resume, settings, setResume, setSettings, history, canUndo, canRedo } = useEditorHistory({ resume: null, settings: DEFAULT_SETTINGS }, resumeId);
  const [locationRequest, setLocationRequest] = useState<{id:string}|null>(null);
  const [deleteNotice, setDeleteNotice] = useState<{resume:Resume|null;settings:ResumeSettings}|null>(null);
  const editorRoot = useRef<HTMLDivElement | null>(null);
  const [activeView, setActiveView] = useState('edit');
  const [managerOpen, setManagerOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState('');
  const [exportFeedback, setExportFeedback] = useState<{type:'error'|'success';message:string;detail:string}|null>(null);
  const [activeItemId, setActiveItemId] = useState<string|null>(null);
  const [savedAt, setSavedAt] = useState('Just now');
  const [shareUrl, setShareUrl] = useState('');
  const [checkResult, setCheckResult] = useState<ReturnType<typeof runChecks>|null>(null);
  const [tailorSnapshot, setTailorSnapshot] = useState<EditorDocument|null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const paperRef = useRef<HTMLElement | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const previousLangRef = useRef<string | null>(null);

  useEffect(() => {
    setLoadError(false);
    loadedRef.current = false;
    previousLangRef.current = null;
    let cancelled = false;
    const cacheKey = `draft_${resumeId}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const cachedDocument: unknown = JSON.parse(cached);
        if (!isEditorDocument(cachedDocument)) throw new Error('INVALID_DRAFT');
        const { resume: r, settings: s } = cachedDocument;
        history.reset({ resume: normalizeResumeShape(r), settings: normalizeSettingsShape(s) });
        setDirty(true);
        setTimeout(() => { loadedRef.current = true; }, 0);
        return;
      } catch {}
    }
    getResume(resumeId).then((stored) => {
      if (cancelled) return;
      if (!stored) { setLoadError(true); return; }
      history.reset({ resume: normalizeResumeShape(stored.resume), settings: normalizeSettingsShape(stored.settings) });
      setTimeout(() => { loadedRef.current = true; }, 0);
    }).catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, [resumeId, loadAttempt]);

  useEffect(() => {
    if (!resume || previousLangRef.current === lang) return;
    previousLangRef.current = lang;
    history.map((document) => {
      if (!document.resume) return document;
      const kind = document.settings.titleKind || inferSystemResumeTitleKind(document.resume.title, document.settings.template);
      const mode = document.settings.titleMode || (kind === 'custom' ? 'custom' : 'auto');
      const localized = localizeResumeSections(document.resume, lang);
      return { ...document, resume: mode === 'auto' && kind !== 'custom'
        ? { ...localized, title: localizeResumeTitle(kind, document.settings.template, lang) } : localized };
    });
  }, [lang, resume, settings.template, settings.titleKind, settings.titleMode]);

  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!loadedRef.current) return;
    setDirty(true);
    const cacheKey = `draft_${resumeId}`;
    sessionStorage.setItem(cacheKey, JSON.stringify({ resume, settings }));
  }, [resume, settings, resumeId]);

  const [saveError, setSaveError] = useState('');
  const savingRef = useRef(false);

  const handleSave = async () => {
    if (!resume || savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError('');
    const savedDocument = history.getSnapshot().present;
    try {
      await saveResume(resumeId, savedDocument.resume!, savedDocument.settings);
      // A save finishing after a new edit/undo must not discard that newer draft.
      if (history.getSnapshot().present === savedDocument) {
        sessionStorage.removeItem(`draft_${resumeId}`);
        setDirty(false);
      }
      setSavedAt('Just now');
    } catch (err) {
      if (errorMessage(err) === 'UNAUTHORIZED') {
        setSaveError(t('Your session expired. Sign in again to save.'));
      } else {
        setSaveError(t('Save failed. Your changes are cached locally.'));
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!loadedRef.current || !dirty || saving) return;
    const timer = setTimeout(() => { handleSave(); }, 10000);
    return () => clearTimeout(timer);
  }, [resume, settings, dirty, saving]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [resume, settings]);

  useEffect(() => {
    if (!exportOpen) return undefined;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!exportMenuRef.current?.contains(event.target as Node)) setExportOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExportOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [exportOpen]);

  useEffect(() => {
    if (!exportFeedback) return undefined;
    const timer = window.setTimeout(() => setExportFeedback(null), 5000);
    return () => window.clearTimeout(timer);
  }, [exportFeedback]);

  useEffect(() => {
    const onHistoryKey = (event: KeyboardEvent) => {
      if (event.isComposing || !(event.metaKey || event.ctrlKey) || event.altKey) return;
      // Dialog search/link fields retain their native text undo.
      if ((event.target as Element).closest('[role="dialog"], [data-history-native]')) return;
      const key = event.key.toLowerCase();
      if (key === 'z' || key === 'y') {
        event.preventDefault();
        if (key === 'y' || event.shiftKey) history.redo(); else history.undo();
        setDeleteNotice(null);
      }
    };
    window.addEventListener('keydown', onHistoryKey);
    return () => window.removeEventListener('keydown', onHistoryKey);
  }, [history]);

  useEffect(() => {
    if (!deleteNotice) return undefined;
    const timer = setTimeout(() => setDeleteNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [deleteNotice]);

  useLayoutEffect(() => {
    if (!locationRequest || activeView !== 'edit') return;
    const node = [...(editorRoot.current?.querySelectorAll<HTMLElement>('[data-editor-target]') || [])]
      .find((element) => element.dataset.editorTarget === locationRequest.id);
    if (!node) return;
    if (node instanceof HTMLDetailsElement) node.open = true;
    node.scrollIntoView({ block: 'center', behavior: 'auto' });
    const field = node.querySelector<HTMLElement>('input:not([type="file"]), textarea, [contenteditable="true"]') || node.querySelector('summary');
    field?.focus({ preventScroll: true });
  }, [locationRequest, activeView]);

  const updateTitle = (title: string) => history.commit((current) => current.resume ? ({
    resume: { ...current.resume, title },
    settings: { ...current.settings, titleMode: 'custom', titleKind: 'custom' },
  }) : current, 'title');

  const locateFromPreview = (id: string) => {
    setActiveItemId(id);
    setActiveView('edit');
    setLocationRequest({ id });
  };

  if (!resume && loadError) return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <section className="max-w-md rounded-xl border border-border bg-card p-8 text-center" role="alert">
        <h1 className="text-xl font-semibold">{t('Could not load your resume')}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{t('Check your connection and try again, or return to your resumes.')}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button onClick={() => setLoadAttempt((value) => value + 1)}>{t('Retry')}</Button>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>{t('My Resumes')}</Button>
        </div>
      </section>
    </main>
  );

  if (!resume) return (
    <div className="flex h-screen flex-col bg-background">
      <div className="flex h-14 items-center justify-between border-b border-border bg-card px-4"><Skeleton className="h-8 w-56" /><Skeleton className="h-8 w-40" /></div>
      <div className="grid min-h-0 flex-1 lg:grid-cols-[64px_480px_minmax(0,1fr)]">
        <Skeleton className="hidden h-full rounded-none lg:block" />
        <div className="flex flex-col gap-4 border-r border-border p-4"><Skeleton className="h-24" /><Skeleton className="h-48" /><Skeleton className="h-72" /></div>
        <div className="grid place-items-center bg-muted/45 p-8"><Skeleton className="aspect-[210/297] h-[min(74vh,760px)]" /></div>
      </div>
    </div>
  );

  const updateResume = (recipe: (resume:Resume)=>void, group: string | null = null) => setResume((cur) => { const next = clone(cur); recipe(next); return next; }, group);
  const updateProfile = (field: keyof ResumeProfile, value: string) => updateResume((d) => { d.profile[field] = value; }, `profile:${field}`);
  const updateSection = (sectionId: string, patch: Partial<ResumeSectionData>) => updateResume((d) => { const s = d.sections.find((x) => x.id === sectionId); if (s) Object.assign(s, patch); }, Object.keys(patch).length === 1 && patch.label !== undefined ? `section:${sectionId}:label` : null);
  const updateItem = (sectionId: string, itemId: string, patch: Partial<ResumeItemData>) => updateResume((d) => { const s = d.sections.find((x) => x.id === sectionId); const item = s?.items.find((x) => x.id === itemId); if (item) Object.assign(item, patch); }, `item:${itemId}:${Object.keys(patch).sort().join()}`);
  const addSection = (type: SectionType = 'custom') => { const ns = { id: uid(), type, label: getSectionCopy(type, lang).label, visible: true, items: [createSectionItem(type, lang)] }; updateResume((d) => { d.sections.push(ns); }); setActiveItemId(ns.items[0].id); };
  const addItem = (section: ResumeSectionData) => { const item = createSectionItem(section.type, lang); updateResume((d) => { d.sections.find((x) => x.id === section.id)?.items.push(item); }); setActiveItemId(item.id); };
  const deleteSection = (id: string) => { updateResume((d) => { d.sections = d.sections.filter((x) => x.id !== id); }); setDeleteNotice(history.getSnapshot().present); };
  const deleteItem = (sId: string, iId: string) => { updateResume((d) => { const s = d.sections.find((x) => x.id === sId); if (s) s.items = s.items.filter((x) => x.id !== iId); }); setDeleteNotice(history.getSnapshot().present); };
  const moveSection = (id: string, dir: number) => updateResume((d) => { const i = d.sections.findIndex((x) => x.id === id); const t = i + dir; if (i < 0 || t < 0 || t >= d.sections.length) return; const [s] = d.sections.splice(i, 1); d.sections.splice(t, 0, s); });
  const handleAvatar = (file: File | undefined) => { if (!file) return; const r = new FileReader(); r.onload = () => updateProfile('avatar', String(r.result || '')); r.readAsDataURL(file); };

  const handleExport = async (type: string) => {
    if (!paperRef.current || isExporting) return;
    setExportFeedback(null);
    setIsExporting(type); setExportOpen(false);
    const base = resume.title || resume.profile.name || 'resume';
    const node = paperRef.current;
    try {
      const { exportResumeAsDomVectorPdf, exportResumeAsJson, exportResumeAsPng } = await import('../exporters.ts');
      if (type === 'json') {
        exportResumeAsJson(resume, settings, `${base}.json`);
      } else {
        const surface = await createExportSurface(node);
        try {
          if (type === 'pdf') await exportResumeAsDomVectorPdf(surface.node, `${base}.pdf`);
          if (type === 'png') await exportResumeAsPng(surface.node, `${base}.png`);
        } finally {
          surface.destroy();
        }
      }
      setExportFeedback({
        type: 'success',
        message: t('{type} is ready', { type: t(EXPORT_TYPE_LABELS[type] || 'File') }),
        detail: t("If you don't see a save prompt, check your browser's download settings."),
      });
    } catch {
      setExportFeedback({
        type: 'error',
        message: t('{type} export failed', { type: t(EXPORT_TYPE_LABELS[type] || 'File') }),
        detail: t('Try again. Your resume content is still safe in the editor.'),
      });
    } finally { setIsExporting(''); }
  };

  const handleShare = async () => { const url = await generateShareUrl(resume, settings); setShareUrl(url); try { await navigator.clipboard.writeText(url); } catch {} };
  const handleCheck = () => setCheckResult(runChecks(resume, t));
  return (
    <div ref={editorRoot} className="flex h-screen flex-col overflow-hidden bg-background">
      {deleteNotice === history.getSnapshot().present && canUndo && <div role="status" className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-lg">
        <span className="text-sm">{t('Deleted')}</span><Button variant="outline" size="sm" onClick={() => { history.undo(); setDeleteNotice(null); }}>{t('Undo')}</Button>
      </div>}
      <TopBar
        canUndo={canUndo} canRedo={canRedo} onUndo={() => { history.undo(); setDeleteNotice(null); }} onRedo={history.redo}
        resume={resume} activeView={activeView} onActiveView={setActiveView}
        savedAt={savedAt} dirty={dirty} saving={saving} saveError={saveError} onSave={handleSave}
        isExporting={isExporting} exportOpen={exportOpen}
        exportMenuRef={exportMenuRef}
        fontFamily={settings.fontFamily}
        onFontFamily={(fontFamily) => setSettings((current) => ({ ...current, fontFamily }))}
        onResumeTitle={updateTitle}
        onManager={() => setManagerOpen(true)}
        onExportToggle={() => setExportOpen((v) => !v)}
        onExport={handleExport} onShare={handleShare} onCheck={handleCheck}
      />
      <div className="shrink-0 border-b border-border bg-card px-4 py-1.5 sm:hidden">
        <input className="w-full min-w-0 truncate rounded bg-transparent text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring" aria-label={t('Resume name')} value={resume.title} onChange={(event) => updateTitle(event.target.value)} />
      </div>
      {exportFeedback && (
        <div
          className={cn(
            "fixed right-3 top-[4.25rem] z-[80] flex w-[min(24rem,calc(100vw-1.5rem))] items-start gap-3 rounded-lg border bg-card px-4 py-3 text-foreground shadow-lg sm:right-4",
            exportFeedback.type === 'success'
              ? "border-emerald-300"
              : "border-destructive/30"
          )}
          role={exportFeedback.type === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          {exportFeedback.type === 'success'
            ? <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={18} />
            : <CircleAlert className="mt-0.5 shrink-0 text-destructive" size={18} />}
          <div className="min-w-0 flex-1">
            <strong className="block text-sm font-semibold">{exportFeedback.message}</strong>
            <p className="mt-0.5 text-xs leading-5 opacity-80">{exportFeedback.detail}</p>
          </div>
          <button
            type="button"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md opacity-70 transition hover:bg-muted hover:opacity-100"
            onClick={() => setExportFeedback(null)}
            aria-label={t('Close export notification')}
          >
            <X size={14} />
          </button>
        </div>
      )}
      <main className={cn(
        "flex-1 grid min-h-0 overflow-hidden grid-rows-[auto_minmax(0,1fr)] lg:grid-rows-1",
        activeView === 'preview'
          ? "grid-cols-1 lg:grid-cols-[64px_minmax(0,1fr)]"
          : "grid-cols-1 lg:grid-cols-[64px_480px_minmax(0,1fr)]"
      )}>
        <SideRail activeView={activeView} onActiveView={setActiveView} onTailor={() => setTailorSnapshot({ resume: clone(resume), settings: clone(settings) })} />
        <MobileModeBar activeView={activeView} onActiveView={setActiveView} onTailor={() => setTailorSnapshot({ resume: clone(resume), settings: clone(settings) })} />
        {activeView !== 'preview' && (
          <div className="light-panel min-h-0 border-r border-zinc-200 bg-white">
            {activeView === 'template' ? (
              <TemplateStylePanel resume={resume} settings={settings} onSettings={setSettings} />
            ) : (
              <EditorPanel
                resume={resume} activeItemId={activeItemId}
                onProfile={updateProfile} onAvatar={handleAvatar}
                onSection={updateSection} onItem={updateItem}
                onAddItem={addItem} onAddSection={addSection}
                onDeleteSection={deleteSection} onDeleteItem={deleteItem}
                onMoveSection={moveSection} onActiveItem={setActiveItemId}
                onCheck={handleCheck}
              />
            )}
          </div>
        )}
        <PreviewStage className={activeView === 'preview' ? "flex" : "hidden lg:flex"}>
          {({ scale }) => <PaginatedResumePreview resume={resume} settings={settings} refNode={paperRef} scale={scale} activeItemId={activeItemId} onLocate={locateFromPreview} />}
        </PreviewStage>
      </main>
      {managerOpen && <ModuleManager resume={resume} onClose={() => setManagerOpen(false)} onAddSection={addSection} onSection={updateSection} onMoveSection={moveSection} onDeleteSection={deleteSection} />}
      {shareUrl && <ShareModal url={shareUrl} onClose={() => setShareUrl('')} />}
      {checkResult && <CheckPanel result={checkResult} onClose={() => setCheckResult(null)} />}
      {tailorSnapshot && <TailorResumeDialog key={resumeId} snapshot={tailorSnapshot} currentResume={resume} onClose={() => setTailorSnapshot(null)} />}
    </div>
  );
}

function ShareModal({ url, onClose }: {url:string;onClose?:() => void}) {
  const { t } = useTheme();
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 px-5" onClick={onClose}>
      <div className="flex w-full max-w-md flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-semibold text-foreground">{t('Share link created')}</h3>
        <p className="text-sm text-muted-foreground">{t('The link was copied to your clipboard. Anyone with it can view the resume preview.')}</p>
        <input readOnly value={url} onFocus={(e) => e.target.select()} className="w-full px-3 py-2 bg-muted border border-border rounded-md text-xs text-foreground" />
        <Button className="w-full" onClick={onClose}>{t('Close')}</Button>
      </div>
    </div>
  );
}

function CheckPanel({ result, onClose }: {result:ReturnType<typeof runChecks>;onClose?:() => void}) {
  const { t } = useTheme();
  const typeLabel = { error: t('Error'), warning: t('Warning'), suggestion: t('Suggestion') };
  const typeColor: Record<string, React.ComponentProps<typeof Badge>["variant"]> = { error: 'destructive', warning: 'warning', suggestion: 'secondary' };
  return (
    <div className="fixed top-0 right-0 h-full w-80 bg-card border-l border-border z-40 flex flex-col overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <strong className="text-sm text-foreground">{t('Resume check')}</strong>
          <Badge variant="outline">{t('{score} points', { score: result.score })}</Badge>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X size={16} /></Button>
      </header>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
        {result.results.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">{t('Great—no issues found!')}</p>}
        {result.results.map((r, i) => (
          <div key={i} className="flex flex-col gap-1 rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-2">
              <Badge variant={typeColor[r.type]}>{typeLabel[r.type]}</Badge>
              <span className="text-xs text-muted-foreground">{r.category}</span>
            </div>
            <p className="text-xs text-foreground leading-relaxed">{r.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopBar({ canUndo, canRedo, onUndo, onRedo, resume, activeView, onActiveView, savedAt, dirty, saving, saveError, onSave, isExporting, exportOpen, exportMenuRef, fontFamily, onFontFamily, onResumeTitle, onManager, onExportToggle, onExport, onShare, onCheck }: {canUndo:boolean;canRedo:boolean;onUndo:() => void;onRedo:() => void;resume:Resume;activeView:string;onActiveView:(view:string) => void;savedAt:string;dirty:boolean;saving:boolean;saveError:string;onSave:() => void;isExporting:string;exportOpen:boolean;exportMenuRef:React.RefObject<HTMLDivElement>;fontFamily:string;onFontFamily:(font:string) => void;onResumeTitle:(title:string) => void;onManager:() => void;onExportToggle:() => void;onExport:(type:string) => void;onShare:() => void;onCheck:() => void}) {
  const { t } = useTheme();
  const modes = [
    { id: 'edit', label: 'Edit', icon: PencilLine },
    { id: 'template', label: 'Style', icon: LayoutTemplate },
    { id: 'preview', label: 'Preview', icon: Eye },
  ];
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <Button variant="ghost" size="sm" className="shrink-0" onClick={() => navigate('/dashboard')} aria-label={t('Back to My Resumes')}>
          <Home size={14} /> <span className="hidden sm:inline">{t('My Resumes')}</span>
        </Button>
        <Button
          variant={dirty ? "default" : "ghost"}
          size="sm"
          className={`shrink-0 gap-1 ${saveError ? 'text-red-500' : ''}`}
          onClick={onSave}
          disabled={saving || !dirty}
          aria-label={saving ? t('Saving') : saveError ? saveError : dirty ? t('Save resume') : t('Resume saved {time}', { time: t(savedAt) })}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          <span className="hidden sm:inline">{saving ? t('Saving') : saveError ? saveError : dirty ? t('Save') : t('Saved · {time}', { time: t(savedAt) })}</span>
        </Button>
        <div className="hidden h-5 w-px bg-border sm:block" />
        <div className="hidden min-w-0 sm:block">
          <input
            className="block w-32 max-w-full truncate rounded border-none bg-transparent px-1 text-sm font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary xl:w-48"
            value={resume.title} onChange={(e) => onResumeTitle(e.target.value)} aria-label={t('Resume name')}
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        <Button variant="ghost" size="icon-sm" disabled={!canUndo} onMouseDown={(event) => event.preventDefault()} onClick={onUndo} aria-label={t('Undo')} title={t('Undo') + ' (Ctrl/⌘ Z)'}><Undo2 /></Button>
        <Button variant="ghost" size="icon-sm" disabled={!canRedo} onMouseDown={(event) => event.preventDefault()} onClick={onRedo} aria-label={t('Redo')} title={t('Redo') + ' (Ctrl/⌘ Shift Z)'}><Redo2 /></Button>
      </div>
      <FontPicker
        value={fontFamily}
        onChange={onFontFamily}
        className="hidden w-32 shrink-0 xl:block"
        selectClassName="py-1.5"
        ariaLabel={t('Top bar font')}
      />

      <div className="ml-auto hidden items-center rounded-md border border-border bg-background p-0.5 lg:flex">
        {modes.map((mode) => {
          const Icon = mode.icon;
          return (
            <button
              key={mode.id}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                activeView === mode.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
              onClick={() => onActiveView(mode.id)}
            >
              <Icon size={14} />
              {t(mode.label)}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <LanguageMenu />
        <Button variant="outline" size="sm" className="hidden text-xs md:inline-flex" onClick={onManager}>{t('Sections')}</Button>
        <Button variant="ghost" size="sm" className="hidden text-xs md:inline-flex" onClick={onCheck}><Sparkles size={14} /> {t('Check')}</Button>
        <Button variant="ghost" size="sm" className="hidden text-xs sm:inline-flex" onClick={onShare}><Share2 size={14} /> {t('Share')}</Button>
        <div className="relative" ref={exportMenuRef}>
          <Button
            size="sm"
            onClick={onExportToggle}
            disabled={Boolean(isExporting)}
            aria-haspopup="menu"
            aria-expanded={exportOpen}
            aria-controls="resume-export-menu"
            aria-label={isExporting ? t('Exporting {type}', { type: t(EXPORT_TYPE_LABELS[isExporting] || 'File') }) : t('Open download menu')}
          >
            {isExporting ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
            <span className="hidden sm:inline">{isExporting ? t('Exporting') : t('Export')}</span>
          </Button>
          {exportOpen && (
            <div id="resume-export-menu" role="menu" aria-label={t('Choose export format')} className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-lg">
              <button role="menuitem" className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-xs font-medium transition-colors hover:bg-muted focus:bg-muted focus:outline-none" onClick={() => onExport('pdf')}><FileText size={14} className="text-muted-foreground" /> {t('Export PDF')}</button>
              <button role="menuitem" className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-xs font-medium transition-colors hover:bg-muted focus:bg-muted focus:outline-none" onClick={() => onExport('png')}><ImageDown size={14} className="text-muted-foreground" /> {t('Export image')}</button>
              <div className="my-1 h-px bg-border" />
              <button role="menuitem" className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-xs font-medium transition-colors hover:bg-muted focus:bg-muted focus:outline-none" onClick={() => onExport('json')}><FileJson size={14} className="text-muted-foreground" /> {t('Back up JSON')}</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function FontPicker({ value, onChange, className, selectClassName, ariaLabel = 'Font' }: {value:string | undefined;onChange:(value:string) => void;className?:string;selectClassName?:string;ariaLabel?:string}) {
  const { lang } = useTheme();
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="sr-only">{ariaLabel}</span>
      <select
        className={cn("w-full rounded-md border border-zinc-200 bg-white px-2.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15", selectClassName)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
      >
        {FONT_OPTIONS.map((font) => (
          <option key={font.value} value={font.value}>{font.label[lang] || font.label.en}</option>
        ))}
      </select>
    </label>
  );
}

function SideRail({ activeView, onActiveView, onTailor }: {activeView:string;onActiveView:(view:string) => void;onTailor:() => void}) {
  const { t } = useTheme();
  const items = [
    { id: 'edit', label: 'Edit', icon: PencilLine },
    { id: 'template', label: 'Style', icon: LayoutTemplate },
    { id: 'preview', label: 'Preview', icon: Eye }
  ];
  return (
    <nav className="hidden flex-col items-center gap-2 border-r border-border bg-card py-4 lg:flex" aria-label={t('Editor navigation')}>
      <button onClick={onTailor} title={t('Tailor to a job')} aria-label={t('Tailor to a job')} className="flex w-12 flex-col items-center gap-1 rounded-lg bg-primary/10 px-1 py-2.5 text-[10px] text-primary transition-colors hover:bg-primary/20"><Sparkles size={18} /><span>{t('Tailor')}</span></button>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            className={cn(
              "flex flex-col items-center gap-1 w-12 py-2.5 rounded-lg text-[10px] transition-colors",
              activeView === item.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            onClick={() => onActiveView(item.id)}
          >
            <Icon size={18} /><span>{t(item.label)}</span>
          </button>
        );
      })}
    </nav>
  );
}

function MobileModeBar({ activeView, onActiveView, onTailor }: {activeView:string;onActiveView:(view:string) => void;onTailor:() => void}) {
  const { t } = useTheme();
  const items = [
    { id: 'edit', label: 'Edit', icon: PencilLine },
    { id: 'template', label: 'Style', icon: LayoutTemplate },
    { id: 'preview', label: 'Preview', icon: Eye }
  ];
  return (
    <nav className="flex gap-1 border-b border-border bg-card p-2 lg:hidden" aria-label={t('Editor views')}>
      <button onClick={onTailor} aria-label={t('Tailor to a job')} className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-2 text-xs text-primary"><Sparkles size={14} />{t('Tailor')}</button>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium",
              activeView === item.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            )}
            onClick={() => onActiveView(item.id)}
          >
            <Icon size={14} />
            {t(item.label)}
          </button>
        );
      })}
    </nav>
  );
}

function EditorPanel({ resume, activeItemId, onProfile, onAvatar, onSection, onItem, onAddItem, onAddSection, onDeleteSection, onDeleteItem, onMoveSection, onActiveItem, onCheck }: {resume:Resume;activeItemId?:string | null;onProfile:(field:keyof ResumeProfile,value:string) => void;onAvatar:(file:File | undefined) => void;onSection:(id:string,patch:Partial<ResumeSectionData>) => void;onItem:(sectionId:string,itemId:string,patch:Partial<ResumeItemData>) => void;onAddItem:(section:ResumeSectionData) => void;onAddSection:(type?:SectionType) => void;onDeleteSection:(id:string) => void;onDeleteItem:(sectionId:string,itemId:string) => void;onMoveSection:(id:string,direction:number) => void;onActiveItem:(id:string) => void;onCheck:() => void}) {
  const { t } = useTheme();
  const stats = getResumeStats(resume);
  return (
    <section className="flex h-full min-w-0 flex-col gap-4 overflow-y-auto overflow-x-hidden p-4" aria-label={t('Resume editor')}>
      <EditorOverview stats={stats} onCheck={onCheck} />
      <QuickSections resume={resume} onAddSection={onAddSection} />
      <div data-editor-target="profile" onFocusCapture={() => onActiveItem("profile")}><ProfileEditor profile={resume.profile} onProfile={onProfile} onAvatar={onAvatar} /></div>
      {resume.sections.map((section, index) => (
        <SectionEditor key={section.id} section={section} index={index} total={resume.sections.length}
          activeItemId={activeItemId} onSection={onSection} onItem={onItem} onAddItem={onAddItem}
          onDeleteSection={onDeleteSection} onDeleteItem={onDeleteItem} onMoveSection={onMoveSection} onActiveItem={onActiveItem} />
      ))}
      <Button variant="outline" className="w-full" onClick={() => onAddSection('custom')}>
        <Plus size={15} /> {t('Add custom section')}
      </Button>
    </section>
  );
}

function EditorOverview({ stats, onCheck }: {stats:ReturnType<typeof getResumeStats>;onCheck:() => void}) {
  const { t } = useTheme();
  return (
    <section className="rounded-lg border border-zinc-200 bg-white/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Gauge size={15} className="text-primary" />
            <h2 className="text-sm font-semibold text-foreground">{t('Resume completeness')}</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{t('Complete your profile first, then add experience and skills.')}</p>
        </div>
        <strong className="text-lg text-foreground">{stats.progress}%</strong>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-200">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${stats.progress}%` }} />
      </div>
      <div className="mt-3 grid grid-cols-3 divide-x divide-zinc-200 rounded-md border border-zinc-200 bg-white text-xs">
        <div className="px-2 py-2">
          <strong className="block text-foreground">{stats.profileDone}/5</strong>
          <span className="text-muted-foreground">{t('Profile')}</span>
        </div>
        <div className="px-2 py-2">
          <strong className="block text-foreground">{stats.visibleSections.length}</strong>
          <span className="text-muted-foreground">{t('Sections')}</span>
        </div>
        <div className="px-2 py-2">
          <strong className="block text-foreground">{stats.filledItems}/{Math.max(stats.itemCount, 1)}</strong>
          <span className="text-muted-foreground">{t('Content')}</span>
        </div>
      </div>
      <Button size="sm" variant="outline" className="mt-3 w-full text-xs" onClick={onCheck}>
        <Sparkles size={13} /> {t('Check writing and keywords')}
      </Button>
    </section>
  );
}

function QuickSections({ resume, onAddSection }: {resume:Resume;onAddSection:(type?:SectionType) => void}) {
  const { lang, t } = useTheme();
  const existing = new Set(resume.sections.map((section) => section.type));
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">{t('Quick add')}</h2>
        <span className="text-[11px] text-muted-foreground">{t('Common resume sections')}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {QUICK_SECTION_TYPES.map((type) => {
          const tpl = SECTION_TEMPLATES[type];
          const Icon = iconMap[tpl.icon] ?? PlusCircle;
          const added = existing.has(type);
          return (
            <button
              key={type}
              className={cn(
                "flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-xs transition-colors",
                added ? "border-zinc-200 bg-muted/40 text-muted-foreground" : "border-zinc-200 bg-white text-foreground hover:border-primary/50 hover:bg-primary/5"
              )}
              onClick={() => { if (!added) onAddSection(type); }}
              disabled={added}
            >
              <Icon size={14} className={added ? "text-muted-foreground" : "text-primary"} />
              <span className="truncate">{getSectionCopy(type, lang).label}</span>
              {added && <CheckCircle2 size={12} className="ml-auto" />}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function TemplateStylePanel({ resume, settings, onSettings }: {resume:Resume;settings:ResumeSettings;onSettings:Setter<ResumeSettings>}) {
  const { lang, t } = useTheme();
  const updateSetting = <K extends keyof ResumeSettings,>(f: K, v: ResumeSettings[K]) => onSettings((c) => ({ ...c, [f]: v }), `setting:${f}`);
  const colorPresets = ['#8b63f6', '#2468c9', '#0f766e', '#d97706', '#d94f74', '#374151'];
  const selectedTemplate = RESUME_TEMPLATES.find((template) => template.id === settings.template) ?? RESUME_TEMPLATES[0];
  return (
    <section className="flex h-full min-w-0 flex-col gap-4 overflow-y-auto overflow-x-hidden bg-white p-4" aria-label={t('Template style')}>
      <div className="rounded-lg border border-zinc-200 bg-white/50 p-4">
        <div className="flex items-center gap-2">
          <Palette size={15} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">{t('Template style')}</h2>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {t('Using {template}. Style changes appear in the preview immediately.', { template: selectedTemplate?.label?.[lang] || t('Default template') })}
        </p>
      </div>

      <EditorTemplatePicker resume={resume} settings={settings} onSettings={onSettings} Preview={ResumePreview} />

      <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-foreground">{t('Typography')}</h3>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">{t('Font')}</span>
          <FontPicker value={settings.fontFamily} onChange={(value) => updateSetting('fontFamily', value)} ariaLabel={t('Font')} />
        </div>
        <SettingSlider label={t('Font size')} value={settings.fontSize} min={10} max={14} step={1} suffix="px" onChange={(v) => updateSetting('fontSize', v)} />
        <SettingSlider label={t('Line height')} value={settings.lineHeight} min={1.35} max={1.85} step={0.01} onChange={(v) => updateSetting('lineHeight', Number(v.toFixed(2)))} />
        <label className="flex items-center gap-2 rounded-md border border-zinc-200 p-3 cursor-pointer hover:bg-muted/50">
          <input type="checkbox" className="rounded" checked={settings.compact} onChange={(e) => updateSetting('compact', e.target.checked)} />
          <div><strong className="text-xs text-foreground">{t('Smart one-page layout')}</strong><p className="text-[11px] text-muted-foreground">{t('Tighten section spacing to help keep the resume on one page.')}</p></div>
        </label>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-foreground">{t('Accent color')}</h3>
        <div className="flex flex-wrap items-center gap-2">
          {colorPresets.map((c) => (
            <button
              key={c}
              title={c}
              className={cn("h-7 w-7 rounded-full border-2 transition-transform", settings.accent === c ? "border-foreground scale-110" : "border-white shadow-[0_0_0_1px_rgba(0,0,0,0.12)]")}
              style={{ background: c }}
              onClick={() => updateSetting('accent', c)}
            />
          ))}
          <label className="ml-auto flex items-center gap-1.5 rounded-md border border-zinc-200 px-2 py-1.5 text-xs text-muted-foreground cursor-pointer hover:bg-muted">
            <input type="color" className="h-5 w-5 rounded border-0 cursor-pointer" value={settings.accent} onChange={(e) => updateSetting('accent', e.target.value)} />
            {t('Custom')}
          </label>
        </div>
      </div>
    </section>
  );
}

function SettingSlider({ label, value, min, max, step, suffix = '', onChange }: {label:string;value:number;min:number;max:number;step:number;suffix?:string;onChange:(value:number)=>void}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <strong className="font-medium text-foreground">{value}{suffix}</strong>
      </span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        className="w-full accent-primary"
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function ProfileEditor({ profile, onProfile, onAvatar }: {profile:ResumeProfile;onProfile:(field:keyof ResumeProfile,value:string) => void;onAvatar:(file:File | undefined) => void}) {
  const { t } = useTheme();
  const avatarSrc = resolveResumeAvatar(profile.avatar);
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">{t('Profile information')}</h2>
        </div>
        <span className="text-[11px] text-muted-foreground">{t('Photo optional')}</span>
      </div>
      <div className="grid grid-cols-[76px_minmax(0,1fr)] gap-3">
        <label className="grid h-24 w-[72px] shrink-0 cursor-pointer place-items-center overflow-hidden rounded-md border border-border bg-muted hover:ring-2 hover:ring-primary/30">
          <img src={avatarSrc} alt={t('Profile photo')} className="h-full w-full object-cover" />
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onAvatar(e.target.files?.[0])} />
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Field label={t('Name')} value={profile.name} onChange={(v) => onProfile('name', v)} />
          <Field label={t('Target role')} value={profile.headline} onChange={(v) => onProfile('headline', v)} />
          <Field label={t('Phone')} value={profile.phone} onChange={(v) => onProfile('phone', v)} />
          <Field label={t('Email')} value={profile.email} onChange={(v) => onProfile('email', v)} />
          <Field label={t('Personal website')} value={profile.website} onChange={(v) => onProfile('website', v)} />
          <Field label={t('Current city')} value={profile.city} onChange={(v) => onProfile('city', v)} />
          <Field label={t('Date of birth')} value={profile.birthday} onChange={(v) => onProfile('birthday', v)} />
          <Field label={t('Current status')} value={profile.status} onChange={(v) => onProfile('status', v)} />
        </div>
      </div>
    </section>
  );
}

function SectionEditor({ section, index, total, activeItemId, onSection, onItem, onAddItem, onDeleteSection, onDeleteItem, onMoveSection, onActiveItem }: {section:ResumeSectionData;index:number;total:number;activeItemId?:string | null;onSection:(id:string,patch:Partial<ResumeSectionData>) => void;onItem:(sectionId:string,itemId:string,patch:Partial<ResumeItemData>) => void;onAddItem:(section:ResumeSectionData) => void;onDeleteSection:(id:string) => void;onDeleteItem:(sectionId:string,itemId:string) => void;onMoveSection:(id:string,direction:number) => void;onActiveItem:(id:string) => void}) {
  const { lang, t } = useTheme();
  const tpl = SECTION_TEMPLATES[section.type] ?? SECTION_TEMPLATES.custom;
  const Icon = iconMap[tpl.icon] ?? PlusCircle;
  return (
    <section data-editor-target={`section:${section.id}`} onFocusCapture={(event) => { if (!(event.target as Element).closest("details")) onActiveItem(`section:${section.id}`); }} className={cn("flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4", !section.visible && "opacity-60")}>
      <header className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon size={14} />
        </span>
        <input className="flex-1 bg-transparent text-sm font-semibold text-foreground border-none focus:outline-none focus:ring-1 focus:ring-ring rounded px-1" value={section.label} onChange={(e) => onSection(section.id, { label: e.target.value })} />
        <div className="flex items-center gap-0.5">
          <button className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-30" title={t('Move section up')} onClick={() => onMoveSection(section.id, -1)} disabled={index === 0}><MoveUp size={14} /></button>
          <button className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-30" title={t('Move section down')} onClick={() => onMoveSection(section.id, 1)} disabled={index === total - 1}><MoveDown size={14} /></button>
          <button className="p-1 rounded hover:bg-muted text-muted-foreground" title={section.visible ? t('Hide section') : t('Show section')} onClick={() => onSection(section.id, { visible: !section.visible })}><Eye size={14} /></button>
          <button className="p-1 rounded hover:bg-muted text-destructive" title={t('Delete section')} onClick={() => onDeleteSection(section.id)}><Trash2 size={14} /></button>
        </div>
      </header>
      {section.items.length === 0 && <p className="text-xs text-muted-foreground/60 py-2">{getSectionCopy(section.type, lang).empty}</p>}
      {section.items.map((item, idx) => (
        <details key={item.id} data-editor-target={item.id} onFocusCapture={() => onActiveItem(item.id)} className={cn("rounded-md border border-border overflow-hidden", activeItemId === item.id && "border-primary/50")} ref={(el) => { if (el && idx === 0 && !el.dataset.inited) { el.open = true; el.dataset.inited = '1'; } }} onClick={() => onActiveItem(item.id)}>
          <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50 text-sm">
            <span className="flex-1 truncate text-foreground">{getItemTitle(section, item, t)}</span>
            <small className="text-xs text-muted-foreground truncate max-w-[120px]">{getItemMeta(section, item, t)}</small>
            <span role="button" aria-label={t('Delete entry')} tabIndex={0} className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteItem(section.id, item.id); }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onDeleteItem(section.id, item.id); } }}><Trash2 size={13} /></span>
          </summary>
          <div className="px-3 pb-3 pt-1">
            <EntryForm section={section} item={item} onItem={(patch) => onItem(section.id, item.id, patch)} />
          </div>
        </details>
      ))}
      <button className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 py-1" onClick={() => onAddItem(section)}>
        <Plus size={13} /> {t('Add another {section}', { section: section.label })}
      </button>
    </section>
  );
}

function EntryForm({ section, item, onItem }: {section:ResumeSectionData;item:ResumeItemData;onItem:(patch:Partial<ResumeItemData>) => void}) {
  const { lang, t } = useTheme();
  const kind = SECTION_TEMPLATES[section.type]?.kind ?? 'experience';
  const chineseLocale = lang === 'zh' || lang === 'zh-TW';
  const schoolSuggestions = HOT_SCHOOL_OPTIONS[lang] || (chineseLocale ? HOT_SCHOOL_OPTIONS.zh : HOT_SCHOOL_OPTIONS.en);
  const majorSuggestions = HOT_MAJOR_OPTIONS[lang] || (chineseLocale ? HOT_MAJOR_OPTIONS.zh : HOT_MAJOR_OPTIONS.en);
  const degreeOptions = DEGREE_OPTIONS[lang] || (chineseLocale ? DEGREE_OPTIONS.zh : DEGREE_OPTIONS.en);
  if (kind === 'text') return (
    <div className="flex flex-col gap-2">
      <Field label={t('Title')} value={item.title} onChange={(v) => onItem({ title: v })} />
      <TextArea label={t('Body')} value={item.body} onChange={(v) => onItem({ body: v })} />
    </div>
  );
  if (kind === 'education') return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <ComboField label={t('School')} listId="school-options" value={item.school} onChange={(v) => onItem({ school: v })} options={chineseLocale ? CHINA_SCHOOL_OPTIONS : HOT_SCHOOL_OPTIONS.en} hotOptions={schoolSuggestions} placeholder={t('Enter or search for a school')} />
      <ComboField label={t('Field of study')} listId="major-options" value={item.major} onChange={(v) => onItem({ major: v })} options={chineseLocale ? CHINA_MAJOR_OPTIONS : HOT_MAJOR_OPTIONS.en} hotOptions={majorSuggestions} placeholder={t('Enter or search for a field of study')} />
      <ComboField label={t('Degree')} listId="degree-options" value={item.degree} onChange={(v) => onItem({ degree: v })} options={degreeOptions} />
      <Field label={t('Location')} value={item.location} onChange={(v) => onItem({ location: v })} placeholder={t('Optional')} />
      <div className="col-span-2">
        <PeriodPicker
          startDate={item.startDate ?? ''}
          endDate={item.endDate ?? ''}
          current={!!item.current}
          onChange={({ startDate, endDate, current }) => onItem({ startDate, endDate, current, period: '' })}
        />
      </div>
      <div className="col-span-2"><RichTextEditor label={t('Additional details')} value={getEducationBody(item)} onChange={(v) => onItem({ body: v, details: [] })} /></div>
    </div>
  );
  if (kind === 'simpleList') return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <Field label={t('Name')} value={item.title} onChange={(v) => onItem({ title: v })} />
      <Field label={t('Date / level')} value={item.meta} onChange={(v) => onItem({ meta: v })} />
      <div className="col-span-2"><TextArea label={t('Description')} value={item.description} onChange={(v) => onItem({ description: v })} /></div>
    </div>
  );
  if (kind === 'chips') return (
    <div className="flex flex-col gap-2">
      <Field label={t('Title')} value={item.title} onChange={(v) => onItem({ title: v })} />
      <TextArea label={t('Skills, one per line')} value={(item.values ?? []).join('\n')} onChange={(v) => onItem({ values: normalizeLines(v) })} />
    </div>
  );
  if (section.type === 'work') return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <Field label={t('Company')} value={item.org} onChange={(v) => onItem({ org: v })} />
      <Field label={t('Role / title')} value={item.role} onChange={(v) => onItem({ role: v })} />
      <Field label={t('Department')} value={item.department} onChange={(v) => onItem({ department: v })} placeholder={t('Optional')} />
      <Field label={t('Work location')} value={item.location} onChange={(v) => onItem({ location: v })} />
      <div className="col-span-2">
        <PeriodPicker
          startDate={item.startDate ?? ''}
          endDate={item.endDate ?? ''}
          current={!!item.current}
          onChange={({ startDate, endDate, current }) => onItem({ startDate, endDate, current, period: '' })}
        />
      </div>
      <div className="col-span-2"><RichTextEditor label={t('Content')} value={getExperienceBody(item)} onChange={(v) => onItem({ body: v, bullets: [] })} /></div>
    </div>
  );
  if (section.type === 'project') return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <Field label={t('Project name')} value={item.org} onChange={(v) => onItem({ org: v })} />
      <Field label={t('Project role')} value={item.role} onChange={(v) => onItem({ role: v })} />
      <div className="col-span-2">
        <PeriodPicker
          startDate={item.startDate ?? ''}
          endDate={item.endDate ?? ''}
          current={!!item.current}
          onChange={({ startDate, endDate, current }) => onItem({ startDate, endDate, current, period: '' })}
        />
      </div>
      <div className="col-span-2"><RichTextEditor label={t('Content')} value={getExperienceBody(item)} onChange={(v) => onItem({ body: v, bullets: [] })} /></div>
    </div>
  );
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <Field label={t('Organization / company')} value={item.org} onChange={(v) => onItem({ org: v })} />
      <Field label={t('Position / role')} value={item.role} onChange={(v) => onItem({ role: v })} />
      <Field label={t('Dates')} value={item.period} onChange={(v) => onItem({ period: v })} />
      <Field label={t('Location')} value={item.location} onChange={(v) => onItem({ location: v })} />
      <div className="col-span-2"><RichTextEditor label={t('Content')} value={getExperienceBody(item)} onChange={(v) => onItem({ body: v, bullets: [] })} /></div>
    </div>
  );
}

function RichTextEditor({ label, value, onChange }: {label:string;value:string | undefined;onChange:(value:string) => void}) {
  const { t } = useTheme();
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [linkPopup, setLinkPopup] = useState<{url:string;text:string;editing:boolean}|null>(null);
  useLayoutEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    const s = sanitizeRichText(value);
    if (sanitizeRichText(ed.innerHTML) !== s) {
      ed.innerHTML = s;
      if (document.activeElement === ed) {
        const range = document.createRange();
        range.selectNodeContents(ed); range.collapse(false);
        const selection = window.getSelection()!;
        selection.removeAllRanges(); selection.addRange(range);
      }
    }
  }, [value]);
  const sync = () => { const ed = editorRef.current; if (!ed) return; const next = sanitizeRichText(ed.innerHTML); if (next !== sanitizeRichText(value)) onChange(next); };
  const fmt = (cmd: string) => { const ed = editorRef.current; if (!ed) return; ed.focus(); document.execCommand('styleWithCSS', false, 'false'); document.execCommand(cmd, false); sync(); };
  const savedSelRef = useRef<Range | null>(null);
  const openLinkPopup = () => {
    const sel = window.getSelection()!;
    if (sel && sel.rangeCount > 0) {
      savedSelRef.current = sel.getRangeAt(0).cloneRange();
    }
    const anchor = sel?.anchorNode?.parentElement?.closest('a') || sel?.focusNode?.parentElement?.closest('a');
    if (anchor) {
      setLinkPopup({ url: anchor.getAttribute('href') || '', text: anchor.textContent || '', editing: true });
    } else {
      const text = sel?.toString() || '';
      setLinkPopup({ url: 'https://', text, editing: false });
    }
  };
  const applyLink = () => {
    if (!linkPopup) return;
    const ed = editorRef.current;
    if (!ed) return;
    const { url, text, editing } = linkPopup;
    if (!url || !url.startsWith('http')) { setLinkPopup(null); return; }
    ed.focus();
    if (savedSelRef.current) {
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(savedSelRef.current);
    }
    if (editing) {
      const sel = window.getSelection()!;
      const anchor = sel?.anchorNode?.parentElement?.closest('a') || sel?.focusNode?.parentElement?.closest('a');
      if (anchor) {
        anchor.href = url;
        anchor.textContent = text || url;
      }
    } else {
      const linkText = text || url;
      document.execCommand('insertHTML', false, `<a href="${url}" target="_blank" rel="noopener">${linkText}</a>`);
    }
    sync();
    savedSelRef.current = null;
    setLinkPopup(null);
  };
  const removeLink = () => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.focus();
    if (savedSelRef.current) {
      const sel = window.getSelection()!;
      sel.removeAllRanges();
      sel.addRange(savedSelRef.current);
    }
    document.execCommand('unlink', false);
    sync();
    savedSelRef.current = null;
    setLinkPopup(null);
  };
  const paste = (e: React.ClipboardEvent<HTMLDivElement>) => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); requestAnimationFrame(sync); };
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="relative rounded-md border border-zinc-200 bg-white">
        <div className="flex items-center gap-0.5 border-b border-zinc-200 bg-muted/40 px-1.5 py-1">
          <button type="button" className="p-0.5 rounded hover:bg-muted text-muted-foreground" title={t('Bold')} onMouseDown={(e) => e.preventDefault()} onClick={() => fmt('bold')}><Bold size={13} /></button>
          <button type="button" className="p-0.5 rounded hover:bg-muted text-muted-foreground" title={t('Italic')} onMouseDown={(e) => e.preventDefault()} onClick={() => fmt('italic')}><Italic size={13} /></button>
          <button type="button" className="p-0.5 rounded hover:bg-muted text-muted-foreground" title={t('Underline')} onMouseDown={(e) => e.preventDefault()} onClick={() => fmt('underline')}><Underline size={13} /></button>
          <span className="mx-1 h-4 w-px bg-zinc-200" />
          <button type="button" className="p-0.5 rounded hover:bg-muted text-muted-foreground" title={t('Bulleted list')} onMouseDown={(e) => e.preventDefault()} onClick={() => fmt('insertUnorderedList')}><List size={13} /></button>
          <button type="button" className="p-0.5 rounded hover:bg-muted text-muted-foreground" title={t('Numbered list')} onMouseDown={(e) => e.preventDefault()} onClick={() => fmt('insertOrderedList')}><ListOrdered size={13} /></button>
          <span className="mx-1 h-4 w-px bg-zinc-200" />
          <button type="button" className={cn("p-0.5 rounded hover:bg-muted", linkPopup ? "text-primary bg-primary/10" : "text-muted-foreground")} title={t('Insert link')} onMouseDown={(e) => e.preventDefault()} onClick={openLinkPopup}><Link2 size={13} /></button>
          <span className="mx-1 h-4 w-px bg-zinc-200" />
          <button type="button" className="p-0.5 rounded hover:bg-muted text-muted-foreground" title={t('Clear formatting')} onMouseDown={(e) => e.preventDefault()} onClick={() => fmt('removeFormat')}><Eraser size={13} /></button>
        </div>
        <div ref={editorRef} className="min-h-[104px] px-2.5 py-2 text-xs leading-relaxed text-foreground focus:outline-none" role="textbox" contentEditable data-placeholder={t('Enter content')} suppressContentEditableWarning onInput={sync} onBlur={sync} onPaste={paste} />
      </div>
      {linkPopup && (
        <div data-history-native className="fixed inset-0 z-50" onClick={() => setLinkPopup(null)}>
          <div className="absolute left-1/2 top-1/2 flex w-72 -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-sm font-medium text-foreground">{linkPopup.editing ? t('Edit link') : t('Insert link')}</h4>
            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">{t('Link URL')}</span>
                <input className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" placeholder="https://example.com" value={linkPopup.url} onChange={(e) => setLinkPopup({ ...linkPopup, url: e.target.value })} autoFocus onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyLink(); } if (e.key === 'Escape') setLinkPopup(null); }} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-muted-foreground">{t('Display text')}</span>
                <input className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" placeholder={t('Link text')} value={linkPopup.text} onChange={(e) => setLinkPopup({ ...linkPopup, text: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyLink(); } if (e.key === 'Escape') setLinkPopup(null); }} />
              </label>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" className="flex-1 rounded-md bg-primary px-3 py-2 text-xs font-medium text-white hover:bg-primary/90 transition-colors" onClick={applyLink}>{linkPopup.editing ? t('Update') : t('Insert')}</button>
              {linkPopup.editing && <button type="button" className="flex-1 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors" onClick={removeLink}>{t('Remove link')}</button>}
              <button type="button" className="flex-1 rounded-md border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors" onClick={() => setLinkPopup(null)}>{t('Cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, disabled }: {label:string;value:string | undefined;onChange:(value:string) => void;placeholder?:string;disabled?:boolean}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input className="rounded-md border border-zinc-200 bg-white px-2.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-50 disabled:bg-muted" aria-label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} />
    </label>
  );
}

function ComboField({ label, value, onChange, options, hotOptions = [], listId, placeholder, disabled }: {label:string;value:string | undefined;onChange:(value:string) => void;options:string[];hotOptions?:string[];listId:string;placeholder?:string;disabled?:boolean}) {
  const { t } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLLabelElement | null>(null);
  const query = String(value ?? '').trim().toLowerCase();
  const matchedOptions = buildComboOptions(options, query, hotOptions);
  const filteredOptions = matchedOptions.slice(0, COMBO_OPTION_LIMIT);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  return (
    <label className="flex flex-col gap-1" ref={rootRef}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="relative">
        <input
          data-list-id={listId}
          className="rounded-md border border-zinc-200 bg-white px-2.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-50 disabled:bg-muted"
          aria-label={label}
          value={value ?? ''}
          onFocus={() => !disabled && setOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            if (!disabled) setOpen(true);
          }}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
        />
        {open && !disabled && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-md border border-zinc-200 bg-white shadow-lg">
            {filteredOptions.length > 0 ? (
              <>
                {filteredOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className="block w-full border-0 bg-white px-2.5 py-2 text-left text-xs text-foreground hover:bg-primary/[0.06]"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onChange(option);
                      setOpen(false);
                    }}
                  >
                    {option}
                  </button>
                ))}
                <div className="border-t border-zinc-100 px-2.5 py-2 text-[11px] text-muted-foreground">
                  {matchedOptions.length > filteredOptions.length
                    ? t('Showing the first {shown} of {total} matches. Keep typing to narrow the list.', { shown: filteredOptions.length, total: matchedOptions.length })
                    : t('{count} matches', { count: matchedOptions.length })}
                </div>
              </>
            ) : (
              <div className="px-2.5 py-2 text-xs text-muted-foreground">{t('No matches. You can enter a custom value.')}</div>
            )}
          </div>
        )}
      </div>
    </label>
  );
}

function DateField({ label, value, onChange, disabled }: {label:string;value:string | undefined;onChange:(value:string) => void;disabled?:boolean}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input type="month" className="rounded-md border border-zinc-200 bg-white px-2.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-50 disabled:bg-muted" aria-label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value)} disabled={disabled} />
    </label>
  );
}

function MonthPicker({ value, onChange, showCurrent, current, onCurrentChange }: {value:string | undefined;onChange:(value:string) => void;showCurrent?:boolean;current?:boolean;onCurrentChange?:(value:boolean) => void}) {
  const { lang, t } = useTheme();
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [viewYear, setViewYear] = useState(() => {
    if (value) return parseInt(value.split('-')[0], 10);
    return now.getFullYear();
  });
  const selectedMonth = value ? parseInt(value.split('-')[1], 10) : null;
  const selectedYear = value ? parseInt(value.split('-')[0], 10) : null;
  const months = Array.from({ length: 12 }, (_, index) => new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en', { month: 'short' }).format(new Date(2024, index, 1)));

  const pick = (m: number) => {
    onChange(`${viewYear}-${String(m).padStart(2, '0')}`);
    setOpen(false);
  };

  const displayValue = current ? t('Present') : (value ? (lang === 'zh' ? `${selectedYear}年${selectedMonth}月` : `${months[(selectedMonth || 1) - 1]} ${selectedYear}`) : '');

  return (
    <div className="relative">
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(!open); }} className={cn(
        "flex items-center gap-2 w-full rounded-md border px-2.5 py-2 text-xs text-left transition-colors",
        open ? "border-primary ring-2 ring-primary/15" : "border-zinc-200 hover:border-zinc-300",
        current && "text-primary font-medium",
        !current && !value && "text-muted-foreground"
      )}>
        <Calendar size={13} className="text-muted-foreground shrink-0" />
        <span className="flex-1 truncate">{displayValue || t('Select date')}</span>
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 flex w-56 flex-col gap-2 rounded-lg border border-zinc-200 bg-white p-3 shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <button type="button" className="p-1 rounded hover:bg-muted" onClick={() => setViewYear((y) => y - 1)}><ChevronLeft size={14} /></button>
            <span className="text-xs font-semibold">{lang === 'zh' ? `${viewYear} 年` : viewYear}</span>
            <button type="button" className="p-1 rounded hover:bg-muted" onClick={() => setViewYear((y) => y + 1)}><ChevronRight size={14} /></button>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {months.map((label, i) => {
              const m = i + 1;
              const isSelected = !current && selectedYear === viewYear && selectedMonth === m;
              return (
                <button key={m} type="button" onClick={() => pick(m)} className={cn(
                  "rounded-md py-1.5 text-[11px] font-medium transition-colors",
                  isSelected ? "bg-primary text-white" : "hover:bg-muted text-foreground"
                )}>
                  {label}
                </button>
              );
            })}
          </div>
          {showCurrent && (
            <button type="button" onClick={() => { onCurrentChange?.(true); setOpen(false); }} className={cn(
              "w-full rounded-md border py-1.5 text-xs font-medium transition-colors",
              current ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted text-foreground"
            )}>
              {t('Present (current)')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PeriodPicker({ startDate, endDate, current, onChange }: {startDate:string | undefined;endDate:string | undefined;current?:boolean;onChange:(value:{startDate:string;endDate:string;current:boolean})=>void}) {
  const { t } = useTheme();
  const invalid = !current && startDate && endDate && startDate > endDate;
  return (
    <div className="flex flex-col gap-1">
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">{t('Start date')}</span>
          <MonthPicker value={startDate} onChange={(v) => onChange({ startDate: v, endDate: endDate || '', current: !!current })} />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">{t('End date')}</span>
          <MonthPicker value={endDate} onChange={(v) => onChange({ startDate: startDate || '', endDate: v, current: false })} showCurrent current={current} onCurrentChange={(c) => onChange({ startDate: startDate || '', endDate: '', current: c })} />
        </div>
      </div>
      {invalid && <p className="text-[11px] text-red-500">{t('Start date cannot be after end date')}</p>}
    </div>
  );
}

function TextArea({ label, value, onChange }: {label:string;value:string | undefined;onChange:(value:string) => void}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <textarea className="min-h-[72px] resize-y rounded-md border border-zinc-200 bg-white px-2.5 py-2 text-xs text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" aria-label={label} value={value ?? ''} rows={3} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function PreviewStage({ children, className }: {children:(value:{scale:number}) => React.ReactNode;className?:string}) {
  const { t } = useTheme();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [fitScale, setFitScale] = useState(0.7);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const widthScale = (el.clientWidth - 48) / DEFAULT_A4_WIDTH_PX;
      const heightScale = (el.clientHeight - 84) / DEFAULT_A4_HEIGHT_PX;
      setFitScale(Math.max(0.35, Math.min(widthScale, heightScale, 0.95)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = Math.max(0.35, Math.min(fitScale * zoom, 1.15));
  const zoomLabel = `${Math.round(scale * 100)}%`;
  return (
    <section className={cn("min-h-0 flex-col bg-muted/55", className)} aria-label={t('Resume preview')}>
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Eye size={14} className="text-primary" />
          <span>{t('A4 preview')}</span>
          <span className="hidden sm:inline">· {zoomLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" title={t('Zoom out')} onClick={() => setZoom((v) => Math.max(0.65, Number((v - 0.1).toFixed(2))))}>
            <ZoomOut size={14} />
          </button>
          <button className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" title={t('Fit to screen')} onClick={() => setZoom(1)}>
            <Maximize2 size={14} />
          </button>
          <button className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" title={t('Zoom in')} onClick={() => setZoom((v) => Math.min(1.45, Number((v + 0.1).toFixed(2))))}>
            <ZoomIn size={14} />
          </button>
        </div>
      </header>
      <div className="flex-1 overflow-auto px-4 py-5 sm:px-6" ref={stageRef}>
        {typeof children === 'function' ? children({ scale }) : children}
      </div>
    </section>
  );
}

function PaginatedResumePreview({ resume, settings, refNode, scale, activeItemId, onLocate }: {resume:Resume;settings:ResumeSettings;refNode:React.RefObject<HTMLElement>;scale:number;activeItemId?:string | null;onLocate?:(id:string) => void}) {
  const { t } = useTheme();
  const pagesRef = useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState({
    pageWidth: DEFAULT_A4_WIDTH_PX,
    pageHeight: DEFAULT_A4_HEIGHT_PX,
    cuts: [0, DEFAULT_A4_HEIGHT_PX]
  });

  useLayoutEffect(() => {
    const node = refNode.current;
    if (!node) return undefined;
    let cancelled = false;
    let frame = 0;

    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(async () => {
        await document.fonts?.ready;
        await waitForLayout();
        if (cancelled || !refNode.current) return;
        const source = refNode.current;
        const rect = source.getBoundingClientRect();
        const pageWidth = Math.ceil(rect.width || DEFAULT_A4_WIDTH_PX);
        const pageHeight = Math.round(pageWidth * A4_RATIO);
        const totalHeight = Math.ceil(Math.max(rect.height, source.scrollHeight, pageHeight));
        const cuts = getSmartPageCuts(source, pageHeight, { totalHeight });
        if (!cancelled) setLayout({ pageWidth, pageHeight, cuts });
      });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(node);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [resume, settings, refNode]);

  useLayoutEffect(() => {
    const targets = pagesRef.current?.querySelectorAll<HTMLElement>('[data-preview-target]') || [];
    let activePage: HTMLElement | null = null;
    targets.forEach((node) => {
      const clip = node.closest('.resume-page-clip')!.getBoundingClientRect();
      const rect = node.getBoundingClientRect();
      const visible = rect.bottom > clip.top + 1 && rect.top < clip.bottom - 1;
      node.tabIndex = visible ? 0 : -1;
      node.setAttribute('aria-hidden', String(!visible));
      node.setAttribute('role', 'button');
      node.setAttribute('aria-label', `${t('Edit this section')}: ${(node.textContent || '').trim().slice(0, 80)}`);
      node.classList.toggle('resume-edit-target', visible);
      node.classList.toggle('resume-edit-selected', visible && node.dataset.previewTarget === activeItemId);
      if (visible && node.dataset.previewTarget === activeItemId && !activePage) activePage = node.closest<HTMLElement>('.resume-page-shell');
    });
    // Scroll the page shell, never a clipped duplicate of the full document.
    if (activePage && activeItemId !== lastActive.current) (activePage as HTMLElement).scrollIntoView({ block: 'nearest', inline: 'nearest' });
    lastActive.current = activeItemId || null;
  }, [activeItemId, layout, scale, resume, t]);
  const lastActive = useRef<string | null>(null);
  const selectTarget = (event: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => {
    const target = (event.target as Element).closest<HTMLElement>('[data-preview-target]');
    if (!target?.classList.contains('resume-edit-target')) return;
    if (event.type === 'keydown' && ('key' in event && event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    onLocate?.(target.dataset.previewTarget || '');
  };

  const pages = Array.from({ length: Math.max(1, layout.cuts.length - 1) }, (_, index) => {
    const top = layout.cuts[index] ?? 0;
    const bottom = layout.cuts[index + 1] ?? layout.pageHeight;
    return {
      index,
      top,
      height: Math.min(layout.pageHeight, Math.max(1, bottom - top))
    };
  });

  return (
    <>
      <div className="resume-pagination-measure" aria-hidden="true">
        <ResumePreview resume={resume} settings={settings} refNode={refNode} />
      </div>
      <div ref={pagesRef} className="resume-pages mx-auto" onClick={selectTarget} onKeyDown={selectTarget}>
        {pages.map((page) => (
          <div
            key={`${page.index}-${page.top}-${page.height}`}
            className="resume-page-shell"
            style={{
              width: `${layout.pageWidth * scale}px`,
              height: `${layout.pageHeight * scale}px`
            }}
          >
            <div
              className="resume-page-clip"
              style={{
                width: `${layout.pageWidth}px`,
                height: `${page.height}px`,
                transform: `scale(${scale})`
              }}
            >
              <div className="resume-page-content" style={{ transform: `translateY(-${page.top}px)` }}>
                <ResumePreview resume={resume} settings={settings} className="resume-paper-slice" />
              </div>
            </div>
            {pages.length > 1 && <span className="resume-page-number">{page.index + 1} / {pages.length}</span>}
          </div>
        ))}
      </div>
    </>
  );
}

export function ResumePreview({ resume, settings, refNode, className, paperStyle, profileHeading = 'h1' }: {resume:Resume;settings:ResumeSettings;refNode?:React.Ref<HTMLElement>;className?:string;paperStyle?:React.CSSProperties;profileHeading?:'h1'|'h2'}) {
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

function ModuleManager({ resume, onClose, onAddSection, onSection, onMoveSection, onDeleteSection }: {resume:Resume;onClose?:() => void;onAddSection:(type?:SectionType) => void;onSection:(id:string,patch:Partial<ResumeSectionData>) => void;onMoveSection:(id:string,direction:number) => void;onDeleteSection:(id:string) => void}) {
  const { lang, t } = useTheme();
  return (
    <div className="fixed inset-0 z-50 bg-foreground/30" onClick={onClose}>
      <aside className="absolute right-0 top-0 h-full w-80 bg-card border-l border-border flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div><h2 className="text-sm font-semibold text-foreground">{t('Manage sections')}</h2><p className="text-xs text-muted-foreground">{t('Show, reorder, remove, or add resume sections.')}</p></div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X size={16} /></Button>
        </header>
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-medium text-muted-foreground">{t('Added')}</h3>
            {resume.sections.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 p-2 rounded-md border border-border">
                <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                  <input type="checkbox" className="rounded" checked={s.visible} onChange={(e) => onSection(s.id, { visible: e.target.checked })} />
                  <span className="text-xs text-foreground truncate">{s.label}</span>
                </label>
                <button className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30" onClick={() => onMoveSection(s.id, -1)} disabled={i === 0}><MoveUp size={13} /></button>
                <button className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30" onClick={() => onMoveSection(s.id, 1)} disabled={i === resume.sections.length - 1}><MoveDown size={13} /></button>
                <button className="p-0.5 text-muted-foreground hover:text-destructive" onClick={() => onDeleteSection(s.id)}><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-medium text-muted-foreground">{t('Add section')}</h3>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(SECTION_TEMPLATES) as [SectionType, (typeof SECTION_TEMPLATES)[SectionType]][]).map(([type, tpl]) => {
                const Icon = iconMap[tpl.icon] ?? PlusCircle;
                return <button key={type} className="flex items-center gap-1.5 p-2 rounded-md border border-border text-xs text-foreground hover:bg-muted" onClick={() => onAddSection(type)}><Icon size={14} />{getSectionCopy(type, lang).label}</button>;
              })}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function getItemTitle(section: ResumeSectionData, item: ResumeItemData, t: Translate) {
  const kind = SECTION_TEMPLATES[section.type]?.kind;
  if (kind === 'education') return item.school || t('Untitled school');
  if (kind === 'simpleList' || kind === 'text' || kind === 'chips') return item.title || t('Untitled item');
  return item.org || t('Untitled experience');
}

function getItemMeta(section: ResumeSectionData, item: ResumeItemData, t: Translate) {
  const kind = SECTION_TEMPLATES[section.type]?.kind;
  if (kind === 'education') return [item.major, item.degree, getItemPeriodLabel(item, t)].filter(Boolean).join(' · ');
  if (kind === 'simpleList') return item.meta;
  if (kind === 'text') return t('Highlights');
  if (kind === 'chips') return t('{count} items', { count: item.values?.length ?? 0 });
  return [item.role, getItemPeriodLabel(item, t)].filter(Boolean).join(' | ');
}
