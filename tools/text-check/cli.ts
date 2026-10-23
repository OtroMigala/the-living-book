// npm run check:text — F04 AC1: no passage of the book's content (both locales, as the build
// last received it from Contentstack) is written into a file under src/. Unit tests are skipped:
// they may quote the text they check, and they never ship.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { loadBook } from '../../src/content/load.ts';
import { LOCALES } from '../../src/content/model.ts';
import { findCopies, probesOf } from './text.ts';

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });

const paragraphs = LOCALES.flatMap((locale) =>
  loadBook(locale).chapters.flatMap((chapter) =>
    chapter.blocks.filter((block) => block.type === 'paragraph').map((block) => block.text),
  ),
);
const probes = probesOf(paragraphs);
const sources = files('src')
  .filter((path) => /\.(ts|astro|css|json|md|html)$/.test(path) && !/\.test\.ts$/.test(path))
  .map((path) => ({ path, text: readFileSync(path, 'utf8') }));

const copies = findCopies(sources, probes);
for (const c of copies) console.error(`${c.path}: contains the content's "${c.probe}…"`);
console.log(
  `text-check: ${probes.length} paragraph openings searched in ${sources.length} source files, ${copies.length} copied`,
);
process.exitCode = copies.length > 0 ? 1 : 0;
