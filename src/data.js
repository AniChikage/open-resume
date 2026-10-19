import { getLocaleSample, RESUME_SECTION_LABELS } from './resume-locales.js';
import { toTraditional } from './lib/traditionalize.js';

export const SECTION_TEMPLATES = {
  summary: {
    label: '个人总结',
    kind: 'text',
    icon: 'FileText',
    empty: '用 2-4 句话概括目标岗位、核心能力和亮点。',
    item: () => ({
      id: crypto.randomUUID(),
      title: '目标岗位总结',
      body: ''
    })
  },
  education: {
    label: '教育经历',
    kind: 'education',
    icon: 'GraduationCap',
    empty: '添加学校、专业、学历和在校时间。',
    item: () => ({
      id: crypto.randomUUID(),
      school: '',
      major: '',
      degree: '',
      startDate: '',
      endDate: '',
      current: false,
      period: '',
      location: '',
      body: '',
      details: []
    })
  },
  work: {
    label: '工作经历',
    kind: 'experience',
    icon: 'BriefcaseBusiness',
    empty: '添加公司、职位、时间、地点和项目成果。',
    item: () => ({
      id: crypto.randomUUID(),
      org: '',
      role: '',
      department: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      bullets: ['']
    })
  },
  project: {
    label: '项目经历',
    kind: 'experience',
    icon: 'Layers3',
    empty: '添加项目名称、角色、周期和贡献。',
    item: () => ({
      id: crypto.randomUUID(),
      org: '',
      role: '',
      startDate: '',
      endDate: '',
      current: false,
      period: '',
      location: '',
      body: '',
      bullets: ['']
    })
  },
  organization: {
    label: '社团和组织经历',
    kind: 'experience',
    icon: 'UsersRound',
    empty: '添加学生会、协会、志愿活动等经历。',
    item: () => ({
      id: crypto.randomUUID(),
      org: '',
      role: '',
      period: '',
      location: '',
      bullets: ['']
    })
  },
  awards: {
    label: '荣誉奖项',
    kind: 'simpleList',
    icon: 'Trophy',
    empty: '添加奖学金、比赛奖项、证书等。',
    item: () => ({
      id: crypto.randomUUID(),
      title: '',
      meta: '',
      description: ''
    })
  },
  skills: {
    label: '技能清单',
    kind: 'chips',
    icon: 'BadgeCheck',
    empty: '添加技能、语言、工具和证书。',
    item: () => ({
      id: crypto.randomUUID(),
      title: '技能',
      values: []
    })
  },
  custom: {
    label: '自定义模块',
    kind: 'experience',
    icon: 'PlusCircle',
    empty: '添加自定义模块内容。',
    item: () => ({
      id: crypto.randomUUID(),
      org: '',
      role: '',
      period: '',
      location: '',
      bullets: ['']
    })
  }
};

const SECTION_COPY_EN = {
  summary: { label: 'Professional Summary', empty: 'Summarize your target role, strengths, and highlights in 2–4 sentences.', itemTitle: 'Career Summary' },
  education: { label: 'Education', empty: 'Add your school, field of study, degree, and dates.' },
  work: { label: 'Experience', empty: 'Add a company, role, dates, location, and measurable outcomes.' },
  project: { label: 'Projects', empty: 'Add a project name, role, timeline, and contribution.' },
  organization: { label: 'Leadership & Activities', empty: 'Add student groups, associations, or volunteer work.' },
  awards: { label: 'Awards', empty: 'Add scholarships, awards, or certificates.' },
  skills: { label: 'Skills', empty: 'Add skills, languages, tools, and certificates.', itemTitle: 'Skills' },
  custom: { label: 'Custom Section', empty: 'Add content for this custom section.' },
};

export function getSectionCopy(type, lang = 'en') {
  const template = SECTION_TEMPLATES[type] ?? SECTION_TEMPLATES.custom;
  const english = SECTION_COPY_EN[type] ?? SECTION_COPY_EN.custom;
  const labels = RESUME_SECTION_LABELS[lang] || RESUME_SECTION_LABELS.en;
  const itemTitle = type === 'summary' ? labels.summaryItem : type === 'skills' ? labels.skillsItem : english.itemTitle;
  return {
    ...english,
    label: labels[type] || english.label,
    empty: lang === 'zh' ? template.empty : english.empty,
    ...(itemTitle ? { itemTitle } : {}),
  };
}

export function createSectionItem(type, lang = 'en') {
  const template = SECTION_TEMPLATES[type] ?? SECTION_TEMPLATES.custom;
  const item = template.item();
  const copy = getSectionCopy(type, lang);
  return copy.itemTitle && Object.hasOwn(item, 'title') ? { ...item, title: copy.itemTitle } : item;
}

export const RESUME_AVATAR = '/avatars/resume-avatar-professional-woman.png';
const LEGACY_RESUME_AVATARS = new Set([
  '/avatars/default.svg',
  '/avatars/default.png',
  '/avatars/resume-avatar.png',
]);

export function resolveResumeAvatar(avatar) {
  const value = String(avatar ?? '').trim();
  return value && !LEGACY_RESUME_AVATARS.has(value) ? value : RESUME_AVATAR;
}

// Static examples use local seed IDs; builders generate fresh IDs inside the request.
export const BLANK_RESUME = {
  title: 'My Resume',
  profile: {
    name: '',
    email: '',
    phone: '',
    website: '',
    city: '',
    birthday: '',
    status: '',
    headline: '',
    avatar: RESUME_AVATAR
  },
  sections: [
    {
      id: 'blank-seed-1',
      type: 'education',
      label: 'Education',
      visible: true,
      items: []
    },
    {
      id: 'blank-seed-2',
      type: 'work',
      label: 'Experience',
      visible: true,
      items: []
    },
    {
      id: 'blank-seed-3',
      type: 'skills',
      label: 'Skills',
      visible: true,
      items: []
    }
  ]
};

const BLANK_RESUME_TITLES = {
  en: 'My Resume',
  zh: '我的简历',
  'zh-TW': '我的履歷',
  ja: '私の履歴書',
  ko: '내 이력서',
  fr: 'Mon CV',
  ru: 'Моё резюме',
};

export function buildBlankResume(lang = 'en') {
  const labels = RESUME_SECTION_LABELS[lang] || RESUME_SECTION_LABELS.en;
  return {
    title: BLANK_RESUME_TITLES[lang] || BLANK_RESUME_TITLES.en,
    profile: { ...BLANK_RESUME.profile },
    sections: [
      { id: uid(), type: 'education', label: labels.education, visible: true, items: [] },
      { id: uid(), type: 'work', label: labels.work, visible: true, items: [] },
      { id: uid(), type: 'skills', label: labels.skills, visible: true, items: [] },
    ],
  };
}

export const SAMPLE_RESUME = {
  title: '示例简历',
  profile: {
    name: '李明',
    email: 'liming@example.com',
    phone: '138-0000-0000',
    website: '',
    city: '上海',
    birthday: '1996-06',
    status: '在职',
    headline: '前端工程师',
    avatar: RESUME_AVATAR
  },
  sections: [
    {
      id: 'sample-seed-1',
      type: 'summary',
      label: '个人总结',
      visible: true,
      items: [
        {
          id: 'sample-seed-2',
          title: '目标岗位总结',
          body: '5 年前端开发经验，熟悉 React、Vue 技术栈，擅长复杂后台系统和数据可视化开发，注重代码质量和用户体验。'
        }
      ]
    },
    {
      id: 'sample-seed-3',
      type: 'education',
      label: '教育经历',
      visible: true,
      items: [
        {
          id: 'sample-seed-4',
          school: '华东师范大学',
          major: '计算机科学与技术',
          degree: '本科',
          period: '2014年9月 - 2018年6月',
          location: '上海',
          details: ['GPA 3.7/4.0']
        }
      ]
    },
    {
      id: 'sample-seed-5',
      type: 'work',
      label: '工作经历',
      visible: true,
      items: [
        {
          id: 'sample-seed-6',
          org: '某科技公司',
          role: '高级前端工程师',
          period: '2021年3月 - 至今',
          location: '北京',
          bullets: [
            '负责公司核心后台系统前端架构设计与开发，支撑日均 10 万+ 用户使用。',
            '主导组件库建设，沉淀 50+ 高频业务组件，研发效率提升 40%。',
            '优化首屏加载性能，LCP 从 3.2s 降至 1.1s。'
          ]
        }
      ]
    },
    {
      id: 'sample-seed-7',
      type: 'skills',
      label: '技能',
      visible: true,
      items: [
        {
          id: 'sample-seed-8',
          title: '技术栈',
          values: ['React', 'TypeScript', 'Vue', 'Node.js', 'Webpack', 'Vite']
        }
      ]
    }
  ]
};

export const DEFAULT_SETTINGS = {
  template: 'purple',
  accent: '#8b63f6',
  fontFamily: 'Arial',
  fontSize: 12,
  lineHeight: 1.58,
  compact: false
};

function createTemplate({
  id,
  zh,
  en,
  accent,
  variant,
  tags,
  descriptionZh,
  descriptionEn,
  usage,
  language = '中文简历',
  free = false
}) {
  const localizedDescriptions = {
    ja: '読みやすさとプロらしさを両立した、応募しやすい履歴書テンプレート。',
    ko: '읽기 쉽고 전문적인 인상을 주는 실전형 이력서 템플릿입니다.',
    fr: 'Un modèle de CV clair et professionnel, conçu pour une candidature efficace.',
    ru: 'Понятный профессиональный шаблон резюме для уверенной подачи.',
  };
  return {
    id,
    label: { zh, 'zh-TW': toTraditional(zh), en, ja: en, ko: en, fr: en, ru: en },
    accent,
    variant,
    tags,
    description: { zh: descriptionZh, 'zh-TW': toTraditional(descriptionZh), en: descriptionEn, ...localizedDescriptions },
    usage,
    language,
    ...(free ? { free: true } : {})
  };
}

