/// <reference lib="dom" />
// npm run paginate — the build's pagination pass (ADR 0009), after `astro build`. Serves dist/ on
// a local port, opens /paginate/ in Firefox, which measures every chapter in both languages and
// both page classes, writes the breaks to dist/pages/breaks.json and deletes /paginate/ from dist/
// so it is never published. Exit code 1 if a page overflows, a word is lost, or the pages were
// measured in a fallback font.

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize } from 'node:path';
import { firefox } from '@playwright/test';
import type { BuildPass } from '../../src/pagination/build-pass.ts';

const DIST = 'dist';
const BASE = '/the-living-book/';
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.glb': 'model/gltf-binary',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

// A static server for dist/ under the site's base path, as GitHub Pages serves it.
const server = createServer(async (request, response) => {
  const path = decodeURIComponent(new URL(request.url ?? '/', 'http://x').pathname);
  if (!path.startsWith(BASE)) return response.writeHead(404).end();
  let file = normalize(join(DIST, path.slice(BASE.length)));
  if (!file.startsWith(DIST)) return response.writeHead(403).end();
  if (path.endsWith('/')) file = join(file, 'index.html');
  try {
    const body = await readFile(file);
    response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    response.end(body);
  } catch {
    response.writeHead(404).end();
  }
});
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address() as AddressInfo;

const browser = await firefox.launch();
let pass: BuildPass | undefined;
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}${BASE}paginate/`);
  await page.waitForFunction(() => window.__buildPass !== undefined, null, { timeout: 60_000 });
  pass = await page.evaluate(() => window.__buildPass);
} finally {
  await browser.close();
  server.close();
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
