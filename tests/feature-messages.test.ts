import assert from 'node:assert/strict';
import test from 'node:test';
import { translate } from '../src/lib/i18n.ts';
import { IMPORT_MESSAGES } from '../src/lib/import-messages.ts';
import { JOB_MATCH_MESSAGES } from '../src/lib/job-match-messages.ts';
import { VERSION_MESSAGES } from '../src/lib/version-messages.ts';

const languages = ['zh', 'zh-TW', 'ja', 'ko', 'fr', 'ru'];
const interpolate = (text: string, values: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key]));

for (const [feature, messages] of Object.entries({ history: VERSION_MESSAGES, importing: IMPORT_MESSAGES, matching: JOB_MATCH_MESSAGES })) {
  test(`${feature} actions and guidance are integrated into every supported non-English language`, () => {
    assert.ok(Object.keys(messages).length > 10);
    for (const [key, translations] of Object.entries(messages)) {
      const values = Object.fromEntries([...key.matchAll(/\{(\w+)\}/g)].map(([, name]) => [name, `test-${name}`]));
      for (const language of languages) {
        const expected = translations[language];
        assert.equal(typeof expected, 'string', `${feature}/${language}/${key}`);
        assert.ok(expected.trim().length > 0, `${feature}/${language}/${key}`);
        assert.equal(translate(language, key, values), interpolate(expected, values), `${feature}/${language}/${key} must use its translated message`);
      }
    }
  });
}

test('feature entry points, retention limits and keyword counts render translated labels and values', () => {
  const entryPoints = ['Version history', 'Save snapshot', 'Restore as a new resume', 'Import resume', 'Review before importing', 'Job matching', 'Continue with AI tailoring'];
  const messages = { ...VERSION_MESSAGES, ...IMPORT_MESSAGES, ...JOB_MATCH_MESSAGES };
  for (const language of languages) {
    for (const key of entryPoints) {
      assert.ok(messages[key]?.[language], `${language}/${key}`);
      assert.equal(translate(language, key), messages[key][language]);
    }
    const retention = translate(language, 'Keeps the initial version, {auto} recent automatic versions and {manual} recent snapshots. Automatic changes within one minute are grouped.', { auto: 20, manual: 30 });
    assert.match(retention, /20/);
    assert.match(retention, /30/);
    assert.doesNotMatch(retention, /\{(?:auto|manual)\}/);
    const count = translate(language, '{matched} of {total} selected keywords appear in your resume.', { matched: 3, total: 7 });
    assert.match(count, /3/);
    assert.match(count, /7/);
    assert.doesNotMatch(count, /\{(?:matched|total)\}/);
  }
});
