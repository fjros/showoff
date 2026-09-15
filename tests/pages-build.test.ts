import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { build } from 'vite';
import { createSnapshot, type Profile } from '../lib/model.ts';

await test('static build supports project paths and isolated application pages', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'showoff-pages-build-'));
  const variables = [
    'SHOWOFF_PROFILE_PATH',
    'SHOWOFF_APPLICATIONS_PATH',
    'SHOWOFF_PUBLICATION_GZIP_BASE64',
  ];
  const before = Object.fromEntries(
    variables.map((key) => [key, process.env[key]]),
  );
  try {
    const profile: Profile = {
      name: 'name',
      location: 'location',
      headline: 'headline',
      introduction: 'introduction',
      importedAt: '2026-01-01',
      importStatus: 'complete',
      importNotes: ['PRIVATE IMPORT'],
      evidence: ['master-only', 'selected'].map((id) => ({
        id,
        kind: 'experience',
        title: id,
        organization: 'organization',
        date: null,
        summary: `Work ${id}`,
        tags: ['skill'],
        confirmed: true,
        sourceNote: 'PRIVATE NOTE',
      })),
    };
    const snapshot = createSnapshot(profile, {
      company: 'company',
      role: 'role',
      headline: 'headline',
      introduction: 'intro',
      evidenceIds: ['selected'],
    });
    process.env.SHOWOFF_PROFILE_PATH = join(directory, 'profile.json');
    process.env.SHOWOFF_APPLICATIONS_PATH = join(
      directory,
      'applications.json',
    );
    process.env.SHOWOFF_PUBLICATION_GZIP_BASE64 = '';
    await writeFile(process.env.SHOWOFF_PROFILE_PATH, JSON.stringify(profile));
    await writeFile(
      process.env.SHOWOFF_APPLICATIONS_PATH,
      JSON.stringify([
        { id: 'published', status: 'published', ...snapshot },
        { id: 'draft', status: 'draft', ...snapshot },
      ]),
    );
    const outDir = join(directory, 'dist');
    await build({
      base: '/portfolio/',
      logLevel: 'silent',
      build: { outDir, emptyOutDir: true },
    });
    const html = await readFile(join(outDir, 'a/published/index.html'), 'utf8');
    assert.match(html, /src="\/portfolio\/assets\//);
    assert.ok(html.includes('Work selected'));
    for (const omitted of ['master-only', 'PRIVATE', 'sourceNote', 'confirmed'])
      assert.ok(!html.includes(omitted));
    await assert.rejects(readFile(join(outDir, 'a/draft/index.html')));
    const notFound = await readFile(join(outDir, '404.html'), 'utf8');
    assert.ok(!notFound.includes('Work selected'));
    assert.match(notFound, /src="\/portfolio\/assets\//);
    for (const file of await readdir(join(outDir, 'assets'))) {
      if (!file.endsWith('.js')) continue;
      const bundle = await readFile(join(outDir, 'assets', file), 'utf8');
      assert.ok(
        !bundle.includes('Work selected') &&
          !bundle.includes('Work master-only'),
      );
    }
  } finally {
    for (const key of variables) {
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key];
    }
    await rm(directory, { recursive: true, force: true });
  }
});
