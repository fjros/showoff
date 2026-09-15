import { readFile, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { gunzipSync } from 'node:zlib';
import {
  preparePublication,
  validatePublication,
  type Publication,
} from '../lib/publication.ts';

export type ContentSettings = Record<string, string | undefined>;

export async function readPrivateJson(path: string): Promise<unknown> {
  const root = await realpath(process.cwd());
  const file = await realpath(resolve(path));
  const rel = relative(root, file);
  if (
    !rel ||
    (!rel.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) &&
      !isAbsolute(rel))
  )
    throw new Error(
      'CV content must be stored outside the repository, including symlink targets.',
    );
  return JSON.parse(await readFile(file, 'utf8'));
}

export async function loadPublication(
  settings: ContentSettings,
): Promise<Publication | null> {
  if (settings.SHOWOFF_PUBLICATION_GZIP_BASE64) {
    // Only the reader projection is stored in this publishing secret.
    return validatePublication(
      JSON.parse(
        gunzipSync(
          Buffer.from(settings.SHOWOFF_PUBLICATION_GZIP_BASE64, 'base64'),
          { maxOutputLength: 5_000_000 },
        ).toString('utf8'),
      ),
    );
  }
  if (!settings.SHOWOFF_PROFILE_PATH) {
    if (settings.SHOWOFF_REQUIRE_CONTENT === 'true')
      throw new Error('Private publication content is required.');
    return null;
  }
  const input = (await readPrivateJson(
    settings.SHOWOFF_PROFILE_PATH,
  )) as Record<string, unknown>;
  const applications = settings.SHOWOFF_APPLICATIONS_PATH
    ? await readPrivateJson(settings.SHOWOFF_APPLICATIONS_PATH)
    : [];
  return preparePublication(input.profile ?? input, applications);
}
