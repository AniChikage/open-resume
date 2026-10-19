export const LANDING_TRANSLATIONS = {
  'Try it here': { zh: '直接试试看', 'zh-TW': '直接試試看', ja: 'ここで試す', ko: '직접 체험하기', fr: 'Essayez ici', ru: 'Попробуйте здесь' },
  'Your experience. Your style.': { zh: '你的经历，你的风格。', 'zh-TW': '你的經歷，你的風格。', ja: 'あなたの経験を、あなたらしく。', ko: '나의 경험, 나만의 스타일.', fr: 'Votre expérience. Votre style.', ru: 'Ваш опыт. Ваш стиль.' },
  'Same content, three different looks. Try a layout, adjust the type, and make it yours.': { zh: '同一份经历，三种不同呈现。切换模板、调整字号和颜色，马上看到效果。', 'zh-TW': '同一份經歷，三種不同呈現。切換範本、調整字級和顏色，馬上看到效果。', ja: '同じ内容を3つのデザインで。レイアウト、文字サイズ、色を変えて仕上がりを確認できます。', ko: '같은 내용을 세 가지 디자인으로 비교하세요. 레이아웃, 글자 크기와 색상을 바로 조정할 수 있어요.', fr: 'Un même contenu, trois présentations. Changez la mise en page, la taille du texte et la couleur.', ru: 'Одно содержание, три оформления. Меняйте макет, размер текста и цвет и сразу смотрите результат.' },
  'Switch layouts without rewriting your resume.': { zh: '换模板，保留你已写好的内容。', 'zh-TW': '換範本，保留你已寫好的內容。', ja: '書いた内容はそのまま、デザインを変更。', ko: '작성한 내용을 유지하면서 디자인을 바꾸세요.', fr: 'Changez de mise en page en conservant votre contenu.', ru: 'Меняйте оформление, сохраняя написанный текст.' },
  'Fine-tune the spacing, then export to PDF or PNG.': { zh: '在编辑器中调整间距，导出 PDF 或 PNG。', 'zh-TW': '在編輯器中調整間距，匯出 PDF 或 PNG。', ja: 'エディターで余白を調整し、PDFやPNGで保存。', ko: '편집기에서 간격을 조정하고 PDF 또는 PNG로 내보내세요.', fr: 'Ajustez les espacements dans l’éditeur, puis exportez en PDF ou PNG.', ru: 'Настройте интервалы в редакторе и экспортируйте в PDF или PNG.' },
  'Two free templates. All professional layouts for {price}, once.': { zh: '两款免费模板；一次支付 {price}，解锁全部专业模板。', 'zh-TW': '兩款免費範本；一次支付 {price}，解鎖全部專業範本。', ja: '2種類は無料。{price}の買い切りで全プロテンプレートを利用できます。', ko: '무료 템플릿 2개. {price} 한 번 결제로 모든 전문 템플릿을 이용하세요.', fr: 'Deux modèles gratuits. Tous les modèles professionnels pour {price}, en un seul paiement.', ru: 'Два бесплатных шаблона. Все профессиональные шаблоны за {price} одним платежом.' },
};

