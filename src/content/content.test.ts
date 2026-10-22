import { describe, expect, it } from 'vitest';
import { loadBook, toBook } from './load.ts';
import type { Book } from './model.ts';
import { paragraphsFromText } from './text.ts';
import { checkParity, validateBook } from './validate.ts';

const book = (over: Partial<Book> = {}): Book => ({
  locale: 'en-us',
  title: 'T',
  subtitle: 'S',
  description: 'D',
  chapters: [{ id: 'a', title: 'A', blocks: [{ type: 'paragraph', text: 'x' }] }],
  credits: [{ role: 'Text', title: 't', author: 'a', url: 'https://example.org', license: 'PD' }],
  ...over,
});

describe('paragraphsFromText', () => {
  it('splits on blank lines, joins wrapped lines and collapses double spaces', () => {
    const text = 'One line\nwrapped.  Then more.\n\n\nSecond\r\nparagraph.\n';
    expect(paragraphsFromText(text)).toEqual(['One line wrapped. Then more.', 'Second paragraph.']);
  });
});

describe('validateBook', () => {
  it('accepts a complete book', () => {
    expect(validateBook(book())).toEqual([]);
  });

  it('reports empty fields, repeated chapter ids and empty blocks', () => {
    const errors = validateBook(
      book({
        title: ' ',
        chapters: [
          { id: 'a', title: 'A', blocks: [{ type: 'paragraph', text: '' }] },
          { id: 'a', title: '', blocks: [] },
        ],
      }),
    );
    expect(errors).toEqual([
      'en-us: title is empty',
      'en-us: chapter "a", block 1 is empty',
      'en-us: chapter id "a" is repeated',
      'en-us: chapter "a" has no title',
      'en-us: chapter "a" has no blocks',
    ]);
  });
});

describe('checkParity (K02)', () => {
  const es = (over: Partial<Book> = {}) => book({ locale: 'es-419', ...over });

  it('accepts the same structure with different text', () => {
    const spanish = es({
      chapters: [{ id: 'a', title: 'Á', blocks: [{ type: 'paragraph', text: 'equis' }] }],
    });
    expect(checkParity(book(), spanish)).toEqual([]);
  });

  it('reports a different number of blocks', () => {
    const spanish = es({
      chapters: [
        {
          id: 'a',
          title: 'A',
          blocks: [
            { type: 'paragraph', text: 'x' },
            { type: 'paragraph', text: 'y' },
          ],
        },
      ],
    });
    expect(checkParity(book(), spanish)).toEqual(['chapter "a": en-us has 1 blocks, es-419 has 2']);
  });

  it('reports different chapters', () => {
    expect(checkParity(book(), es({ chapters: [] }))).toEqual([
      'chapters differ: en-us has [a], es-419 has []',
    ]);
  });
});

describe('toBook', () => {
  it('names the path of a wrong field', () => {
    expect(() => toBook({ ...book(), chapters: [{ id: 1 }] }, 'en-us')).toThrow(
      'chapters[0].id must be a string',
    );
  });

  it('rejects a snapshot of another locale', () => {
    expect(() => toBook(book(), 'es-419')).toThrow('the snapshot says its locale is "en-us"');
  });
});

// The committed snapshot is what the site builds from: it must always be valid (F04 AC1).
describe('content/snapshot/en-us.json', () => {
  it('loads and validates', () => {
    const en = loadBook('en-us');
    expect(en.chapters.length).toBeGreaterThan(0);
    expect(en.credits.length).toBeGreaterThan(0);
  });
});

// The Spanish text is cut to Lang's paragraphs so a language switch keeps the reader's place
// (K02 AC2). This checks the real snapshots, not fixtures.
describe('content/snapshot/es-419.json', () => {
  it('loads, validates and has the same structure as the English book', () => {
    const es = loadBook('es-419');
    expect(checkParity(loadBook('en-us'), es)).toEqual([]);
  });
});

describe('checkParity on credits', () => {
  it('reports credits that differ in works or order', () => {
    const other = book({
      locale: 'es-419',
      credits: [{ role: 'x', title: 't', author: 'a', url: 'https://example.com', license: 'PD' }],
    });
    expect(checkParity(book(), other)).toEqual([
      'credits differ: en-us and es-419 must credit the same works in the same order',
    ]);
  });
});
