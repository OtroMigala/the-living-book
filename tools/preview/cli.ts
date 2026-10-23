// npm run check:preview — after a preview build (F06): every page in dist/preview is noindex, shows
// the preview flag and links only inside the preview; the book's page breaks are there.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { previewProblems } from './preview.ts';

const DIR = 'dist/preview';
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });

if (!existsSync(DIR)) throw new Error(`check:preview: no ${DIR}; build the preview first`);
const pages = files(DIR).filter((f) => f.endsWith('.html'));
let problems = 0;
for (const page of pages) {
  for (const p of previewProblems(readFileSync(page, 'utf8'))) {
    console.error(`${page}: ${p}`);
    problems++;
  }
}
if (!existsSync(join(DIR, 'pages', 'breaks.json'))) {
  console.error(`${DIR}/pages/breaks.json: missing (the pagination pass did not run)`);
  problems++;
}
console.log(`check:preview: ${pages.length} pages, ${problems} problem(s)`);
process.exitCode = problems > 0 ? 1 : 0;
