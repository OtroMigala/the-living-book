import { describe, expect, it } from 'vitest';
import { loadBook } from '../content/load.ts';
import {
  type Page,
  type PageBlock,
  paginate,
  signature,
  wordsOf,
  wordsOfPages,
} from './paginate.ts';

/**
 * A fake measurer: a page of `lines` lines of `width` characters. Words wrap greedily, as browsers
 * do; a heading takes two lines; a word longer than a line breaks anywhere (CSS overflow-wrap).
 */
function fakeFits(blocks: PageBlock[], width: number, lines: number) {
  const linesOf = (page: Page) => {
    let used = 0;
    for (const piece of page) {
      const block = blocks[piece.block];
      if (!block) continue;
      if (block.type === 'heading') {
        used += 2;
        continue;
      }
      let count = 1;
      let line = 0;
      for (const word of wordsOf(block.text).slice(piece.from, piece.to)) {
        if (word.length > width) {
          if (line > 0) count++;
          count += Math.ceil(word.length / width) - 1;
          line = word.length % width || width;
        } else if (line === 0) line = word.length;
        else if (line + 1 + word.length <= width) line += 1 + word.length;
        else {
          count++;
          line = word.length;
        }
      }
      used += count;
    }
    return used;
  };
  return { fits: (page: Page) => linesOf(page) <= lines, linesOf };
}

const book = loadBook('en-us');
const chapter = book.chapters[0];
const real: PageBlock[] = chapter
  ? [{ type: 'heading', text: chapter.title, level: 2 }, ...chapter.blocks]
  : [];
const allWords = (blocks: PageBlock[]) => blocks.flatMap((b) => wordsOf(b.text));

// Several page sizes, from a phone-like page to a large one.
const SIZES: [number, number][] = [
  [20, 6],
  [36, 14],
  [60, 23],
  [90, 40],
];

describe('paginate', () => {
  for (const [width, lines] of SIZES) {
    describe(`a page of ${lines} lines of ${width} characters`, () => {
      const fake = fakeFits(real, width, lines);
      const { pages } = paginate(real, fake.fits);

      it('loses no word and repeats none, in order', () => {
        expect(wordsOfPages(real, pages)).toEqual(allWords(real));
      });

      it('overflows no page', () => {
        for (const page of pages) expect(fake.linesOf(page)).toBeLessThanOrEqual(lines);
      });

      it('fills each page before starting the next', () => {
        for (let i = 0; i + 1 < pages.length; i++) {
          const next = (pages[i + 1] as Page)[0];
          // A heading carried over with its text is the one case where a page ends early.
          if (!next || real[next.block]?.type === 'heading') continue;
          const oneMore = [
            ...(pages[i] as Page),
            { block: next.block, from: next.from, to: next.from + 1 },
          ];
          expect(fake.fits(oneMore), `page ${i + 1} could take another word`).toBe(false);
        }
      });

      it('never ends a page with a heading, except the last', () => {
        for (const page of pages.slice(0, -1)) {
          expect(real[page.at(-1)?.block ?? 0]?.type).toBe('paragraph');
        }
      });
    });
  }

  it('puts a short text on one page', () => {
    const blocks: PageBlock[] = [
      { type: 'heading', text: 'Short' },
      { type: 'paragraph', text: 'Only a few words here.' },
    ];
    expect(paginate(blocks, fakeFits(blocks, 36, 14).fits).pages).toHaveLength(1);
  });

  it('places a word longer than a line, and keeps every other word', () => {
    const long = 'x'.repeat(100);
    const blocks: PageBlock[] = [
      { type: 'paragraph', text: `before ${long} after ${'word '.repeat(40)}` },
    ];
    const fake = fakeFits(blocks, 30, 6);
    const { pages } = paginate(blocks, fake.fits);
    expect(wordsOfPages(blocks, pages)).toEqual(allWords(blocks));
    for (const page of pages) expect(fake.linesOf(page)).toBeLessThanOrEqual(6);
  });

  it('gives an empty chapter its heading and nothing else', () => {
    const blocks: PageBlock[] = [
      { type: 'heading', text: 'An empty chapter' },
      { type: 'paragraph', text: '' },
    ];
    const { pages } = paginate(blocks, fakeFits(blocks, 36, 14).fits);
    expect(pages).toEqual([[{ block: 0, from: 0, to: 3 }]]);
    expect(paginate([], () => true).pages).toEqual([]);
  });

  it('moves a heading that would end a page to the next one, with its text', () => {
    const blocks: PageBlock[] = [
      { type: 'paragraph', text: 'one two three four five six seven eight' },
      { type: 'heading', text: 'Next part' },
      { type: 'paragraph', text: 'nine ten eleven twelve' },
    ];
    // 4 lines: the first paragraph takes 2, the heading 2, the second paragraph does not fit.
    const { pages } = paginate(blocks, fakeFits(blocks, 20, 4).fits);
    expect(pages[0]?.map((p) => p.block)).toEqual([0]);
    expect(pages[1]?.[0]?.block).toBe(1);
  });

  it('asks about log2(words) layouts to split a long paragraph, not one per word', () => {
    const blocks: PageBlock[] = [{ type: 'paragraph', text: 'word '.repeat(1000) }];
    const { pages, layouts } = paginate(blocks, fakeFits(blocks, 36, 14).fits);
    // Per page: one try of the whole rest, then about log2(1000) ≈ 10 for the split.
    expect(layouts / pages.length).toBeLessThan(13);
  });

  it('signs equal breaks equally and different breaks differently', () => {
    const a = paginate(real, fakeFits(real, 36, 14).fits).pages;
    const b = paginate(real, fakeFits(real, 37, 14).fits).pages;
    expect(signature(a)).toBe(signature(structuredClone(a)));
    expect(signature(a)).not.toBe(signature(b));
  });
});
