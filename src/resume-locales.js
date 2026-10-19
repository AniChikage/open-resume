const SAMPLES = {
  'zh-TW': {
    profile: { name: '周明遠', email: 'mingyuan@example.com', phone: '+886 912 345 678', website: 'mingyuan.design', city: '臺北', birthday: '1993-08', status: '在職', headline: '產品策略經理' },
    summary: '7 年數位產品經驗，擅長把使用者需求轉化為清晰的產品策略，並以數據推動跨團隊交付與成長。',
    education: [{ school: '國立臺灣大學', major: '資訊管理', degree: '學士', period: '2011 - 2015', location: '臺北', details: ['主修產品設計、資料分析與使用者研究'] }],
    work: [
      { org: '雲端科技', role: '資深產品經理', period: '2021 - 至今', location: '臺北', bullets: ['重新設計核心工作流程，讓啟用率提升 28%。', '建立季度產品規劃機制，協調設計、工程與商務團隊準時交付。'] },
      { org: '新創實驗室', role: '產品經理', period: '2017 - 2021', location: '新北', bullets: ['從零推出企業版方案，首年服務 120 家客戶。'] },
    ],
    project: [{ org: '自助式導入計畫', role: '專案負責人', period: '2023', location: '臺北', bullets: ['將平均導入時間從 12 天縮短至 5 天。'] }],
    skills: ['產品策略', '使用者研究', '資料分析', 'SQL', 'Figma', '專案管理'],
    awards: [{ title: '年度產品影響力獎', meta: '2023', description: '因提升新客戶啟用率而獲獎。' }],
  },
  ja: {
    profile: { name: '佐藤 美咲', email: 'misaki.sato@example.jp', phone: '+81 90-1234-5678', website: 'misaki.work', city: '東京', birthday: '1993-08', status: '在職中', headline: 'プロダクト戦略マネージャー' },
    summary: 'デジタルプロダクト領域で7年の経験。ユーザー課題を明確な戦略へ変換し、データを使って部門横断の成長を推進します。',
    education: [{ school: '早稲田大学', major: '経営情報学', degree: '学士', period: '2011 - 2015', location: '東京', details: ['プロダクト設計、データ分析、ユーザー調査を専攻'] }],
    work: [
      { org: 'North Cloud株式会社', role: 'シニアプロダクトマネージャー', period: '2021 - 現在', location: '東京', bullets: ['主要ワークフローを再設計し、利用開始率を28%向上。', 'デザイン、開発、営業を横断する四半期計画を構築し、納期達成率を改善。'] },
      { org: 'Launch Lab', role: 'プロダクトマネージャー', period: '2017 - 2021', location: '横浜', bullets: ['法人向けプランをゼロから立ち上げ、初年度に120社へ提供。'] },
    ],
    project: [{ org: 'セルフオンボーディング', role: 'プロジェクト責任者', period: '2023', location: '東京', bullets: ['導入期間を平均12日から5日に短縮。'] }],
    skills: ['プロダクト戦略', 'ユーザー調査', 'データ分析', 'SQL', 'Figma', 'プロジェクト管理'],
    awards: [{ title: 'Product Impact Award', meta: '2023', description: '新規顧客の利用開始率向上を評価。' }],
  },
  ko: {
    profile: { name: '김서연', email: 'seoyeon.kim@example.kr', phone: '+82 10-1234-5678', website: 'seoyeon.work', city: '서울', birthday: '1993-08', status: '재직 중', headline: '제품 전략 매니저' },
    summary: '디지털 제품 분야에서 7년간 일했습니다. 사용자 문제를 명확한 제품 전략으로 바꾸고 데이터로 여러 팀의 성장을 이끕니다.',
    education: [{ school: '연세대학교', major: '경영정보학', degree: '학사', period: '2011 - 2015', location: '서울', details: ['제품 설계, 데이터 분석, 사용자 조사를 전공'] }],
    work: [
      { org: '노스클라우드', role: '시니어 제품 매니저', period: '2021 - 현재', location: '서울', bullets: ['핵심 작업 흐름을 재설계해 활성화율을 28% 높였습니다.', '디자인·개발·영업 팀이 함께하는 분기별 계획 체계를 만들었습니다.'] },
      { org: '런치랩', role: '제품 매니저', period: '2017 - 2021', location: '성남', bullets: ['기업용 요금제를 처음부터 출시해 첫해 120개 고객사를 확보했습니다.'] },
    ],
    project: [{ org: '셀프 온보딩 프로젝트', role: '프로젝트 리드', period: '2023', location: '서울', bullets: ['평균 도입 기간을 12일에서 5일로 줄였습니다.'] }],
    skills: ['제품 전략', '사용자 조사', '데이터 분석', 'SQL', 'Figma', '프로젝트 관리'],
    awards: [{ title: '제품 임팩트상', meta: '2023', description: '신규 고객 활성화 개선 성과를 인정받았습니다.' }],
  },
  fr: {
    profile: { name: 'Camille Martin', email: 'camille.martin@example.fr', phone: '+33 6 12 34 56 78', website: 'camille.work', city: 'Paris', birthday: '1993-08', status: 'En poste', headline: 'Responsable stratégie produit' },
    summary: 'Sept ans d’expérience en produit numérique. Transforme les besoins utilisateurs en stratégie claire et pilote la croissance transverse par la donnée.',
    education: [{ school: 'Université Paris-Dauphine', major: 'Systèmes d’information', degree: 'Master', period: '2011 - 2016', location: 'Paris', details: ['Produit, analyse de données et recherche utilisateur'] }],
    work: [
      { org: 'North Cloud', role: 'Senior Product Manager', period: '2021 - Aujourd’hui', location: 'Paris', bullets: ['Refonte du parcours principal, avec une hausse de 28 % du taux d’activation.', 'Mise en place d’une planification trimestrielle commune au design, à la tech et au commerce.'] },
      { org: 'Launch Lab', role: 'Product Manager', period: '2017 - 2021', location: 'Lyon', bullets: ['Lancement de zéro d’une offre entreprise adoptée par 120 clients la première année.'] },
    ],
    project: [{ org: 'Onboarding en libre-service', role: 'Responsable du projet', period: '2023', location: 'Paris', bullets: ['Réduction du délai moyen de déploiement de 12 à 5 jours.'] }],
    skills: ['Stratégie produit', 'Recherche utilisateur', 'Analyse de données', 'SQL', 'Figma', 'Gestion de projet'],
    awards: [{ title: 'Prix de l’impact produit', meta: '2023', description: 'Récompense pour l’amélioration de l’activation client.' }],
  },
  ru: {
    profile: { name: 'Анна Волкова', email: 'anna.volkova@example.ru', phone: '+7 999 123-45-67', website: 'anna.work', city: 'Москва', birthday: '1993-08', status: 'Работаю', headline: 'Менеджер по продуктовой стратегии' },
    summary: 'Семь лет в цифровых продуктах. Превращаю задачи пользователей в ясную стратегию и развиваю продуктовые метрики вместе с разными командами.',
    education: [{ school: 'Высшая школа экономики', major: 'Бизнес-информатика', degree: 'Магистр', period: '2011 - 2017', location: 'Москва', details: ['Продуктовый дизайн, анализ данных и исследования пользователей'] }],
    work: [
      { org: 'North Cloud', role: 'Старший менеджер продукта', period: '2021 - настоящее время', location: 'Москва', bullets: ['Переработала ключевой сценарий и повысила активацию на 28%.', 'Внедрила квартальное планирование для дизайна, разработки и продаж.'] },
      { org: 'Launch Lab', role: 'Менеджер продукта', period: '2017 - 2021', location: 'Санкт-Петербург', bullets: ['Запустила корпоративный тариф с нуля и привлекла 120 клиентов за первый год.'] },
    ],
    project: [{ org: 'Самостоятельный онбординг', role: 'Руководитель проекта', period: '2023', location: 'Москва', bullets: ['Сократила средний срок внедрения с 12 до 5 дней.'] }],
    skills: ['Продуктовая стратегия', 'Исследования', 'Аналитика', 'SQL', 'Figma', 'Управление проектами'],
    awards: [{ title: 'Премия за влияние на продукт', meta: '2023', description: 'За рост активации новых клиентов.' }],
  },
};

