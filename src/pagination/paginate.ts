// Splits a chapter into pages (spike C). Pure: it only asks a measurer "does this page fit?", so
// it is unit-tested with a fake measurer and runs in the browser with a real one (dom.ts).
//
// Greedy, block by block: each block goes on the current page if it fits. A paragraph that does
// not fit is split at the last word that still fits, found by binary search over its words: each
// question is one layout, so a split costs about log2(words) layouts instead of one per word. A
// heading is never split and never ends a page: it moves to the next page with the text it heads.

/** A block of a chapter, as in the content model; `level` is the heading's level (2 or 3). */
export interface PageBlock {
  type: 'heading' | 'paragraph';
  text: string;
  level?: 2 | 3;
}

/** Words [from, to) of block number `block`. */
export interface Piece {
  block: number;
  from: number;
  to: number;
}

export type Page = Piece[];

export const wordsOf = (text: string) => text.split(/\s+/).filter((w) => w.length > 0);

export interface Pagination {
  pages: Page[];
  /** How many times the measurer was asked: each one is a layout in the browser. */
  layouts: number;
}

export function paginate(blocks: PageBlock[], fits: (page: Page) => boolean): Pagination {
  const lengths = blocks.map((b) => wordsOf(b.text).length);
  const isHeading = (piece: Piece | undefined) => blocks[piece?.block ?? -1]?.type === 'heading';
  let layouts = 0;
  const test = (page: Page) => {
    layouts++;
    return fits(page);
  };
  const pages: Page[] = [];
  let page: Page = [];

  /** Ends the current page. Headings at its end move on to the next page with their text. */
  const close = () => {
    let keep = page.length;
    while (keep > 0 && isHeading(page[keep - 1])) keep--;
    if (keep === 0) {
      // Nothing but headings, and the text after them does not fit even in part: keep them here,
      // or the same page would be tried forever.
      pages.push(page);
      page = [];
      return;
    }
    pages.push(page.slice(0, keep));
    page = page.slice(keep);
  };

  for (let b = 0; b < blocks.length; b++) {
    const n = lengths[b] ?? 0;
    for (let from = 0; from < n; ) {
      const whole: Piece = { block: b, from, to: n };
      if (test([...page, whole])) {
        page.push(whole);
        break;
      }
      if (blocks[b]?.type === 'paragraph') {
        // The largest `to` whose words still fit: lo always fits (or is `from`), hi never does.
        let lo = from;
        let hi = n;
        while (hi - lo > 1) {
          const mid = Math.floor((lo + hi) / 2);
          if (test([...page, { block: b, from, to: mid }])) lo = mid;
          else hi = mid;
        }
        if (lo > from) {
          page.push({ block: b, from, to: lo });
          from = lo;
        } else if (page.length === 0) {
          // Not even one word fits on an empty page (a page smaller than a line): place it anyway.
          page.push({ block: b, from, to: from + 1 });
          from += 1;
        }
      } else if (page.length === 0) {
        // A heading taller than an empty page: place it anyway, cut off, rather than loop.
        page.push(whole);
        break;
      }
      close();
    }
  }
  if (page.length > 0) pages.push(page);
  return { pages, layouts };
}

/** The words of a list of pages, in order: what a reader would read, page after page. */
export function wordsOfPages(blocks: PageBlock[], pages: Page[]): string[] {
  return pages.flatMap((page) =>
    page.flatMap((p) => wordsOf(blocks[p.block]?.text ?? '').slice(p.from, p.to)),
  );
}

/** A short hash of any JSON value (FNV-1a, 32 bits): equal values, equal hashes. */
export function hashOf(value: unknown): string {
  let hash = 0x811c9dc5;
  for (const ch of JSON.stringify(value)) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** A short signature of where the pages break: equal breaks, equal signatures. */
export const signature = (pages: Page[]): string => hashOf(pages);