const tailoringDemoRows = [
  ['AI job tailoring', 'AI 岗位定制', 'AI 職缺客製化', 'AIで求人に合わせる', 'AI 직무 맞춤', 'CV adapté par IA', 'Адаптация резюме с ИИ'],
  ['Your experience. Tailored to the role.', '同一份经历，适配不同岗位。', '同一份經歷，適配不同職缺。', 'あなたの経験を、応募先に合わせて。', '나의 경험을 지원 직무에 맞게.', 'Votre expérience, adaptée au poste.', 'Ваш опыт — с акцентом на нужную вакансию.'],
  ['One resume, different opportunities. Bring forward the experience that matters for each job, with AI suggestions you review first.', '面对不同机会，让相关经历更突出。AI 根据职位描述提出建议，每一处修改都由你确认。', '面對不同機會，讓相關經歷更突出。AI 根據職缺說明提出建議，每一處修改都由你確認。', '求人ごとに関連する経験を引き立てます。AIの提案は、あなたが確認してから反映。', '지원하는 직무에 중요한 경험을 강조하세요. AI의 제안을 직접 검토한 후 적용할 수 있어요.', 'Mettez en avant l’expérience pertinente pour chaque offre. Vous validez les suggestions de l’IA avant de les appliquer.', 'Выделяйте опыт, важный для каждой вакансии. Все предложения ИИ сначала проверяете вы.'],
  ['Tailoring demo steps', '岗位定制演示步骤', '職缺客製化示範步驟', '最適化デモの手順', '직무 맞춤 데모 단계', 'Étapes de la démonstration', 'Этапы демонстрации'],
  ['Paste the job', '粘贴职位描述', '貼上職缺說明', '求人内容を貼り付け', '채용 공고 붙여넣기', 'Collez l’offre', 'Вставьте описание вакансии'],
  ['Review the changes', '对比优化建议', '比較優化建議', '修正案を確認', '수정 제안 검토', 'Vérifiez les modifications', 'Проверьте изменения'],
  ['Keep a separate copy', '另存定制副本', '另存客製化副本', '別のコピーとして保存', '별도 사본 저장', 'Gardez une copie distincte', 'Сохраните отдельную копию'],
  ['Tailor my resume', '定制我的简历', '客製化我的履歷', '履歴書を最適化する', '내 이력서 맞춤 작성', 'Adapter mon CV', 'Адаптировать моё резюме'],
  ['Open a resume, then choose “Tailor to a job”.', '打开一份简历，点击“针对岗位优化”。', '開啟一份履歷，點選「針對職缺優化」。', '履歴書を開き、「求人に合わせて最適化」を選択。', '이력서를 열고 직무 맞춤 기능을 선택하세요.', 'Ouvrez un CV, puis choisissez l’adaptation à une offre.', 'Откройте резюме и выберите адаптацию к вакансии.'],
  ['Illustrative example', '流程示例', '流程範例', '使用例', '사용 예시', 'Exemple illustratif', 'Пример работы'],
  ['Pause demo', '暂停演示', '暫停示範', '一時停止', '데모 일시정지', 'Pause', 'Пауза'],
  ['Play demo', '播放演示', '播放示範', 'デモを再生', '데모 재생', 'Lire la démo', 'Запустить демо'],
  ['Frontend Developer', '前端开发工程师', '前端工程師', 'フロントエンドエンジニア', '프론트엔드 개발자', 'Développeur front-end', 'Фронтенд-разработчик'],
  ['Build React dashboards, improve web performance, and collaborate with designers. Kubernetes experience required.', '开发 React 仪表盘，优化网页性能，与设计师协作。要求具备 Kubernetes 经验。', '開發 React 儀表板、優化網頁效能並與設計師協作。需具備 Kubernetes 經驗。', 'Reactダッシュボードの開発、Web性能の改善、デザイナーとの協働。Kubernetesの経験が必要。', 'React 대시보드 개발, 웹 성능 개선 및 디자이너 협업. Kubernetes 경험 필수.', 'Créer des tableaux de bord React, améliorer les performances web et collaborer avec les designers. Expérience Kubernetes requise.', 'Разработка дашбордов на React, оптимизация веб-производительности и работа с дизайнерами. Требуется опыт Kubernetes.'],
  ['Web performance', '网页性能', '網頁效能', 'Web性能', '웹 성능', 'Performance web', 'Веб-производительность'],
  ['Start with the experience already in your resume.', '以简历中已有的真实经历为起点。', '以履歷中已有的真實經歷為起點。', '履歴書にある実際の経験をもとにします。', '이력서에 이미 작성된 실제 경험을 바탕으로 합니다.', 'Partez de l’expérience déjà présente dans votre CV.', 'В основе — опыт, уже указанный в вашем резюме.'],
  ['Built React dashboards. Improved page load time by 20%.', '开发了 React 仪表盘。页面加载时间缩短了 20%。', '開發了 React 儀表板。頁面載入時間縮短了 20%。', 'Reactダッシュボードを開発。ページ読み込み時間を20%短縮。', 'React 대시보드 개발. 페이지 로딩 시간 20% 단축.', 'Création de tableaux de bord React. Réduction du temps de chargement de 20 %.', 'Разработал дашборды на React. Сократил время загрузки страниц на 20%.'],
  ['Built React dashboards and improved page load time by 20%.', '开发 React 仪表盘，并将页面加载时间缩短 20%。', '開發 React 儀表板，並將頁面載入時間縮短 20%。', 'Reactダッシュボードを開発し、ページ読み込み時間を20%短縮。', 'React 대시보드를 개발하고 페이지 로딩 시간을 20% 단축.', 'Développement de tableaux de bord React et réduction du temps de chargement de 20 %.', 'Разработал дашборды на React и сократил время загрузки страниц на 20%.'],
  ['Kubernetes is not in this resume. Flagged as a gap, not added as a skill.', '简历中没有 Kubernetes 经历：标记为待补充要求，不添加为已有技能。', '履歷中沒有 Kubernetes 經歷：標示為待補充要求，不新增為已有技能。', 'Kubernetesの経験は未記載。不足項目として示し、スキルには追加しません。', 'Kubernetes 경험이 없어 부족한 요건으로 표시하며, 보유 기술에 추가하지 않습니다.', 'Kubernetes est absent du CV : signalé comme un manque, sans l’ajouter aux compétences.', 'Kubernetes не указан в резюме: отмечен как пробел, а не добавлен в навыки.'],
  ['Original resume', '原始简历', '原始履歷', '元の履歴書', '원본 이력서', 'CV original', 'Исходное резюме'],
  ['Unchanged and ready for your next application.', '完整保留，随时用于下一次申请。', '完整保留，隨時用於下一次申請。', '変更せずに保存。次の応募にも使えます。', '원본 그대로 유지되어 다음 지원에도 활용할 수 있어요.', 'Conservé intact pour vos prochaines candidatures.', 'Без изменений, для следующих откликов.'],
  ['Tailored copy', '岗位定制版', '職缺客製化版', '応募先に合わせたコピー', '직무 맞춤 사본', 'Copie adaptée', 'Адаптированная копия'],
  ['Only the changes you approve.', '只包含你确认采纳的修改。', '只包含你確認採用的修改。', '承認した変更だけを反映。', '승인한 변경 사항만 적용됩니다.', 'Uniquement les changements que vous approuvez.', 'Только одобренные вами изменения.'],
  ['Review every suggestion. Keep your experience true to you.', '逐项确认建议，让简历始终忠于真实经历。', '逐項確認建議，讓履歷始終忠於真實經歷。', '提案を一つずつ確認し、実際の経験に忠実な内容に。', '모든 제안을 검토하고 실제 경험에 충실한 이력서를 만드세요.', 'Vérifiez chaque suggestion pour rester fidèle à votre expérience.', 'Проверяйте каждое предложение, сохраняя достоверность опыта.'],
  ['Your facts. Your final say.', '经历属实，修改由你决定。', '經歷屬實，修改由你決定。', '事実に基づき、最後はあなたが判断。', '사실에 기반한 경험, 최종 결정은 나에게.', 'Vos faits. Votre décision.', 'Ваш опыт. Ваше решение.'],
];
for (const [key, zh, zhTW, ja, ko, fr, ru] of tailoringDemoRows) {
  LANDING_TRANSLATIONS[key] = { zh, 'zh-TW': zhTW, ja, ko, fr, ru };
}