export const RESUME_SECTION_LABELS = {
  en: { fallback: 'Resume template', summary: 'Professional Summary', summaryItem: 'Career Summary', education: 'Education', work: 'Experience', project: 'Projects', organization: 'Leadership & Activities', skills: 'Skills', skillsItem: 'Core Skills', awards: 'Awards', custom: 'Custom Section' },
  zh: { fallback: '简历模板', summary: '个人总结', summaryItem: '目标岗位总结', education: '教育经历', work: '工作经历', project: '项目经历', organization: '社团和组织经历', skills: '技能', skillsItem: '核心能力', awards: '荣誉奖项', custom: '自定义模块' },
  'zh-TW': { fallback: '履歷模板', summary: '個人摘要', summaryItem: '職涯摘要', education: '教育經歷', work: '工作經歷', project: '專案經歷', organization: '社團與組織經歷', skills: '技能', skillsItem: '核心能力', awards: '榮譽獎項', custom: '自訂區塊' },
  ja: { fallback: '履歴書テンプレート', summary: '職務要約', summaryItem: 'キャリア要約', education: '学歴', work: '職務経歴', project: 'プロジェクト', organization: 'リーダーシップ・活動', skills: 'スキル', skillsItem: 'コアスキル', awards: '受賞歴', custom: 'カスタム項目' },
  ko: { fallback: '이력서 템플릿', summary: '경력 요약', summaryItem: '핵심 소개', education: '학력', work: '경력', project: '프로젝트', organization: '리더십 및 활동', skills: '기술', skillsItem: '핵심 역량', awards: '수상', custom: '사용자 지정 섹션' },
  fr: { fallback: 'Modèle de CV', summary: 'Profil professionnel', summaryItem: 'Résumé de carrière', education: 'Formation', work: 'Expérience', project: 'Projets', organization: 'Engagements et activités', skills: 'Compétences', skillsItem: 'Compétences clés', awards: 'Distinctions', custom: 'Rubrique personnalisée' },
  ru: { fallback: 'Шаблон резюме', summary: 'Профессиональный профиль', summaryItem: 'Кратко о карьере', education: 'Образование', work: 'Опыт работы', project: 'Проекты', organization: 'Лидерство и активность', skills: 'Навыки', skillsItem: 'Ключевые навыки', awards: 'Награды', custom: 'Пользовательский раздел' },
};

export function getLocaleSample(lang, avatar) {
  const sample = SAMPLES[lang];
  return sample ? { ...sample, profile: { ...sample.profile, avatar } } : null;
}