const CORE_TEMPLATE_LIBRARY = [
  createTemplate({
    id: 'purple',
    zh: '商务紫线',
    en: 'Purple Pro',
    accent: '#8b63f6',
    variant: 'banded',
    tags: ['热门', '社招', '商务', '产品经理', '项目管理', '运营', '互联网', 'SaaS', '电商', '管理'],
    descriptionZh: '适合产品、运营、管理类岗位，结构稳重，强调项目成果。',
    descriptionEn: 'For product, operations, and management roles with a results-first structure.',
    usage: 128640
  }),
  createTemplate({
    id: 'slate',
    zh: '石墨灰线',
    en: 'Slate',
    accent: '#475569',
    variant: 'classic',
    tags: ['热门', '社招', '商务', '金融', '咨询', '银行', '会计', '审计', '投资', '风控'],
    descriptionZh: '适合金融、咨询、职能岗位，阅读节奏清晰，信息密度适中。',
    descriptionEn: 'For finance, consulting, and business functions with balanced density.',
    usage: 117820
  }),
  createTemplate({
    id: 'exec-navy',
    zh: '深蓝简约',
    en: 'Navy',
    accent: '#1e3a5f',
    variant: 'executive',
    tags: ['社招', '商务', '管理', '金融', '咨询', '战略', '总监', '投融资', '企业服务'],
    descriptionZh: '适合资深候选人和管理岗位，突出履历稳定性和专业感。',
    descriptionEn: 'For senior candidates and management roles with a composed profile.',
    usage: 103480
  }),
  createTemplate({
    id: 'exec-charcoal',
    zh: '炭灰商务',
    en: 'Charcoal',
    accent: '#374151',
    variant: 'sidebar',
    tags: ['社招', '商务', '销售', '运营', '客户成功', '商务拓展', '物流', '零售', '供应链'],
    descriptionZh: '适合销售、运营、商务拓展岗位，兼顾专业度和可扫描性。',
    descriptionEn: 'For sales, operations, and business roles with easy scanning.',
    usage: 96420
  }),
  createTemplate({
    id: 'exec-wine',
    zh: '酒红庄重',
    en: 'Wine',
    accent: '#7f1d1d',
    variant: 'leftline',
    tags: ['社招', '商务', '行政', '人力资源', '法务', '政府事务', '公共关系', '职能岗'],
    descriptionZh: '适合行政、人力、职能类岗位，风格克制但有记忆点。',
    descriptionEn: 'For administrative and HR roles with restrained visual emphasis.',
    usage: 88760
  }),
  createTemplate({
    id: 'rose',
    zh: '玫红封面',
    en: 'Rose',
    accent: '#d94f74',
    variant: 'rose',
    tags: ['热门', '社招', '创意', '设计师', 'UI/UX', '品牌', '视觉设计', '内容', '互联网'],
    descriptionZh: '适合设计、品牌、内容岗位，顶部色块让个人信息更醒目。',
    descriptionEn: 'For design, brand, and content roles with a prominent header.',
    usage: 135200
  }),
  createTemplate({
    id: 'amber',
    zh: '暖橙活力',
    en: 'Amber',
    accent: '#d97706',
    variant: 'timeline',
    tags: ['校招', '实习生', '创意', '市场营销', '广告', '活动策划', '新媒体', '快消', '传媒'],
    descriptionZh: '适合校招、市场、活动运营岗位，强调活力和成长经历。',
    descriptionEn: 'For campus, marketing, and event roles with an energetic tone.',
    usage: 92110
  }),
  createTemplate({
    id: 'coral',
    zh: '珊瑚活力',
    en: 'Coral',
    accent: '#f97316',
    variant: 'banded',
    tags: ['校招', '实习生', '创意', '新媒体', '内容运营', '短视频', '直播', '电商', '传媒'],
    descriptionZh: '适合实习、新媒体和内容运营，版面轻快，便于突出项目。',
    descriptionEn: 'For internship, social media, and content operations roles.',
    usage: 86570
  }),
  createTemplate({
    id: 'violet',
    zh: '紫罗兰',
    en: 'Violet',
    accent: '#7c3aed',
    variant: 'rose',
    tags: ['社招', '创意', '设计师', 'UI/UX', '交互设计', '用户研究', '产品设计', '互联网'],
    descriptionZh: '适合 UI/UX、视觉设计岗位，适合搭配作品集链接。',
    descriptionEn: 'For UI/UX and visual design roles with portfolio emphasis.',
    usage: 80940
  }),
  createTemplate({
    id: 'fuchsia',
    zh: '品红大胆',
    en: 'Fuchsia',
    accent: '#c026d3',
    variant: 'rose',
    tags: ['社招', '创意', '品牌', '传媒', '公关', '文案策划', '市场营销', '广告'],
    descriptionZh: '适合品牌、公关、传媒岗位，视觉识别更强。',
    descriptionEn: 'For brand, PR, and media roles with stronger visual identity.',
    usage: 77430
  }),
  createTemplate({
    id: 'blue',
    zh: '极简蓝线',
    en: 'Blue Minimal',
    accent: '#2468c9',
    variant: 'leftline',
    tags: ['热门', '免费', '校招', '应届生', '大学生', '程序员', '软件工程', '计算机', '后端', 'Java'],
    descriptionZh: '适合应届生、技术岗和通用求职，干净耐读。',
    descriptionEn: 'For graduates, technical roles, and general applications.',
    usage: 142360,
    free: true
  }),
  createTemplate({
    id: 'mist',
    zh: '雾蓝清新',
    en: 'Misty',
    accent: '#5b8def',
    variant: 'academic',
    tags: ['校招', '应届生', '大学生', '教育', '教师', '培训', '语言类专业', '留学申请'],
    descriptionZh: '适合校园经历、教育背景较强的候选人，版面清爽。',
    descriptionEn: 'For campus profiles with strong education credentials.',
    usage: 100280
  }),
  createTemplate({
    id: 'teal',
    zh: '松石绿线',
    en: 'Teal',
    accent: '#0f766e',
    variant: 'timeline',
    tags: ['校招', '学术', '医药', '数据分析', '生物医药', '医疗健康', '科研', '统计', 'Python'],
    descriptionZh: '适合学术、数据、医药方向，视觉安静，强调条理。',
    descriptionEn: 'For academic, data, and healthcare profiles.',
    usage: 89260
  }),
  createTemplate({
    id: 'mint',
    zh: '薄荷学院',
    en: 'Mint',
    accent: '#059669',
    variant: 'academic',
    tags: ['校招', '学术', '大学生', '考研复试', '保研', '科研', '奖学金', '论文', '留学申请'],
    descriptionZh: '适合升学、复试、奖项和科研经历较多的简历。',
    descriptionEn: 'For graduate applications, awards, and research-heavy resumes.',
    usage: 73190
  }),
  createTemplate({
    id: 'sky',
    zh: '天蓝清爽',
    en: 'Sky',
    accent: '#0284c7',
    variant: 'blueprint',
    tags: ['校招', '应届生', '互联网', '前端', 'Web前端', 'JavaScript', 'React', '软件工程', '计算机'],
    descriptionZh: '适合互联网校招、前端和软件工程岗位，信息层次明确。',
    descriptionEn: 'For campus tech, frontend, and software roles.',
    usage: 84610
  }),
  createTemplate({
    id: 'mono',
    zh: '纯黑白',
    en: 'Mono',
    accent: '#18181b',
    variant: 'minimal',
    tags: ['社招', '极简', '英文', '外企', '留学申请', '咨询', '金融', '海外求职', '英语'],
    descriptionZh: '适合英文简历、外企投递和偏正式场景。',
    descriptionEn: 'For English resumes, multinational companies, and formal applications.',
    usage: 95880,
    language: '中英双语'
  }),
  createTemplate({
    id: 'paper',
    zh: '纸面素净',
    en: 'Paper',
    accent: '#78716c',
    variant: 'paper',
    tags: ['社招', '极简', '教师', '教育', '培训', '高校', '教研', '课程设计'],
    descriptionZh: '适合教育、教师和传统行业，排版朴素稳妥。',
    descriptionEn: 'For education, teaching, and traditional industries.',
    usage: 69350
  }),
  createTemplate({
    id: 'ink',
    zh: '墨线留白',
    en: 'Ink',
    accent: '#292524',
    variant: 'formal',
    tags: ['社招', '极简', '法律', '行政', '法务', '合规', '公共事务', '咨询'],
    descriptionZh: '适合法律、行政和严肃专业岗位，强调留白和秩序。',
    descriptionEn: 'For legal, administrative, and conservative professional roles.',
    usage: 66140
  }),
  createTemplate({
    id: 'ash',
    zh: '灰调理性',
    en: 'Ash',
    accent: '#6b7280',
    variant: 'blueprint',
    tags: ['社招', '极简', '工程师', '制造', '汽车', '新能源', '半导体', '硬件', '质量管理'],
    descriptionZh: '适合工程、制造和技术支持岗位，重点突出经验条目。',
    descriptionEn: 'For engineering, manufacturing, and technical support roles.',
    usage: 70560
  })
];

