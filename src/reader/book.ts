// The book's pages, views and addresses, without the DOM (F07, F08, F13), so they are unit-tested.
//
// Pages are numbered from 1 across the whole book. In a two-page view, as in a printed book, odd
// pages are on the right: the first view is page 1 alone on the right, then 2–3, 4–5…
//
// A place in the book is a position: chapter, block, word. Page numbers depend on the page class
// (a phone's page holds fewer words than a spread's) and, rarely, on the browser (ADR 0009); a
// position does not. So an address carries the page number and its class, and is turned into a
// position whenever the reader's own pages differ.

import { type Page, type PageBlock, wordsOf } from '../pagination/paginate.ts';
import { PAGE_CLASSES, type PageClass } from '../three/contract.ts';

/** Space kept around the pages, CSS px. */
const MARGIN = 8;
/** Below this the spread's body text would be under 14.4 px: one compact page instead. */
const MIN_SPREAD_SCALE = 0.9;

export interface ReaderLayout {
  pageClass: PageClass;
  pagesPerView: 1 | 2;
  /** Size on screen against the class size: 1 means body text at its CSS size, 16 px (F01 AC1). */
  scale: number;
}

/** The spread at the regular class where it fits at (nearly) full size; else one compact page. */
export function chooseLayout(width: number, height: number): ReaderLayout {
  const r = PAGE_CLASSES.regular;
  const spread = Math.min(
    1,
    (width - 2 * MARGIN) / (2 * r.width),
    (height - 2 * MARGIN) / r.height,
  );
  if (spread >= MIN_SPREAD_SCALE) return { pageClass: 'regular', pagesPerView: 2, scale: spread };
  const c = PAGE_CLASSES.compact;
  const single = Math.min(1, (width - 2 * MARGIN) / c.width, (height - 2 * MARGIN) / c.height);
  return { pageClass: 'compact', pagesPerView: 1, scale: single };
}

export interface Chapter {
  id: string;
  blocks: PageBlock[];
}

/** A page of the book: which chapter, and which words of its blocks. */
export interface BookPage {
  chapter: number;
  page: Page;
}

export interface Position {
  chapter: number;
  block: number;
  word: number;
}

/** All chapters' pages one after the other; each chapter starts on a new page. */
export const bookPages = (pagesByChapter: Page[][]): BookPage[] =>
  pagesByChapter.flatMap((pages, chapter) => pages.map((page) => ({ chapter, page })));

/** Where page `n` (from 1) starts. */
export function positionOf(pages: BookPage[], n: number): Position {
  const p = pages[Math.min(Math.max(n, 1), pages.length) - 1];
  const first = p?.page[0];
  return { chapter: p?.chapter ?? 0, block: first?.block ?? 0, word: first?.from ?? 0 };
}

const before = (a: Position, b: Position) =>
  a.chapter !== b.chapter
    ? a.chapter < b.chapter
    : a.block !== b.block
      ? a.block < b.block
      : a.word < b.word;

/** The page (from 1) that holds a position: the last page starting at or before it. */
export function pageAt(pages: BookPage[], at: Position): number {
  let found = 1;
  for (let i = 0; i < pages.length; i++) {
    if (before(at, positionOf(pages, i + 1))) break;
    found = i + 1;
  }
  return found;
}

/** The pages a view shows, holding page n: 0 stands for no page (before page 1 or after the end). */
export function viewOf(n: number, pagesPerView: 1 | 2, total: number): number[] {
  const page = Math.min(Math.max(n, 1), Math.max(total, 1));
  if (pagesPerView === 1) return [page];
  const left = page % 2 === 0 ? page : page - 1;
  return [left, left + 1 <= total ? left + 1 : 0];
}

/** The first page of the next or previous view, or null at either end of the book. */
export function turnFrom(n: number, step: 1 | -1, pagesPerView: 1 | 2, total: number) {
  const view = viewOf(n, pagesPerView, total).filter((p) => p > 0);
  const next = step > 0 ? Math.max(...view) + 1 : Math.min(...view) - 1;
  return next >= 1 && next <= total ? next : null;
}

/** The address of a page: `#page=7&class=regular`. */
export const addressOf = (n: number, pageClass: PageClass) => `#page=${n}&class=${pageClass}`;

export function parseAddress(hash: string): { page: number; pageClass: PageClass } | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const page = Number(params.get('page'));
  const pageClass = params.get('class');
  if (!Number.isInteger(page) || page < 1) return null;
  if (pageClass !== 'compact' && pageClass !== 'regular') return null;
  return { page, pageClass };
}

/**
 * The same place in the other language. Both have the same blocks in the same order (K02 parity),
 * so the block is the same; within it the word is taken at the same fraction of its length.
 */
export function translatePosition(at: Position, from: BlockLengths, to: BlockLengths): Position {
  const source = from[at.chapter]?.[at.block] ?? 0;
  const target = to[at.chapter]?.[at.block] ?? 0;
  const word = source > 0 ? Math.floor((at.word / source) * target) : 0;
  return { chapter: at.chapter, block: at.block, word: Math.min(word, Math.max(target - 1, 0)) };
}

/** Words in each block of each chapter: [chapter][block]. */
export type BlockLengths = number[][];

export const lengthsOf = (chapters: Chapter[]): BlockLengths =>
  chapters.map((c) => c.blocks.map((b) => wordsOf(b.text).length));

/**
 * The same, read from a chapter's pages: a block's last piece ends at its last word. This is how
 * the reader knows the other language's blocks without having its text.
 */
export function lengthsFromPages(pagesByChapter: Page[][]): BlockLengths {
  return pagesByChapter.map((pages) => {
    const lengths: number[] = [];
    for (const piece of pages.flat()) {
      lengths[piece.block] = Math.max(lengths[piece.block] ?? 0, piece.to);
    }
    return Array.from(lengths, (n) => n ?? 0);
  });
}
