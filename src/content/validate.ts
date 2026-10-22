// Content checks run at build time (F04 AC1, K02 AC2). A broken book fails the build with a
// message that says where, instead of shipping an empty page or a language switch that loses
// the reader's place.

import { type Book, LOCALES } from './model.ts';

export function validateBook(book: Book): string[] {
  const errors: string[] = [];
  const where = (path: string) => `${book.locale}: ${path}`;
  if (!LOCALES.includes(book.locale)) errors.push(`unknown locale "${book.locale}"`);
  for (const field of ['title', 'subtitle', 'description'] as const) {
    if (!book[field].trim()) errors.push(where(`${field} is empty`));
  }
  if (book.chapters.length === 0) errors.push(where('the book has no chapters'));
  const ids = new Set<string>();
  book.chapters.forEach((chapter, c) => {
    if (!chapter.id.trim()) errors.push(where(`chapter ${c + 1} has no id`));
    if (ids.has(chapter.id)) errors.push(where(`chapter id "${chapter.id}" is repeated`));
    ids.add(chapter.id);
    if (!chapter.title.trim()) errors.push(where(`chapter "${chapter.id}" has no title`));
    if (chapter.blocks.length === 0) errors.push(where(`chapter "${chapter.id}" has no blocks`));
    chapter.blocks.forEach((block, b) => {
      if (!block.text.trim())
        errors.push(where(`chapter "${chapter.id}", block ${b + 1} is empty`));
    });
  });
  book.credits.forEach((credit, i) => {
    for (const field of ['role', 'title', 'author', 'url', 'license'] as const) {
      if (!credit[field].trim()) errors.push(where(`credit ${i + 1} has no ${field}`));
    }
  });
  return errors;
}

/**
 * Parity between two locales (K02): same chapters in the same order, and in each chapter the
 * same number of blocks with the same types. The text differs; the structure must not.
 */
export function checkParity(a: Book, b: Book): string[] {
  const errors: string[] = [];
  const idsA = a.chapters.map((c) => c.id).join(', ');
  const idsB = b.chapters.map((c) => c.id).join(', ');
  if (idsA !== idsB) {
    return [`chapters differ: ${a.locale} has [${idsA}], ${b.locale} has [${idsB}]`];
  }
  a.chapters.forEach((chapterA, i) => {
    const chapterB = b.chapters[i];
    if (!chapterB) return;
    const typesA = chapterA.blocks.map((x) => x.type);
    const typesB = chapterB.blocks.map((x) => x.type);
    if (typesA.length !== typesB.length) {
      errors.push(
        `chapter "${chapterA.id}": ${a.locale} has ${typesA.length} blocks, ${b.locale} has ${typesB.length}`,
      );
      return;
    }
    const first = typesA.findIndex((t, k) => t !== typesB[k]);
    if (first >= 0) {
      errors.push(
        `chapter "${chapterA.id}", block ${first + 1}: ${a.locale} has a ${typesA[first]}, ${b.locale} has a ${typesB[first]}`,
      );
    }
  });
  return errors;
}
