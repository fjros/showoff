import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import {
  applicationId,
  pageHtml,
  preparePublication,
} from '../lib/publication.ts';
import { createSnapshot, type Profile } from '../lib/model.ts';
import { validatePublication } from '../lib/publication.ts';
import {
  loadPublication,
  readPrivateJson,
} from '../scripts/private-content.ts';

function profile(): Profile {
  return {
    name: 'name',
    location: 'location',
    headline: 'headline',
    introduction: 'introduction',
    importedAt: '2026-01-01',
    importStatus: 'complete',
    importNotes: ['PRIVATE IMPORT'],
    sourceUrl: 'https://example.org/private',
    evidence: ['a', 'b'].map((id) => ({
      id,
      kind: 'experience',
      title: id,
      organization: 'organization',
      date: null,
      summary: `Work ${id}`,
      tags: ['skill'],
      confirmed: true,
      sourceNote: 'PRIVATE NOTE',
      sourceUrl: 'https://example.org/private',
      links: [{ label: 'Work', url: 'https://example.org/work' }],
    })),
  };
}
await test('application-only showcase survives publication transport without leaking to home', () => {
  const snapshot = profile();
  snapshot.showcase = {
    placement: 'after-story',
    eyebrow: 'Project',
    title: 'Example',
    summary: 'Summary',
    technologies: [],
    demoUrl: 'https://example.org/demo',
    repositoryUrl: 'https://example.org/code',
    engineeringUrl: 'https://example.org/design',
    video: {
      url: 'https://example.org/film.mp4',
      posterUrl: 'https://example.org/poster.png',
      captionsUrl: 'https://example.org/en.vtt',
      transcriptUrl: 'https://example.org/transcript',
      label: 'Walkthrough',
    },
    scenarios: [
      {
        title: 'Retry',
        description: 'Summary',
        url: 'https://example.org/#retry',
      },
    ],
  };
  const publication = validatePublication(
    preparePublication(profile(), [
      {
        id: 'demo',
        status: 'published',
        company: 'Company',
        role: 'Role',
        snapshot,
      },
    ]),
  );
  assert.equal(publication.home.profile.showcase, undefined);
  assert.deepEqual(
    publication.applications[0].page.profile.showcase,
    snapshot.showcase,
  );
});

await test('publishes only approved snapshots and excludes private provenance', () => {
  const p = profile();
  const selected = createSnapshot(p, {
    company: 'company',
    role: 'role',
    evidenceIds: ['b'],
    headline: 'opening',
    introduction: 'intro',
  });
  const result = preparePublication(p, [
    { id: 'selected', status: 'published', ...selected },
    { id: 'draft', status: 'draft', snapshot: p },
  ]);
  assert.deepEqual(
    result.applications.map((a) => a.id),
    ['selected'],
  );
  assert.deepEqual(
    result.applications[0].page.profile.evidence.map((e) => e.id),
    ['b'],
  );
  const serialized = JSON.stringify(result);
  for (const text of [
    'PRIVATE',
    'sourceUrl',
    'sourceNote',
    'confirmed',
    'importNotes',
  ])
    assert.ok(!serialized.includes(text));
  assert.ok(serialized.includes('https://example.org/work'));
  const html = pageHtml(
    '<title>title</title><!--career-data-->',
    result.applications[0].page,
  );
  assert.ok(!html.includes('Work a'));
});

await test('embedded career text cannot break out of its JSON script or title', () => {
  const p = profile();
  p.name = '</title><script>alert(1)</script>';
  p.introduction = '</script><img src=x onerror=alert(1)>\u2028';
  const page = preparePublication(p).home;
  const html = pageHtml('<title>title</title><!--career-data-->', page);
  assert.equal((html.match(/<script/g) ?? []).length, 1);
  assert.ok(!html.includes('<img'));
  const data = html.match(/type="application\/json">(.*?)<\/script>/s)![1];
  assert.deepEqual(JSON.parse(data), page);
});

await test('rejects unsafe and duplicate application paths', () => {
  for (const id of [
    '../escape',
    '/absolute',
    'a/b',
    '%2f',
    '.',
    '',
    'a?x',
    'a#x',
  ])
    assert.throws(() => applicationId(id));
  assert.equal(applicationId('company-2026'), 'company-2026');
  const application = {
    id: 'same',
    status: 'published',
    company: 'company',
    role: 'role',
    snapshot: profile(),
  };
  assert.throws(
    () => preparePublication(profile(), [application, application]),
    /unique/,
  );
});

await test('private file loading rejects repo files even via an outside symlink', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'showoff-content-'));
  try {
    const link = join(directory, 'link.json');
    await symlink(join(process.cwd(), 'package.json'), link);
    await assert.rejects(readPrivateJson(link), /outside/);
    const path = join(directory, 'profile.json');
    await writeFile(path, JSON.stringify(profile()));
    const content = await loadPublication({ SHOWOFF_PROFILE_PATH: path });
    assert.equal(content?.home.profile.name, 'name');
    const compressed = gzipSync(JSON.stringify(content)).toString('base64');
    assert.deepEqual(
      await loadPublication({ SHOWOFF_PUBLICATION_GZIP_BASE64: compressed }),
      content,
    );
    await assert.rejects(
      loadPublication({ SHOWOFF_REQUIRE_CONTENT: 'true' }),
      /required/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
