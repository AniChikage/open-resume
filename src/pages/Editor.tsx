import { ResumePreview } from '../components/ResumePreview.tsx';
import {
BadgeCheck,Bold,BriefcaseBusiness,Calendar,CheckCircle2,ChevronDown,ChevronLeft,ChevronRight,
CircleAlert,
Download,Eraser,Eye,FileJson,FileText,Gauge,GraduationCap,History,Home,Wrench,
ImageDown,Italic,Layers3,LayoutTemplate,Link2,
List,ListOrdered,
Loader2,
MoveDown,MoveUp,Palette,PencilLine,Plus,
PlusCircle,Redo2,Save,Share2,Sparkles,Trash2,Trophy,
Underline,
Undo2,
UsersRound,X,
} from 'lucide-react';
import type * as React from 'react';
import { lazy,Suspense,useEffect,useId,useLayoutEffect,useMemo,useRef,useState,useSyncExternalStore } from 'react';
import { EditorTemplatePicker } from '../components/EditorTemplatePicker.tsx';
import { LanguageMenu } from '../components/SiteChrome.tsx';
import TailorResumeDialog from '../components/TailorResumeDialog.tsx';
import ResumeHistory from '../components/ResumeHistory.tsx';
import { createAutosave } from '../lib/autosave.ts';
import { readDraft, writeDraft, removeDraft } from '../lib/drafts.ts';
import { useAuth } from '../lib/auth.tsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu.tsx';
import { transferText } from '../lib/transfer-copy.ts';
import { Badge } from '../components/ui/badge.tsx';
import { Button } from '../components/ui/button.tsx';
import { Skeleton } from '../components/ui/skeleton.tsx';
import { Field as FormField, FieldGroup, FieldLabel } from '../components/ui/field.tsx';
import { visualText } from '../lib/visual-copy.ts';
import {
createSectionItem,DEFAULT_SETTINGS,FONT_OPTIONS,getSectionCopy,inferSystemResumeTitleKind,
localizeResumeSections,localizeResumeTitle,
resolveResumeAvatar,
RESUME_TEMPLATES,SECTION_TEMPLATES
} from '../data.ts';
import { CHINA_MAJOR_OPTIONS,CHINA_SCHOOL_OPTIONS } from '../lib/education-options.ts';
import { navigate } from '../lib/router.ts';
import { generateShareUrl } from '../lib/share.ts';
import { getResume,saveResume } from '../lib/storage.ts';
import { useTheme } from '../lib/theme.tsx';
import { useEditorHistory } from '../lib/use-editor-history.ts';
import { cn } from '../lib/utils.ts';
import { errorMessage,isEditorDocument } from '../lib/validation.ts';
import type { EditorDocument,Resume,ResumeItem as ResumeItemData,ResumeProfile,ResumeSection as ResumeSectionData,ResumeSettings,SectionType,Setter,Translate } from '../types.ts';

import { EditorModes, ResumeCheckPanel, ResumeSharePanel } from '../components/EditorWorkspace.tsx';
import { workspaceText } from '../lib/editor-workspace-copy.ts';
import { getPaperSize } from '../lib/paper.ts';
import { downloadPdfSnapshot, downloadPdfSnapshotAsPng } from '../lib/pdf-snapshot.ts';
import { usePdfDocumentKey, usePdfPreview } from '../lib/use-pdf-preview.ts';
import { getPdfFontKey } from '../lib/pdf-fonts.ts';
const PdfResumePreview = lazy(() => import('../components/PdfResumePreview.tsx'));

const VersionHistoryDialog = lazy(() => import('../components/VersionHistoryDialog.tsx'));
const JobMatchPanel = lazy(() => import('../components/JobMatchPanel.tsx'));

const iconMap: Record<string, import("lucide-react").LucideIcon> = {
  BadgeCheck, BriefcaseBusiness, FileText, GraduationCap,
  Layers3, PlusCircle, Trophy, UsersRound
};

const clone = <T,>(v: T): T => typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v));
const uid = () => crypto.randomUUID();

