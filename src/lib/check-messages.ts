import { toTraditional } from './traditionalize.ts';

const messages: Record<string, [string, string, string, string, string]> = {
  'Enter a valid email address.': ['请输入有效的邮箱地址。', '有効なメールアドレスを入力してください。', '올바른 이메일 주소를 입력하세요.', 'Saisissez une adresse e-mail valide.', 'Введите действительный адрес электронной почты.'],
  'Dates': ['日期', '日付', '날짜', 'Dates', 'Даты'],
  'The end date is earlier than the start date. Check this entry.': ['结束日期早于开始日期，请检查此条目。', '終了日が開始日より前です。この項目を確認してください。', '종료일이 시작일보다 빠릅니다. 이 항목을 확인하세요.', 'La date de fin précède la date de début. Vérifiez cette entrée.', 'Дата окончания раньше даты начала. Проверьте эту запись.'],
  '{count} entries are blank. Fill them in or remove them.': ['{count} 个条目尚未填写，请补充内容或删除。', '{count} 件の項目が空白です。入力するか削除してください。', '빈 항목이 {count}개 있습니다. 내용을 입력하거나 삭제하세요.', '{count} entrées sont vides. Complétez-les ou supprimez-les.', 'Пустых записей: {count}. Заполните или удалите их.'],
  'Review contact details, dates and visible content. Checks run on this device.': ['检查联系方式、日期和可见内容，检查过程在当前设备上完成。', '連絡先、日付、表示中の内容を確認します。チェックはこの端末で行います。', '연락처, 날짜, 표시된 내용을 확인합니다. 검사는 이 기기에서 실행됩니다.', 'Vérifiez les coordonnées, les dates et le contenu visible. Les contrôles restent sur cet appareil.', 'Проверьте контакты, даты и видимые разделы. Проверка выполняется на этом устройстве.'],
  'Go to field': ['前往填写', '入力欄に移動', '입력란으로 이동', 'Aller au champ', 'Перейти к полю'],
  'Go to section': ['前往模块', 'セクションに移動', '섹션으로 이동', 'Aller à la rubrique', 'Перейти к разделу'],
  'Go to issue': ['定位问题', '問題に移動', '문제로 이동', 'Accéder au problème', 'Перейти к проблеме'],
};

export const CHECK_MESSAGES: Record<string, Record<string, string>> = Object.fromEntries(
  Object.entries(messages).map(([key, [zh, ja, ko, fr, ru]]) => [key, { zh, 'zh-TW': toTraditional(zh), ja, ko, fr, ru }]),
);
