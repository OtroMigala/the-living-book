// npm run bytes — after the build: the files the book's 3D view loads, with their sizes, for the
// progress line (F15 AC2), in pages/book-bytes.json. The 3D view's code is what the book's page
// reaches only through dynamic imports (loaded after the first paint), plus the model. Code is
// counted at its gzip size, close to what GitHub Pages sends; the model at its size on disk.
// The same variables as the pagination pass place it in the preview copy (F06).

import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { MODEL_PATH } from '../../src/three/contract.ts';
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
const files: Record<string, number> = {};
for (const file of all) {
  if (!first.has(file)) files[url(file)] = gzipBytes(readFileSync(file));
}
const model = join(DIST, MODEL_PATH);
files[url(model)] = statSync(model).size;

writeFileSync(join(DIST, 'pages', 'book-bytes.json'), JSON.stringify(files));
const total = Object.values(files).reduce((a, b) => a + b, 0);
console.log(
  `bytes: the 3D view loads ${Object.keys(files).length} files, ${(total / 1024).toFixed(1)} KB`,
);