const QUICK_SECTION_TYPES: SectionType[] = ['summary', 'education', 'work', 'project', 'awards', 'skills'];
const EXPORT_TYPE_LABELS: Record<string,string> = {
  docx: 'Word',
  pdf: 'PDF',
  png: 'Image',
  json: 'JSON backup',
};
const PROFILE_REQUIRED_FIELDS: (keyof ResumeProfile)[] = ['name', 'headline', 'phone', 'email', 'city'];
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

export default function Editor({ resumeId }: {resumeId:string}) {
  const { lang, t } = useTheme();
  const { resume, settings, setResume, setSettings, history, canUndo, canRedo } = useEditorHistory({ resume: null, settings: DEFAULT_SETTINGS }, resumeId);
  const [locationRequest, setLocationRequest] = useState<{id:string;field?:string}|null>(null);
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
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [browserHistoryOpen, setBrowserHistoryOpen] = useState(false);
  const [jobMatchOpen, setJobMatchOpen] = useState(false);
  const [tailorJobDescription, setTailorJobDescription] = useState('');
  const [tailorSnapshot, setTailorSnapshot] = useState<EditorDocument|null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const paperRef = useRef<HTMLElement | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const previousLangRef = useRef<string | null>(null);
  const [previewOnly, setPreviewOnly] = useState(false);
  const pdfKey = usePdfDocumentKey(resume, settings, lang);
  const pdfPreview = usePdfPreview(paperRef, pdfKey);
  const latestDocumentKey = useRef(pdfKey);
  latestDocumentKey.current = pdfKey;
  const selectView = (view: string) => { setActiveView(view); setPreviewOnly(false); };
  useEffect(() => { setShareUrl(''); }, [pdfKey]);
  useEffect(() => {
    const switchMode = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat || target?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return;
      const view = ['edit', 'template', 'check', 'share'][Number(event.key) - 1];
      if (!view || !/^[1-4]$/.test(event.key)) return;
      event.preventDefault(); setActiveView(view); setPreviewOnly(false);
      document.getElementById(`editor-tab-${view}`)?.focus();
    };
    document.addEventListener('keydown', switchMode);
    return () => document.removeEventListener('keydown', switchMode);
  }, []);


  const loadedRef = useRef(false);
  const { user } = useAuth();
  const username = user?.username || '';
  const autosave = useMemo(() => createAutosave<EditorDocument>({
    save: (document, keepalive) => saveResume(resumeId, document.resume, document.settings, { keepalive }),
    writeDraft: document => writeDraft(resumeId, username, document),
    clearDraft: document => removeDraft(resumeId, username, document),
  }), [resumeId, username]);
  const { dirty, saving, error: saveFailure, draftAvailable } = useSyncExternalStore(autosave.subscribe, autosave.getSnapshot);
  const saveError = !saveFailure ? '' : errorMessage(saveFailure) === 'UNAUTHORIZED'
    ? t('Your session expired. Sign in again to save.')
    : t(draftAvailable ? 'Save failed. Your changes are cached locally.' : 'Save failed and browser storage is unavailable. Keep this tab open and try again.');

  useEffect(() => {
    const unsubscribe = history.subscribe(() => {
      const document = history.getSnapshot().present;
      if (loadedRef.current && document.resume) autosave.update({ resume: document.resume, settings: document.settings });
    });
    return () => { unsubscribe(); void autosave.flush(); };
  }, [history, autosave]);

  useEffect(() => {
    setLoadError(false);
    loadedRef.current = false;
    previousLangRef.current = null;
    let cancelled = false;
    const cached = readDraft(resumeId, username);
    if (cached) {
      const document = { resume: normalizeResumeShape(cached.resume), settings: normalizeSettingsShape(cached.settings) };
      history.reset(document);
      loadedRef.current = true;
      autosave.update(document);
      return;
    }
    getResume(resumeId).then((stored) => {
      if (cancelled) return;
      if (!stored) { setLoadError(true); return; }
      history.reset({ resume: normalizeResumeShape(stored.resume), settings: normalizeSettingsShape(stored.settings) });
      loadedRef.current = true;
    }).catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, [resumeId, loadAttempt, username, autosave, history]);

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

  const handleSave = async () => {
    if (await autosave.flush()) setSavedAt('Just now');
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void autosave.flush();
      }
    };
    const onHidden = () => { if (document.visibilityState === 'hidden') void autosave.flush(true); };
    const onPageHide = () => { void autosave.flush(true); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onHidden);
    };
  }, [autosave]);

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
    for (let parent: HTMLElement | null = node; parent && parent !== editorRoot.current; parent = parent.parentElement) {
      if (parent instanceof HTMLDetailsElement) parent.open = true;
    }
    const sectionDetails = node.querySelector('details');
    if (node.dataset.editorTarget?.startsWith('section:') && sectionDetails) sectionDetails.open = true;
    node.scrollIntoView({ block: 'center', behavior: 'auto' });
    const field = (locationRequest.field ? node.querySelector<HTMLElement>(`[aria-label="${CSS.escape(t(locationRequest.field))}"]`) : null) || node.querySelector<HTMLElement>('input:not([type="file"]), textarea, [contenteditable="true"]') || node.querySelector('summary');
    field?.focus({ preventScroll: true });
  }, [locationRequest, activeView]);

  const updateTitle = (title: string) => history.commit((current) => current.resume ? ({
    resume: { ...current.resume, title },
    settings: { ...current.settings, titleMode: 'custom', titleKind: 'custom' },
  }) : current, 'title');

  const locateFromPreview = (id: string, field?: string) => {
    setActiveItemId(id);
    setActiveView('edit');
    setPreviewOnly(false);
    setLocationRequest({ id, field });
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
  const addSection = (type: SectionType = 'custom') => { const ns = { id: uid(), type, label: getSectionCopy(type, lang).label, visible: true, items: [createSectionItem(type, lang)] }; updateResume((d) => { d.sections.push(ns); }); setActiveItemId(ns.items[0].id); return ns.items[0].id; };
  const addItem = (section: ResumeSectionData) => { const item = createSectionItem(section.type, lang); updateResume((d) => { d.sections.find((x) => x.id === section.id)?.items.push(item); }); setActiveItemId(item.id); return item.id; };
  const deleteSection = (id: string) => { updateResume((d) => { d.sections = d.sections.filter((x) => x.id !== id); }); setDeleteNotice(history.getSnapshot().present); };
  const deleteItem = (sId: string, iId: string) => { updateResume((d) => { const s = d.sections.find((x) => x.id === sId); if (s) s.items = s.items.filter((x) => x.id !== iId); }); setDeleteNotice(history.getSnapshot().present); };
  const moveSection = (id: string, dir: number) => updateResume((d) => { const i = d.sections.findIndex((x) => x.id === id); const t = i + dir; if (i < 0 || t < 0 || t >= d.sections.length) return; const [s] = d.sections.splice(i, 1); d.sections.splice(t, 0, s); });
  const handleAvatar = (file: File | undefined) => { if (!file) return; const r = new FileReader(); r.onload = () => updateProfile('avatar', String(r.result || '')); r.readAsDataURL(file); };

  const handleExport = async (type: string) => {
    if (!paperRef.current || isExporting) return;
    setExportFeedback(null);
    setIsExporting(type); setExportOpen(false);
    const base = resume.title || resume.profile.name || 'resume';
    try {
      if (type === 'pdf' || type === 'png') {
        const snapshot = await pdfPreview.getSnapshot();
        if (type === 'pdf') downloadPdfSnapshot(snapshot, `${base}.pdf`);
        else await downloadPdfSnapshotAsPng(snapshot, `${base}.png`);
      } else if (type === 'docx') {
        const { exportResumeAsDocx } = await import('../lib/docx-export.ts');
        await exportResumeAsDocx({ resume, settings }, `${base}.docx`, lang);
      } else if (type === 'json') {
        const { exportResumeAsJson } = await import('../exporters.ts');
        exportResumeAsJson(resume, settings, `${base}.json`);
      } else {
        throw new Error('UNSUPPORTED_EXPORT_FORMAT');
      }
      setExportFeedback({
        type: 'success',
        message: t('{type} is ready', { type: t(EXPORT_TYPE_LABELS[type] || 'File') }),
        detail: t("If you don't see a save prompt, check your browser's download settings."),
      });
    } catch (error) {
      setExportFeedback({
        type: 'error',
        message: t('{type} export failed', { type: t(EXPORT_TYPE_LABELS[type] || 'File') }),
        detail: error instanceof Error && error.message === 'PREVIEW_CHANGED' ? workspaceText(lang, 'changed') : t('Try again. Your resume content is still safe in the editor.'),
      });
    } finally { setIsExporting(''); }
  };

  const handleShare = async () => {
    const key = pdfKey;
    const url = await generateShareUrl(resume, settings);
    if (key !== latestDocumentKey.current) throw new Error('PREVIEW_CHANGED');
    setShareUrl(url);
    try { await navigator.clipboard.writeText(url); return true; } catch { return false; }
  };
  const handleCheck = () => selectView('check');
  const openTailor = (jobDescription = '') => { setTailorJobDescription(jobDescription); setTailorSnapshot({ resume: clone(resume), settings: clone(settings) }); };
  return (
    <div ref={editorRoot} className="editor-root flex h-screen flex-col overflow-hidden bg-background">
      {deleteNotice === history.getSnapshot().present && canUndo && <div role="status" className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-lg">
        <span className="text-sm">{t('Deleted')}</span><Button variant="outline" size="sm" onClick={() => { history.undo(); setDeleteNotice(null); }}>{t('Undo')}</Button>
      </div>}
      <TopBar
        historyControl={<DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t('Resume tools')} title={t('Resume tools')} />}><Wrench /></DropdownMenuTrigger>
          <DropdownMenuContent align="end"><DropdownMenuGroup>
            <DropdownMenuItem onClick={async () => { await autosave.flush(); setVersionsOpen(true); }}><History />{t('Version history')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setBrowserHistoryOpen(true)}><History />{t('Browser history')}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setJobMatchOpen(true)}><BriefcaseBusiness />{t('Job matching')}</DropdownMenuItem>
          </DropdownMenuGroup></DropdownMenuContent>
        </DropdownMenu>}
        canUndo={canUndo} canRedo={canRedo} onUndo={() => { history.undo(); setDeleteNotice(null); }} onRedo={history.redo}
        resume={resume}
        savedAt={savedAt} dirty={dirty} saving={saving} saveError={saveError} onSave={handleSave}
        isExporting={isExporting} exportOpen={exportOpen}
        exportMenuRef={exportMenuRef}
        onResumeTitle={updateTitle}
        onManager={() => setManagerOpen(true)}
        onExportToggle={() => setExportOpen((v) => !v)}
        onExport={handleExport}
      />
      <EditorModes activeView={activeView} onActiveView={selectView} previewOnly={previewOnly} onPreview={() => setPreviewOnly(value => !value)} onTailor={() => openTailor()} />
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
      <main className="grid min-h-0 min-w-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[400px_minmax(0,1fr)]">
        <div id="editor-workspace-panel" role="tabpanel" aria-labelledby={`editor-tab-${activeView}`} className={cn('editor-workspace light-panel min-h-0 min-w-0 border-r border-border bg-card', previewOnly ? 'hidden lg:block' : 'block')}>
          {activeView === 'template' ? <TemplateStylePanel resume={resume} settings={settings} onSettings={setSettings} />
            : activeView === 'check' ? <ResumeCheckPanel resume={resume} onLocate={locateFromPreview} onAddSection={type => { const section = resume.sections.find(value => value.type === type); if (section) { updateSection(section.id, { visible: true }); locateFromPreview(section.items[0]?.id || addItem(section)); } else locateFromPreview(addSection(type)); }} />
            : activeView === 'share' ? <ResumeSharePanel key={pdfKey} url={shareUrl} onShare={handleShare} onExport={handleExport} isExporting={isExporting} />
            : <EditorPanel resume={resume} activeItemId={activeItemId} onProfile={updateProfile} onAvatar={handleAvatar} onSection={updateSection} onItem={updateItem} onAddItem={section => locateFromPreview(addItem(section))} onAddSection={type => locateFromPreview(addSection(type))} onDeleteSection={deleteSection} onDeleteItem={deleteItem} onMoveSection={moveSection} onActiveItem={setActiveItemId} onCheck={handleCheck} />}
        </div>
        <div className="resume-pagination-measure" aria-hidden="true"><ResumePreview resume={resume} settings={settings} refNode={paperRef} /></div>
        <Suspense fallback={<div className={cn('min-h-0 items-center justify-center bg-muted/55', previewOnly ? 'flex' : 'hidden lg:flex')}><Loader2 className="animate-spin" /></div>}>
          <PdfResumePreview snapshot={pdfPreview.snapshot} pending={pdfPreview.pending} error={pdfPreview.error} onRetry={pdfPreview.retry} activeItemId={activeItemId} onLocate={locateFromPreview} className={previewOnly ? 'flex' : 'hidden lg:flex'} />
        </Suspense>
      </main>
      {managerOpen && <ModuleManager resume={resume} onClose={() => setManagerOpen(false)} onAddSection={addSection} onSection={updateSection} onMoveSection={moveSection} onDeleteSection={deleteSection} />}
      <ResumeHistory resumeId={resumeId} document={history.getSnapshot().present as EditorDocument} onRestore={document => history.commit(document)} open={browserHistoryOpen} onOpenChange={setBrowserHistoryOpen} showTrigger={false} />
      <Suspense fallback={<Skeleton className="fixed right-4 top-20 h-20 w-64" />}>
        {versionsOpen && <VersionHistoryDialog resumeId={resumeId} document={history.getSnapshot().present as EditorDocument} onClose={() => setVersionsOpen(false)} beforeRestore={() => autosave.flush()} onRestored={id => navigate(`/editor/${id}`)} />}
        {jobMatchOpen && <JobMatchPanel resumeId={resumeId} resume={resume} onClose={() => setJobMatchOpen(false)} onLocate={id => { setJobMatchOpen(false); locateFromPreview(id); }} onTailor={job => { setJobMatchOpen(false); openTailor(job?.jobDescription); }} />}
      </Suspense>
      {tailorSnapshot && <TailorResumeDialog key={resumeId} snapshot={tailorSnapshot} currentResume={resume} initialJobDescription={tailorJobDescription} onClose={() => setTailorSnapshot(null)} />}
    </div>
  );
}

