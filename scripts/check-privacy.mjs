import { readFile, realpath } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { execFileSync } from 'node:child_process';
const path = process.argv[2];
if (!path)
  throw new Error(
    'Pass the path to the private profile JSON outside this repository.',
  );
const rel = relative(await realpath(process.cwd()), await realpath(path));
if (!rel || (rel.split(/[\\/]/)[0] !== '..' && !isAbsolute(rel)))
  throw new Error('The private profile is inside the repository.');
const profile = JSON.parse(await readFile(path, 'utf8'));
const needles = [
  profile.name,
  profile.sourceUrl ? new URL(profile.sourceUrl).pathname : null,
].filter((v) => v && v.length > 4);
const files = execFileSync(
  'git',
  ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
  { encoding: 'utf8' },
)
  .split('\0')
  .filter(Boolean);
const leaked = [];
for (const file of files) {
  const content = await readFile(resolve(file), 'utf8').catch((error) => {
    if (error.code === 'ENOENT') return ''; // Deleted tracked files are not shipped.
    throw error;
  });
  if (needles.some((n) => content.includes(n))) leaked.push(file);
}
if (leaked.length)
  throw new Error(`Personal data found in source: ${leaked.join(', ')}`);
console.log(
  `Privacy check passed: ${files.length} source files contain no profile name or profile URL.`,
);
