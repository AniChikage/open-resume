import assert from 'node:assert/strict';
import test from 'node:test';
import {
  emptyJobMatchContext, jobMatchStorageKey, matchJobDescription, normalizeManualKeywords,
  parseJobMatchContext, readJobMatchContext, writeJobMatchContext,
} from '../src/lib/job-match.ts';
import { JOB_MATCH_MESSAGES } from '../src/lib/job-match-messages.ts';
import type { Resume } from '../src/types.ts';

function resume(text = ''): Resume {
  return {
    title: 'Private title React',
    profile: { name: 'Java', email: 'python@example.com', phone: 'Redis', website: 'https://docker.com', city: 'AWS', birthday: '', status: 'SQL', headline: 'Engineer', avatar: '' },
    sections: [{ id: 'skills', type: 'skills', label: 'Skills', visible: true, items: [{ id: 'skill-item', values: [text] }] }],
  };
}
const labels = (text: string) => matchJobDescription(resume(), text).keywords.map(keyword => keyword.label);

test('technical keyword boundaries distinguish Java, JavaScript, C, C++, C# and Node.js', () => {
  assert.deepEqual(labels('JavaScript'), ['JavaScript']);
  assert.deepEqual(labels('C++ and C#'), ['C++', 'C#']);
  assert.deepEqual(labels('C/C++/C# .NET Node.js'), ['Node.js', 'C++', 'C#', 'C', '.NET']);
  assert.deepEqual(labels('PostgreSQL'), ['PostgreSQL']);
  assert.deepEqual(labels('Go programming, go to the office'), ['Go']);
  assert.deepEqual(labels('go to a company'), []);
  assert.deepEqual(labels('AC BGo'), []);
  assert.deepEqual(labels('熟练React开发和JavaScript'), ['JavaScript', 'React']);
});

test('bounded attached language versions match generic requirements and keep canonical skill IDs', () => {
  const input = resume('C++17, Python3.11.2 and Java21');
  const generic = matchJobDescription(input, 'C++ and Python and Java required');
  assert.equal(generic.total, 3);
  assert.equal(generic.coverage, 100);
  assert.deepEqual(generic.keywords.map(keyword => keyword.id), ['python', 'java', 'cpp']);
  const versioned = matchJobDescription(resume('C++, Python and Java'), 'C++17 and Python3 and Java17 required');
  assert.equal(versioned.total, 3);
  assert.equal(versioned.coverage, 100);
  assert.ok(versioned.keywords.find(keyword => keyword.id === 'cpp')?.jobExcerpt?.includes('C++17'));
  assert.ok(generic.keywords.find(keyword => keyword.id === 'python')?.evidence?.text.includes('Python3.11.2'));
});

test('supported standards and language versions do not loosen language or package boundaries', () => {
  assert.deepEqual(labels('C++11, C++14, C++17, C++20, C++23, C++26'), ['C++']);
  assert.deepEqual(labels('Python2, Python3.9, Python3.11.2, Java8, Java11, Java17, Java21'), ['Python', 'Java']);
  assert.deepEqual(labels('Python3D Java17Script C++17foo C++170 Java170 Python3.111 .NET8 Node.js20 C#12'), []);
  assert.deepEqual(labels('C++17. C#. .NET. Node.js. JavaScript.'), ['JavaScript', 'Node.js', 'C++', 'C#', '.NET']);
});

test('aliases deduplicate requirements and match resume evidence with original source snippets', () => {
  const posting = 'Required: React.js, ReactJS, K8s, Amazon Web Services and PostgreSQL.';
  const result = matchJobDescription(resume('React, Kubernetes, AWS, Postgres'), posting);
  assert.equal(result.total, 4);
  assert.equal(result.coverage, 100);
  assert.equal(result.matchedCount, 4);
  const keyword = result.keywords.find(item => item.id === 'react');
  assert.equal(keyword?.evidence?.targetId, 'skill-item');
  assert.ok(keyword?.evidence?.text.includes('React'));
  assert.ok(keyword?.jobExcerpt?.includes('React.js'));
});

test('hidden sections, contact information and resume titles cannot satisfy requirements', () => {
  const input = resume();
  input.sections.push({ id: 'private', type: 'work', label: 'Private', visible: false, items: [{ id: 'secret', body: 'Java Python Docker Redis SQL AWS React' }] });
  const result = matchJobDescription(input, 'Java Python Docker Redis SQL AWS React');
  assert.equal(result.matchedCount, 0);
  assert.equal(result.coverage, 0);
  input.profile.headline = 'Python engineer';
  const updated = matchJobDescription(input, 'Python');
  assert.equal(updated.keywords[0].evidence?.targetId, 'profile');
});

test('empty or unknown posting text yields no fabricated score and ordinary words are not requirements', () => {
  assert.equal(matchJobDescription(resume(), '').coverage, null);
  assert.equal(matchJobDescription(resume(), 'We are seeking an experienced professional to join our excellent team.').total, 0);
  assert.deepEqual(normalizeManualKeywords(['the, requirements, and, 负责, 工作']), []);
});