function TopBar({ historyControl, canUndo, canRedo, onUndo, onRedo, resume, savedAt, dirty, saving, saveError, onSave, isExporting, exportOpen, exportMenuRef, onResumeTitle, onManager, onExportToggle, onExport }: {historyControl:React.ReactNode;canUndo:boolean;canRedo:boolean;onUndo:() => void;onRedo:() => void;resume:Resume;savedAt:string;dirty:boolean;saving:boolean;saveError:string;onSave:() => void;isExporting:string;exportOpen:boolean;exportMenuRef:React.RefObject<HTMLDivElement>;onResumeTitle:(title:string) => void;onManager:() => void;onExportToggle:() => void;onExport:(type:string) => void;}) {
  const { lang, t } = useTheme();
  return (
    <header className="editor-topbar flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <Button variant="ghost" size="sm" className="shrink-0" onClick={async () => { await onSave(); navigate('/dashboard'); }} aria-label={t('Back to My Resumes')}>
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

      <div className="ml-auto flex items-center gap-1.5 shrink-0">
        {historyControl}
        <LanguageMenu />
        <Button variant="outline" size="sm" className="hidden text-xs md:inline-flex" onClick={onManager}>{t('Sections')}</Button>
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
              <button role="menuitem" className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-xs font-medium transition-colors hover:bg-muted focus:bg-muted focus:outline-none" onClick={() => onExport('docx')}><FileText size={14} className="text-muted-foreground" /> {transferText(lang, 'word')}</button>
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
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="sr-only">{ariaLabel}</span>
      <select
        className={cn("w-full rounded-md border border-zinc-200 bg-white px-2.5 py-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15", selectClassName)}
        value={getPdfFontKey(value) === 'serif' ? 'SimSun' : 'Arial'}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
      >
        <option value="Arial">Noto Sans CJK SC</option>
        <option value="SimSun">Noto Serif CJK SC</option>
      </select>
    </label>
  );
}