const STYLE_EXPANSION_TEMPLATES = [
  createTemplate({
    id: 'wc-wave-campus',
    zh: '蓝弧应届',
    en: 'Wave Campus',
    accent: '#3b82f6',
    variant: 'wave',
    tags: ['热门', '校招', '应届生', '大学生', '实习生', '求职', '教育', '留学申请'],
    descriptionZh: '参考热门应届生模板的弧形页眉与居中头像，适合校园经历较多的候选人。',
    descriptionEn: 'Campus layout with a curved header and centered portrait.',
    usage: 618300
  }),
  createTemplate({
    id: 'wc-wave-tech',
    zh: '蓝弧技术',
    en: 'Wave Tech',
    accent: '#2563eb',
    variant: 'wave',
    tags: ['热门', '校招', '应届生', '程序员', '前端', '后端', '计算机', '软件工程', '互联网'],
    descriptionZh: '适合研发、测试和数据岗位，顶部视觉醒目，正文保持 ATS 友好。',
    descriptionEn: 'Curved tech resume style for engineering roles.',
    usage: 602700
  }),
  createTemplate({
    id: 'wc-rose-banner',
    zh: '玫红渐变',
    en: 'Rose Banner',
    accent: '#be123c',
    variant: 'gradient',
    tags: ['热门', '校招', '实习生', '创意', '市场营销', '新媒体', '品牌', '传媒'],
    descriptionZh: '横向渐变名片页眉，适合实习、运营、内容和品牌岗位。',
    descriptionEn: 'Gradient name-card header for marketing and intern resumes.',
    usage: 594100
  }),
  createTemplate({
    id: 'wc-soft-business-card',
    zh: '青绿卡片',
    en: 'Soft Cards',
    accent: '#0f766e',
    variant: 'softcard',
    tags: ['社招', '商务', '销售', '运营', '客户成功', '商务拓展', '电商', '管理'],
    descriptionZh: '浅色背景搭配白色内容卡片，适合信息密度较高的社招简历。',
    descriptionEn: 'Soft card sections for business roles.',
    usage: 575400
  }),
  createTemplate({
    id: 'wc-finance-dark-arc',
    zh: '深色弧顶',
    en: 'Dark Arc',
    accent: '#111827',
    variant: 'darkwave',
    tags: ['热门', '社招', '商务', '金融', '咨询', '银行', '投资', '风控', '会计'],
    descriptionZh: '深色弧形页眉与大块留白，适合金融、咨询和正式商务场景。',
    descriptionEn: 'Dark curved header for finance and consulting resumes.',
    usage: 561800
  }),
  createTemplate({
    id: 'wc-teal-right-rail',
    zh: '右栏名片',
    en: 'Right Rail',
    accent: '#0f766e',
    variant: 'rightbar',
    tags: ['社招', '商务', '新能源', '制造', '汽车', '工程师', '项目管理', '管理'],
    descriptionZh: '右侧整栏放置个人信息，正文左侧高密度展开，适合行业项目型履历。',
    descriptionEn: 'Right identity rail with dense experience content.',
    usage: 548900
  }),
  createTemplate({
    id: 'wc-orange-left-rail',
    zh: '橙色侧栏',
    en: 'Orange Rail',
    accent: '#ea580c',
    variant: 'leftbar',
    tags: ['校招', '社招', '销售', '市场营销', '广告', '活动策划', '新媒体', '快消'],
    descriptionZh: '左侧彩色信息栏，正文以细分割线组织，适合销售和市场类岗位。',
    descriptionEn: 'Color identity rail for sales and marketing resumes.',
    usage: 536200
  }),
  createTemplate({
    id: 'wc-geometric-design',
    zh: '几何灰白',
    en: 'Geo Formal',
    accent: '#27272a',
    variant: 'geometric',
    tags: ['社招', '创意', '设计师', 'UI/UX', '视觉设计', '品牌', '产品设计'],
    descriptionZh: '几何角标与黑白分割线，适合设计、视觉和作品集导向履历。',
    descriptionEn: 'Geometric black-and-white layout for creative roles.',
    usage: 521600
  }),
  createTemplate({
    id: 'wc-medical-geometric',
    zh: '医药几何',
    en: 'Medical Geo',
    accent: '#374151',
    variant: 'geometric',
    tags: ['社招', '学术', '医药', '生物医药', '医疗健康', '科研', '数据分析'],
    descriptionZh: '克制的几何装饰与正式居中栏目标题，适合科研和医药行业。',
    descriptionEn: 'Restrained geometric resume for healthcare and research.',
    usage: 508300
  }),
  createTemplate({
    id: 'wc-iconline-tech',
    zh: '图标蓝线',
    en: 'Icon Line',
    accent: '#3b82f6',
    variant: 'iconline',
    tags: ['校招', '应届生', '程序员', '前端', 'Web前端', 'JavaScript', 'React', 'Python'],
    descriptionZh: '圆形栏目图标配细分割线，适合技术岗清晰展示模块。',
    descriptionEn: 'Icon-led section titles for technical resumes.',
    usage: 493700
  }),
  createTemplate({
    id: 'wc-purple-strip-industrial',
    zh: '紫线工业',
    en: 'Purple Strip',
    accent: '#8b5cf6',
    variant: 'topstrip',
    tags: ['校招', '工程师', '制造', '互联网', '自动化', '硬件', '质量管理'],
    descriptionZh: '顶部细色条与浅色栏目带，适合工程、工业互联网和制造校招。',
    descriptionEn: 'Slim color strip layout for engineering resumes.',
    usage: 482400
  }),
  createTemplate({
    id: 'wc-red-legal-strip',
    zh: '法务红线',
    en: 'Legal Strip',
    accent: '#dc2626',
    variant: 'topstrip',
    tags: ['校招', '社招', '法律', '法务', '行政', '公共事务', '合规', '职能岗'],
    descriptionZh: '顶部细红线与淡色标题条，适合法务、行政和公共事务岗位。',
    descriptionEn: 'Thin red rule layout for legal and admin roles.',
    usage: 471200
  }),
  createTemplate({
    id: 'wc-english-ats',
    zh: '英文ATS',
    en: 'ATS English',
    accent: '#18181b',
    variant: 'ats',
    tags: ['热门', '社招', '极简', '英文', '外企', '海外求职', '英语', '咨询', '金融'],
    descriptionZh: '英文 ATS 友好黑白排版，强调清晰标题、粗细层级和可解析文本。',
    descriptionEn: 'ATS-friendly black-and-white English resume.',
    usage: 462800,
    language: '中英双语'
  }),
  createTemplate({
    id: 'wc-mba-ats',
    zh: 'MBA投行',
    en: 'MBA Banking',
    accent: '#111827',
    variant: 'ats',
    tags: ['社招', '极简', '英文', '留学申请', '金融', '咨询', '投融资', '海外求职'],
    descriptionZh: '参考商学院和投行英文简历的高密度黑白版式。',
    descriptionEn: 'Dense MBA and banking style resume.',
    usage: 455600,
    language: '中英双语'
  }),
  createTemplate({
    id: 'wc-ribbon-finance',
    zh: '箭头金融',
    en: 'Ribbon Finance',
    accent: '#be123c',
    variant: 'ribbon',
    tags: ['社招', '商务', '金融', '银行', '会计', '审计', '投资', '风控'],
    descriptionZh: '箭头式栏目标题与细线横贯页面，适合金融、制造和职能类履历。',
    descriptionEn: 'Ribbon section titles for finance resumes.',
    usage: 443900
  }),
  createTemplate({
    id: 'wc-ladder-product',
    zh: '纵轴产品',
    en: 'Ladder Product',
    accent: '#7c3aed',
    variant: 'ladder',
    tags: ['社招', '商务', '产品经理', '项目管理', '运营', '互联网', 'SaaS', '管理'],
    descriptionZh: '纵向时间轴强化经历顺序，适合产品、项目和增长岗位。',
    descriptionEn: 'Vertical ladder timeline for product resumes.',
    usage: 438500
  }),
  createTemplate({
    id: 'wc-hr-statement',
    zh: '人资宣言',
    en: 'HR Statement',
    accent: '#c026d3',
    variant: 'statement',
    tags: ['社招', '商务', '行政', '人力资源', '培训', '职能岗', '管理'],
    descriptionZh: '大标题名片式页眉配淡色栏目块，适合人资、行政和培训岗位。',
    descriptionEn: 'Statement header for HR and admin resumes.',
    usage: 424300
  }),
  createTemplate({
    id: 'wc-capsule-education',
    zh: '胶囊教研',
    en: 'Capsule Edu',
    accent: '#16a34a',
    variant: 'capsule',
    tags: ['校招', '学术', '教师', '教育', '培训', '高校', '教研', '课程设计'],
    descriptionZh: '胶囊栏目标题和柔和底纹，适合教育、教研和升学申请。',
    descriptionEn: 'Capsule title system for education resumes.',
    usage: 413700
  }),
  createTemplate({
    id: 'wc-frost-health',
    zh: '霜白医药',
    en: 'Frost Health',
    accent: '#0d9488',
    variant: 'frost',
    tags: ['社招', '学术', '医药', '医疗健康', '生物医药', '数据分析', '科研'],
    descriptionZh: '浅青背景与卡片分区，适合医疗、数据和科研型简历。',
    descriptionEn: 'Frosted cards for healthcare and data resumes.',
    usage: 406900
  }),
  createTemplate({
    id: 'wc-pillar-consulting',
    zh: '咨询立柱',
    en: 'Consulting Pillar',
    accent: '#334155',
    variant: 'pillar',
    tags: ['社招', '商务', '咨询', '战略', '金融', '投融资', '管理'],
    descriptionZh: '左侧窄柱与严谨分隔，适合咨询、战略和管理岗位。',
    descriptionEn: 'Narrow pillar layout for consulting resumes.',
    usage: 398800
  }),
  createTemplate({
    id: 'wc-corner-academic',
    zh: '学术角标',
    en: 'Academic Corner',
    accent: '#52525b',
    variant: 'corner',
    tags: ['校招', '学术', '大学生', '考研复试', '保研', '科研', '论文', '留学申请'],
    descriptionZh: '灰色角标、居中栏目与学术留白，适合科研、保研和复试材料。',
    descriptionEn: 'Corner-mark academic resume style.',
    usage: 386400
  }),
  createTemplate({
    id: 'wc-mono-rule-legal',
    zh: '黑白法规',
    en: 'Mono Legal',
    accent: '#18181b',
    variant: 'doubleline',
    tags: ['社招', '极简', '法律', '行政', '法务', '合规', '公共事务', '咨询'],
    descriptionZh: '黑白双线标题，适合严肃专业岗位和正式申请场景。',
    descriptionEn: 'Double-rule monochrome layout for formal roles.',
    usage: 374900
  }),
  createTemplate({
    id: 'wc-side-global',
    zh: '海归侧栏',
    en: 'Global Rail',
    accent: '#0f766e',
    variant: 'leftbar',
    tags: ['社招', '英文', '外企', '海外求职', '英语', '项目管理', '商务'],
    descriptionZh: '侧栏突出跨文化背景与联系方式，适合外企和海外求职。',
    descriptionEn: 'Side rail resume for global candidates.',
    usage: 362700,
    language: '中英双语'
  }),
  createTemplate({
    id: 'wc-clean-campus',
    zh: '清白校招',
    en: 'Clean Campus',
    accent: '#0284c7',
    variant: 'cleanline',
    tags: ['免费', '校招', '应届生', '大学生', '实习生', '求职', '计算机', '软件工程'],
    descriptionZh: '轻装饰、细线标题和紧凑正文，适合通用校招投递。',
    descriptionEn: 'Clean campus resume with subtle section rules.',
    usage: 354100,
    free: true
  }),
  createTemplate({
    id: 'wc-ops-minimal',
    zh: '运营细线',
    en: 'Ops Minimal',
    accent: '#f97316',
    variant: 'cleanline',
    tags: ['校招', '社招', '运营', '市场营销', '新媒体', '内容运营', '电商', '传媒'],
    descriptionZh: '轻量单栏与暖色标题线，适合运营、内容和活动履历。',
    descriptionEn: 'Minimal single-column layout for operations roles.',
    usage: 343600
  }),
  createTemplate({
    id: 'wc-portfolio-design',
    zh: '作品集灰',
    en: 'Portfolio Gray',
    accent: '#52525b',
    variant: 'portfolio',
    tags: ['社招', '创意', '设计师', 'UI/UX', '视觉设计', '交互设计', '品牌'],
    descriptionZh: '作品集式信息区和黑白横线，适合设计师强调方法与产出。',
    descriptionEn: 'Portfolio-inspired black-and-white resume.',
    usage: 335800
  }),
  createTemplate({
    id: 'wc-business-card',
    zh: '商务名片',
    en: 'Business Card',
    accent: '#1e3a8a',
    variant: 'businesscard',
    tags: ['社招', '商务', '销售', '商务拓展', '客户成功', '项目管理', '企业服务'],
    descriptionZh: '顶部商务名片区配稳重分栏，适合客户、销售和商务拓展。',
    descriptionEn: 'Business-card header for client-facing roles.',
    usage: 328900
  }),
  createTemplate({
    id: 'wc-executive-card',
    zh: '高管卡片',
    en: 'Executive Card',
    accent: '#0f172a',
    variant: 'executivecard',
    tags: ['社招', '商务', '管理', '战略', '总监', '投融资', '企业服务'],
    descriptionZh: '深色页眉与白色卡片式经历，适合资深候选人。',
    descriptionEn: 'Executive resume with dark header and carded sections.',
    usage: 317500
  }),
  createTemplate({
    id: 'wc-paper-seal',
    zh: '纸章素雅',
    en: 'Paper Seal',
    accent: '#78716c',
    variant: 'seal',
    tags: ['社招', '极简', '教师', '教育', '法律', '行政', '高校', '传统行业'],
    descriptionZh: '纸面色、印章感栏目点缀和宋体系排版，适合传统行业。',
    descriptionEn: 'Paper-toned formal resume with seal accents.',
    usage: 306600
  }),
  createTemplate({
    id: 'wc-grid-engineer',
    zh: '工程网格',
    en: 'Engineer Grid',
    accent: '#4b5563',
    variant: 'gridline',
    tags: ['社招', '工程师', '制造', '汽车', '新能源', '半导体', '硬件', '质量管理'],
    descriptionZh: '淡网格背景与工程图式标题，适合制造、硬件和质量岗位。',
    descriptionEn: 'Engineering grid style for manufacturing resumes.',
    usage: 297200
  }),
  createTemplate({
    id: 'wc-sage-education',
    zh: '青藤教育',
    en: 'Sage Edu',
    accent: '#15803d',
    variant: 'softcard',
    tags: ['校招', '学术', '教师', '教育', '培训', '课程设计', '奖学金'],
    descriptionZh: '柔和卡片版式承载课程、教研和获奖信息。',
    descriptionEn: 'Soft green card layout for teaching resumes.',
    usage: 286400
  }),
  createTemplate({
    id: 'wc-amber-sales',
    zh: '琥珀销售',
    en: 'Amber Sales',
    accent: '#d97706',
    variant: 'leftbar',
    tags: ['社招', '销售', '客户成功', '商务拓展', '零售', '供应链', '管理'],
    descriptionZh: '高识别度侧栏和结果导向正文，适合销售与客户成功。',
    descriptionEn: 'Amber side rail for sales resumes.',
    usage: 276900
  }),
  createTemplate({
    id: 'wc-navy-public',
    zh: '深蓝公关',
    en: 'Navy Public',
    accent: '#111827',
    variant: 'darktop',
    tags: ['社招', '商务', '公共关系', '公共事务', '行政', '政府事务', '品牌公关'],
    descriptionZh: '深色顶部头像名片，正文黑白图标线条，适合公共事务和品牌公关。',
    descriptionEn: 'Navy header resume for public affairs roles.',
    usage: 268300
  })
];

