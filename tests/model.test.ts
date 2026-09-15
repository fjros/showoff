import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSnapshot,
  safeUrl,
  validateProfile,
  type Profile,
} from '../lib/model.ts';
import { groupEntries, readerProfile } from '../lib/reader.ts';
// Structural contract values, not a bundled career or a personal-data fixture.
function profile(): Profile {
  return {
    name: 'name',
    location: 'location',
    headline: 'headline',
    introduction: 'introduction',
    sourceUrl: 'https://example.org/source',
    importedAt: '2026-01-01',
    importStatus: 'partial',
    importNotes: ['private-note'],
    evidence: ['a', 'b'].map((id) => ({
      id,
      kind: 'research',
      title: id,
      organization: 'organization',
      date: null,
      summary: 'summary',
      tags: ['tag'],
      sourceUrl: 'https://example.org/source',
      sourceNote: 'private-note',
      confirmed: false,
    })),
  };
}
const brief = {
  company: 'company',
  role: 'role',
  headline: 'opening',
  introduction: 'introduction',
  evidenceIds: ['b'],
};
await test('rejects active and credential-bearing source URLs', () => {
  for (const value of [
    'javascript:alert(1)',
    'data:text/html,x',
    'http://example.org',
    'https://user:pass@example.org',
  ])
    assert.throws(() => safeUrl(value));
});
await test('rejects duplicate evidence IDs and missing review status', () => {
  const p = profile();
  p.evidence[1].id = 'a';
  assert.throws(() => validateProfile(p));
  assert.throws(() =>
    validateProfile({
      ...profile(),
      evidence: [{ ...profile().evidence[0], confirmed: undefined }],
    }),
  );
});
await test('snapshots contain only selected evidence and omit private notes', () => {
  const result = createSnapshot(profile(), brief);
  assert.deepEqual(
    result.snapshot.evidence.map((e) => e.id),
    ['b'],
  );
  assert.deepEqual(result.snapshot.importNotes, []);
  assert.equal(result.snapshot.evidence[0].sourceNote, '');
});
await test('snapshot ordering is explicit and unaffected by later profile mutation', () => {
  const p = profile();
  const { snapshot } = createSnapshot(p, { ...brief, evidenceIds: ['b', 'a'] });
  p.evidence[1].tags.push('later');
  p.evidence[1].title = 'changed';
  assert.deepEqual(
    snapshot.evidence.map((e) => e.id),
    ['b', 'a'],
  );
  assert.equal(snapshot.evidence[0].title, 'b');
  assert.deepEqual(snapshot.evidence[0].tags, ['tag']);
});
await test('rejects unknown, repeated, empty selections and missing brief fields', () => {
  for (const evidenceIds of [['unknown'], ['a', 'a'], []])
    assert.throws(() => createSnapshot(profile(), { ...brief, evidenceIds }));
  assert.throws(() => createSnapshot(profile(), { ...brief, company: '' }));
});
await test('work links are optional, explicitly labelled and must be safe HTTPS URLs', () => {
  const p = profile();
  delete p.sourceUrl;
  delete p.evidence[0].sourceUrl;
  p.evidence[0].sourceNote = '';
  assert.doesNotThrow(() => validateProfile(p));
  p.evidence[0].links = [
    { label: 'Read the paper', url: 'https://example.org/paper' },
  ];
  assert.equal(validateProfile(p).evidence[0].links?.length, 1);
  for (const url of [
    'javascript:alert(1)',
    'https://user:password@example.org',
    'http://example.org',
  ]) {
    p.evidence[0].links[0].url = url;
    assert.throws(() => validateProfile(p));
  }
});
await test('reader projection removes private provenance and never invents a link', () => {
  const p = profile();
  p.evidence[1].links = [
    { label: 'Project', url: 'https://example.org/project' },
  ];
  const reader = readerProfile(p);
  for (const field of [
    'sourceUrl',
    'importNotes',
    'importStatus',
    'importedAt',
  ])
    assert.ok(!(field in reader));
  for (const e of reader.evidence) {
    for (const field of ['confirmed', 'sourceNote', 'sourceUrl'])
      assert.ok(!(field in e));
  }
  assert.deepEqual(reader.evidence[0].links, []);
  assert.deepEqual(reader.evidence[1].links, p.evidence[1].links);
});
await test('chapter narratives cannot leak unselected application content', () => {
  const p = profile();
  p.chapters = [
    {
      id: 'chapter',
      title: 'chapter',
      period: 'period',
      summary: 'summary',
      highlights: [],
      evidenceIds: ['a', 'b'],
    },
  ];
  assert.equal(validateProfile(p).chapters?.length, 1);
  assert.deepEqual(createSnapshot(p, brief).snapshot.chapters, []);
  const snapshot = createSnapshot(p, {
    ...brief,
    evidenceIds: ['a', 'b'],
  }).snapshot;
  assert.equal(snapshot.chapters?.length, 1);
  p.chapters[0].title = 'later';
  assert.equal(snapshot.chapters?.[0].title, 'chapter');
  p.chapters[0].evidenceIds.push('missing');
  assert.throws(() => validateProfile(p));
});

