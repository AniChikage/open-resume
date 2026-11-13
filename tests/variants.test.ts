import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createApp } from '../server/app.ts';
import { DEFAULT_SETTINGS } from '../src/data.ts';
import { isEditorDocument, isResume, isResumeItem, isVariants } from '../src/lib/validation.ts';
import { resolveResume } from '../src/lib/variants.ts';
import type { Resume, Variants } from '../src/types.ts';

// A small English resume with named versions, two presets and a French translation.
function fixture(): Resume {
  return {
    title: 'Fixture',
    profile: { name: 'Ada Example', email: 'ada@example.com', phone: '', website: '', city: 'London', birthday: '', status: 'Open to work', headline: 'Backend engineer', avatar: '' },
    sections: [
      { id: 'work', type: 'work', label: 'Experience', visible: true, items: [
        { id: 'job-1', org: 'Acme', role: 'Senior engineer', startDate: '2020-01', current: true, bullets: ['Built the billing platform', 'Mentored four engineers'], versions: [
          { id: 'short', name: 'Short', content: { bullets: ['Built the billing platform'] } },
          { id: 'infra', name: 'Infrastructure focus', content: { bullets: ['Cut cloud costs by 30%'], description: 'Infrastructure work' } },
        ] },
        { id: 'job-2', org: 'Globex', role: 'Engineer', period: '2017 - 2020', bullets: ['Maintained the API'] },
      ] },
      { id: 'awards', type: 'awards', label: 'Awards', visible: true, items: [{ id: 'award-1', title: 'Best team', meta: '2022' }] },
      { id: 'private', type: 'custom', label: 'Private', visible: false, items: [{ id: 'private-1', body: 'Not shown' }] },
    ],
    variants: {
      v: 1,
      sourceLocale: 'en',
      presets: [
        { id: 'p-short', name: 'Short', items: { 'job-1': { version: 'short' }, 'job-2': { hidden: true } }, sections: { awards: { hidden: true } } },
        { id: 'p-infra', name: 'Infrastructure', items: { 'job-1': { version: 'infra' } } },
      ],
      translations: {
        fr: {
          profile: { headline: 'Ingénieur backend', city: 'Londres', status: 'Disponible' },
          sections: { work: { label: 'Expérience' }, awards: { label: 'Distinctions' } },
          items: {
            'job-1': { base: { role: 'Ingénieur senior', bullets: ['Conception de la plateforme de facturation', 'Mentorat de quatre ingénieurs'] }, versions: { short: { bullets: ['Conception de la plateforme de facturation'] } } },
            'job-2': { base: { role: 'Ingénieur', period: '2017 - 2020', bullets: ['Maintenance de l’API'] } },
            'award-1': { same: true },
          },
        },
      },
    },
  };
}
const withoutVariants = (resume: Resume): Resume => { const copy = structuredClone(resume); delete copy.variants; return copy; };
const workItems = (resume: Resume) => resume.sections.find(section => section.id === 'work')!.items;

test('a resume without variants resolves to itself', () => {
  const resume = withoutVariants(fixture());
  for (const section of resume.sections) for (const item of section.items) delete item.versions;
  const resolved = resolveResume(resume);
  assert.deepEqual(resolved.resume, resume);
  assert.deepEqual(resolved.missing, []);
  assert.equal(resolved.locale, 'en');
});

test('content stays in its source language, whichever language that is', () => {
  const english = resolveResume(fixture());
  assert.equal(english.locale, 'en');
  assert.deepEqual(english.missing, []);
  assert.equal(english.resume.profile.headline, 'Backend engineer');

  const french = fixture();
  french.variants = { v: 1, sourceLocale: 'fr', presets: [], translations: {} };
  french.profile.headline = 'Ingénieur backend';
  const sameLanguage = resolveResume(french, { locale: 'fr' });
  assert.deepEqual(sameLanguage.missing, []);
  assert.equal(sameLanguage.resume.profile.headline, 'Ingénieur backend');
  // Asking for another language falls back to the source text and reports it.
  const other = resolveResume(french, { locale: 'en' });
  assert.equal(other.resume.profile.headline, 'Ingénieur backend');
  assert.ok(other.missing.some(entry => entry.scope === 'profile' && entry.field === 'headline'));
});