const TEMPLATE_SERIES = [
  {
    id: 'campus-tech',
    variant: 'leftline',
    usageBase: 468000,
    usageStep: 11600,
    language: '中文简历',
    tags: ['热门', '校招', '应届生', '大学生', '互联网', '程序员', '前端', '后端', '计算机', '软件工程', 'JavaScript', 'React', 'Python'],
    descriptionZh: '适合互联网校招、研发实习与技术岗投递，强调课程项目、实习经历和技术栈。',
    descriptionEn: 'For campus tech applications with project, internship, and stack emphasis.',
    designs: [
      ['morning', '晨光校招', 'Campus Dawn', '#2563eb'],
      ['bridge', '蓝桥开发', 'Blue Bridge', '#1d4ed8'],
      ['nebula', '星河前端', 'Nebula Frontend', '#4338ca'],
      ['reactor', '极客后端', 'Geek Backend', '#0369a1'],
      ['quantum', '量子测试', 'Quantum QA', '#0f766e'],
      ['summit', '登峰算法', 'Summit Algo', '#4f46e5'],
      ['voyage', '远航数据', 'Voyage Data', '#0284c7'],
      ['pixel', '像素实习', 'Pixel Intern', '#0891b2']
    ]
  },
  {
    id: 'campus-general',
    variant: 'academic',
    usageBase: 438000,
    usageStep: 10300,
    language: '中文简历',
    tags: ['热门', '校招', '大学生', '实习生', '应届生', '求职', '教育', '留学申请', '语言类专业'],
    descriptionZh: '适合通用校招、实习和校园经历较多的候选人，版面简洁，便于快速填写。',
    descriptionEn: 'For general campus, internship, and education-heavy profiles.',
    designs: [
      ['sailing', '扬帆应届', 'Graduate Sail', '#f97316'],
      ['leaf', '新叶大学生', 'Fresh Leaf', '#16a34a'],
      ['clear', '简白实习', 'Clear Intern', '#0ea5e9'],
      ['warm', '暖阳校招', 'Warm Campus', '#fb7185'],
      ['jade', '青禾成长', 'Jade Growth', '#10b981'],
      ['pearl', '珍珠通用', 'Pearl General', '#64748b'],
      ['start', '启程新人', 'Starter', '#f59e0b'],
      ['hope', '追光求职', 'Chase Light', '#22c55e']
    ]
  },
  {
    id: 'finance-consulting',
    variant: 'minimal',
    usageBase: 402000,
    usageStep: 9700,
    language: '中文简历',
    tags: ['热门', '社招', '商务', '金融', '咨询', '银行', '会计', '审计', '投资', '风控', '职能岗'],
    descriptionZh: '适合金融、咨询、审计和投研岗位，信息密度高且层次克制，便于突出项目与证书。',
    descriptionEn: 'For finance, consulting, and audit roles with concise information density.',
    designs: [
      ['harbor', '柏舟金融', 'Finance Harbor', '#334155'],
      ['keystone', '衡石咨询', 'Keystone Consulting', '#475569'],
      ['audit', '晨岳审计', 'Audit Peak', '#1f2937'],
      ['grain', '金穗投研', 'Golden Grain', '#7c2d12'],
      ['shield', '远见风控', 'Risk Shield', '#0f172a'],
      ['summit', '峰值银行', 'Bank Summit', '#1e3a8a'],
      ['ledger', '华章会计', 'Ledger Pro', '#374151'],
      ['equity', '砺行投资', 'Equity Track', '#312e81']
    ]
  },
  {
    id: 'experienced-business',
    variant: 'banded',
    usageBase: 388000,
    usageStep: 9100,
    language: '中文简历',
    tags: ['热门', '社招', '商务', '产品经理', '项目管理', '运营', '互联网', '电商', '管理', '企业服务', 'SaaS'],
    descriptionZh: '适合产品、运营、项目和企业服务岗位，强调业务成果、跨团队协作与增长指标。',
    descriptionEn: 'For product, operations, and B2B roles with strong business outcomes.',
    designs: [
      ['peak', '峰行产品', 'Peak Product', '#8b5cf6'],
      ['atlas', '云图运营', 'Atlas Ops', '#2563eb'],
      ['chapter', '序章项目', 'Project Chapter', '#4f46e5'],
      ['growth', '增长经理', 'Growth Manager', '#f97316'],
      ['north', '北辰管理', 'Northstar Lead', '#1d4ed8'],
      ['review', '复盘增长', 'Growth Review', '#0f766e'],
      ['b2b', '领航企业服务', 'B2B Lead', '#3730a3'],
      ['playbook', '增长作战图', 'Growth Playbook', '#7c3aed']
    ]
  },
  {
    id: 'sales-success',
    variant: 'sidebar',
    usageBase: 366000,
    usageStep: 8600,
    language: '中文简历',
    tags: ['社招', '商务', '销售', '客户成功', '商务拓展', '物流', '零售', '供应链', '运营', '管理'],
    descriptionZh: '适合销售、客户成功、商务拓展和连锁运营岗位，突出业绩增长、客户维护和区域管理。',
    descriptionEn: 'For sales, customer success, and operations roles with performance emphasis.',
    designs: [
      ['closer', '成交顾问', 'Top Closer', '#ea580c'],
      ['success', '客户成功', 'Customer Success', '#0284c7'],
      ['deal', '商机拓展', 'Deal Builder', '#7c3aed'],
      ['retail', '零售增长', 'Retail Growth', '#dc2626'],
      ['supply', '供应链商务', 'Supply Biz', '#475569'],
      ['warehouse', '仓储运营', 'Warehouse Ops', '#0f766e'],
      ['chain', '连锁管理', 'Chain Manager', '#b45309'],
      ['regional', '区域销售', 'Regional Sales', '#c2410c']
    ]
  },
  {
    id: 'creative-design',
    variant: 'rose',
    usageBase: 352000,
    usageStep: 8400,
    language: '中文简历',
    tags: ['热门', '社招', '创意', '设计师', 'UI/UX', '品牌', '视觉设计', '交互设计', '用户研究', '产品设计', '互联网'],
    descriptionZh: '适合设计、品牌和体验岗位，顶部色块更适合突出作品集链接、设计方法和项目产出。',
    descriptionEn: 'For design, brand, and UX roles with a more expressive profile header.',
    designs: [
      ['glow', '玫影设计', 'Rose Glow', '#e11d48'],
      ['canvas', '画布体验', 'Canvas UX', '#c026d3'],
      ['vector', '弧光交互', 'Arc Interaction', '#7c3aed'],
      ['pixel', '像素创意', 'Pixel Creative', '#db2777'],
      ['blank', '留白品牌', 'Brand Blank', '#be185d'],
      ['poster', '桃色作品集', 'Portfolio Pink', '#f43f5e'],
      ['vision', '灵感视觉', 'Vision Board', '#9333ea'],
      ['quadrant', '象限UI', 'Quadrant UI', '#ec4899']
    ]
  },
  {
    id: 'media-marketing',
    variant: 'banded',
    usageBase: 338000,
    usageStep: 7800,
    language: '中文简历',
    tags: ['热门', '校招', '社招', '创意', '市场营销', '广告', '活动策划', '新媒体', '内容运营', '短视频', '直播', '传媒', '快消'],
    descriptionZh: '适合品牌传播、内容增长和活动营销岗位，强调项目节奏、传播数据和创意执行。',
    descriptionEn: 'For marketing, brand, and content roles with campaign metrics and creative execution.',
    designs: [
      ['heat', '热浪内容', 'Heat Content', '#f97316'],
      ['orange', '橘子新媒体', 'Orange Media', '#fb7185'],
      ['talk', '传播企划', 'Campaign Talk', '#ec4899'],
      ['effect', '品效合一', 'Brand Performance', '#f43f5e'],
      ['topic', '话题营销', 'Topic Growth', '#e11d48'],
      ['event', '节点活动', 'Event Pulse', '#f59e0b'],
      ['camera', '镜头直播', 'Live Camera', '#d946ef'],
      ['copy', '增长文案', 'Growth Copy', '#ef4444']
    ]
  },
  {
    id: 'education-academic',
    variant: 'academic',
    usageBase: 320000,
    usageStep: 7600,
    language: '中文简历',
    tags: ['校招', '学术', '教师', '教育', '培训', '高校', '教研', '课程设计', '考研复试', '保研', '科研', '奖学金', '论文', '留学申请'],
    descriptionZh: '适合教师、教研、升学和科研方向，突出课程设计、论文成果和在校荣誉。',
    descriptionEn: 'For education, graduate applications, and research-oriented profiles.',
    designs: [
      ['ivy', '青藤教研', 'Ivy Teaching', '#16a34a'],
      ['mentor', '师说教育', 'Mentor Edu', '#0f766e'],
      ['folio', '书页高校', 'Campus Folio', '#65a30d'],
      ['research', '学者科研', 'Scholar Research', '#0ea5e9'],
      ['apply', '研途申请', 'Grad Path', '#3b82f6'],
      ['defense', '复试答辩', 'Interview Defense', '#0891b2'],
      ['award', '清简保研', 'Award Clean', '#22c55e'],
      ['paper', '论文成果', 'Paper Result', '#14b8a6']
    ]
  },
  {
    id: 'healthcare-data',
    variant: 'timeline',
    usageBase: 308000,
    usageStep: 7400,
    language: '中文简历',
    tags: ['校招', '社招', '学术', '医药', '生物医药', '医疗健康', '数据分析', '统计', '科研', 'Python'],
    descriptionZh: '适合医药、医疗、数据分析和科研岗位，版面安静，便于梳理实验、研究与分析结果。',
    descriptionEn: 'For healthcare, pharma, and data roles with structured research presentation.',
    designs: [
      ['pharma', '霁青医药', 'Pharma Jade', '#059669'],
      ['bio', '生信研究', 'Bio Research', '#10b981'],
      ['clinical', '临床数据', 'Clinical Data', '#0284c7'],
      ['public', '公卫研究', 'Public Health', '#0f766e'],
      ['insight', '统计分析', 'Stats Insight', '#0891b2'],
      ['med', '松针药学', 'Pine Pharma', '#14b8a6'],
      ['python', '智析Python', 'Python Insight', '#2563eb'],
      ['strategy', '医疗策略', 'Health Strategy', '#0d9488']
    ]
  },
  {
    id: 'manufacturing-engineering',
    variant: 'blueprint',
    usageBase: 292000,
    usageStep: 7200,
    language: '中文简历',
    tags: ['社招', '极简', '工程师', '制造', '汽车', '新能源', '半导体', '硬件', '质量管理', '管理'],
    descriptionZh: '适合工程、制造、汽车和新能源岗位，强调项目交付、工艺优化和质量改进。',
    descriptionEn: 'For engineering and manufacturing roles with project delivery and quality improvements.',
    designs: [
      ['smart', '智造工程', 'Smart Build', '#4b5563'],
      ['energy', '新能源研发', 'New Energy', '#0f766e'],
      ['chip', '半导体制造', 'Chip Making', '#1f2937'],
      ['auto', '汽车质量', 'Auto Quality', '#1d4ed8'],
      ['process', '工艺工程', 'Process Pro', '#6b7280'],
      ['hardware', '硬件系统', 'Hardware System', '#334155'],
      ['ops', '设备运维', 'Device Ops', '#64748b'],
      ['factory', '工厂管理', 'Factory Lead', '#374151']
    ]
  },
  {
    id: 'legal-admin',
    variant: 'formal',
    usageBase: 276000,
    usageStep: 6900,
    language: '中文简历',
    tags: ['社招', '极简', '法律', '行政', '法务', '人力资源', '政府事务', '公共关系', '职能岗', '合规'],
    descriptionZh: '适合法务、行政、人力和公共事务岗位，强调条理、规范和正式表达。',
    descriptionEn: 'For legal, admin, and HR roles with a restrained, orderly presentation.',
    designs: [
      ['law', '法度合规', 'Legal Order', '#1f2937'],
      ['admin', '公务行政', 'Public Admin', '#475569'],
      ['steady', '稳妥法务', 'Steady Legal', '#374151'],
      ['office', '事务管理', 'Office Affairs', '#78716c'],
      ['memo', '文书行政', 'Memo Admin', '#52525b'],
      ['policy', '政策研究', 'Policy Study', '#334155'],
      ['secretary', '纪要秘书', 'Secretary Note', '#57534e'],
      ['discipline', '风纪监察', 'Discipline Review', '#292524']
    ]
  },
  {
    id: 'global-english',
    variant: 'minimal',
    usageBase: 264000,
    usageStep: 6600,
    language: '中英双语',
    tags: ['热门', '社招', '极简', '英文', '外企', '留学申请', '海外求职', '英语', '咨询', '金融'],
    descriptionZh: '适合英文简历、跨国岗位和留学申请，强调 ATS 友好和正式感。',
    descriptionEn: 'For English resumes, global opportunities, and study-abroad applications.',
    designs: [
      ['global-edge', '海投国际', 'Global Edge', '#111827'],
      ['oxford-clean', '牛津素白', 'Oxford Clean', '#1f2937'],
      ['metro-bilingual', '都会双语', 'Metro Bilingual', '#334155'],
      ['ivy-path', '常春藤路径', 'Ivy Path', '#0f172a'],
      ['nordic-pro', '北欧专业', 'Nordic Pro', '#374151'],
      ['london-ats', '伦敦ATS', 'London ATS', '#475569'],
      ['harbor-english', '港湾英文', 'Harbor English', '#4b5563'],
      ['summit-global', '峰会全球', 'Summit Global', '#312e81']
    ]
  },
  {
    id: 'leadership-strategy',
    variant: 'executive',
    usageBase: 248000,
    usageStep: 6400,
    language: '中文简历',
    tags: ['社招', '商务', '管理', '战略', '总监', '投融资', '企业服务', '咨询', '金融'],
    descriptionZh: '适合高管、战略、投融资和综合管理岗位，适合突出组织影响力和经营结果。',
    descriptionEn: 'For leadership, strategy, and investment roles with executive-level presentation.',
    designs: [
      ['board', '董事会简约', 'Boardroom', '#1e3a5f'],
      ['strategy', '战略顾问', 'Strategy Advisor', '#1f2937'],
      ['executive', '高管深蓝', 'Executive Navy', '#1d4ed8'],
      ['capital', '投融资总监', 'Capital Director', '#312e81'],
      ['region', '区域总经理', 'Regional GM', '#0f172a'],
      ['service', '企业服务总监', 'Service Director', '#1e40af'],
      ['landing', '战略落地', 'Strategy Execution', '#334155'],
      ['upgrade', '组织升级', 'Org Upgrade', '#4f46e5']
    ]
  }
];

function buildSeriesTemplates(series) {
  return series.designs.map(([slug, zh, en, accent, free = false, language = series.language, extraTags = []], index) => (
    createTemplate({
      id: `${series.id}-${slug}`,
      zh,
      en,
      accent,
      variant: series.variant,
      tags: [...new Set([...series.tags, ...extraTags, ...(free ? ['免费'] : [])])],
      descriptionZh: series.descriptionZh,
      descriptionEn: series.descriptionEn,
      usage: Math.max(68000, series.usageBase - index * series.usageStep),
      language,
      free
    })
  ));
}

export const RESUME_TEMPLATES = [
  ...CORE_TEMPLATE_LIBRARY,
  ...STYLE_EXPANSION_TEMPLATES,
  ...TEMPLATE_SERIES.flatMap(buildSeriesTemplates)
].map((template) => ({ ...template, free: true }));

const TEMPLATE_TAGS_EN = {
  '人力资源': 'Human Resources', '企业服务': 'Enterprise', '会计': 'Accounting', '传媒': 'Media', '传统行业': 'Traditional Industries',
  '供应链': 'Supply Chain', '保研': 'Graduate Recommendation', '免费': 'Free', '公共事务': 'Public Affairs', '公共关系': 'Public Relations',
  '公关': 'PR', '内容': 'Content', '内容运营': 'Content Operations', '创意': 'Creative', '制造': 'Manufacturing', '前端': 'Frontend',
  '医疗健康': 'Healthcare', '医药': 'Pharma', '半导体': 'Semiconductors', '合规': 'Compliance', '后端': 'Backend', '咨询': 'Consulting',
  '品牌': 'Brand', '品牌公关': 'Brand PR', '商务': 'Business', '商务拓展': 'Business Development', '培训': 'Training', '外企': 'Multinational',
  '大学生': 'Student', '奖学金': 'Scholarships', '学术': 'Academic', '实习生': 'Internship', '审计': 'Audit', '客户成功': 'Customer Success',
  '工程师': 'Engineering', '市场营销': 'Marketing', '广告': 'Advertising', '应届生': 'Graduate', '快消': 'Consumer Goods', '总监': 'Director',
  '战略': 'Strategy', '投融资': 'Investment & Finance', '投资': 'Investment', '政府事务': 'Government Affairs', '教师': 'Teaching', '教研': 'Education Research',
  '教育': 'Education', '数据分析': 'Data Analysis', '文案策划': 'Copywriting', '新媒体': 'New Media', '新能源': 'New Energy', '极简': 'Minimal',
  '校招': 'Campus', '求职': 'Job Search', '汽车': 'Automotive', '法务': 'Legal Operations', '法律': 'Legal', '活动策划': 'Events',
  '海外求职': 'Global Careers', '热门': 'Popular', '物流': 'Logistics', '生物医药': 'Biopharma', '用户研究': 'User Research', '电商': 'E-commerce',
  '留学申请': 'Study Abroad', '直播': 'Livestreaming', '短视频': 'Short Video', '硬件': 'Hardware', '社招': 'Experienced Hire', '科研': 'Research',
  '程序员': 'Software Engineering', '管理': 'Management', '统计': 'Statistics', '考研复试': 'Graduate Interview', '职能岗': 'Corporate Functions', '自动化': 'Automation',
  '英文': 'English', '英语': 'English', '行政': 'Administration', '视觉设计': 'Visual Design', '计算机': 'Computer Science', '论文': 'Publications',
  '设计师': 'Design', '语言类专业': 'Languages', '课程设计': 'Curriculum Design', '质量管理': 'Quality Management', '软件工程': 'Software Engineering',
  '运营': 'Operations', '金融': 'Finance', '银行': 'Banking', '销售': 'Sales', '零售': 'Retail', '项目管理': 'Project Management', '风控': 'Risk', '高校': 'Higher Education',
  'Web前端': 'Web Frontend', '互联网': 'Internet', '产品经理': 'Product Management', '产品设计': 'Product Design', '交互设计': 'Interaction Design',
};

