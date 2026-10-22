// npm run check:secrets — scans every file tracked by git and, if it exists, the build output
// (dist/). The secrets named in SECRET_NAMES are searched for by value when the environment has
// them; the deploy workflow passes them to this step only.

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { type Finding, isTextFile, type KnownSecret, scanText } from './scan.ts';

const SECRET_NAMES = [
  'CONTENTSTACK_API_KEY',
  'CONTENTSTACK_DELIVERY_TOKEN',
  'CONTENTSTACK_MANAGEMENT_TOKEN',
];

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

// Tracked files plus new ones not yet added (but not ignored): what the next commit can contain.
const tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean);
const built = existsSync('dist') ? walk('dist') : [];
const files = [...tracked, ...built].filter(isTextFile).filter((f) => existsSync(f));

const secrets: KnownSecret[] = SECRET_NAMES.flatMap((name) => {
  const value = process.env[name];
  return value ? [{ name, value }] : [];
});

const findings: Finding[] = files.flatMap((f) => scanText(readFileSync(f, 'utf8'), f, secrets));
for (const f of findings) console.error(`${f.file}:${f.line}  ${f.rule}`);
console.log(
  `secret-scan: ${files.length} files (${built.length > 0 ? 'repository + dist' : 'repository only'}), ` +
    `${secrets.length} secret value(s) searched, ${findings.length} finding(s)`,
);
process.exitCode = findings.length > 0 ? 1 : 0;
