import { describe, expect, it } from 'vitest';
import type { Page } from '../pagination/paginate.ts';
import {
  addressOf,
  bookPages,
  type Chapter,
  CONTENTS,
  chooseLayout,
  lengthsFromPages,
  lengthsOf,
  NO_PAGE,
  pageAt,
  parseAddress,
  positionOf,
  translatePosition,
  turnFrom,
  viewOf,
} from './book.ts';

describe('chooseLayout', () => {
  it('shows the regular spread at full size where it fits (1280 × 720 less a control bar)', () => {
    expect(chooseLayout(1280, 672)).toEqual({ pageClass: 'regular', pagesPerView: 2, scale: 1 });
  });
  it('shows one compact page on a phone', () => {
    expect(chooseLayout(360, 600)).toEqual({ pageClass: 'compact', pagesPerView: 1, scale: 1 });
  });
  it('shrinks the spread a little rather than show one small page on a short wide window', () => {
    const layout = chooseLayout(1280, 620);
    expect(layout.pageClass).toBe('regular');
    expect(layout.scale).toBeCloseTo((620 - 16) / 648, 6);
  });
});

// Two chapters: three pages, then two. Each piece is [block, from, to].
const piece = (block: number, from: number, to: number) => ({ block, from, to });
const chapterPages: Page[][] = [
  [[piece(0, 0, 3), piece(1, 0, 40)], [piece(1, 40, 90)], [piece(1, 90, 100), piece(2, 0, 30)]],
  [[piece(0, 0, 2), piece(1, 0, 50)], [piece(1, 50, 80)]],
];
const pages = bookPages(chapterPages);

describe('positions and pages', () => {
  it('numbers the pages of all chapters one after the other', () => {
    expect(pages).toHaveLength(5);
    expect(positionOf(pages, 4)).toEqual({ chapter: 1, block: 0, word: 0 });
  });
  it('finds the page that holds a position, including the middle of a paragraph', () => {
    expect(pageAt(pages, { chapter: 0, block: 1, word: 60 })).toBe(2);
    expect(pageAt(pages, { chapter: 0, block: 2, word: 5 })).toBe(3);
    expect(pageAt(pages, { chapter: 1, block: 1, word: 79 })).toBe(5);
  });
  it('goes from a page to its position and back to the same page', () => {
    for (let n = 1; n <= pages.length; n++) expect(pageAt(pages, positionOf(pages, n))).toBe(n);
  });
});

describe('views and turns', () => {
  it('puts page 1 on the right of the first spread, facing the contents, then even pages on the left', () => {
    expect(viewOf(1, 2, 7)).toEqual([CONTENTS, 1]);
    expect(viewOf(CONTENTS, 2, 7)).toEqual([CONTENTS, 1]);
    expect(viewOf(3, 2, 7)).toEqual([2, 3]);
    expect(viewOf(6, 2, 7)).toEqual([6, 7]);
    expect(viewOf(5, 2, 6)).toEqual([4, 5]);
    expect(viewOf(6, 2, 6)).toEqual([6, NO_PAGE]);
  });
  it('shows the contents alone before page 1 when pages come one at a time', () => {
    expect(viewOf(CONTENTS, 1, 16)).toEqual([CONTENTS]);
    expect(viewOf(1, 1, 16)).toEqual([1]);
  });
  it('turns one view at a time and stops at both ends', () => {
    expect(turnFrom(1, 1, 2, 7)).toBe(2);
    expect(turnFrom(2, 1, 2, 7)).toBe(4);
    expect(turnFrom(7, 1, 2, 7)).toBeNull();
    expect(turnFrom(2, -1, 2, 7)).toBe(1);
    expect(turnFrom(1, -1, 2, 7)).toBeNull(); // the contents are already on the left
    expect(turnFrom(4, 1, 1, 16)).toBe(5);
    expect(turnFrom(1, -1, 1, 16)).toBe(CONTENTS);
    expect(turnFrom(CONTENTS, -1, 1, 16)).toBeNull();
    expect(turnFrom(CONTENTS, 1, 1, 16)).toBe(1);
  });
});

describe('addresses', () => {
  it('writes and reads a page and its class', () => {
    expect(parseAddress(addressOf(7, 'regular'))).toEqual({ page: 7, pageClass: 'regular' });
    expect(parseAddress(addressOf(CONTENTS, 'compact'))).toEqual({ page: 0, pageClass: 'compact' });
  });
  it('ignores an address it cannot read', () => {
    for (const hash of [
      '',
      '#',
      '#page=-1&class=regular',
      '#page=2&class=huge',
      '#b-frame-story-3',
    ]) {
      expect(parseAddress(hash)).toBeNull();
    }
  });
});

describe('translatePosition', () => {
  const english: Chapter[] = [
    { id: 'c', blocks: [{ type: 'paragraph', text: 'a b c d e f g h' }] },
  ];
  const spanish: Chapter[] = [{ id: 'c', blocks: [{ type: 'paragraph', text: 'u v w x' }] }];
  it('keeps the block and takes the word at the same fraction of it', () => {
    const at = { chapter: 0, block: 0, word: 4 };
    expect(translatePosition(at, lengthsOf(english), lengthsOf(spanish))).toEqual({
      chapter: 0,
      block: 0,
      word: 2,
    });
  });
  it("reads the blocks' lengths from the pages alone, as the other language arrives", () => {
    expect(lengthsFromPages(chapterPages)).toEqual([
      [3, 100, 30],
      [2, 80],
    ]);
  });
});