export function localizeTemplateTag(tag, lang = 'en') {
  if (lang === 'zh') return tag;
  if (lang === 'zh-TW') return toTraditional(tag);
  return TEMPLATE_TAGS_EN[tag] || tag;
}

export function localizeTemplateLanguage(language, lang = 'en') {
  if (lang === 'zh') return '中文 / 英文';
  if (lang === 'zh-TW') return '繁體中文 / 英文';
  if (lang === 'ja') return '日本語 / 英語';
  if (lang === 'ko') return '한국어 / 영어';
  if (lang === 'fr') return 'Français / Anglais';
  if (lang === 'ru') return 'Русский / английский';
  return 'English / Chinese';
}

const uid = () => crypto.randomUUID();

const SAMPLE_RESUME_CASES_ZH = [
  {
    id: 'tech',
    match: ['程序员', '前端', '后端', 'JavaScript', 'React', 'Python', '计算机', '软件工程'],
    profile: {
      name: '陈宇飞',
      email: 'chenyf@techmail.com',
      phone: '186-2233-8899',
      website: 'github.com/chenyf-dev',
      city: '北京',
      birthday: '1993-07',
      status: '在职',
      headline: '全栈工程师 / 技术负责人',
      avatar: RESUME_AVATAR
    },
    summary: '8 年全栈开发与平台架构经验，熟悉 React、Node.js、Go 和云原生技术栈。擅长从 0 到 1 搭建技术产品，推动工程效率和系统稳定性提升。',
    education: [
      { school: '北京科技大学', major: '计算机科学与技术', degree: '硕士（免试）', period: '2016年9月 - 2019年1月', location: '北京', details: ['研究方向：分布式系统、微服务架构'] },
      { school: '北京科技大学', major: '计算机科学与技术', degree: '本科', period: '2012年9月 - 2016年6月', location: '北京', details: ['校级一等奖学金，ACM 竞赛省级银奖'] }
    ],
    work: [
      {
        org: '字节跳动',
        role: '高级全栈工程师',
        period: '2022年3月 - 至今',
        location: '北京',
        bullets: [
          '主导内部开发者平台建设，支撑 2000+ 工程师日常研发流程，CI/CD 执行效率提升 60%。',
          '设计并实现微服务编排引擎，支持复杂业务流程可视化配置，上线后人力投入减少 40%。',
          '构建前端监控体系，覆盖异常捕获、性能埋点和告警链路，线上问题平均定位时间缩短至 5 分钟。'
        ]
      },
      {
        org: '美团',
        role: '前端技术专家',
        period: '2019年3月 - 2022年2月',
        location: '北京',
        bullets: [
          '负责到店业务商家端前端架构，支撑日均 50 万+ 商家操作，核心页面 LCP 优化至 1.2s。',
          '搭建组件库和设计系统，沉淀 60+ 业务组件，被 4 条业务线复用。',
          '推动 TypeScript 全量迁移和单元测试覆盖率从 12% 提升至 78%。'
        ]
      }
    ],
    project: [
      { org: '开发者平台 2.0', role: '技术负责人', period: '2023年6月 - 2024年2月', location: '北京', bullets: ['重构平台架构为微前端 + BFF 模式，支持多团队并行开发，部署频率提升 3 倍。'] }
    ],
    skills: ['React', 'TypeScript', 'Node.js', 'Go', 'Kubernetes', 'CI/CD', '微服务', '系统设计', 'PostgreSQL', 'Redis'],
    awards: [{ title: '年度技术突破奖', meta: '字节跳动 · 2023', description: '开发者平台项目获得公司级技术创新认可。' }]
  },
  {
    id: 'finance',
    match: ['金融', '咨询', '银行', '会计', '审计', '投资', '风控'],
    profile: { name: '林嘉怡', email: 'linjiayi@finance.cn', phone: '136-1188-6620', website: '', city: '上海', birthday: '1995-03', status: '在职', headline: '投研与风险分析师', avatar: RESUME_AVATAR },
    summary: '6 年金融数据分析、投研支持和风险监控经验，熟悉财务建模、行业研究、信贷风险和组合监控，能够把业务判断转化为稳定的数据指标和报告机制。',
    education: [{ school: '上海财经大学', major: '金融学', degree: '硕士', period: '2017年9月 - 2020年6月', location: '上海', details: ['GPA 3.8/4.0，CFA Level II'] }],
    work: [
      { org: '中信证券', role: '行业研究员', period: '2022年7月 - 至今', location: '上海', bullets: ['覆盖新能源与高端制造板块，维护 60+ 重点公司财务模型，输出周报、深度报告和路演材料。', '搭建估值监控看板，跟踪盈利预测偏离、现金流变化和资本开支节奏，支持投资决策会。'] },
      { org: '招商银行', role: '风险策略分析师', period: '2020年7月 - 2022年6月', location: '深圳', bullets: ['构建中小企业授信评分卡，结合交易流水、税票和行业景气度特征，坏账预警提前 21 天。', '设计贷后监控指标体系，覆盖逾期迁徙、额度使用和现金流波动，支持区域经理风险排查。'] }
    ],
    project: [{ org: '新能源产业链投研模型', role: '项目负责人', period: '2023年3月 - 2023年9月', location: '上海', bullets: ['整合价格、产能、订单和库存数据，拆解毛利弹性，形成月度跟踪框架。'] }],
    skills: ['财务建模', 'Wind', 'Bloomberg', 'SQL', 'Python', '信用风险', '估值分析', '行业研究'],
    awards: [{ title: '年度优秀研究支持奖', meta: '中信证券 · 2023', description: '研究框架被多个投资小组复用。' }]
  },
  {
    id: 'product',
    match: ['产品经理', '项目管理', 'SaaS', '企业服务', '电商', '运营'],
    profile: { name: '周明远', email: 'zhoumy@saas.io', phone: '138-0166-8892', website: 'zhoumy.pm', city: '杭州', birthday: '1992-11', status: '在职', headline: 'B2B SaaS 产品经理', avatar: RESUME_AVATAR },
    summary: '7 年 B2B 产品经验，负责从 0 到 1 产品定义、需求拆解、数据分析和商业化落地，擅长把复杂业务流程转化为可配置产品能力。',
    education: [{ school: '浙江大学', major: '信息管理与信息系统', degree: '本科', period: '2011年9月 - 2015年6月', location: '杭州', details: ['主修数据库、管理信息系统、用户研究方法'] }],
    work: [
      { org: '有赞科技', role: '高级产品经理', period: '2021年4月 - 至今', location: '杭州', bullets: ['负责商家经营分析与营销自动化模块，沉淀人群分层、触达策略和效果归因能力。', '推动 12 个核心流程从定制化交付改为配置化交付，实施周期从 21 天缩短到 8 天。'] },
      { org: '阿里巴巴', role: '产品经理', period: '2017年7月 - 2021年3月', location: '杭州', bullets: ['负责商家工作台订单和售后模块，优化批量处理、异常提醒和数据看板，提升客服处理效率 32%。', '联动算法、前端和运营团队上线推荐任务体系，月活商家提升 18%。'] }
    ],
    project: [{ org: '营销自动化策略中心', role: '负责人', period: '2022年8月 - 2023年2月', location: '杭州', bullets: ['设计策略模板、触达编排和 A/B 实验能力，支撑重点客户复购率提升 11%。'] }],
    skills: ['需求分析', '用户研究', '数据看板', 'SQL', 'Axure', 'Figma', '增长实验', '项目管理'],
    awards: [{ title: '商业化突破奖', meta: '2023', description: '负责模块成为企业版核心卖点。' }]
  },
  {
    id: 'sales',
    match: ['销售', '客户成功', '商务拓展', '物流', '零售', '供应链'],
    profile: { name: '陈思远', email: 'chen.sy@sales.cn', phone: '139-1712-8810', website: '', city: '广州', birthday: '1990-09', status: '在职', headline: '大客户销售经理', avatar: RESUME_AVATAR },
    summary: '8 年企业客户销售与客户成功经验，覆盖零售、物流和供应链客户，擅长需求挖掘、方案共创、商务谈判和续费增长。',
    education: [{ school: '华南理工大学', major: '市场营销', degree: '本科', period: '2009年9月 - 2013年6月', location: '广州', details: ['学生会外联部部长，参与多项企业赞助合作'] }],
    work: [
      { org: '京东物流', role: '大客户销售经理', period: '2020年5月 - 至今', location: '广州', bullets: ['负责华南区域 KA 客户开发与续约，年合同额从 1800 万提升至 5200 万，续费率 93%。', '联合售前和交付团队设计仓配一体化方案，帮助 3 家客户降低履约成本 12%-18%。'] },
      { org: '纷享销客', role: '客户成功经理', period: '2016年3月 - 2020年4月', location: '深圳', bullets: ['维护 40+ 中大型企业客户，建立健康度评分和季度业务复盘机制，NPS 提升至 67。', '设计客户培训和续费预测流程，减少流失风险客户 28%。'] }
    ],
    project: [{ org: '连锁零售仓配方案', role: '商务负责人', period: '2022年3月 - 2022年9月', location: '广州', bullets: ['整合仓储、干线和末端配送资源，完成 800 家门店切换上线。'] }],
    skills: ['大客户开发', '解决方案销售', '商务谈判', '客户成功', 'CRM', '续费增长', '项目推进'],
    awards: [{ title: '年度销售冠军', meta: '京东物流 · 2022', description: '完成率 156%，签约 2 个千万级客户。' }]
  },
  {
    id: 'design',
    match: ['设计师', 'UI/UX', '品牌', '视觉设计', '交互设计', '用户研究', '产品设计'],
    profile: { name: '李思', email: 'lisi@design.co', phone: '139-1200-4567', website: 'portfolio.lisi.design', city: '上海', birthday: '1996-05', status: '在职', headline: 'UI/UX 设计师', avatar: RESUME_AVATAR },
    summary: '5 年 B 端与消费产品设计经验，熟悉用户研究、信息架构、设计系统和高保真交付，能够与产品、研发、运营共同推动体验指标改进。',
    education: [{ school: '同济大学', major: '工业设计', degree: '本科', period: '2014年9月 - 2018年6月', location: '上海', details: ['优秀毕业设计，研究方向为复杂系统交互体验'] }],
    work: [
      { org: '小红书', role: '高级体验设计师', period: '2021年6月 - 至今', location: '上海', bullets: ['负责创作者商业化后台体验，重构任务创建、数据回看和结算链路，任务发布完成率提升 24%。', '搭建设计组件规范和 Figma 变量体系，统一 6 条业务线的表单、筛选、表格和图表模式。'] },
      { org: '饿了么', role: 'UI 设计师', period: '2018年7月 - 2021年5月', location: '上海', bullets: ['负责商家端活动配置工具，优化空态、错误态和批量操作体验，减少客服咨询 19%。', '参与品牌活动视觉设计，输出落地页、Banner 和社媒传播物料。'] }
    ],
    project: [{ org: '创作者商业化设计系统', role: '设计负责人', period: '2022年5月 - 2022年12月', location: '上海', bullets: ['沉淀 80+ 组件与 20+ 业务模板，交付效率提升 35%。'] }],
    skills: ['Figma', 'Design System', '用户访谈', '信息架构', '可用性测试', '动效规范', '视觉设计'],
    awards: [{ title: '站酷推荐作品', meta: '2021', description: 'B 端工具体验改版案例。' }]
  },
  {
    id: 'marketing',
    match: ['市场营销', '广告', '活动策划', '新媒体', '内容运营', '短视频', '直播', '传媒', '快消', '品牌', '公关'],
    profile: { name: '王雅琳', email: 'wangya@brand.cn', phone: '137-1888-9901', website: '', city: '北京', birthday: '1997-02', status: '在职', headline: '品牌内容运营', avatar: RESUME_AVATAR },
    summary: '4 年品牌传播与内容增长经验，熟悉短视频、直播、社群和整合营销，能够围绕新品上市和关键节点设计内容节奏。',
    education: [{ school: '中国传媒大学', major: '广告学', degree: '本科', period: '2015年9月 - 2019年6月', location: '北京', details: ['主修品牌传播、消费者洞察、媒介策划'] }],
    work: [
      { org: '元气森林', role: '品牌内容运营', period: '2021年3月 - 至今', location: '北京', bullets: ['负责新品上市内容策略，联动小红书、抖音和 B 站达人投放，单月曝光 3200 万。', '搭建品牌内容选题库和达人分层机制，爆文率提升 41%，内容投放 CPA 下降 23%。'] },
      { org: '蓝色光标', role: '整合营销执行', period: '2019年7月 - 2021年2月', location: '北京', bullets: ['参与快消客户年度传播方案，负责活动落地、KOL 沟通和传播数据复盘。', '独立执行 8 场线下快闪活动，平均到场率超过预估 18%。'] }
    ],
    project: [{ org: '新品上市内容战役', role: '项目负责人', period: '2023年4月 - 2023年7月', location: '北京', bullets: ['围绕健康轻负担心智设计内容矩阵，带动电商搜索量提升 56%。'] }],
    skills: ['内容策划', '达人投放', '短视频运营', '直播复盘', '品牌策略', '数据分析', '活动执行'],
    awards: [{ title: '年度品牌增长案例', meta: '2023', description: '新品传播战役入选公司最佳实践。' }]
  },
  {
    id: 'education',
    match: ['教师', '教育', '培训', '高校', '教研', '课程设计', '考研复试', '保研', '科研', '奖学金', '论文', '留学申请'],
    profile: { name: '赵青宁', email: 'zhaoqn@edu.cn', phone: '135-0101-2245', website: '', city: '南京', birthday: '1994-08', status: '在职', headline: '高中数学教师 / 教研负责人', avatar: RESUME_AVATAR },
    summary: '6 年高中数学教学和教研经验，熟悉新高考命题方向、分层教学和班级学情分析，能够独立设计课程体系和教师培训材料。',
    education: [{ school: '南京师范大学', major: '数学与应用数学', degree: '硕士', period: '2016年9月 - 2019年6月', location: '南京', details: ['研究方向：数学教育与学习评价'] }],
    work: [
      { org: '南京外国语学校', role: '高中数学教师', period: '2020年8月 - 至今', location: '南京', bullets: ['承担高二、高三数学教学，所带班级平均分连续 4 次位列年级前三。', '开发函数与导数专题讲义，形成 12 讲课程包，被数学组全年级使用。'] },
      { org: '新东方学校', role: '高中数学教研员', period: '2019年7月 - 2020年7月', location: '南京', bullets: ['负责暑秋课程教案和题库建设，组织 20+ 名教师试讲与磨课。'] }
    ],
    project: [{ org: '新高考压轴题专题', role: '课程设计', period: '2022年9月 - 2023年1月', location: '南京', bullets: ['拆分 6 类核心题型，建立错因标签和讲评模板，学生二轮复习正确率提升 17%。'] }],
    skills: ['课程设计', '分层教学', '学情分析', '教研培训', '命题研究', '班级管理'],
    awards: [{ title: '市级优质课一等奖', meta: '2022', description: '函数综合应用公开课。' }]
  },
  {
    id: 'healthcare',
    match: ['医药', '生物医药', '医疗健康', '数据分析', '统计'],
    profile: { name: '徐瑞婷', email: 'xurt@healthdata.cn', phone: '138-1888-1234', website: '', city: '苏州', birthday: '1993-12', status: '在职', headline: '医疗数据分析师', avatar: RESUME_AVATAR },
    summary: '7 年医疗数据、临床研究和商业分析经验，熟悉真实世界研究、患者路径分析、药品销售预测和统计建模。',
    education: [{ school: '复旦大学', major: '流行病与卫生统计学', degree: '硕士', period: '2015年9月 - 2018年6月', location: '上海', details: ['核心课程：多元统计、临床试验设计、SAS 编程'] }],
    work: [
      { org: '百济神州', role: '商业分析经理', period: '2021年5月 - 至今', location: '苏州', bullets: ['负责肿瘤产品市场表现跟踪，建立医院层级预测模型，月度预测误差控制在 8% 以内。', '整合处方、招采和患者随访数据，识别重点城市增长机会，支持区域资源配置。'] },
      { org: 'IQVIA', role: '医疗数据分析师', period: '2018年7月 - 2021年4月', location: '上海', bullets: ['参与 10+ 个药企咨询项目，完成患者路径、市场规模和医生画像分析。'] }
    ],
    project: [{ org: '真实世界患者路径研究', role: '分析负责人', period: '2022年6月 - 2022年12月', location: '苏州', bullets: ['基于脱敏 EMR 数据拆解诊断、用药和复诊节点，形成患者分层策略。'] }],
    skills: ['SAS', 'Python', 'SQL', 'RWE', '临床研究', '统计建模', 'Tableau'],
    awards: [{ title: '优秀商业洞察奖', meta: '2023', description: '模型支持区域策略调整。' }]
  },
  {
    id: 'manufacturing',
    match: ['工程师', '制造', '汽车', '新能源', '半导体', '硬件', '质量管理'],
    profile: { name: '刘晓峰', email: 'liuxiao@ev-tech.cn', phone: '136-2100-8921', website: '', city: '合肥', birthday: '1991-06', status: '在职', headline: '新能源工艺工程师', avatar: RESUME_AVATAR },
    summary: '9 年新能源制造和工艺改善经验，熟悉电池包装配、制程良率、设备验证和质量闭环，能够推进跨部门量产问题解决。',
    education: [{ school: '哈尔滨工业大学', major: '机械设计制造及其自动化', degree: '本科', period: '2010年9月 - 2014年6月', location: '哈尔滨', details: ['机械创新设计大赛省级二等奖'] }],
    work: [
      { org: '蔚来汽车', role: '高级工艺工程师', period: '2020年4月 - 至今', location: '合肥', bullets: ['负责电池包关键装配工序优化，推动自动点胶参数标准化，首检不良率下降 31%。', '建立 PFMEA 和控制计划闭环，联合质量、设备和供应商解决 12 项量产问题。'] },
      { org: '欣旺达', role: '工艺工程师', period: '2015年3月 - 2020年3月', location: '深圳', bullets: ['负责 PACK 线导入与爬坡，完成 4 条生产线节拍优化和设备验收。'] }
    ],
    project: [{ org: '电池包装配良率提升', role: '项目负责人', period: '2022年1月 - 2022年8月', location: '合肥', bullets: ['通过 DOE 试验和 SPC 监控定位波动来源，综合良率提升 4.6 个百分点。'] }],
    skills: ['PFMEA', 'SPC', 'DOE', '设备验证', '工艺优化', '质量闭环', 'AutoCAD', 'Six Sigma'],
    awards: [{ title: '年度质量改善项目', meta: '2022', description: '节约返工与报废成本约 320 万元。' }]
  },
  {
    id: 'legal',
    match: ['法律', '行政', '法务', '人力资源', '政府事务', '公共关系', '公共事务', '合规', '职能岗'],
    profile: { name: '何家诚', email: 'hejiacheng@legal.cn', phone: '135-8899-0012', website: '', city: '北京', birthday: '1989-04', status: '在职', headline: '法务合规经理', avatar: RESUME_AVATAR },
    summary: '10 年企业法务与合规管理经验，覆盖合同审查、争议解决、数据合规、劳动用工和政府事务，擅长建立标准化制度与风险台账。',
    education: [{ school: '中国政法大学', major: '民商法学', degree: '硕士', period: '2011年9月 - 2014年6月', location: '北京', details: ['通过国家法律职业资格考试'] }],
    work: [
      { org: '美团', role: '法务合规经理', period: '2020年8月 - 至今', location: '北京', bullets: ['负责即时零售业务合同、数据合规和消费者权益事项，年审合同 900+ 份。', '搭建合规培训和风险评估机制，推动业务线完成 6 项制度整改。'] },
      { org: '金杜律师事务所', role: '律师', period: '2014年7月 - 2020年7月', location: '北京', bullets: ['参与并购、投融资和商事争议项目，负责尽调、交易文件起草和诉讼材料准备。'] }
    ],
    project: [{ org: '数据合规制度建设', role: '项目负责人', period: '2022年4月 - 2022年11月', location: '北京', bullets: ['建立数据分类分级、供应商评估和员工培训体系，覆盖 3000+ 名业务员工。'] }],
    skills: ['合同审查', '数据合规', '争议解决', '劳动用工', '制度建设', '法律检索', '政府事务'],
    awards: [{ title: '优秀法务支持奖', meta: '2023', description: '支持重点业务合规上线。' }]
  },
  {
    id: 'global',
    match: ['英文', '外企', '海外求职', '英语', '留学申请', '咨询'],
    profile: { name: '张凯文', email: 'kevin.zhang@email.com', phone: '+86 138-0013-8000', website: 'linkedin.com/in/kevinzhang', city: '上海', birthday: '1994-01', status: '可考虑海外机会', headline: '战略与商业分析经理', avatar: RESUME_AVATAR },
    summary: '7 年市场分析、定价与跨境增长经验，擅长把复杂商业问题拆解为清晰模型，并形成可供管理层直接决策的建议。',
    education: [{ school: '密歇根大学', major: '商业分析', degree: '硕士', period: '2017年 - 2019年', location: '安娜堡', details: ['院长荣誉名单，研究生助理'] }],
    work: [
      { org: '德勤咨询', role: '高级咨询顾问', period: '2021年 - 至今', location: '上海', bullets: ['负责中国及东南亚消费和科技客户的市场进入与运营模式项目。', '搭建定价和需求预测模型，支持客户制定毛利率提升 12% 的改善方案。'] },
      { org: '耐克', role: '商业分析师', period: '2019年 - 2021年', location: '上海', bullets: ['负责数字渠道周度经营分析，识别不同品类的转化增长机会。'] }
    ],
    project: [{ org: '亚太市场进入手册', role: '分析负责人', period: '2023年', location: '上海', bullets: ['整合市场、消费者与竞品信息，为三个目标国家建立优先级评估模型。'] }],
    skills: ['市场规模分析', 'SQL', 'Python', 'Tableau', '财务建模', '定价策略', '管理层汇报'],
    awards: [{ title: '高影响力项目奖', meta: '德勤 · 2023', description: '区域增长战略项目获得团队年度认可。' }]
  },
  {
    id: 'leadership',
    match: ['战略', '总监', '投融资', '管理'],
    profile: { name: '沈志然', email: 'shenzr@corp.cn', phone: '139-0101-6688', website: '', city: '北京', birthday: '1986-10', status: '在职', headline: '战略运营总监', avatar: RESUME_AVATAR },
    summary: '12 年战略、运营和投融资经验，曾负责多业务线经营分析、组织效率提升和并购整合，擅长把战略拆解为可执行目标、预算和治理机制。',
    education: [{ school: '清华大学', major: '工商管理', degree: 'MBA', period: '2012年9月 - 2014年6月', location: '北京', details: ['优秀毕业生，创业与创新方向'] }],
    work: [
      { org: '腾讯云', role: '战略运营总监', period: '2020年3月 - 至今', location: '北京', bullets: ['负责企业服务业务经营分析与战略项目推进，覆盖 5 条产品线、年收入规模 30 亿+。', '设计季度经营会和重点项目 PMO 机制，推动毛利改善、交付效率和重点客户续约提升。'] },
      { org: '华兴资本', role: '投资经理', period: '2015年7月 - 2020年2月', location: '北京', bullets: ['参与 SaaS、企业服务和智能制造方向投资项目，完成行业研究、尽调和交易执行。'] }
    ],
    project: [{ org: '企业服务经营提升项目', role: '项目负责人', period: '2022年1月 - 2022年12月', location: '北京', bullets: ['通过产品线 P&L 拆解、重点客户分层和交付工时治理，年度毛利率提升 6 个百分点。'] }],
    skills: ['战略规划', '经营分析', '投融资', 'PMO', '预算管理', '组织协同', '商业分析'],
    awards: [{ title: '总裁特别奖', meta: '2022', description: '推动重点业务经营改善。' }]
  }
];

