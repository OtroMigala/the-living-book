// npm run content:from-source — builds content/snapshot/<locale>.json from a seed file in
// content/seed/: the seed holds the book's metadata and credits; each chapter names a source text
// in assets-src/text/, which is split into paragraph blocks.
//
// This exists only until Contentstack is seeded. After that, the snapshot comes from the CMS.

import { readFileSync, writeFileSync } from 'node:fs';
import { snapshotPath, toBook } from '../../src/content/load.ts';
import type { Book, Locale } from '../../src/content/model.ts';
import { paragraphsFromText } from '../../src/content/text.ts';
import { validateBook } from '../../src/content/validate.ts';

interface SeedChapter {
  id: string;
  title: string;
  source: string;
}

const locale = (process.argv[2] ?? 'en-us') as Locale;
const seed = JSON.parse(readFileSync(`content/seed/${locale}.json`, 'utf8'));
const chapters = (seed.chapters as SeedChapter[]).map((c) => ({
  id: c.id,
  title: c.title,
  blocks: paragraphsFromText(readFileSync(c.source, 'utf8')).map((text) => ({
    type: 'paragraph' as const,
    text,
  })),
}));
const book: Book = toBook({ ...seed, chapters }, locale);
const errors = validateBook(book);
if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}
writeFileSync(snapshotPath(locale), `${JSON.stringify(book, null, 2)}\n`);
const blocks = book.chapters.reduce((n, c) => n + c.blocks.length, 0);
console.log(`content:from-source: ${locale}, ${book.chapters.length} chapter(s), ${blocks} blocks`);
