import { toTraditional } from './traditionalize.ts';

// Keep new workspace actions available in every supported interface language.
const messages: Record<string, [string, string, string, string, string]> = {
  'Import JSON backup': ['导入 JSON 备份', 'JSON バックアップを読み込む', 'JSON 백업 가져오기', 'Importer une sauvegarde JSON', 'Импортировать JSON'],
  'Restore content and appearance as a new resume. Existing resumes stay unchanged.': ['将内容和样式恢复为一份新简历，不会覆盖已有简历。', '内容とスタイルを新しい履歴書として復元します。既存の履歴書は保持されます。', '내용과 스타일을 새 이력서로 복원합니다. 기존 이력서는 유지됩니다.', 'Restaurez le contenu et le style dans un nouveau CV, sans écraser les CV existants.', 'Восстановите содержание и оформление в новом резюме, сохранив существующие.'],
  'JSON backup file': ['JSON 备份文件', 'JSON バックアップファイル', 'JSON 백업 파일', 'Fichier de sauvegarde JSON', 'Файл резервной копии JSON'],
  'Import as a new resume': ['导入为新简历', '新しい履歴書として読み込む', '새 이력서로 가져오기', 'Importer comme nouveau CV', 'Импортировать как новое резюме'],
  'Importing…': ['正在导入…', '読み込み中…', '가져오는 중…', 'Importation…', 'Импорт…'],
  '{count} sections': ['{count} 个模块', '{count} セクション', '섹션 {count}개', '{count} rubriques', 'Разделов: {count}'],
  'Choose a JSON backup smaller than 10 MB.': ['请选择小于 10 MB 的 JSON 备份。', '10 MB 未満の JSON バックアップを選んでください。', '10 MB 미만의 JSON 백업을 선택하세요.', 'Choisissez une sauvegarde JSON de moins de 10 Mo.', 'Выберите резервную копию JSON меньше 10 МБ.'],
  'This file is not a supported resume backup. Choose a JSON file exported by Open Resume.': ['此文件不是支持的简历备份，请选择 Open Resume 导出的 JSON 文件。', '対応するバックアップではありません。Open Resume から出力した JSON を選んでください。', '지원되는 백업이 아닙니다. Open Resume에서 내보낸 JSON 파일을 선택하세요.', 'Ce fichier n’est pas une sauvegarde compatible. Choisissez un JSON exporté par Open Resume.', 'Файл не поддерживается. Выберите JSON, экспортированный из Open Resume.'],
  'Could not import the resume. Please try again.': ['导入失败，请重试。', '読み込めませんでした。もう一度お試しください。', '가져오지 못했습니다. 다시 시도하세요.', 'Importation impossible. Réessayez.', 'Не удалось импортировать резюме. Повторите попытку.'],
  'Duplicate resume': ['复制简历', '履歴書を複製', '이력서 복제', 'Dupliquer le CV', 'Создать копию резюме'],
  'Duplicate {name}': ['复制 {name}', '{name} を複製', '{name} 복제', 'Dupliquer {name}', 'Создать копию {name}'],
  '{name} (copy)': ['{name}（副本）', '{name}（コピー）', '{name} (사본)', '{name} (copie)', '{name} (копия)'],
  'Could not create the resume. Please try again.': ['创建简历失败，请重试。', '履歴書を作成できませんでした。再試行してください。', '이력서를 만들지 못했습니다. 다시 시도하세요.', 'Création du CV impossible. Réessayez.', 'Не удалось создать резюме. Повторите попытку.'],
  'Could not load your resumes. Your saved data has not been deleted.': ['简历加载失败，已保存的数据没有被删除。', '履歴書を読み込めませんでした。保存済みデータは削除されていません。', '이력서를 불러오지 못했습니다. 저장된 데이터는 삭제되지 않았습니다.', 'Chargement impossible. Vos données enregistrées n’ont pas été supprimées.', 'Не удалось загрузить резюме. Сохранённые данные не удалены.'],
  'Save failed and browser storage is unavailable. Keep this tab open and try again.': ['保存失败，浏览器也无法缓存草稿。请保持此标签页打开并重试。', '保存に失敗し、ブラウザーにも保存できません。このタブを開いたまま再試行してください。', '저장에 실패했고 브라우저 캐시도 사용할 수 없습니다. 이 탭을 열어 두고 다시 시도하세요.', 'Échec de la sauvegarde et du stockage local. Gardez cet onglet ouvert et réessayez.', 'Сохранение и локальное хранилище недоступны. Оставьте вкладку открытой и повторите попытку.'],
  'Share resume': ['分享简历', '履歴書を共有', '이력서 공유', 'Partager le CV', 'Поделиться резюме'],
  'Only visible sections are shared. Uploaded photos are excluded.': ['仅分享可见模块，不包含上传的照片。', '表示中のセクションのみ共有します。アップロードした写真は含みません。', '표시된 섹션만 공유합니다. 업로드한 사진은 제외됩니다.', 'Seules les rubriques visibles sont partagées. Les photos téléversées sont exclues.', 'Доступны только видимые разделы. Загруженные фотографии исключены.'],
  'Choose what to include': ['选择分享内容', '共有する情報を選択', '공유할 정보 선택', 'Choisir les informations à inclure', 'Выберите данные для публикации'],
  'Contact details: phone, email and website': ['联系方式：电话、邮箱和网站', '連絡先：電話、メール、ウェブサイト', '연락처: 전화, 이메일, 웹사이트', 'Coordonnées : téléphone, e-mail et site web', 'Контакты: телефон, почта и сайт'],
  'Personal details: city, birthday and status': ['个人信息：城市、生日和当前状态', '個人情報：都市、生年月日、現在の状況', '개인 정보: 도시, 생년월일, 현재 상태', 'Informations personnelles : ville, naissance et statut', 'Личные данные: город, дата рождения и статус'],
  'Anyone with this link can read its contents. It is a snapshot and cannot be revoked; later edits will not update it.': ['持有链接的人都能读取其中内容。链接是无法撤销的快照，后续编辑不会更新它。', 'リンクを持つ人は内容を閲覧できます。取り消せないスナップショットで、後の編集は反映されません。', '링크가 있는 사람은 내용을 읽을 수 있습니다. 취소할 수 없는 스냅샷이며 이후 수정은 반영되지 않습니다.', 'Toute personne ayant ce lien peut lire son contenu. Cet instantané ne peut être révoqué ni mis à jour par vos modifications.', 'Любой обладатель ссылки может прочитать данные. Это неизменяемый снимок: его нельзя отозвать или обновить.'],
  'Create share link': ['生成分享链接', '共有リンクを作成', '공유 링크 만들기', 'Créer le lien de partage', 'Создать ссылку'],
  'Creating link…': ['正在生成链接…', 'リンクを作成中…', '링크 생성 중…', 'Création du lien…', 'Создание ссылки…'],
  'Share link': ['分享链接', '共有リンク', '공유 링크', 'Lien de partage', 'Ссылка для публикации'],
  'Copy link': ['复制链接', 'リンクをコピー', '링크 복사', 'Copier le lien', 'Копировать ссылку'],
  'Copied': ['已复制', 'コピーしました', '복사됨', 'Copié', 'Скопировано'],
  'Could not create the share link. Please try again.': ['分享链接生成失败，请重试。', '共有リンクを作成できませんでした。再試行してください。', '공유 링크를 만들지 못했습니다. 다시 시도하세요.', 'Impossible de créer le lien. Réessayez.', 'Не удалось создать ссылку. Повторите попытку.'],
  'This resume is too large for a share link. Export a PDF or JSON backup instead.': ['简历内容过大，无法生成分享链接。请导出 PDF 或 JSON 备份。', '履歴書のサイズが大きすぎるため共有リンクを作成できません。PDF または JSON バックアップとして書き出してください。', '이력서가 너무 커서 공유 링크를 만들 수 없습니다. PDF 또는 JSON 백업으로 내보내세요.', 'Ce CV est trop volumineux pour un lien de partage. Exportez-le en PDF ou en sauvegarde JSON.', 'Резюме слишком большое для ссылки. Экспортируйте его в PDF или резервную копию JSON.'],
  'Copy the link from the field above.': ['请从上方输入框手动复制链接。', '上の入力欄からリンクをコピーしてください。', '위 입력란에서 링크를 복사하세요.', 'Copiez le lien depuis le champ ci-dessus.', 'Скопируйте ссылку из поля выше.'],
};
export const WORKSPACE_MESSAGES: Record<string, Record<string, string>> = Object.fromEntries(
  Object.entries(messages).map(([key, [zh, ja, ko, fr, ru]]) => [key, { zh, 'zh-TW': toTraditional(zh), ja, ko, fr, ru }]),
);