function EditorPanel({ resume, activeItemId, onProfile, onAvatar, onSection, onItem, onAddItem, onAddSection, onDeleteSection, onDeleteItem, onMoveSection, onActiveItem, onCheck }: {resume:Resume;activeItemId?:string | null;onProfile:(field:keyof ResumeProfile,value:string) => void;onAvatar:(file:File | undefined) => void;onSection:(id:string,patch:Partial<ResumeSectionData>) => void;onItem:(sectionId:string,itemId:string,patch:Partial<ResumeItemData>) => void;onAddItem:(section:ResumeSectionData) => void;onAddSection:(type?:SectionType) => void;onDeleteSection:(id:string) => void;onDeleteItem:(sectionId:string,itemId:string) => void;onMoveSection:(id:string,direction:number) => void;onActiveItem:(id:string) => void;onCheck:() => void}) {
  const { lang, t } = useTheme();
  const stats = getResumeStats(resume);
  return (
    <section className="editor-content-panel" aria-label={t('Resume editor')}>
      <div className="editor-content-heading"><h2>{workspaceText(lang, 'content')}</h2><p>{visualText(lang, 'contentHelp')}</p></div>
      <EditorOverview stats={stats} onCheck={onCheck} />
      <div data-editor-target="profile" onFocusCapture={() => onActiveItem("profile")}><ProfileEditor profile={resume.profile} onProfile={onProfile} onAvatar={onAvatar} /></div>
      {resume.sections.map((section, index) => (
        <SectionEditor key={section.id} section={section} index={index} total={resume.sections.length}
          activeItemId={activeItemId} onSection={onSection} onItem={onItem} onAddItem={onAddItem}
          onDeleteSection={onDeleteSection} onDeleteItem={onDeleteItem} onMoveSection={onMoveSection} onActiveItem={onActiveItem} />
      ))}
      <QuickSections resume={resume} onAddSection={onAddSection} />
    </section>
  );
}

