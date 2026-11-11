import { toTraditional } from './traditionalize.ts';

const messages: Record<string, [string, string, string, string, string]> = {
  'Search resumes': ['搜索简历', '履歴書を検索', '이력서 검색', 'Rechercher des CV', 'Поиск резюме'],
  'Search by title, name or headline': ['按标题、姓名或职位搜索', 'タイトル、氏名、職種で検索', '제목, 이름 또는 직함으로 검색', 'Rechercher par titre, nom ou poste', 'По названию, имени или должности'],
  'Sort resumes': ['简历排序', '履歴書の並び順', '이력서 정렬', 'Trier les CV', 'Сортировка резюме'],
  'Recently updated': ['最近更新优先', '更新が新しい順', '최근 수정순', 'Modification récente', 'Сначала новые изменения'],
  'Oldest updated': ['最早更新优先', '更新が古い順', '오래된 수정순', 'Modification ancienne', 'Сначала старые изменения'],
  'Name (A–Z)': ['按名称排序', '名前順', '이름순', 'Nom (A–Z)', 'По названию (А–Я)'],
  '{count} of {total} resumes match': ['共 {total} 份简历，找到 {count} 份', '{total} 件中 {count} 件が一致', '이력서 {total}개 중 {count}개 일치', '{count} CV trouvés sur {total}', 'Найдено {count} из {total} резюме'],
  'No matching resumes': ['未找到匹配的简历', '一致する履歴書がありません', '일치하는 이력서가 없습니다', 'Aucun CV correspondant', 'Подходящие резюме не найдены'],
  'Try a different title, name or headline.': ['试试其他标题、姓名或职位。', '別のタイトル、氏名、職種で検索してください。', '다른 제목, 이름 또는 직함으로 검색하세요.', 'Essayez un autre titre, nom ou poste.', 'Попробуйте другое название, имя или должность.'],
  'Clear search': ['清除搜索', '検索をクリア', '검색 지우기', 'Effacer la recherche', 'Очистить поиск'],
  'All your resumes are hidden': ['所有简历都已隐藏', 'すべての履歴書が非表示です', '모든 이력서가 숨겨져 있습니다', 'Tous vos CV sont masqués', 'Все ваши резюме скрыты'],
  'Your saved resumes are still here. Restore them to see them in this list.': ['已保存的简历仍然保留，恢复后即可在列表中查看。', '保存済みの履歴書は保持されています。再表示すると一覧に戻ります。', '저장한 이력서는 유지됩니다. 복원하면 목록에서 볼 수 있습니다.', 'Vos CV enregistrés sont conservés. Rétablissez-les pour les afficher.', 'Сохранённые резюме на месте. Восстановите их отображение в списке.'],
  'Rename resume': ['重命名简历', '履歴書名を変更', '이력서 이름 변경', 'Renommer le CV', 'Переименовать резюме'],
  'Rename {name}': ['重命名 {name}', '{name} の名前を変更', '{name} 이름 변경', 'Renommer {name}', 'Переименовать {name}'],
  'Edit {name}': ['编辑 {name}', '{name} を編集', '{name} 수정', 'Modifier {name}', 'Редактировать {name}'],
  'Give this resume a name so you can find it easily.': ['为简历设置一个容易辨认的名称。', '見つけやすい履歴書名を付けてください。', '쉽게 찾을 수 있도록 이력서 이름을 지정하세요.', 'Donnez un nom à ce CV pour le retrouver facilement.', 'Дайте резюме название, чтобы его было легко найти.'],
  'Enter a resume name between 1 and 1000 characters.': ['请输入 1 至 1000 个字符的简历名称。', '履歴書名は 1～1000 文字で入力してください。', '이력서 이름을 1~1000자로 입력하세요.', 'Saisissez un nom de 1 à 1000 caractères.', 'Введите название длиной от 1 до 1000 символов.'],
  'Could not rename the resume. Please try again.': ['重命名失败，请重试。', '名前を変更できませんでした。再試行してください。', '이름을 변경하지 못했습니다. 다시 시도하세요.', 'Impossible de renommer le CV. Réessayez.', 'Не удалось переименовать резюме. Повторите попытку.'],
  'Save name': ['保存名称', '名前を保存', '이름 저장', 'Enregistrer le nom', 'Сохранить название'],
  'Saving…': ['正在保存…', '保存中…', '저장 중…', 'Enregistrement…', 'Сохранение…'],
};

export const DASHBOARD_MESSAGES: Record<string, Record<string, string>> = Object.fromEntries(
  Object.entries(messages).map(([key, [zh, ja, ko, fr, ru]]) => [key, { zh, 'zh-TW': toTraditional(zh), ja, ko, fr, ru }]),
);
