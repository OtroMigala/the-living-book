// Reads a content snapshot (content/snapshot/<locale>.json) and checks it before any page uses it.
// The snapshot is what the build last received from Contentstack (K02); until the stack is
// seeded it is generated from the source texts by `npm run content:from-source`.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Block, Book, Chapter, Credit, Locale } from './model.ts';
import { validateBook } from './validate.ts';

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, path: string): string => {
  if (typeof v !== 'string') throw new Error(`${path} must be a string`);
  return v;
};
const list = (v: unknown, path: string): unknown[] => {
  if (!Array.isArray(v)) throw new Error(`${path} must be a list`);
  return v;
};

function toBlock(v: unknown, path: string): Block {
  if (!isObject(v)) throw new Error(`${path} must be an object`);
  const text = str(v.text, `${path}.text`);
  if (v.type === 'heading' || v.type === 'paragraph') return { type: v.type, text };
  throw new Error(`${path}.type must be "heading" or "paragraph"`);
}

function toChapter(v: unknown, path: string): Chapter {
  if (!isObject(v)) throw new Error(`${path} must be an object`);
  return {
    id: str(v.id, `${path}.id`),
    title: str(v.title, `${path}.title`),
    blocks: list(v.blocks, `${path}.blocks`).map((b, i) => toBlock(b, `${path}.blocks[${i}]`)),
  };
}

function toCredit(v: unknown, path: string): Credit {
  if (!isObject(v)) throw new Error(`${path} must be an object`);
  const credit: Credit = {
    role: str(v.role, `${path}.role`),
    title: str(v.title, `${path}.title`),
    author: str(v.author, `${path}.author`),
    url: str(v.url, `${path}.url`),
    license: str(v.license, `${path}.license`),
  };
  if (v.notes !== undefined) credit.notes = str(v.notes, `${path}.notes`);
  return credit;
}

/** Checks the shape of untrusted JSON and returns a Book, or throws with the path that is wrong. */
export function toBook(data: unknown, locale: Locale): Book {
  if (!isObject(data)) throw new Error(`${locale}: the snapshot must be an object`);
  if (data.locale !== locale) {
    throw new Error(`${locale}: the snapshot says its locale is "${String(data.locale)}"`);
  }
  return {
    locale,
    title: str(data.title, 'title'),
    subtitle: str(data.subtitle, 'subtitle'),
    description: str(data.description, 'description'),
    chapters: list(data.chapters, 'chapters').map((c, i) => toChapter(c, `chapters[${i}]`)),
    credits: list(data.credits, 'credits').map((c, i) => toCredit(c, `credits[${i}]`)),
  };
}

export function snapshotPath(locale: Locale, root = process.cwd()): string {
  return join(root, 'content', 'snapshot', `${locale}.json`);
}

/** Loads and validates a locale's snapshot. Throws, failing the build, if anything is wrong. */
export function loadBook(locale: Locale, root = process.cwd()): Book {
  const book = toBook(JSON.parse(readFileSync(snapshotPath(locale, root), 'utf8')), locale);
  const errors = validateBook(book);
  if (errors.length > 0) throw new Error(`invalid content:\n  ${errors.join('\n  ')}`);
  return book;
}