test('the stored resume is never mutated', () => {
  const resume = fixture();
  const snapshot = structuredClone(resume);
  resolveResume(resume, { presetId: 'p-short', locale: 'fr' });
  resolveResume(resume, { presetId: 'p-infra', locale: 'fr' });
  assert.deepEqual(resume, snapshot);
});

test('the resolved resume exposes no variants or versions', () => {
  const { resume } = resolveResume(fixture(), { presetId: 'p-infra' });
  assert.equal('variants' in resume, false);
  for (const item of workItems(resume)) assert.equal('versions' in item, false);
});

test('a preset hides items and sections and keeps hidden sections invisible', () => {
  const { resume } = resolveResume(fixture(), { presetId: 'p-short' });
  assert.deepEqual(workItems(resume).map(item => item.id), ['job-1']);
  assert.equal(resume.sections.find(section => section.id === 'awards')!.visible, false);
  assert.equal(resume.sections.find(section => section.id === 'private')!.visible, false);
  // Without a preset, or with an unknown one, everything is shown.
  for (const presetId of [undefined, 'does-not-exist']) {
    const all = resolveResume(fixture(), { presetId }).resume;
    assert.deepEqual(workItems(all).map(item => item.id), ['job-1', 'job-2']);
    assert.equal(all.sections.find(section => section.id === 'awards')!.visible, true);
  }
});

test('a section whose items are all hidden by the preset disappears with them', () => {
  const resume = fixture();
  resume.variants!.presets[1].items['award-1'] = { hidden: true };
  const rendered = resolveResume(resume, { presetId: 'p-infra' }).resume;
  const awards = rendered.sections.find(section => section.id === 'awards')!;
  assert.equal(awards.visible, false);
  assert.deepEqual(awards.items, []);
  // A section that was already empty in the stored resume is left as the user made it.
  const empty = fixture();
  empty.sections[1].items = [];
  assert.equal(resolveResume(empty, { presetId: 'p-infra' }).resume.sections[1].visible, true);
});

test('a named version overrides only the fields it lists and inherits the rest', () => {
  const infra = workItems(resolveResume(fixture(), { presetId: 'p-infra' }).resume)[0];
  assert.deepEqual(infra.bullets, ['Cut cloud costs by 30%']);
  assert.equal(infra.description, 'Infrastructure work');
  assert.equal(infra.role, 'Senior engineer');
  assert.equal(infra.org, 'Acme');
  const short = workItems(resolveResume(fixture(), { presetId: 'p-short' }).resume)[0];
  assert.deepEqual(short.bullets, ['Built the billing platform']);
  // A preset pointing at a version that no longer exists falls back to the default content.
  const dangling = fixture();
  dangling.variants!.presets[1].items['job-1'] = { version: 'deleted' };
  assert.deepEqual(workItems(resolveResume(dangling, { presetId: 'p-infra' }).resume)[0].bullets, ['Built the billing platform', 'Mentored four engineers']);
});

test('a version may blank a field on purpose', () => {
  const resume = fixture();
  resume.sections[0].items[0].body = 'Long description';
  resume.sections[0].items[0].versions![0].content.body = '';
  assert.equal(workItems(resolveResume(resume, { presetId: 'p-short' }).resume)[0].body, '');
  assert.equal(workItems(resolveResume(resume).resume)[0].body, 'Long description');
});

test('a complete translation replaces every written field and reports nothing', () => {
  const { resume, missing, locale } = resolveResume(fixture(), { locale: 'fr' });
  assert.equal(locale, 'fr');
  assert.deepEqual(missing, []);
  assert.equal(resume.profile.headline, 'Ingénieur backend');
  assert.equal(resume.profile.city, 'Londres');
  assert.equal(resume.sections[0].label, 'Expérience');
  const [first, second] = workItems(resume);
  assert.equal(first.role, 'Ingénieur senior');
  assert.deepEqual(first.bullets, ['Conception de la plateforme de facturation', 'Mentorat de quatre ingénieurs']);
  assert.equal(second.role, 'Ingénieur');
  // Language-neutral fields and proper nouns are untouched.
  assert.equal(first.org, 'Acme');
  assert.equal(first.startDate, '2020-01');
  assert.equal(resume.profile.name, 'Ada Example');
});