function makeEnglishSample(id, content) {
  return {
    id,
    match: SAMPLE_RESUME_CASES_ZH.find((sample) => sample.id === id)?.match || [],
    profile: {
      email: content.email,
      phone: content.phone,
      website: content.website || '',
      city: content.city,
      birthday: content.birthday,
      status: content.status || 'Open to opportunities',
      avatar: RESUME_AVATAR,
      name: content.name,
      headline: content.headline,
    },
    summary: content.summary,
    education: [{
      school: content.school,
      major: content.major,
      degree: content.degree,
      period: content.educationPeriod,
      location: content.city,
      details: [content.educationDetail],
    }],
    work: content.work,
    project: [{
      org: content.project,
      role: content.projectRole,
      period: content.projectPeriod,
      location: content.city,
      bullets: [content.projectResult],
    }],
    skills: content.skills,
    awards: [{ title: content.award, meta: content.awardMeta, description: content.awardDescription }],
  };
}

const SAMPLE_RESUME_CASES_EN = [
  makeEnglishSample('tech', {
    name: 'Alex Chen', email: 'alex.chen@devmail.com', phone: '+1 415 555 0138', website: 'alexchen.dev', city: 'San Francisco, CA', birthday: '1993-07', headline: 'Staff Software Engineer',
    summary: 'Eight years building reliable web platforms with React, Node.js, and cloud-native systems. Turns ambiguous product needs into maintainable architecture and measurable delivery gains.',
    school: 'University of California, Berkeley', major: 'Computer Science', degree: 'M.S.', educationPeriod: '2015 - 2017', educationDetail: 'Focus: distributed systems and developer infrastructure.',
    work: [
      { org: 'Northstar Labs', role: 'Staff Software Engineer', period: '2022 - Present', location: 'San Francisco, CA', bullets: ['Led a developer platform used by 1,800 engineers and cut deployment time by 58%.', 'Introduced service observability standards that reduced incident diagnosis from 35 minutes to 8 minutes.'] },
      { org: 'Orbit Commerce', role: 'Senior Frontend Engineer', period: '2018 - 2022', location: 'Seattle, WA', bullets: ['Built a shared design system adopted by five product teams.', 'Improved storefront LCP from 3.1s to 1.4s across the highest-traffic pages.'] },
    ],
    project: 'Developer Platform 2.0', projectRole: 'Technical Lead', projectPeriod: '2023', projectResult: 'Moved 40 services to a self-service delivery workflow and tripled weekly release frequency.',
    skills: ['React', 'TypeScript', 'Node.js', 'Go', 'Kubernetes', 'PostgreSQL', 'System Design'], award: 'Engineering Impact Award', awardMeta: 'Northstar Labs · 2023', awardDescription: 'Recognized for company-wide improvements to developer productivity.',
  }),
  makeEnglishSample('finance', {
    name: 'Sophia Lin', email: 'sophia.lin@finmail.com', phone: '+1 212 555 0172', website: '', city: 'New York, NY', birthday: '1995-03', headline: 'Investment & Risk Analyst',
    summary: 'Six years in investment research, financial modeling, and portfolio risk. Builds decision-ready analysis from complex market and operating data.',
    school: 'Columbia University', major: 'Financial Economics', degree: 'M.S.', educationPeriod: '2017 - 2019', educationDetail: 'CFA Level II; concentration in valuation and risk management.',
    work: [
      { org: 'Meridian Capital', role: 'Senior Research Analyst', period: '2022 - Present', location: 'New York, NY', bullets: ['Maintained operating models for 45 public companies across energy and industrial technology.', 'Created a valuation monitor used in weekly portfolio reviews and investment committee meetings.'] },
      { org: 'Harbor Bank', role: 'Risk Strategy Analyst', period: '2019 - 2022', location: 'Boston, MA', bullets: ['Developed an early-warning model that identified credit deterioration three weeks sooner.', 'Standardized portfolio reporting across six regional lending teams.'] },
    ],
    project: 'Clean Energy Research Model', projectRole: 'Analysis Lead', projectPeriod: '2023', projectResult: 'Combined pricing, capacity, and order data into a monthly earnings sensitivity framework.',
    skills: ['Financial Modeling', 'Valuation', 'Bloomberg', 'SQL', 'Python', 'Credit Risk'], award: 'Research Excellence Award', awardMeta: 'Meridian Capital · 2023', awardDescription: 'Recognized for a reusable sector-analysis framework.',
  }),
  makeEnglishSample('product', {
    name: 'Jordan Lee', email: 'jordan.lee@productmail.com', phone: '+1 646 555 0190', website: 'jordanlee.product', city: 'New York, NY', birthday: '1992-11', headline: 'B2B SaaS Product Lead',
    summary: 'Seven years defining and scaling B2B products from discovery through commercialization. Simplifies complex workflows into configurable experiences customers adopt.',
    school: 'New York University', major: 'Information Systems', degree: 'B.S.', educationPeriod: '2011 - 2015', educationDetail: 'Coursework in databases, product analytics, and user research.',
    work: [
      { org: 'Relay Software', role: 'Senior Product Manager', period: '2021 - Present', location: 'New York, NY', bullets: ['Launched marketing automation workflows that increased enterprise expansion revenue by 14%.', 'Converted 12 custom implementation flows into configurable product features, reducing launch time by 61%.'] },
      { org: 'MarketSquare', role: 'Product Manager', period: '2017 - 2021', location: 'Austin, TX', bullets: ['Redesigned merchant operations tools and improved case resolution speed by 32%.', 'Partnered with data science to launch recommendations that lifted monthly active merchants by 18%.'] },
    ],
    project: 'Automation Strategy Center', projectRole: 'Product Owner', projectPeriod: '2023', projectResult: 'Shipped templates, journey orchestration, and experiments that improved customer repeat purchase by 11%.',
    skills: ['Product Strategy', 'User Research', 'SQL', 'Figma', 'Experimentation', 'Roadmapping'], award: 'Commercial Impact Award', awardMeta: 'Relay Software · 2023', awardDescription: 'Product became a core enterprise-plan differentiator.',
  }),
  makeEnglishSample('sales', {
    name: 'Taylor Morgan', email: 'taylor.morgan@salesmail.com', phone: '+1 312 555 0126', website: '', city: 'Chicago, IL', birthday: '1990-09', headline: 'Enterprise Sales Director',
    summary: 'Eight years growing enterprise accounts across retail, logistics, and supply chain. Strong in discovery, solution design, negotiation, and expansion.',
    school: 'Northwestern University', major: 'Marketing', degree: 'B.A.', educationPeriod: '2009 - 2013', educationDetail: 'Led corporate partnership programs for the student business association.',
    work: [
      { org: 'Atlas Logistics', role: 'Enterprise Sales Director', period: '2020 - Present', location: 'Chicago, IL', bullets: ['Grew annual contract value from $2.4M to $7.1M while maintaining 93% renewal.', 'Closed three multi-year transformation programs by aligning operations, finance, and IT stakeholders.'] },
      { org: 'Pipeline Cloud', role: 'Customer Success Manager', period: '2016 - 2020', location: 'Austin, TX', bullets: ['Managed 42 mid-market and enterprise customers and raised portfolio NPS to 67.', 'Introduced health scoring and quarterly business reviews that reduced preventable churn by 28%.'] },
    ],
    project: 'Retail Fulfillment Transformation', projectRole: 'Commercial Lead', projectPeriod: '2022', projectResult: 'Coordinated the rollout of a new fulfillment network across 800 retail locations.',
    skills: ['Enterprise Sales', 'Negotiation', 'Customer Success', 'CRM', 'Account Planning'], award: 'Top Sales Performer', awardMeta: 'Atlas Logistics · 2022', awardDescription: 'Finished at 156% of annual quota.',
  }),
  makeEnglishSample('design', {
    name: 'Maya Patel', email: 'maya@pateldesign.co', phone: '+1 206 555 0155', website: 'maya.design', city: 'Seattle, WA', birthday: '1996-05', headline: 'Senior Product Designer',
    summary: 'Five years designing enterprise and consumer products across research, information architecture, systems, and polished delivery. Connects user needs to measurable product outcomes.',
    school: 'Rhode Island School of Design', major: 'Industrial Design', degree: 'B.F.A.', educationPeriod: '2014 - 2018', educationDetail: 'Honors thesis on interaction patterns for complex systems.',
    work: [
      { org: 'Canvas Market', role: 'Senior Product Designer', period: '2021 - Present', location: 'Seattle, WA', bullets: ['Redesigned creator monetization workflows and improved task completion by 24%.', 'Built a variable-driven Figma system that aligned patterns across six product teams.'] },
      { org: 'QuickPlate', role: 'Product Designer', period: '2018 - 2021', location: 'Portland, OR', bullets: ['Simplified merchant campaign setup and reduced related support contacts by 19%.', 'Delivered responsive launch experiences across product, email, and social channels.'] },
    ],
    project: 'Creator Design System', projectRole: 'Design Lead', projectPeriod: '2022', projectResult: 'Delivered 80 components and 20 workflow templates, improving design delivery speed by 35%.',
    skills: ['Figma', 'Design Systems', 'User Research', 'Prototyping', 'Accessibility'], award: 'Featured Product Case Study', awardMeta: 'Design Week · 2022', awardDescription: 'Selected for its clear systems-thinking approach.',
  }),
  makeEnglishSample('marketing', {
    name: 'Olivia Brooks', email: 'olivia@brandmail.com', phone: '+1 310 555 0114', website: '', city: 'Los Angeles, CA', birthday: '1997-02', headline: 'Brand & Content Marketing Manager',
    summary: 'Four years growing brands through integrated campaigns, creator programs, video, and community. Builds launch narratives that connect attention to demand.',
    school: 'University of Southern California', major: 'Communication', degree: 'B.A.', educationPeriod: '2015 - 2019', educationDetail: 'Focus: brand strategy, consumer insight, and media planning.',
    work: [
      { org: 'Bright Soda', role: 'Brand Marketing Manager', period: '2021 - Present', location: 'Los Angeles, CA', bullets: ['Led a product launch campaign that generated 31M qualified impressions in one month.', 'Built a creator segmentation model that improved high-performing content rate by 41% and lowered CPA by 23%.'] },
      { org: 'Signal Creative', role: 'Integrated Marketing Associate', period: '2019 - 2021', location: 'Los Angeles, CA', bullets: ['Delivered annual campaign programs for consumer brands across digital and experiential channels.', 'Produced eight pop-up events with average attendance 18% above forecast.'] },
    ],
    project: 'New Product Launch', projectRole: 'Campaign Lead', projectPeriod: '2023', projectResult: 'Built an integrated content calendar that increased branded search by 56%.',
    skills: ['Brand Strategy', 'Content Marketing', 'Creator Partnerships', 'Campaign Analytics'], award: 'Growth Campaign of the Year', awardMeta: 'Bright Soda · 2023', awardDescription: 'Recognized as the company marketing playbook of the year.',
  }),
  makeEnglishSample('education', {
    name: 'Emma Wilson', email: 'emma.wilson@learnmail.org', phone: '+1 617 555 0184', website: '', city: 'Boston, MA', birthday: '1994-08', headline: 'Mathematics Teacher & Curriculum Lead',
    summary: 'Six years teaching secondary mathematics and leading curriculum development. Uses assessment data and differentiated instruction to improve student outcomes.',
    school: 'Boston University', major: 'Mathematics Education', degree: 'M.Ed.', educationPeriod: '2016 - 2018', educationDetail: 'Research focus: formative assessment and differentiated learning.',
    work: [
      { org: 'Beacon Academy', role: 'Mathematics Teacher', period: '2020 - Present', location: 'Boston, MA', bullets: ['Taught advanced algebra and calculus classes that ranked in the top quartile for growth four terms running.', 'Created a 12-unit calculus program adopted across the mathematics department.'] },
      { org: 'Summit Learning', role: 'Curriculum Specialist', period: '2018 - 2020', location: 'Cambridge, MA', bullets: ['Developed lesson plans and assessment banks and coached 24 instructors through delivery.'] },
    ],
    project: 'Advanced Problem-Solving Series', projectRole: 'Curriculum Designer', projectPeriod: '2022', projectResult: 'Introduced error-based practice routines that improved second-assessment accuracy by 17%.',
    skills: ['Curriculum Design', 'Assessment', 'Differentiated Instruction', 'Teacher Coaching'], award: 'Excellence in Teaching', awardMeta: 'Beacon Academy · 2022', awardDescription: 'Recognized for an evidence-based calculus program.',
  }),
  makeEnglishSample('healthcare', {
    name: 'Rachel Xu', email: 'rachel.xu@healthdata.com', phone: '+1 617 555 0141', website: '', city: 'Boston, MA', birthday: '1993-12', headline: 'Healthcare Data Analytics Manager',
    summary: 'Seven years across real-world evidence, patient journey analysis, forecasting, and statistical modeling. Converts clinical and commercial data into clear operating decisions.',
    school: 'Johns Hopkins University', major: 'Biostatistics', degree: 'M.S.', educationPeriod: '2015 - 2017', educationDetail: 'Coursework in clinical trial design, causal inference, and SAS programming.',
    work: [
      { org: 'Nova Therapeutics', role: 'Analytics Manager', period: '2021 - Present', location: 'Boston, MA', bullets: ['Built hospital-level performance reporting for an oncology portfolio and improved forecast accuracy by 18%.', 'Developed patient journey cohorts used to prioritize education programs and field resources.'] },
      { org: 'CareMetrics', role: 'Senior Data Analyst', period: '2017 - 2021', location: 'New York, NY', bullets: ['Analyzed claims and electronic health record data for 14 outcomes research studies.', 'Automated recurring quality checks and reduced reporting preparation time by 46%.'] },
    ],
    project: 'Patient Journey Measurement', projectRole: 'Analytics Lead', projectPeriod: '2023', projectResult: 'Created a privacy-safe cohort model that revealed two major treatment access gaps.',
    skills: ['Biostatistics', 'Python', 'SQL', 'SAS', 'Forecasting', 'Real-World Evidence'], award: 'Evidence Innovation Award', awardMeta: 'Nova Therapeutics · 2023', awardDescription: 'Recognized for improving the portfolio planning process.',
  }),
  makeEnglishSample('manufacturing', {
    name: 'Daniel Kim', email: 'daniel.kim@engineeringmail.com', phone: '+1 313 555 0169', website: '', city: 'Detroit, MI', birthday: '1991-06', headline: 'Manufacturing Engineering Manager',
    summary: 'Nine years improving automated manufacturing, quality, and supplier operations. Leads cross-functional programs from root-cause analysis through scaled production.',
    school: 'University of Michigan', major: 'Mechanical Engineering', degree: 'M.S.', educationPeriod: '2013 - 2015', educationDetail: 'Focus: manufacturing systems and industrial automation.',
    work: [
      { org: 'Vector Mobility', role: 'Manufacturing Engineering Manager', period: '2020 - Present', location: 'Detroit, MI', bullets: ['Led automation upgrades that increased line throughput by 27% while reducing scrap by 16%.', 'Introduced layered process audits across three plants and improved first-pass yield to 98.4%.'] },
      { org: 'Motion Components', role: 'Process Engineer', period: '2015 - 2020', location: 'Cleveland, OH', bullets: ['Designed fixtures and standardized work for six high-volume assembly cells.', 'Resolved recurring supplier defects through joint capability studies and control-plan revisions.'] },
    ],
    project: 'EV Module Line Launch', projectRole: 'Engineering Lead', projectPeriod: '2022', projectResult: 'Delivered a new production line four weeks early and within the approved capital budget.',
    skills: ['Lean Manufacturing', 'Automation', 'Six Sigma', 'Quality Systems', 'Supplier Development'], award: 'Operational Excellence Award', awardMeta: 'Vector Mobility · 2022', awardDescription: 'Recognized for the EV module launch.',
  }),
  makeEnglishSample('legal', {
    name: 'Grace Park', email: 'grace.park@legalmail.com', phone: '+1 202 555 0132', website: '', city: 'Washington, DC', birthday: '1992-04', headline: 'Legal Operations & Compliance Manager',
    summary: 'Seven years improving commercial contracting, compliance programs, and legal operations. Balances risk control with practical business execution.',
    school: 'Georgetown University', major: 'Law', degree: 'J.D.', educationPeriod: '2013 - 2016', educationDetail: 'Concentration in corporate law and data privacy.',
    work: [
      { org: 'Civic Cloud', role: 'Legal Operations Manager', period: '2021 - Present', location: 'Washington, DC', bullets: ['Redesigned contract intake and playbooks, reducing median review time from nine days to four.', 'Coordinated privacy assessments for launches across the United States and European Union.'] },
      { org: 'Hamilton & Reed', role: 'Corporate Associate', period: '2016 - 2021', location: 'Washington, DC', bullets: ['Supported technology transactions, corporate governance, and regulatory reviews for growth-stage clients.', 'Built reusable diligence checklists that improved matter consistency across the practice.'] },
    ],
    project: 'Contract Operations Program', projectRole: 'Program Lead', projectPeriod: '2023', projectResult: 'Launched self-service templates and routing rules that cut low-risk legal requests by 34%.',
    skills: ['Commercial Contracts', 'Privacy', 'Compliance', 'Legal Operations', 'Policy Design'], award: 'Business Partnership Award', awardMeta: 'Civic Cloud · 2023', awardDescription: 'Recognized for enabling faster, safer product launches.',
  }),
  makeEnglishSample('global', {
    name: 'Kevin Zhang', email: 'kevin.zhang@email.com', phone: '+1 646 555 0188', website: 'linkedin.com/in/kevinzhang', city: 'New York, NY', birthday: '1994-03', headline: 'Strategy & Analytics Manager',
    summary: 'Seven years turning market, customer, and operating data into growth strategy. Experienced in cross-border launches, pricing, and executive decision support.',
    school: 'London Business School', major: 'Management', degree: 'M.Sc.', educationPeriod: '2016 - 2017', educationDetail: 'Concentration in strategy and global business.',
    work: [
      { org: 'Deloitte', role: 'Strategy Manager', period: '2021 - Present', location: 'New York, NY', bullets: ['Led market-entry and pricing work across North America, Europe, and Asia Pacific.', 'Built executive operating reviews that linked commercial performance to clear investment choices.'] },
      { org: 'Nova Commerce', role: 'Senior Business Analyst', period: '2017 - 2021', location: 'London, UK', bullets: ['Analyzed acquisition and retention across eight markets and identified a $12M growth opportunity.', 'Automated weekly performance reporting and reduced preparation time by 70%.'] },
    ],
    project: 'APAC Market Entry Playbook', projectRole: 'Analysis Lead', projectPeriod: '2023', projectResult: 'Combined market, consumer, and competitor signals into a prioritization model for three countries.',
    skills: ['Market Sizing', 'SQL', 'Python', 'Tableau', 'Financial Modeling', 'Pricing'], award: 'High Impact Project Award', awardMeta: 'Deloitte · 2023', awardDescription: 'Recognized for a regional growth strategy project.',
  }),
  makeEnglishSample('leadership', {
    name: 'Michael Shen', email: 'michael.shen@executivemail.com', phone: '+1 650 555 0108', website: '', city: 'San Francisco, CA', birthday: '1986-10', headline: 'VP, Strategy & Operations',
    summary: 'Twelve years leading strategy, operating cadence, investment, and organizational transformation. Translates enterprise priorities into accountable plans and durable business results.',
    school: 'Stanford Graduate School of Business', major: 'Business Administration', degree: 'M.B.A.', educationPeriod: '2011 - 2013', educationDetail: 'Focus: entrepreneurship, finance, and organizational leadership.',
    work: [
      { org: 'Pioneer Cloud', role: 'VP, Strategy & Operations', period: '2020 - Present', location: 'San Francisco, CA', bullets: ['Directed planning across five product lines representing more than $400M in annual revenue.', 'Established quarterly business reviews and a transformation office that improved gross margin by six points.'] },
      { org: 'Summit Ventures', role: 'Investment Principal', period: '2014 - 2020', location: 'Palo Alto, CA', bullets: ['Led diligence and portfolio strategy across SaaS, enterprise services, and advanced manufacturing.'] },
    ],
    project: 'Enterprise Operating Model', projectRole: 'Executive Sponsor', projectPeriod: '2022', projectResult: 'Aligned portfolio priorities, budgets, and delivery governance across nine executive teams.',
    skills: ['Corporate Strategy', 'Operating Planning', 'M&A', 'P&L Management', 'Executive Leadership'], award: 'CEO Leadership Award', awardMeta: 'Pioneer Cloud · 2022', awardDescription: 'Recognized for company-wide operating improvement.',
  }),
];

