import { toTraditional } from './traditionalize.ts';

const messages: Record<string, [string, string, string, string, string]> = {
  'Job matching': ['岗位匹配', '求人とのマッチング', '직무 매칭', 'Correspondance avec le poste', 'Соответствие вакансии'],
  'Match': ['匹配', 'マッチ', '매칭', 'Comparer', 'Сравнить'],
  'Compare a job posting with the evidence in your visible resume. No API key needed.': ['对照岗位要求，查看简历可见内容中的证据，无需 API Key。', '求人要件と履歴書の表示中の内容を比較します。API キーは不要です。', '채용 공고와 이력서의 표시된 내용을 비교합니다. API 키가 필요하지 않습니다.', 'Comparez l’offre aux éléments de votre CV visible. Aucune clé API nécessaire.', 'Сравните требования с видимыми разделами резюме. API-ключ не нужен.'],
  'Target job': ['目标岗位', '応募先の求人', '목표 직무', 'Poste visé', 'Целевая вакансия'],
  'Company (optional)': ['公司（选填）', '会社（任意）', '회사 (선택)', 'Entreprise (facultatif)', 'Компания (необязательно)'],
  'Job title (optional)': ['职位名称（选填）', '職種（任意）', '직무명 (선택)', 'Intitulé du poste (facultatif)', 'Должность (необязательно)'],
  'Saved in this browser for this resume. Matching runs on this device.': ['此岗位信息保存在当前浏览器中，与本简历关联。匹配在本机完成。', 'この履歴書用にブラウザーへ保存します。比較はこの端末で実行します。', '이 이력서의 채용 정보가 브라우저에 저장됩니다. 비교는 이 기기에서 실행됩니다.', 'L’offre est conservée dans ce navigateur pour ce CV. La comparaison reste locale.', 'Вакансия сохраняется в браузере для этого резюме. Сравнение выполняется локально.'],
  'Browser storage is unavailable. You can still compare during this visit.': ['浏览器存储不可用，本次访问仍可正常比较。', 'ブラウザーへ保存できませんが、今回の利用中は比較できます。', '브라우저 저장소를 사용할 수 없지만 이번 방문 중에는 비교할 수 있습니다.', 'Le stockage du navigateur est indisponible. La comparaison reste possible pendant cette visite.', 'Хранилище браузера недоступно. Сравнение доступно до закрытия страницы.'],
  'Keyword coverage': ['关键词覆盖率', 'キーワード網羅率', '키워드 포함률', 'Couverture des mots-clés', 'Покрытие ключевых слов'],
  '{matched} of {total} selected keywords appear in your resume.': ['简历中已出现 {total} 个所选关键词中的 {matched} 个。', '選択した {total} 個中 {matched} 個のキーワードが履歴書にあります。', '선택한 키워드 {total}개 중 {matched}개가 이력서에 있습니다.', '{matched} mots-clés sélectionnés sur {total} figurent dans votre CV.', 'В резюме найдены {matched} из {total} выбранных ключевых слов.'],
  'Paste a posting or add keywords to start comparing.': ['粘贴岗位描述或添加关键词，开始比较。', '求人情報を貼り付けるか、キーワードを追加してください。', '채용 공고를 붙여 넣거나 키워드를 추가하여 비교하세요.', 'Collez une offre ou ajoutez des mots-clés pour comparer.', 'Вставьте описание вакансии или добавьте ключевые слова.'],
  'This is keyword coverage, not an ATS score or a hiring prediction. Add only skills you actually have.': ['此结果仅表示关键词覆盖情况，不代表 ATS 评分或录用预测。请仅补充真实具备的能力。', 'これはキーワードの網羅率であり、ATS 評価や採用予測ではありません。実際のスキルのみ記載してください。', '키워드 포함률이며 ATS 점수나 채용 예측이 아닙니다. 실제 보유한 기술만 추가하세요.', 'Cette couverture ne constitue ni un score ATS ni une prédiction d’embauche. Mentionnez uniquement vos compétences réelles.', 'Это покрытие ключевых слов, а не оценка ATS или прогноз найма. Указывайте только реальные навыки.'],
  'No supported skill keywords were found. Add the specific skills or phrases that matter for this role.': ['未识别到词库支持的技能关键词，请手动添加此岗位重视的技能或短语。', '対応するスキル語が見つかりません。この求人に必要なスキルや語句を追加してください。', '지원되는 기술 키워드를 찾지 못했습니다. 이 직무에 중요한 기술이나 구절을 직접 추가하세요.', 'Aucun mot-clé reconnu. Ajoutez les compétences ou expressions importantes pour ce poste.', 'Поддерживаемые ключевые слова не найдены. Добавьте важные для вакансии навыки или фразы.'],
  'Missing keywords': ['尚未体现的关键词', '未記載のキーワード', '누락된 키워드', 'Mots-clés absents', 'Отсутствующие ключевые слова'],
  'Matched keywords': ['已体现的关键词', '記載済みのキーワード', '포함된 키워드', 'Mots-clés présents', 'Найденные ключевые слова'],
  'Ignore': ['忽略', '除外', '제외', 'Ignorer', 'Исключить'],
  'Ignore {keyword}': ['忽略 {keyword}', '{keyword} を除外', '{keyword} 제외', 'Ignorer {keyword}', 'Исключить {keyword}'],
  'In the posting': ['岗位描述中的原文', '求人情報の記載', '채용 공고 원문', 'Dans l’offre', 'В описании вакансии'],
  'In your resume': ['简历中的对应内容', '履歴書の記載', '이력서의 내용', 'Dans votre CV', 'В вашем резюме'],
  'Manually selected requirement': ['手动添加的要求', '手動で選択した要件', '직접 선택한 요구 사항', 'Exigence ajoutée manuellement', 'Требование добавлено вручную'],
  'Go to evidence': ['定位到对应内容', '該当箇所へ移動', '해당 내용으로 이동', 'Voir le passage', 'Перейти к фрагменту'],
  'Review resume': ['前往完善简历', '履歴書を確認', '이력서 검토', 'Revoir le CV', 'Проверить резюме'],
  'Add keywords': ['补充关键词', 'キーワードを追加', '키워드 추가', 'Ajouter des mots-clés', 'Добавить ключевые слова'],
  'Specific skill or phrase': ['具体技能或短语', '具体的なスキルや語句', '구체적인 기술 또는 구절', 'Compétence ou expression précise', 'Конкретный навык или фраза'],
  'Add keyword': ['添加关键词', '追加', '키워드 추가', 'Ajouter', 'Добавить'],
  'Add a specific skill or phrase, up to 64 characters. You can add 20 keywords.': ['请输入不超过 64 字的具体技能或短语，最多添加 20 个关键词。', '64 文字以内のスキルや語句を入力してください。最大 20 個追加できます。', '64자 이내의 기술이나 구절을 입력하세요. 키워드는 20개까지 추가할 수 있습니다.', 'Saisissez une compétence ou expression de 64 caractères maximum. Limite : 20 mots-clés.', 'Введите навык или фразу до 64 символов. Можно добавить до 20 ключевых слов.'],
  'Remove {keyword}': ['移除 {keyword}', '{keyword} を削除', '{keyword} 삭제', 'Supprimer {keyword}', 'Удалить {keyword}'],
  'Restore {keyword}': ['恢复 {keyword}', '{keyword} を戻す', '{keyword} 복원', 'Rétablir {keyword}', 'Восстановить {keyword}'],
  'Ignored keywords are excluded from coverage.': ['忽略的关键词不计入覆盖率。', '除外したキーワードは網羅率に含めません。', '제외한 키워드는 포함률 계산에서 빠집니다.', 'Les mots-clés ignorés sont exclus du calcul.', 'Исключённые слова не учитываются при расчёте.'],
  'Continue with AI tailoring': ['继续使用 AI 岗位优化', 'AI 最適化へ進む', 'AI 맞춤 최적화 계속', 'Continuer avec l’optimisation IA', 'Продолжить с оптимизацией ИИ'],
  'AI tailoring asks for consent before sending content to your configured provider.': ['AI 优化将在向配置的服务商发送内容前征求同意。', 'AI 最適化では、設定したプロバイダーへ内容を送信する前に同意を確認します。', 'AI 최적화는 설정된 제공업체에 내용을 보내기 전에 동의를 요청합니다.', 'L’optimisation IA demande votre accord avant tout envoi au fournisseur configuré.', 'Оптимизация ИИ запрашивает согласие перед отправкой данных настроенному провайдеру.'],
};

export const JOB_MATCH_MESSAGES: Record<string, Record<string, string>> = Object.fromEntries(
  Object.entries(messages).map(([key, [zh, ja, ko, fr, ru]]) => [key, { zh, 'zh-TW': toTraditional(zh), ja, ko, fr, ru }]),
);
