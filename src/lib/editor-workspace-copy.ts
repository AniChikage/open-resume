import type { Language } from '../types.ts';

const copy = {
  content: ['Content', '内容', '內容', '内容', '내용', 'Contenu', 'Содержание'],
  design: ['Design', '设计', '設計', 'デザイン', '디자인', 'Design', 'Дизайн'],
  check: ['Check', '检查', '檢查', 'チェック', '검사', 'Vérifier', 'Проверка'],
  share: ['Share', '分享', '分享', '共有', '공유', 'Partager', 'Поделиться'],
  preview: ['Preview', '预览', '預覽', 'プレビュー', '미리보기', 'Aperçu', 'Просмотр'],
  back: ['Back to editing', '返回编辑', '返回編輯', '編集に戻る', '편집으로 돌아가기', 'Revenir à l’édition', 'Вернуться к правке'],
  workflow: ['Editor workflow', '编辑器工作区', '編輯器工作區', '編集ワークスペース', '편집 작업 공간', 'Espace d’édition', 'Рабочее пространство'],
  paper: ['Paper size', '纸张大小', '紙張大小', '用紙サイズ', '용지 크기', 'Format du papier', 'Размер бумаги'],
  pdfPreview: ['PDF preview', 'PDF 预览', 'PDF 預覽', 'PDF プレビュー', 'PDF 미리보기', 'Aperçu PDF', 'Предпросмотр PDF'],
  preparing: ['Preparing PDF preview…', '正在生成 PDF 预览…', '正在產生 PDF 預覽…', 'PDF を準備中…', 'PDF 준비 중…', 'Préparation du PDF…', 'Подготовка PDF…'],
  updating: ['Updating preview…', '正在更新预览…', '正在更新預覽…', 'プレビューを更新中…', '미리보기 업데이트 중…', 'Mise à jour de l’aperçu…', 'Обновление просмотра…'],
  current: ['Preview matches your PDF download', '预览与下载的 PDF 一致', '預覽與下載的 PDF 一致', 'ダウンロードと同じ PDF です', '다운로드와 동일한 PDF입니다', 'L’aperçu correspond au PDF téléchargé', 'Просмотр совпадает с загружаемым PDF'],
  previewError: ['Could not prepare the PDF preview. Your edits are safe.', 'PDF 预览生成失败，编辑内容仍然保留。', 'PDF 預覽產生失敗，編輯內容仍然保留。', 'PDF を生成できませんでした。編集内容は保持されています。', 'PDF를 준비하지 못했습니다. 편집 내용은 유지됩니다.', 'Impossible de préparer le PDF. Vos modifications sont conservées.', 'Не удалось подготовить PDF. Изменения сохранены в редакторе.'],
  retry: ['Retry preview', '重试预览', '重試預覽', '再試行', '다시 시도', 'Réessayer', 'Повторить'],
  pages: ['{count} pages', '{count} 页', '{count} 頁', '{count} ページ', '{count}페이지', '{count} pages', 'Страниц: {count}'],
  multiple: ['Your resume spans {count} pages. Adjust the font or spacing in Design if you want fewer pages.', '简历共 {count} 页。如需减少页数，可在“设计”中调整字号或间距。', '履歷共 {count} 頁。如需減少頁數，可在「設計」中調整字級或間距。', '全 {count} ページです。デザインで文字サイズや余白を調整できます。', '총 {count}페이지입니다. 디자인에서 글자 크기나 간격을 조정할 수 있습니다.', 'Le CV fait {count} pages. Ajustez la taille ou l’espacement dans Design pour le raccourcir.', 'Резюме занимает {count} страниц. Размер текста и интервалы можно изменить в Дизайне.'],
  checkTitle: ['Review before sending', '发送前检查', '傳送前檢查', '送信前の確認', '보내기 전 확인', 'Vérifier avant l’envoi', 'Проверка перед отправкой'],
  checkHelp: ['Checks update as you write. Open a finding to edit its field.', '检查结果随编辑更新，点击问题可直接修改对应内容。', '檢查結果隨編輯更新，點擊問題可直接修改對應內容。', '編集するとチェックも更新されます。問題を選んで修正できます。', '편집하면 검사도 업데이트됩니다. 문제를 선택해 수정하세요.', 'Les vérifications suivent vos modifications. Ouvrez un résultat pour le corriger.', 'Проверки обновляются при правке. Выберите замечание, чтобы исправить поле.'],
  caveat: ['These are content suggestions, not an ATS score or a hiring prediction. Downloads remain available.', '这些是内容建议，不代表 ATS 评分或录用预测，不影响下载。', '這些是內容建議，不代表 ATS 評分或錄用預測，不影響下載。', '内容の提案であり、ATS 評価や採用予測ではありません。ダウンロードは可能です。', '내용 제안이며 ATS 점수나 채용 예측이 아닙니다. 다운로드는 가능합니다.', 'Ce sont des conseils de contenu, sans prédiction de recrutement. Le téléchargement reste disponible.', 'Это советы по содержанию, а не оценка ATS или прогноз найма. Загрузка доступна.'],
  editField: ['Edit this field', '修改对应内容', '修改對應內容', 'この項目を編集', '이 항목 편집', 'Modifier ce champ', 'Исправить поле'],
  addSection: ['Add this section', '添加这个模块', '新增這個模組', 'セクションを追加', '섹션 추가', 'Ajouter cette rubrique', 'Добавить раздел'],
  shareTitle: ['Share and download', '分享与下载', '分享與下載', '共有とダウンロード', '공유 및 다운로드', 'Partager et télécharger', 'Доступ и загрузка'],
  shareHelp: ['Download a file or create a snapshot link for this version.', '下载文件，或为当前版本创建一个分享快照链接。', '下載檔案，或為目前版本建立分享快照連結。', 'ファイルを保存するか、この版の共有リンクを作成します。', '파일을 다운로드하거나 현재 버전의 공유 링크를 만드세요.', 'Téléchargez un fichier ou créez un lien vers cette version.', 'Загрузите файл или создайте ссылку на эту версию.'],
  createLink: ['Create and copy link', '创建并复制链接', '建立並複製連結', 'リンクを作成してコピー', '링크 만들고 복사', 'Créer et copier le lien', 'Создать и скопировать ссылку'],
  linkHelp: ['Anyone with the link can view this snapshot. Photos are not included. Later edits do not change an existing link.', '持有链接的人可以查看此快照，不包含头像。后续编辑不会更新已有链接。', '持有連結的人可以查看此快照，不包含頭像。後續編輯不會更新已有連結。', 'リンクを知る人が閲覧できます。写真は含まれず、後の編集も反映されません。', '링크가 있는 사람은 이 버전을 볼 수 있습니다. 사진과 이후 편집은 포함되지 않습니다.', 'Toute personne ayant le lien peut voir cet instantané, sans photo ni modifications ultérieures.', 'Любой со ссылкой увидит этот снимок без фотографии и последующих правок.'],
  copied: ['Link copied', '链接已复制', '連結已複製', 'コピーしました', '링크 복사됨', 'Lien copié', 'Ссылка скопирована'],
  manualCopy: ['Link ready. Select and copy it below.', '链接已生成，请在下方选中并复制。', '連結已產生，請在下方選取並複製。', '下のリンクを選択してコピーしてください。', '아래 링크를 선택해 복사하세요.', 'Le lien est prêt. Sélectionnez-le et copiez-le ci-dessous.', 'Ссылка готова. Выделите и скопируйте её ниже.'],
  linkError: ['Could not create the link. Please try again.', '创建链接失败，请重试。', '建立連結失敗，請重試。', 'リンクを作成できませんでした。再試行してください。', '링크를 만들지 못했습니다. 다시 시도하세요.', 'Impossible de créer le lien. Réessayez.', 'Не удалось создать ссылку. Повторите.'],
  link: ['Snapshot link', '快照链接', '快照連結', 'スナップショットのリンク', '스냅샷 링크', 'Lien vers cette version', 'Ссылка на снимок'],
  pdf: ['Download PDF', '下载 PDF', '下載 PDF', 'PDF を保存', 'PDF 다운로드', 'Télécharger le PDF', 'Скачать PDF'],
  pdfHelp: ['The same pages, fonts and colors shown in the preview.', '与预览相同的分页、字体和颜色。', '與預覽相同的分頁、字型和顏色。', 'プレビューと同じ改ページ、フォント、色。', '미리보기와 동일한 페이지, 글꼴, 색상.', 'Les mêmes pages, polices et couleurs que l’aperçu.', 'Те же страницы, шрифты и цвета, что в просмотре.'],
  wordHelp: ['Editable Word content with a simplified layout.', '可编辑的 Word 内容，使用简洁排版。', '可編輯的 Word 內容，使用簡潔排版。', 'シンプルなレイアウトの編集可能な Word。', '간단한 레이아웃의 편집 가능한 Word.', 'Un document Word modifiable à la mise en page simplifiée.', 'Редактируемый Word с упрощённой вёрсткой.'],
  pngHelp: ['An image of the full resume.', '完整简历的图片。', '完整履歷的圖片。', '履歴書全体の画像。', '전체 이력서 이미지.', 'Une image du CV complet.', 'Изображение всего резюме.'],
  jsonHelp: ['A backup with content and design that you can restore later.', '包含内容和样式，可稍后恢复的备份。', '包含內容和樣式，可稍後還原的備份。', '内容とデザインを後で復元できるバックアップ。', '내용과 디자인을 복원할 수 있는 백업.', 'Une sauvegarde du contenu et du design à restaurer.', 'Резервная копия содержания и оформления.'],
  changed: ['Your resume changed while the PDF was preparing. Please download again for the latest version.', 'PDF 生成期间简历已修改，请重新下载最新版本。', 'PDF 產生期間履歷已修改，請重新下載最新版本。', '生成中に変更されました。最新版を再度ダウンロードしてください。', 'PDF 준비 중 변경되었습니다. 최신 버전을 다시 다운로드하세요.', 'Le CV a changé pendant la préparation. Téléchargez à nouveau la dernière version.', 'Резюме изменилось при подготовке PDF. Загрузите последнюю версию ещё раз.'],
} as const;

const languages = ['en', 'zh', 'zh-TW', 'ja', 'ko', 'fr', 'ru'];
export function workspaceText(lang: Language | string, key: keyof typeof copy, values: Record<string, string | number> = {}) {
  if (key === 'pages' && values.count === 1 && (lang === 'en' || lang === 'fr')) return '1 page';
  const text = copy[key][Math.max(0, languages.indexOf(lang))] || copy[key][0];
  return text.replace(/\{(\w+)\}/g, (match, key) => String(values[key] ?? match));
}