function EditorOverview({ stats, onCheck }: {stats:ReturnType<typeof getResumeStats>;onCheck:() => void}) {
  const { t } = useTheme();
  return <div className="editor-overview">
    <div className="editor-overview-line"><span>{t('Resume completeness')}</span><button type="button" onClick={onCheck} title={t('Check writing and keywords')}><strong>{stats.progress}%</strong></button></div>
    <div className="editor-overview-track"><span style={{ width: stats.progress + '%' }} /></div>
  </div>;
}

function QuickSections({ resume, onAddSection }: {resume:Resume;onAddSection:(type?:SectionType) => void}) {
  const { lang, t } = useTheme();
  const existing = new Set(resume.sections.map(section => section.type));
  return <details className="editor-quick-add"><summary>{visualText(lang, 'addSection')}</summary><div className="grid grid-cols-2 gap-2">
    {QUICK_SECTION_TYPES.filter(type => !existing.has(type)).map(type => <Button key={type} variant="outline" onClick={() => onAddSection(type)}>{getSectionCopy(type, lang).label}</Button>)}
    <Button variant="outline" onClick={() => onAddSection('custom')}><Plus data-icon="inline-start" />{getSectionCopy('custom', lang).label}</Button>
  </div></details>;
}

function TemplateStylePanel({ resume, settings, onSettings }: {resume:Resume;settings:ResumeSettings;onSettings:Setter<ResumeSettings>}) {
  const { lang, t } = useTheme();
  const updateSetting = <K extends keyof ResumeSettings,>(f: K, v: ResumeSettings[K]) => onSettings((c) => ({ ...c, [f]: v }), `setting:${f}`);
  const colorPresets = ['#8b63f6', '#2468c9', '#0f766e', '#d97706', '#d94f74', '#374151'];
  const selectedTemplate = RESUME_TEMPLATES.find((template) => template.id === settings.template) ?? RESUME_TEMPLATES[0];
  return (
    <section className="editor-style-panel flex h-full min-w-0 flex-col overflow-y-auto overflow-x-hidden bg-white" aria-label={t('Template style')}>
      <div className="editor-style-group">
        <div className="flex items-center gap-2">
          <Palette size={15} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">{t('Template style')}</h2>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {t('Using {template}. Style changes appear in the preview immediately.', { template: selectedTemplate?.label?.[lang] || t('Default template') })}
        </p>
      </div>

      <EditorTemplatePicker resume={resume} settings={settings} onSettings={onSettings} Preview={ResumePreview} />

      <div className="editor-style-group flex flex-col gap-3">
        <label className="flex flex-col gap-2 text-xs text-muted-foreground">{workspaceText(lang, 'paper')}
          <select aria-label={workspaceText(lang, 'paper')} className="min-h-11 rounded-md border border-border bg-background px-3 text-sm text-foreground" value={settings.paperSize || 'a4'} onChange={event => updateSetting('paperSize', event.target.value as 'a4' | 'letter')}><option value="a4">A4 · 210 × 297 mm</option><option value="letter">US Letter · 8.5 × 11 in</option></select>
        </label>
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

      <div className="editor-style-group flex flex-col gap-3">
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
  const { lang, t } = useTheme();
  const avatarSrc = resolveResumeAvatar(profile.avatar);
  return <section className="editor-profile">
    <h2>{t('Profile information')}</h2>
    <div className="editor-photo-row"><img src={avatarSrc} alt={t('Profile photo')} /><label className="editor-photo-control">{visualText(lang, 'photo')}<input aria-label={visualText(lang, 'photo')} type="file" accept="image/*" onChange={event => onAvatar(event.target.files?.[0])} /></label><span className="text-xs text-muted-foreground">{t('Photo optional')}</span></div>
    <FieldGroup className="editor-profile-fields">
      <Field label={t('Name')} value={profile.name} onChange={value => onProfile('name', value)} />
      <Field label={t('Target role')} value={profile.headline} onChange={value => onProfile('headline', value)} />
      <Field label={t('Email')} value={profile.email} onChange={value => onProfile('email', value)} />
      <Field label={t('Phone')} value={profile.phone} onChange={value => onProfile('phone', value)} />
      <Field label={t('Personal website')} value={profile.website} onChange={value => onProfile('website', value)} />
      <Field label={t('Current city')} value={profile.city} onChange={value => onProfile('city', value)} />
    </FieldGroup>
    <details className="editor-profile-extra"><summary>{t('Additional details')}</summary><FieldGroup className="editor-profile-fields">
      <Field label={t('Date of birth')} value={profile.birthday} onChange={value => onProfile('birthday', value)} />
      <Field label={t('Current status')} value={profile.status} onChange={value => onProfile('status', value)} />
    </FieldGroup></details>
  </section>;
}

function SectionEditor({ section, index, total, activeItemId, onSection, onItem, onAddItem, onDeleteSection, onDeleteItem, onMoveSection, onActiveItem }: {section:ResumeSectionData;index:number;total:number;activeItemId?:string | null;onSection:(id:string,patch:Partial<ResumeSectionData>) => void;onItem:(sectionId:string,itemId:string,patch:Partial<ResumeItemData>) => void;onAddItem:(section:ResumeSectionData) => void;onDeleteSection:(id:string) => void;onDeleteItem:(sectionId:string,itemId:string) => void;onMoveSection:(id:string,direction:number) => void;onActiveItem:(id:string) => void}) {
  const { lang, t } = useTheme();
  const tpl = SECTION_TEMPLATES[section.type] ?? SECTION_TEMPLATES.custom;
  const Icon = iconMap[tpl.icon] ?? PlusCircle;
  return <section data-editor-target={'section:' + section.id} className={cn('editor-section', !section.visible && 'opacity-60')}>
    <details ref={node => { if (node && !node.dataset.inited) { node.open = section.type === 'summary'; node.dataset.inited = '1'; } }}>
      <summary><Icon /><span>{section.label}</span><span className="editor-section-count">{section.items.length}</span><ChevronDown className="section-chevron" /></summary>
      <div className="editor-section-body">
        {section.items.length === 0 && <p className="py-2 text-xs text-muted-foreground">{getSectionCopy(section.type, lang).empty}</p>}
        {tpl.kind === 'text' && section.items.length === 1 ? <div data-editor-target={section.items[0].id} onFocusCapture={() => onActiveItem(section.items[0].id)}><EntryForm hideTitle section={section} item={section.items[0]} onItem={patch => onItem(section.id, section.items[0].id, patch)} /></div> : section.items.map((item, index) => <details key={item.id} data-editor-target={item.id} onFocusCapture={() => onActiveItem(item.id)} className="editor-entry" ref={node => { if (node && !node.dataset.inited) { node.open = index === 0; node.dataset.inited = '1'; } }} onClick={() => onActiveItem(item.id)}>
          <summary className="flex cursor-pointer items-center gap-2 px-2 py-2 hover:bg-muted/50"><span className="min-w-0 flex-1 truncate">{getItemTitle(section, item, t)}</span><small className="max-w-24 truncate text-xs text-muted-foreground">{getItemMeta(section, item, t)}</small><span role="button" aria-label={t('Delete entry')} tabIndex={0} className="p-1 text-muted-foreground hover:text-destructive" onClick={event => { event.preventDefault(); event.stopPropagation(); onDeleteItem(section.id, item.id); }} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); onDeleteItem(section.id, item.id); } }}><Trash2 size={13} /></span></summary>
          <div className="pb-3 pt-1"><EntryForm section={section} item={item} onItem={patch => onItem(section.id, item.id, patch)} /></div>
        </details>)}
        {tpl.kind !== 'text' && <Button variant="ghost" size="sm" className="justify-start" onClick={() => onAddItem(section)}><Plus data-icon="inline-start" />{t('Add another {section}', { section: section.label })}</Button>}
        <details className="editor-section-options"><summary>{visualText(lang, 'sectionOptions')}</summary><div className="editor-section-management">
          <input aria-label={t('Title')} className="rounded border border-border px-2 py-1.5 text-xs" value={section.label} onChange={event => onSection(section.id, { label: event.target.value })} />
          <button type="button" title={t('Move section up')} onClick={() => onMoveSection(section.id, -1)} disabled={index === 0}><MoveUp size={13} /></button>
          <button type="button" title={t('Move section down')} onClick={() => onMoveSection(section.id, 1)} disabled={index === total - 1}><MoveDown size={13} /></button>
          <button type="button" title={section.visible ? t('Hide section') : t('Show section')} onClick={() => onSection(section.id, { visible: !section.visible })}><Eye size={13} /></button>
          <button type="button" title={t('Delete section')} className="text-muted-foreground hover:text-destructive" onClick={() => onDeleteSection(section.id)}><Trash2 size={13} /></button>
        </div>{tpl.kind === 'text' && section.items.length === 1 && <Field label={t('Title')} value={section.items[0].title} onChange={value => onItem(section.id, section.items[0].id, { title: value })} />}
          {tpl.kind === 'text' && <Button variant="ghost" size="sm" className="justify-start" onClick={() => onAddItem(section)}><Plus data-icon="inline-start" />{t('Add another {section}', { section: section.label })}</Button>}
