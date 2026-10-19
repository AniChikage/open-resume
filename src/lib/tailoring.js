// Shared, deterministic contract. AI can propose body text only, never identity,
// employment dates, employers, qualifications, or arbitrary object paths.
export const JD_MAX_LENGTH = 12000;
export const TAILOR_LANGUAGES = { en: 'English', zh: 'Simplified Chinese', 'zh-TW': 'Traditional Chinese', ja: 'Japanese', ko: 'Korean', fr: 'French', ru: 'Russian' };

export function plainText(value) {
  return String(value ?? '')
    .replace(/<\s*(script|style)\b[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, '')
    .replace(/<br\s*\/?\s*>|<\/(p|div|li)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, entity) => {
      const names = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
      if (entity[0] !== '#') return names[entity.toLowerCase()] ?? match;
      const n = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
      return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : '';
    }).replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

export function tailoringTargets(resume) {
  if (!resume || !Array.isArray(resume.sections) || resume.sections.length > 40) throw new Error('INVALID_RESUME');
  const targets = [];
  for (const [sectionIndex, section] of resume.sections.entries()) {
    if (!section || section.visible === false || !['summary', 'work', 'project', 'skills'].includes(section.type)) continue;
    if (!Array.isArray(section.items) || section.items.length > 40) throw new Error('INVALID_RESUME');
    for (const [itemIndex, item] of section.items.entries()) {
      if (!item || typeof item !== 'object') throw new Error('INVALID_RESUME');
      const text = section.type === 'skills'
        ? (Array.isArray(item.values) ? item.values.map(plainText).filter(Boolean).join('\n') : '')
        : plainText(item.body) || (Array.isArray(item.bullets) ? item.bullets.map(plainText).join('\n') : '');
      if (!text) continue;
      if (text.length > 6000) throw new Error('RESUME_TOO_LONG');
      targets.push({ id: `s${sectionIndex}i${itemIndex}`, sectionIndex, itemIndex, type: section.type,
        label: plainText(section.label).slice(0, 120), title: plainText(item.title || item.role || item.org).slice(0, 160), text });
    }
  }
  if (!targets.length) throw new Error('EMPTY_RESUME');
  if (targets.length > 60 || JSON.stringify(targets).length > 32000) throw new Error('RESUME_TOO_LONG');
  return targets;
}

export function applyTailoring(resume, suggestions, selectedIds) {
  const targets = new Map(tailoringTargets(resume).map((target) => [target.id, target]));
  const next = structuredClone(resume);
  const seen = new Set();
  for (const suggestion of suggestions) {
    if (!selectedIds.includes(suggestion.id)) continue;
    const target = targets.get(suggestion.id);
    if (!target || seen.has(target.id) || target.text !== suggestion.before || typeof suggestion.after !== 'string' || !suggestion.after.trim()) throw new Error('STALE_RESUME');
    seen.add(target.id);
    const item = next.sections[target.sectionIndex].items[target.itemIndex];
    if (target.type === 'skills') {
      const values = suggestion.after.split('\n').map((value) => value.trim()).filter(Boolean);
      if (JSON.stringify([...values].sort()) !== JSON.stringify(target.text.split('\n').sort())) throw new Error('INVALID_SELECTION');
      item.values = values;
    } else {
      item.body = suggestion.after.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])).replace(/\r?\n/g, '<br>');
      item.bullets = [];
    }
  }
  if (!seen.size || seen.size !== new Set(selectedIds).size) throw new Error('INVALID_SELECTION');
  return next;
}
