import type { Language } from '../types.ts';

const copy = {
  newChapter: ['Start a new chapter', '开启新的篇章', '開啟新的篇章', '新しい一歩を始めよう', '새로운 시작을 준비하세요', 'Un nouveau chapitre', 'Новая глава карьеры'],
  sectionOptions: ['Section options', '模块选项', '模組選項', 'セクション設定', '섹션 옵션', 'Options de rubrique', 'Настройки раздела'],
  addSection: ['Add a section', '添加模块', '新增模組', 'セクションを追加', '섹션 추가', 'Ajouter une rubrique', 'Добавить раздел'],
  description: ['An open-source resume builder. All templates, unlimited resumes, free exports.', '开源的简历制作工具。全部模板开放，简历数量不限，导出免费。', '開源的履歷製作工具。全部範本開放，履歷數量不限，匯出免費。', 'オープンソースの履歴書作成ツール。すべてのテンプレート、無制限の履歴書、無料の書き出し。', '오픈 소스 이력서 도구. 모든 템플릿, 무제한 이력서, 무료 내보내기.', 'Un créateur de CV open source. Tous les modèles, des CV illimités et des exports gratuits.', 'Редактор резюме с открытым кодом. Все шаблоны, любое число резюме и бесплатный экспорт.'],
  note: ['Self-host it. Make it yours.', '自己部署，自由使用。', '自行部署，自由使用。', '自分でホスト。自分らしい履歴書に。', '직접 호스팅하고 나답게 만드세요.', 'Hébergez-le. Faites-le vôtre.', 'Разместите у себя. Сделайте своим.'],
  story: ['Start with your story', '从你的经历开始', '從你的經歷開始', 'あなたの経験から', '나의 경험에서 시작', 'Commencez par votre parcours', 'Начните со своего опыта'],
  storyHelp: ['Bring a PDF, restore a backup, or start from a blank page.', '导入 PDF、恢复备份，或从空白简历开始。', '匯入 PDF、還原備份，或從空白履歷開始。', 'PDF を取り込む、バックアップを復元する、白紙から始める。', 'PDF를 가져오거나 백업을 복원하거나 새로 시작하세요.', 'Importez un PDF, restaurez une sauvegarde ou partez de zéro.', 'Импортируйте PDF, восстановите копию или начните с чистого листа.'],
  design: ['Make it your own', '找到适合你的表达', '找到適合你的表達', '自分らしく整える', '나만의 스타일로', 'Faites-le vôtre', 'Оформите по-своему'],
  designHelp: ['Choose a template, adjust the details, and see every change.', '选择模板，调整细节，实时查看每一处变化。', '選擇範本，調整細節，即時查看每一處變化。', 'テンプレートを選び、細部を調整。変更をすぐ確認。', '템플릿과 세부 사항을 조정하고 바로 확인하세요.', 'Choisissez un modèle, ajustez les détails et voyez chaque changement.', 'Выберите шаблон, настройте детали и сразу увидите изменения.'],
  export: ['Export with confidence', '确认好，再发送', '確認好，再傳送', '確認して書き出す', '확인하고 내보내기', 'Exportez en confiance', 'Проверьте и отправляйте'],
  exportHelp: ['Review the pages you download. PDF, editable Word, PNG and JSON.', '核对下载时的页面，支持 PDF、可编辑 Word、PNG 和 JSON。', '核對下載時的頁面，支援 PDF、可編輯 Word、PNG 和 JSON。', '保存するページを確認。PDF、編集可能な Word、PNG、JSON。', '다운로드할 페이지를 확인하세요. PDF, 편집 가능한 Word, PNG, JSON.', 'Vérifiez vos pages. PDF, Word modifiable, PNG et JSON.', 'Проверьте страницы перед загрузкой. PDF, редактируемый Word, PNG и JSON.'],
  gallery: ['A good first impression.', '好的第一印象，从这里开始。', '好的第一印象，從這裡開始。', '第一印象を、あなたらしく。', '좋은 첫인상의 시작.', 'Une bonne première impression.', 'Хорошее первое впечатление.'],
  galleryHelp: ['Find a layout that fits your next chapter.', '为下一段职业经历，找到合适的版式。', '為下一段職涯，找到合適的版式。', '次のキャリアに合うレイアウトを。', '다음 도전에 맞는 레이아웃을 찾아보세요.', 'Trouvez la mise en page de votre prochaine étape.', 'Найдите оформление для нового этапа.'],
  libraryHelp: ['Your next chapter starts here.', '下一段职业经历，从这里开始。', '下一段職涯，從這裡開始。', '次のキャリアは、ここから。', '다음 도전은 여기서 시작됩니다.', 'Votre prochaine étape commence ici.', 'Ваш новый этап начинается здесь.'],
  contentHelp: ['Your experience, in your own words.', '用自己的话，写下你的经历。', '用自己的話，寫下你的經歷。', 'あなたの経験を、あなたの言葉で。', '나의 경험을 나의 말로.', 'Votre expérience, avec vos mots.', 'Ваш опыт, вашими словами.'],
  photo: ['Change photo', '更换照片', '更換照片', '写真を変更', '사진 변경', 'Changer la photo', 'Изменить фото'],
} as const;
const languages = ['en', 'zh', 'zh-TW', 'ja', 'ko', 'fr', 'ru'];

export function visualText(lang: Language | string, key: keyof typeof copy) {
  return copy[key][Math.max(0, languages.indexOf(lang))] || copy[key][0];
}
