// npm run check:budgets — after `npm run build`, measures dist/ against the byte budgets that can
// be checked without a browser: BB1 (JS the home page needs for first paint), BB2 (all JS of the
// 3D mode, measured on the /lab/ page until the book has its own) and BB6 (web fonts).
// Sizes are gzip -9, a close stand-in for what GitHub Pages sends.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { gzipBytes, importsOf, readBudgets, scriptsOf } from './budgets.ts';

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

/** Path in dist/ of a URL or an import specifier, relative to the file that references it. */
const resolve = (spec: string, from: string) =>
  spec.startsWith(BASE) ? join(DIST, spec.slice(BASE.length)) : join(dirname(from), spec);

/** Gzip bytes of the JavaScript a page loads: inline scripts, external ones and their imports. */
function pageJs(page: string, includeDynamic: boolean): { bytes: number; files: number } {
  const { inline, external } = scriptsOf(readFileSync(page, 'utf8'));
  const seen = new Set<string>();
  const queue = external.map((src) => resolve(src, page));
  while (queue.length > 0) {
    const file = queue.pop() ?? '';
    if (seen.has(file)) continue;
    seen.add(file);
    for (const spec of importsOf(readFileSync(file, 'utf8'), includeDynamic)) {
      queue.push(resolve(spec, file));
    }
  }
  const bytes =
    inline.reduce((n, code) => n + gzipBytes(code), 0) +
    [...seen].reduce((n, file) => n + gzipBytes(readFileSync(file)), 0);
  return { bytes, files: seen.size };
}

// BB1: what the home page needs for first paint (static imports only).
const home = pageJs(join(DIST, 'index.html'), false);
check('BB1', home.bytes, `entry JS of index.html (${home.files} file(s) + inline)`);

// BB2: everything the 3D mode loads, lazy chunks included.
const lab = pageJs(join(DIST, 'lab', 'index.html'), true);
check('BB2', lab.bytes, `3D-mode JS, measured on lab/index.html (${lab.files} file(s))`);

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
