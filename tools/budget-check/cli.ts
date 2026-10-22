// npm run check:budgets — after `npm run build`, measures dist/ against the byte budgets that can
// be checked without a browser: BB1 (JS the home page needs for first paint) and BB6 (web fonts).
// Sizes are gzip -9, a close stand-in for what GitHub Pages sends.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipBytes, readBudgets, scriptsOf } from './budgets.ts';

const DIST = 'dist';
const BASE = '/the-living-book/';

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });

const budgets = readBudgets(readFileSync('specs/02-budget.md', 'utf8'));
const all = files(DIST);
const kb = (bytes: number) => `${(bytes / 1024).toFixed(1)} KB`;
let failures = 0;

const check = (id: string, measured: number, what: string) => {
  const budget = budgets.get(id);
  const limit = budget?.mobile;
  if (limit === null || limit === undefined) {
    console.error(`${id}: no mobile limit found in specs/02-budget.md`);
    failures++;
    return;
  }
  const ok = measured <= limit;
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${id} ${what}: ${kb(measured)} (budget ${kb(limit)})`);
};

// BB1: JavaScript referenced by the home page, inline or external.
const home = readFileSync(join(DIST, 'index.html'), 'utf8');
const { inline, external } = scriptsOf(home);
const externalBytes = external.reduce((n, src) => {
  const path = join(DIST, src.startsWith(BASE) ? src.slice(BASE.length) : src);
  return n + gzipBytes(readFileSync(path));
}, 0);
check(
  'BB1',
  inline.reduce((n, s) => n + gzipBytes(s), 0) + externalBytes,
  'entry JS of index.html',
);

// BB6: every web font in the output.
const fonts = all.filter((f) => /\.(woff2?|ttf|otf)$/i.test(f));
check(
  'BB6',
  fonts.reduce((n, f) => n + statSync(f).size, 0),
  `web fonts (${fonts.length} files)`,
);

// Report, not a budget: the size of each page, for the ledger.
for (const page of all.filter((f) => f.endsWith('.html'))) {
  console.log(`     page ${relative(DIST, page)}: ${kb(gzipBytes(readFileSync(page)))} gzip`);
}

process.exitCode = failures > 0 ? 1 : 0;
