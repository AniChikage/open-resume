import type { Resume,Translate } from '../types.ts';
export interface CheckResult { type:'error'|'warning'|'suggestion'; category:string; message:string }
function getRichTextText(value: unknown) {
  const raw = String(value ?? '');
  if (!raw) return '';
  if (typeof document === 'undefined') return raw.replace(/<[^>]+>/g, '');
  const template = document.createElement('template');
  template.innerHTML = raw;
  return template.content.textContent ?? '';
}

export function runChecks(resume: Resume, t: Translate = (message, values = {}) => String(message).replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`))) {
  const results: CheckResult[] = [];

  if (!resume.profile.phone && !resume.profile.email) {
    results.push({
      type: 'error',
      category: t('Profile information'),
      message: t('Add at least one contact method: phone or email.')
    });
  } else if (!resume.profile.phone || !resume.profile.email) {
    results.push({
      type: 'warning',
      category: t('Profile information'),
      message: t('Add both phone and email so recruiters can reach you easily.')
    });
  }

  if (!resume.profile.name) {
    results.push({
      type: 'error',
      category: t('Profile information'),
      message: t('Add your name.')
    });
  }

  if (!resume.profile.headline) {
    results.push({
      type: 'warning',
      category: t('Profile information'),
      message: t('Add a target role so recruiters understand your goal immediately.')
    });
  }

  const hasSummary = resume.sections.some(
    (s) => s.visible && s.type === 'summary' && s.items.length > 0
  );
  if (!hasSummary) {
    results.push({
      type: 'suggestion',
      category: t('Structure'),
      message: t('Add a professional summary to surface your strongest qualifications.')
    });
  }

  const hasWork = resume.sections.some(
    (s) => s.visible && s.type === 'work' && s.items.length > 0
  );
  if (!hasWork) {
    results.push({
      type: 'warning',
      category: t('Structure'),
      message: t('Add an experience section.')
    });
  }

  const hasEducation = resume.sections.some(
    (s) => s.visible && s.type === 'education' && s.items.length > 0
  );
  if (!hasEducation) {
    results.push({
      type: 'warning',
      category: t('Structure'),
      message: t('Add an education section.')
    });
  }

  const allBullets = resume.sections
    .flatMap((s) => s.items)
    .flatMap((item) => {
      const body = getRichTextText(item.body).trim();
      return body ? [item.body] : (item.bullets ?? []);
    });

  const longBullets = allBullets.filter(
    (b) => getRichTextText(b).length > 80
  );
  if (longBullets.length > 0) {
    results.push({
      type: 'warning',
      category: t('Content quality'),
      message: t('{count} descriptions are over 80 characters. Consider making them more concise.', { count: longBullets.length })
    });
  }

  const shortBullets = allBullets.filter((b) => {
    const text = getRichTextText(b).trim();
    return text.length > 0 && text.length < 10;
  });
  if (shortBullets.length > 0) {
    results.push({
      type: 'suggestion',
      category: t('Content quality'),
      message: t('{count} descriptions are very short. Add specific outcomes.', { count: shortBullets.length })
    });
  }

  const bulletsWithoutNumbers = allBullets.filter((b) => {
    const text = getRichTextText(b).trim();
    return text.length > 15 && !/\d/.test(text);
  });
  if (bulletsWithoutNumbers.length >= 3) {
    results.push({
      type: 'suggestion',
      category: t('Measurable impact'),
      message: t('{count} descriptions lack numbers. Quantifying results can make them more convincing.', { count: bulletsWithoutNumbers.length })
    });
  }

  const visibleSections = resume.sections.filter((s) => s.visible);
  const emptySections = visibleSections.filter((s) => s.items.length === 0);
  if (emptySections.length > 0) {
    results.push({
      type: 'warning',
      category: t('Structure'),
      message: t('{sections} is empty. Add content or hide the section.', { sections: emptySections.map((s) => s.label).join(', ') })
    });
  }

  const totalBullets = allBullets.filter((b) => getRichTextText(b).trim().length > 0).length;
  const actionVerbs = ['负责', '主导', '开发', '设计', '优化', '搭建', '推动', '参与', '完成', '实现', '提升', '降低', 'led', 'built', 'owned', 'created', 'designed', 'developed', 'improved', 'reduced', 'increased', 'delivered', 'launched'];
  const starBullets = allBullets.filter((b) => {
    const text = getRichTextText(b).trim();
    return text.length > 0 && actionVerbs.some((v) => text.toLowerCase().startsWith(v));
  });
  if (totalBullets > 3 && starBullets.length < totalBullets * 0.5) {
    results.push({
      type: 'suggestion',
      category: t('STAR method'),
      message: t('Start more descriptions with strong action verbs to emphasize actions and results.')
    });
  }

  const score = Math.max(0, 100 - results.filter((r) => r.type === 'error').length * 20
    - results.filter((r) => r.type === 'warning').length * 10
    - results.filter((r) => r.type === 'suggestion').length * 3);

  return { score, results };
}