</details>
      </div>
    </details>
  </section>;
}

function EntryForm({ section, item, onItem, hideTitle = false }: {section:ResumeSectionData;item:ResumeItemData;onItem:(patch:Partial<ResumeItemData>) => void;hideTitle?:boolean}) {
  const { lang, t } = useTheme();
  const kind = SECTION_TEMPLATES[section.type]?.kind ?? 'experience';
  const chineseLocale = lang === 'zh' || lang === 'zh-TW';
  const schoolSuggestions = HOT_SCHOOL_OPTIONS[lang] || (chineseLocale ? HOT_SCHOOL_OPTIONS.zh : HOT_SCHOOL_OPTIONS.en);
  const majorSuggestions = HOT_MAJOR_OPTIONS[lang] || (chineseLocale ? HOT_MAJOR_OPTIONS.zh : HOT_MAJOR_OPTIONS.en);
  const degreeOptions = DEGREE_OPTIONS[lang] || (chineseLocale ? DEGREE_OPTIONS.zh : DEGREE_OPTIONS.en);
  if (kind === 'text') return (
    <div className="flex flex-col gap-2">
      <TextArea label={t('Body')} value={item.body} onChange={(v) => onItem({ body: v })} />
      {!hideTitle && <details className="editor-section-options"><summary>{t('Title')}</summary><Field label={t('Title')} value={item.title} onChange={(v) => onItem({ title: v })} /></details>}
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
        <div ref={editorRef} className="min-h-[104px] px-2.5 py-2 text-xs leading-relaxed text-foreground focus:outline-none" role="textbox" aria-label={label} contentEditable data-placeholder={t('Enter content')} suppressContentEditableWarning onInput={sync} onBlur={sync} onPaste={paste} />
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
  const id = useId();
  return <FormField className="editor-field" data-disabled={disabled || undefined}><FieldLabel htmlFor={id}>{label}</FieldLabel><input id={id} className="text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15" aria-label={label} value={value ?? ''} onChange={event => onChange(event.target.value)} placeholder={placeholder} disabled={disabled} /></FormField>;
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