test('untranslated text falls back to the source and is reported', () => {
  const resume = fixture();
  delete resume.variants!.translations.fr.items!['job-2'];
  const resolved = resolveResume(resume, { locale: 'fr' });
  assert.equal(workItems(resolved.resume)[1].role, 'Engineer');
  const fields = resolved.missing.filter(entry => entry.itemId === 'job-2').map(entry => entry.field).sort();
  // `period` is reported because job-2 has no structured dates.
  assert.deepEqual(fields, ['bullets', 'period', 'role']);
  // An unknown locale has no translation at all, so every written field is reported.
  assert.ok(resolveResume(fixture(), { locale: 'de' }).missing.length > 0);
});

test('an item marked as needing no translation is not reported', () => {
  const resume = fixture();
  delete resume.variants!.translations.fr.items!['award-1'];
  assert.ok(resolveResume(resume, { locale: 'fr' }).missing.some(entry => entry.itemId === 'award-1' && entry.field === 'title'));
  assert.deepEqual(resolveResume(fixture(), { locale: 'fr' }).missing.filter(entry => entry.itemId === 'award-1'), []);
});

test('structured dates make the free-text period optional for translation', () => {
  const resume = fixture();
  resume.sections[0].items[0].period = '2020 - Present';
  const missing = resolveResume(resume, { locale: 'fr' }).missing;
  assert.equal(missing.some(entry => entry.itemId === 'job-1' && entry.field === 'period'), false);
});

test('version text is translated under its version and the rest under the item', () => {
  // Preset "short": the version's bullets come from the version's translation.
  const short = workItems(resolveResume(fixture(), { presetId: 'p-short', locale: 'fr' }).resume)[0];
  assert.deepEqual(short.bullets, ['Conception de la plateforme de facturation']);
  assert.equal(short.role, 'Ingénieur senior');
  // Preset "infra": that version has no translation yet, so its own fields are reported
  // with the version id, while inherited fields still use the item's translation.
  const infra = resolveResume(fixture(), { presetId: 'p-infra', locale: 'fr' });
  const item = workItems(infra.resume)[0];
  assert.equal(item.role, 'Ingénieur senior');
  assert.deepEqual(item.bullets, ['Cut cloud costs by 30%']);
  const reported = infra.missing.filter(entry => entry.itemId === 'job-1');
  assert.deepEqual(reported.map(entry => entry.field).sort(), ['bullets', 'description']);
  assert.ok(reported.every(entry => entry.versionId === 'infra'));
});

test('hidden items and sections never produce missing-translation reports', () => {
  const resume = fixture();
  delete resume.variants!.translations.fr.items!['job-2'];
  delete resume.variants!.translations.fr.sections!.awards;
  const resolved = resolveResume(resume, { presetId: 'p-short', locale: 'fr' });
  assert.equal(resolved.missing.some(entry => entry.itemId === 'job-2' || entry.sectionId === 'awards' || entry.sectionId === 'private'), false);
});

test('keys that collide with object internals are treated as plain data', () => {
  const resolved = resolveResume(fixture(), { locale: 'constructor' });
  assert.ok(resolved.missing.length > 0);
  const resume = fixture();
  resume.variants = JSON.parse('{"v":1,"sourceLocale":"en","presets":[{"id":"p","name":"P","items":{"__proto__":{"hidden":true}}}],"translations":{}}') as Variants;
  assert.doesNotThrow(() => resolveResume(resume, { presetId: 'p' }));
  assert.equal(({} as { hidden?: boolean }).hidden, undefined);
});

test('validation accepts documents with and without variants', () => {
  assert.ok(isResume(fixture()));
  assert.ok(isResume(withoutVariants(fixture())));
  assert.ok(isEditorDocument({ resume: fixture(), settings: DEFAULT_SETTINGS }));
  assert.ok(isResumeItem({ id: 'x', bullets: ['a'], versions: [{ id: 'v', name: 'V', content: { bullets: ['b'] } }] }));
});

