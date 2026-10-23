// npm run bytes — after the build: the files the book's 3D view loads, with their sizes, for the
// progress line (F15 AC2), in pages/book-bytes.json, one list per quality tier, since each tier
// loads its own model. The 3D view's code is what the book's page reaches only through dynamic
// imports (loaded after the first paint), plus the model. Code is counted at its gzip size, close
// to what GitHub Pages sends; the model at its size on disk.
// The same variables as the pagination pass place it in the preview copy (F06).

import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { MODEL_PATHS } from '../../src/three/contract.ts';
import type { Tier } from '../../src/three/tiers.ts';
import { gzipBytes, importsOf, scriptsOf } from '../budget-check/budgets.ts';

const DIST = process.env.OUT_DIR ?? 'dist';
const BASE = `${process.env.SITE_BASE ?? '/the-living-book'}/`;

/** dist/ path of a URL or an import specifier, relative to the file that names it. */
const resolve = (spec: string, from: string) =>
  spec.startsWith(BASE) ? join(DIST, spec.slice(BASE.length)) : join(dirname(from), spec);

/** Every JavaScript file a page reaches, by static imports only or by dynamic ones too. */
function reach(page: string, includeDynamic: boolean): Set<string> {
  const seen = new Set<string>();
  const queue = scriptsOf(readFileSync(page, 'utf8')).external.map((src) => resolve(src, page));
  while (queue.length > 0) {
    const file = queue.pop() ?? '';
    if (seen.has(file)) continue;
    seen.add(file);
    for (const spec of importsOf(readFileSync(file, 'utf8'), includeDynamic)) {
      queue.push(resolve(spec, file));
    }
  }
  return seen;
}

const page = join(DIST, 'book', 'index.html');
const first = reach(page, false);
const all = reach(page, true);
const url = (file: string) => BASE + relative(DIST, file).split('\\').join('/');
const code: Record<string, number> = {};
for (const file of all) {
  if (!first.has(file)) code[url(file)] = gzipBytes(readFileSync(file));
}
const listing = {} as Record<Tier, Record<string, number>>;
for (const [tier, path] of Object.entries(MODEL_PATHS) as [Tier, string][]) {
  const model = join(DIST, path);
  listing[tier] = { ...code, [url(model)]: statSync(model).size };
}

writeFileSync(join(DIST, 'pages', 'book-bytes.json'), JSON.stringify(listing));
for (const [tier, files] of Object.entries(listing)) {
  const total = Object.values(files).reduce((a, b) => a + b, 0);
  console.log(
    `bytes: the 3D view loads ${Object.keys(files).length} files, ${(total / 1024).toFixed(1)} KB (${tier})`,
  );
}