const SAMPLE_CASE_PRIORITY = [
  'global',
  'tech',
  'leadership',
  'legal',
  'manufacturing',
  'healthcare',
  'design',
  'marketing',
  'sales',
  'education',
  'finance',
  'product'
];

function countMatchingTags(template, tags) {
  const allTags = new Set(template.tags || []);
  return tags.reduce((count, tag) => count + Number(allTags.has(tag)), 0);
}

function getSampleCase(template, lang) {
  const localizedSample = getLocaleSample(lang, RESUME_AVATAR);
  if (localizedSample) return localizedSample;
  const samples = lang === 'zh' ? SAMPLE_RESUME_CASES_ZH : SAMPLE_RESUME_CASES_EN;
  const orderedCases = SAMPLE_CASE_PRIORITY
    .map((id) => samples.find((item) => item.id === id))
    .filter(Boolean);
  return orderedCases
    .map((item, priority) => ({ item, priority, score: countMatchingTags(template, item.match) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.priority - b.priority)[0]?.item
    || samples.find((item) => item.id === 'product');
}

function makeSection(type, label, items) {
  return {
    id: uid(),
    type,
    label,
    visible: true,
    items: items.map((item) => ({ ...item, id: uid() }))
  };
}

export function buildResumeFromTemplate(template, lang = 'en') {
  const selectedTemplate = template || RESUME_TEMPLATES[0];
  const sample = getSampleCase(selectedTemplate, lang);
  const labels = RESUME_SECTION_LABELS[lang] || RESUME_SECTION_LABELS.en;
  const title = `${selectedTemplate.label?.[lang] || selectedTemplate.label?.en || labels.fallback} · ${sample.profile.headline}`;

  return {
    title,
    profile: { ...sample.profile },
    sections: [
      makeSection('summary', labels.summary, [{ title: labels.summaryItem, body: sample.summary }]),
      makeSection('education', labels.education, sample.education.map((item) => ({ ...item }))),
      makeSection('work', labels.work, sample.work.map((item) => ({ ...item }))),
      makeSection('project', labels.project, sample.project.map((item) => ({ ...item }))),
      makeSection('skills', labels.skills, [{ title: labels.skillsItem, values: sample.skills }]),
      makeSection('awards', labels.awards, sample.awards.map((item) => ({ ...item })))
    ]
  };
}

const RESUME_TITLE_LANGUAGES = ['en', 'zh', 'zh-TW', 'ja', 'ko', 'fr', 'ru'];

export function localizeResumeTitle(kind, templateId, lang = 'en') {
  if (kind === 'blank') return BLANK_RESUME_TITLES[lang] || BLANK_RESUME_TITLES.en;
  const template = RESUME_TEMPLATES.find((item) => item.id === templateId) || RESUME_TEMPLATES[0];
  const sample = getSampleCase(template, lang);
  const labels = RESUME_SECTION_LABELS[lang] || RESUME_SECTION_LABELS.en;
  return `${template.label?.[lang] || template.label?.en || labels.fallback} · ${sample.profile.headline}`;
}

export function inferSystemResumeTitleKind(title, templateId) {
  const value = String(title ?? '').trim();
  if (!value) return 'custom';
  if (RESUME_TITLE_LANGUAGES.some((lang) => value === localizeResumeTitle('blank', templateId, lang))) return 'blank';
  if (RESUME_TITLE_LANGUAGES.some((lang) => value === localizeResumeTitle('template', templateId, lang))) return 'template';
  return 'custom';
}

const RESUME_SECTION_LANGUAGES = Object.keys(RESUME_SECTION_LABELS);

function isSystemSectionLabel(type, label) {
  const value = String(label ?? '').trim();
  if (!value) return true;
  if (value === SECTION_TEMPLATES[type]?.label || value === SECTION_COPY_EN[type]?.label) return true;
  return RESUME_SECTION_LANGUAGES.some((language) => RESUME_SECTION_LABELS[language]?.[type] === value);
}

function isSystemItemTitle(type, title) {
  if (type !== 'summary' && type !== 'skills') return false;
  const value = String(title ?? '').trim();
  if (!value) return true;
  const key = type === 'summary' ? 'summaryItem' : 'skillsItem';
  const legacyChineseTitle = type === 'summary' ? '目标岗位总结' : '技能';
  if (value === legacyChineseTitle || value === SECTION_COPY_EN[type]?.itemTitle) return true;
  return RESUME_SECTION_LANGUAGES.some((language) => RESUME_SECTION_LABELS[language]?.[key] === value);
}

export function localizeResumeSections(resume, lang = 'en') {
  if (!resume?.sections?.length) return resume;
  let changed = false;
  const sections = resume.sections.map((section) => {
    const copy = getSectionCopy(section.type, lang);
    const nextLabel = isSystemSectionLabel(section.type, section.label) ? copy.label : section.label;
    let itemsChanged = false;
    const items = section.items?.map((item) => {
      if (!Object.hasOwn(item, 'title') || !copy.itemTitle || !isSystemItemTitle(section.type, item.title)) return item;
      if (item.title === copy.itemTitle) return item;
      itemsChanged = true;
      return { ...item, title: copy.itemTitle };
    }) || section.items;
    if (nextLabel === section.label && !itemsChanged) return section;
    changed = true;
    return { ...section, label: nextLabel, items };
  });
  return changed ? { ...resume, sections } : resume;
}

export const TEMPLATE_OPTIONS = RESUME_TEMPLATES.map((template) => ({
  value: template.id,
  label: template.label
}));

export const TEMPLATE_ACCENTS = Object.fromEntries(
  RESUME_TEMPLATES.map((template) => [template.id, template.accent])
);

export const TEMPLATE_VARIANTS = Object.fromEntries(
  RESUME_TEMPLATES.map((template) => [template.id, template.variant])
);

export const FONT_OPTIONS = [
  { value: 'Arial', label: { en: 'Arial', zh: 'Arial' } },
  { value: 'Georgia', label: { en: 'Georgia', zh: 'Georgia' } },
  { value: 'Times New Roman', label: { en: 'Times New Roman', zh: 'Times New Roman' } },
  { value: 'Microsoft YaHei', label: { en: 'Microsoft YaHei', zh: '微软雅黑' } },
  { value: 'SimHei', label: { en: 'SimHei', zh: '黑体' } },
  { value: 'SimSun', label: { en: 'SimSun', zh: '宋体' } },
  { value: 'KaiTi', label: { en: 'KaiTi', zh: '楷体' } },
  { value: 'FangSong', label: { en: 'FangSong', zh: '仿宋' } }
];