test('validation rejects malformed variants', () => {
  const variants = () => structuredClone(fixture().variants!);
  const reject = (mutate: (value: Variants) => void, message: string) => {
    const value = variants();
    mutate(value);
    assert.equal(isVariants(value), false, message);
  };
  assert.ok(isVariants(variants()));
  reject(value => { value.sourceLocale = 'not a locale'; }, 'invalid source locale');
  reject(value => { (value as { v: number }).v = 2; }, 'unknown format version');
  reject(value => { value.presets.push({ ...value.presets[0] }); }, 'duplicate preset id');
  reject(value => { value.presets = Array.from({ length: 51 }, (_, index) => ({ id: `p${index}`, name: 'P', items: {} })); }, 'too many presets');
  reject(value => { (value.presets[0].items['job-1'] as { hidden: unknown }).hidden = 'yes'; }, 'non-boolean hidden');
  reject(value => { value.presets[0].name = ''; }, 'empty preset name');
  reject(value => { (value.translations as Record<string, unknown>)['not a locale'] = {}; }, 'invalid translation locale');
  reject(value => { (value.translations.fr.items!['job-1'].base as { bullets: unknown }).bullets = [1]; }, 'non-text bullet in a translation');
  reject(value => { (value.translations.fr.profile as { city: unknown }).city = 3; }, 'non-text profile translation');

  const resume = fixture();
  resume.sections[0].items[0].versions!.push({ id: 'short', name: 'Again', content: {} });
  assert.equal(isResume(resume), false, 'duplicate version id');
  const crowded = fixture();
  crowded.sections[0].items[0].versions = Array.from({ length: 21 }, (_, index) => ({ id: `v${index}`, name: 'V', content: {} }));
  assert.equal(isResume(crowded), false, 'too many versions');
  const badVersion = fixture();
  (badVersion.sections[0].items[0].versions![0].content as { bullets: unknown }).bullets = [1];
  assert.equal(isResume(badVersion), false, 'non-text bullet in a version');
});

test('variants survive being saved to and loaded from the server', async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), 'open-resume-variants-'));
  const app = createApp({ dataDir: dir, env: {} });
  app.listen(0, '127.0.0.1');
  await once(app, 'listening');
  t.after(async () => { app.close(); await once(app, 'close'); await rm(dir, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${(app.address() as import('node:net').AddressInfo).port}`;
  const login = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'admin' }) });
  assert.equal(login.status, 200);
  const cookie = login.headers.get('set-cookie')!.split(';')[0];
  const send = (route: string, method: string, value?: unknown) => fetch(base + route, {
    method, headers: { Cookie: cookie, ...(value === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(value === undefined ? {} : { body: JSON.stringify(value) }),
  });
  const load = async (id: string) => ((await (await send('/api/resumes', 'GET')).json()).resumes as { id: string; resume: Resume }[]).find(entry => entry.id === id)!.resume;

  const resume = fixture();
  const created = await send('/api/resumes', 'POST', { title: resume.title, resume, settings: DEFAULT_SETTINGS });
  assert.equal(created.status, 201);
  const id = (await created.json()).id as string;
  assert.deepEqual(await load(id), resume);

  const edited = structuredClone(resume);
  edited.variants!.presets.push({ id: 'p-new', name: 'New', items: { 'job-2': { hidden: true } } });
  edited.sections[0].items[1].versions = [{ id: 'v1', name: 'Version', content: { role: 'Developer' } }];
  const updated = await send(`/api/resumes/${id}`, 'PUT', { title: edited.title, resume: edited, settings: DEFAULT_SETTINGS });
  assert.equal(updated.status, 200);
  assert.deepEqual(await load(id), edited);

  // A malformed variants block is refused and leaves the stored resume unchanged.
  const broken = structuredClone(edited);
  (broken.variants as { sourceLocale: string }).sourceLocale = 'not a locale';
  const refused = await send(`/api/resumes/${id}`, 'PUT', { title: broken.title, resume: broken, settings: DEFAULT_SETTINGS });
  assert.ok(refused.status >= 400 && refused.status < 500, `unexpected status ${refused.status}`);
  assert.deepEqual(await load(id), edited);
});