await test('projects belong to existing experience roles and render only within that role', () => {
  const p = profile();
  p.evidence[0].kind = 'experience';
  p.evidence[1].parentId = 'a';
  const entries = readerProfile(validateProfile(p)).evidence;
  const groups = groupEntries(entries);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].entry.id, 'a');
  assert.deepEqual(
    groups[0].projects.map((e) => e.id),
    ['b'],
  );
  assert.equal(groupEntries([entries[1]])[0].entry.id, 'b');
  for (const parentId of ['missing', 'b']) {
    p.evidence[1].parentId = parentId;
    assert.throws(() => validateProfile(p));
  }
  p.evidence[1].parentId = 'a';
  p.evidence[0].kind = 'research';
  assert.throws(() => validateProfile(p));
});

await test('a tailored project stays readable without exposing an omitted parent', () => {
  const p = profile();
  p.evidence[0].kind = 'experience';
  p.evidence[1].parentId = 'a';
  const selected = createSnapshot(p, brief).snapshot;
  assert.equal(selected.evidence.length, 1);
  assert.equal(selected.evidence[0].parentId, undefined);
  assert.doesNotThrow(() => validateProfile(selected));
  const together = createSnapshot(p, {
    ...brief,
    evidenceIds: ['a', 'b'],
  }).snapshot;
  assert.equal(together.evidence[1].parentId, 'a');
});

await test('structured skills validate, survive reader projection and stay scoped to snapshots', () => {
  const p = profile();
  p.evidence[0].skills = [{ category: 'category', items: ['alpha', 'beta'] }];
  p.evidence[1].skills = [{ category: 'category', items: ['gamma'] }];
  assert.deepEqual(
    readerProfile(validateProfile(p)).evidence[0].skills,
    p.evidence[0].skills,
  );
  const selected = readerProfile(createSnapshot(p, brief).snapshot);
  assert.deepEqual(selected.evidence[0].skills?.[0].items, ['gamma']);
  p.evidence[1].skills[0].items.push('later');
  assert.deepEqual(selected.evidence[0].skills?.[0].items, ['gamma']);
  for (const skills of [
    [{ category: '', items: ['a'] }],
    [{ category: 'c', items: [] }],
    [{ category: 'c', items: ['a', 'A'] }],
  ]) {
    assert.throws(() =>
      validateProfile({ ...p, evidence: [{ ...p.evidence[0], skills }] }),
    );
  }
});

await test('private map settings validate references and scope themselves to an application', () => {
  const p = profile();
  p.evidence[0].skills = [{ category: 'category', items: ['alpha'] }];
  p.evidence[1].skills = [{ category: 'category', items: ['beta'] }];
  p.skillMap = {
    featured: ['family'],
    groups: [{ label: 'family', members: ['alpha', 'beta'] }],
  };
  assert.deepEqual(validateProfile(p).skillMap, p.skillMap);
  assert.deepEqual(readerProfile(p).skillMap, p.skillMap);
  const { snapshot } = createSnapshot(p, brief);
  assert.deepEqual(snapshot.skillMap, {
    featured: ['family'],
    groups: [{ label: 'family', members: ['beta'] }],
  });
  p.skillMap.groups[0].members.push('unknown');
  assert.deepEqual(snapshot.skillMap?.groups[0].members, ['beta']);
  assert.throws(() => validateProfile(p), /listed skills/);
  p.skillMap = { featured: ['unknown'], groups: [] };
  assert.throws(() => validateProfile(p), /Featured skills/);
  p.skillMap = {
    featured: [],
    groups: [
      { label: 'one', members: ['alpha'] },
      { label: 'two', members: ['alpha'] },
    ],
  };
  assert.deepEqual(validateProfile(p).skillMap, p.skillMap);
  const scoped = createSnapshot(p, { ...brief, evidenceIds: ['a'] }).snapshot;
  assert.equal(scoped.skillMap?.groups.length, 2);
  assert.deepEqual(createSnapshot(p, brief).snapshot.skillMap?.groups, []);
  p.skillMap.groups[0].members.push('Alpha');
  assert.throws(() => validateProfile(p), /Duplicate skill map label/);
  p.skillMap = { featured: ['alpha'], groups: [] };
  assert.deepEqual(createSnapshot(p, brief).snapshot.skillMap, {
    featured: [],
    groups: [],
  });
});

await test('chapter skill highlights are explicit, scoped, and preserved in snapshots', () => {
  const p = profile();
  p.evidence[0].skills = [{ category: 'category', items: ['alpha', 'beta'] }];
  p.evidence[1].skills = [{ category: 'category', items: ['gamma'] }];
  p.chapters = [
    {
      id: 'chapter',
      title: 'chapter',
      period: 'period',
      summary: 'summary',
      highlights: [],
      evidenceIds: ['a'],
      featuredSkills: ['beta'],
    },
  ];
  const valid = validateProfile(p);
  assert.deepEqual(readerProfile(valid).chapters[0].featuredSkills, ['beta']);
  assert.deepEqual(
    createSnapshot(valid, { ...brief, evidenceIds: ['a'] }).snapshot
      .chapters?.[0].featuredSkills,
    ['beta'],
  );
  assert.deepEqual(createSnapshot(valid, brief).snapshot.chapters, []);
  p.chapters[0].featuredSkills = ['gamma'];
  assert.throws(() => validateProfile(p), /in that chapter/);
  p.chapters[0].featuredSkills = ['alpha', 'Alpha'];
  assert.throws(() => validateProfile(p), /distinct skills/);
  p.chapters[0].featuredSkills = [];
  assert.deepEqual(validateProfile(p).chapters?.[0].featuredSkills, []);
});
