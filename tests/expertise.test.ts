import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  expertiseIndex,
  connectionRoles,
  skillMatches,
  resolveSkill,
  matchingDetail,
  orderSkills,
} from '../lib/expertise.ts';
import type { ReaderEvidence } from '../lib/reader.ts';
function entry(id: string): ReaderEvidence {
  return {
    id,
    kind: 'experience',
    title: id,
    organization: 'org',
    date: null,
    summary: 'gamma is only prose',
    tags: [],
    skills: [{ category: 'category', items: ['alpha'] }],
  };
}
await test('skill index uses explicit claims, merges labels and preserves project attribution', () => {
  const role = entry('role');
  const project = {
    ...entry('project'),
    kind: 'research' as const,
    parentId: 'role',
    skills: [{ category: 'category', items: ['Alpha', 'beta'] }],
  };
  const skills = expertiseIndex([role, project]);
  assert.equal(skills.length, 2);
  const alpha = skills.find((s) => s.label === 'alpha')!;
  assert.equal(alpha.entries.length, 2);
  assert.equal(connectionRoles(alpha, [role, project]).length, 1);
  assert.equal(connectionRoles(alpha, [role, project])[0].sources.length, 2);
  const standalone = expertiseIndex([project]);
  assert.equal(connectionRoles(standalone[0], [project])[0].role.id, 'project');
  assert.equal(
    skills.some((s) => s.label === 'gamma'),
    false,
  );
  assert.equal(skillMatches(alpha, ' ALPHA org ', 'category'), true);
  assert.equal(skillMatches(alpha, 'alpha', 'unrelated'), false);
});
await test('older snapshots fall back to their own tags without leaking education or language claims', () => {
  const old = { ...entry('old'), skills: undefined, tags: ['legacy'] };
  const excluded = { ...entry('school'), kind: 'education' as const };
  assert.deepEqual(
    expertiseIndex([old, excluded]).map((s) => s.label),
    ['legacy'],
  );
});

await test('grouped tools preserve exact attribution and can be found by their own name', () => {
  const a = entry('a');
  const b = {
    ...entry('b'),
    skills: [{ category: 'category', items: ['beta'] }],
  };
  const settings = {
    featured: ['family'],
    groups: [{ label: 'family', members: ['alpha', 'beta'] }],
  };
  const skills = expertiseIndex([a, b], settings);
  assert.equal(skills.length, 1);
  assert.deepEqual(
    skills[0].entries.map((e) => e.id),
    ['a', 'b'],
  );
  assert.equal(skillMatches(skills[0], 'beta', ''), true);
  assert.equal(resolveSkill(skills, 'BETA'), skills[0]);
  assert.deepEqual(
    connectionRoles(matchingDetail(skills[0], 'beta')!, [a, b]).map(
      (c) => c.role.id,
    ),
    ['b'],
  );
  assert.equal(matchingDetail(skills[0], 'a'), undefined);
  assert.equal(matchingDetail(skills[0], 'family'), undefined);
});

await test('featured order is data-driven and popularity counts roles, not projects', () => {
  const role = entry('role');
  const project = {
    ...entry('project'),
    parentId: 'role',
    kind: 'research' as const,
  };
  const b = {
    ...entry('b'),
    skills: [{ category: 'category', items: ['beta'] }],
  };
  const c = { ...b, id: 'c' };
  const entries = [role, project, b, c];
  const skills = expertiseIndex(entries);
  assert.deepEqual(
    orderSkills(skills, entries, ['beta', 'alpha'], 'featured').map(
      (s) => s.label,
    ),
    ['beta', 'alpha'],
  );
  assert.deepEqual(
    orderSkills(skills, entries, ['alpha'], 'featured').map((s) => s.label),
    ['alpha', 'beta'],
  );
  assert.deepEqual(
    orderSkills(skills, entries, [], 'roles').map((s) => s.label),
    ['beta', 'alpha'],
  );
  assert.deepEqual(
    orderSkills(skills, entries, [], 'alphabetical').map((s) => s.label),
    ['alpha', 'beta'],
  );
});

await test('shared members preserve group context without duplicating role claims', () => {
  const a = entry('a');
  const b = {
    ...entry('b'),
    skills: [{ category: 'category', items: ['beta'] }],
  };
  const settings = {
    featured: ['one', 'two'],
    groups: [
      { label: 'one', members: ['alpha', 'beta'] },
      { label: 'two', members: ['beta'] },
    ],
  };
  const skills = expertiseIndex([a, b], settings);
  assert.equal(skills.filter((s) => skillMatches(s, 'beta', '')).length, 2);
  for (const group of ['one', 'two']) {
    const selected = resolveSkill(skills, 'beta', group)!;
    assert.equal(selected.label, group);
    assert.deepEqual(
      connectionRoles(matchingDetail(selected, 'beta')!, [a, b]).map(
        (c) => c.role.id,
      ),
      ['b'],
    );
  }
  assert.equal(resolveSkill(skills, 'alpha', 'two')?.label, 'one');
  assert.deepEqual(
    connectionRoles(skills[0], [a, b]).map((c) => c.role.id),
    ['a', 'b'],
  );
});