test('ignored keywords leave the denominator and manual phrases are explicit, bounded and deduplicated', () => {
  const result = matchJobDescription(resume('React and computational fluid dynamics'), 'React and Java', {
    ignoredKeywords: ['java'], manualKeywords: ['computational fluid dynamics', 'computational fluid dynamics', 'ReactJS'],
  });
  assert.equal(result.total, 2);
  assert.equal(result.ignored.length, 1);
  assert.equal(result.coverage, 100);
  const manual = result.keywords.find(keyword => keyword.source === 'manual');
  assert.equal(manual?.label, 'computational fluid dynamics');
  assert.equal(manual?.jobExcerpt, null);
  assert.equal(normalizeManualKeywords(['a'.repeat(65)]).length, 0);
  assert.equal(normalizeManualKeywords(Array.from({ length: 25 }, (_, i) => `skill ${i}`)).length, 20);
});

test('matching recomputes from current resume, strips markup, and never mutates source data', () => {
  const input = resume('');
  input.sections.push({ id: 'work', type: 'work', label: 'Experience', visible: true, items: [{ id: 'work-item', body: '<p>Built <strong>Node.js</strong> systems.</p><p>Used C&#35; and Python.</p>' }] });
  const original = structuredClone(input);
  const options = { manualKeywords: ['machine learning'], ignoredKeywords: ['nodejs'] };
  const originalOptions = structuredClone(options);
  const before = matchJobDescription(input, 'Node.js, C# and machine learning', options);
  assert.equal(before.matchedCount, 1);
  assert.equal(before.keywords.find(keyword => keyword.id === 'csharp')?.evidence?.targetId, 'work-item');
  assert.deepEqual(input, original);
  assert.deepEqual(options, originalOptions);
  input.sections[0].items[0].values = ['machine learning'];
  assert.equal(matchJobDescription(input, 'Node.js, C# and machine learning', options).coverage, 100);
});

test('legacy fallback fields and unused item fields cannot match when they are not displayed', () => {
  const input = resume('');
  input.sections.push({ id: 'work', type: 'work', label: 'Experience', visible: true, items: [
    { id: 'work-item', body: 'Built Python systems.', bullets: ['Legacy Java'], school: 'React', values: ['Docker'] },
  ] });
  const result = matchJobDescription(input, 'Python, Java, React, Docker');
  assert.equal(result.matchedCount, 1);
  assert.equal(result.keywords.find(keyword => keyword.evidence)?.label, 'Python');
});

test('Chinese skill synonyms match English evidence without adding unrelated words', () => {
  const result = matchJobDescription(resume('data analysis, project management and communication skills'), '要求具备数据分析、项目管理和沟通能力，拥有相关工作经验。');
  assert.equal(result.total, 3);
  assert.equal(result.coverage, 100);
  assert.ok(result.keywords.every(keyword => keyword.jobExcerpt));
});

test('saved job context validates its version, types and limits and drops unknown fields', () => {
  const valid = { ...emptyJobMatchContext(), company: 'Example', jobDescription: 'React', manualKeywords: ['K8s'] };
  assert.deepEqual(parseJobMatchContext({ ...valid, secret: 'ignored' }), valid);
  assert.equal(parseJobMatchContext({ ...valid, version: 2 }), null);
  assert.equal(parseJobMatchContext({ ...valid, company: [] }), null);
  assert.equal(parseJobMatchContext({ ...valid, jobDescription: 'a'.repeat(12_001) }), null);
  assert.equal(parseJobMatchContext({ ...valid, manualKeywords: [12] }), null);
  assert.equal(parseJobMatchContext({ ...valid, ignoredKeywords: Array(151).fill('java') }), null);
  assert.notEqual(jobMatchStorageKey('resume', 'a'), jobMatchStorageKey('resume', 'b'));
  assert.notEqual(jobMatchStorageKey('a:b', 'c'), jobMatchStorageKey('b', 'c:a'));
});

test('blocked or corrupt browser storage never prevents session-only matching', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('blocked'); } });
    assert.deepEqual(readJobMatchContext('resume', 'user'), emptyJobMatchContext());
    assert.equal(writeJobMatchContext('resume', 'user', emptyJobMatchContext()), false);
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => '{broken' } });
    assert.deepEqual(readJobMatchContext('resume', 'user'), emptyJobMatchContext());
    assert.equal(matchJobDescription(resume('React'), 'React').coverage, 100);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

test('job context restores across visits and stays scoped to a resume and account', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const stored = new Map<string, string>();
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
      getItem: (key: string) => stored.get(key) ?? null,
      setItem: (key: string, value: string) => { stored.set(key, value); },
    } });
    const context = { ...emptyJobMatchContext(), company: '目标公司', jobTitle: 'Engineer', jobDescription: 'React and C++', ignoredKeywords: ['cpp'] };
    assert.equal(writeJobMatchContext('resume-1', 'user-1', context), true);
    assert.deepEqual(readJobMatchContext('resume-1', 'user-1'), context);
    assert.deepEqual(readJobMatchContext('resume-2', 'user-1'), emptyJobMatchContext());
    assert.deepEqual(readJobMatchContext('resume-1', 'user-2'), emptyJobMatchContext());
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

test('new matching interface strings cover every supported non-English language', () => {
  for (const [message, translated] of Object.entries(JOB_MATCH_MESSAGES)) {
    for (const lang of ['zh', 'zh-TW', 'ja', 'ko', 'fr', 'ru']) assert.ok(translated[lang], `${message}/${lang}`);
  }
});
