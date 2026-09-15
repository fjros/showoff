import { writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { createSnapshot, validateProfile } from '../lib/model.ts';
import { applicationId } from '../lib/publication.ts';
import { readPrivateJson } from './private-content.ts';

const [profilePath, briefPath, applicationsPath, requestedId] = process.argv
  .slice(2)
  .filter((arg) => arg !== '--publish');
if (!profilePath || !briefPath || !applicationsPath)
  throw new Error(
    'Usage: npm run application:create -- PROFILE BRIEF APPLICATIONS [id] [--publish]. All JSON files must already exist outside Git; applications starts as [].',
  );
const input = (await readPrivateJson(profilePath)) as Record<string, unknown>;
const profile = validateProfile(input.profile ?? input);
const brief = await readPrivateJson(briefPath);
const applications = await readPrivateJson(applicationsPath);
if (!Array.isArray(applications))
  throw new Error('Applications must be an array.');
const id = applicationId(requestedId ?? randomUUID());
if (applications.some((a) => a.id === id))
  throw new Error(
    'That application ID already exists; use a new ID to preserve the snapshot.',
  );
const snapshot = createSnapshot(profile, brief);
applications.push({
  id,
  ...snapshot,
  status: process.argv.includes('--publish') ? 'published' : 'draft',
  profileRevision: input.revision ?? 0,
  createdAt: new Date().toISOString(),
});
await writeFile(
  applicationsPath,
  JSON.stringify(applications, null, 2) + '\n',
  { mode: 0o600 },
);
console.log(
  `Created ${process.argv.includes('--publish') ? 'published' : 'draft'} snapshot: /a/${id}/`,
);
