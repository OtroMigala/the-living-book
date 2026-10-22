/// <reference lib="dom" />
// npm run paginate — the build's pagination pass (ADR 0009), after `astro build`. Serves dist/ on
// a local port, opens /paginate/ in Firefox, which measures every chapter in both languages and
// both page classes, writes the breaks to dist/pages/breaks.json and deletes /paginate/ from dist/
// so it is never published. Exit code 1 if a page overflows, a word is lost, or the pages were
// measured in a fallback font.

import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { firefox } from '@playwright/test';
import type { BuildPass } from '../../src/pagination/build-pass.ts';
import { serve } from '../static/serve.ts';

const DIST = 'dist';
const site = await serve(DIST);

const browser = await firefox.launch();
let pass: BuildPass | undefined;
try {
  const page = await browser.newPage();
  await page.goto(`${site.url}paginate/`);
  await page.waitForFunction(() => window.__buildPass !== undefined, null, { timeout: 60_000 });
  pass = await page.evaluate(() => window.__buildPass);
} finally {
  await browser.close();
  site.close();
}
if (!pass) throw new Error('the pagination pass returned nothing');

const engine = `Firefox ${browser.version()}`;
for (const [locale, chapters] of Object.entries(pass.books)) {
  for (const [chapter, pages] of Object.entries(chapters)) {
    console.log(
      `paginate: ${locale} ${chapter}: ${pages.compact.length} compact pages, ` +
        `${pages.regular.length} regular pages`,
    );
  }
}
console.log(
  `paginate: ${engine}, ${pass.slack} px slack, font ${pass.font}, ${pass.layouts} layouts, ${pass.ms} ms in the page`,
);
for (const problem of pass.problems) console.error(`paginate: FAIL ${problem}`);

await mkdir(join(DIST, 'pages'), { recursive: true });
await writeFile(
  join(DIST, 'pages', 'breaks.json'),
  JSON.stringify({ engine, slack: pass.slack, font: pass.font, books: pass.books }),
);
await rm(join(DIST, 'paginate'), { recursive: true, force: true });
process.exitCode = pass.problems.length > 0 ? 1 : 0;
