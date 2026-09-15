import { execFileSync, spawnSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { loadEnv } from 'vite';
import { loadPublication } from './private-content.ts';

const repo = process.argv[2];
if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo))
  throw new Error('Pass the target GitHub repository as owner/repository.');
if (execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim())
  throw new Error('Commit the source changes before publishing.');
const localHead = execFileSync('git', ['rev-parse', 'HEAD'], {
  encoding: 'utf8',
}).trim();
const remoteHead = execFileSync(
  'gh',
  ['api', `repos/${repo}/commits/main`, '--jq', '.sha'],
  { encoding: 'utf8' },
).trim();
if (localHead !== remoteHead)
  throw new Error('Push the current source to main before publishing.');
const settings = {
  ...loadEnv('production', process.cwd(), 'SHOWOFF_'),
  ...process.env,
  SHOWOFF_REQUIRE_CONTENT: 'true',
};
const publication = await loadPublication(settings);
if (!publication) throw new Error('No publication content.');
const encoded = gzipSync(JSON.stringify(publication)).toString('base64');
if (Buffer.byteLength(encoded) > 48 * 1024)
  throw new Error(
    'Publication exceeds the GitHub secret size limit. Split or move content storage before publishing.',
  );
const secret = spawnSync(
  'gh',
  ['secret', 'set', 'SHOWOFF_PUBLICATION', '--repo', repo],
  { input: encoded, stdio: ['pipe', 'pipe', 'pipe'] },
);
if (secret.status !== 0)
  throw new Error(
    'Unable to set the publication secret. Check GitHub authentication and repository permissions.',
  );
execFileSync(
  'gh',
  ['workflow', 'run', 'pages.yml', '--repo', repo, '--ref', 'main'],
  { stdio: 'inherit' },
);
console.log(
  'Publication queued. The CV was sent as a repository secret, never committed.',
);
