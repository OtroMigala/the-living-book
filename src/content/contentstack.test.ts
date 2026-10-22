import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromDelivery, toEntries, toModularBlocks, untranslatedEntries } from './contentstack.ts';
import { loadBook, toBook } from './load.ts';

// What the Delivery API returns for a book entry with include[]=chapters&include[]=credits,
// trimmed to the fields we read (plus some we ignore, like uid and _metadata).
const deliveryEntry = {
  uid: 'blt1',
  title: 'One Thousand and One Nights',
  subtitle: 'The frame story',
  description: 'How Scheherazade began.',
  chapters: [
    {
      uid: 'blt2',
      title: 'The Arabian Nights',
      chapter_id: 'frame-story',
      blocks: [
        { heading: { text: 'A heading', _metadata: { uid: 'cs1' } } },
        { paragraph: { text: 'In the chronicles…', _metadata: { uid: 'cs2' } } },
      ],
    },
  ],
  credits: [
    {
      uid: 'blt3',
      role: 'Text',
      title: 'The Arabian Nights Entertainments',
      author: 'Andrew Lang',
      url: 'https://www.gutenberg.org/ebooks/128',
      license: 'Public domain',
      notes: '',
    },
  ],
};

describe('fromDelivery', () => {
  it('maps a delivered entry to a valid book', () => {
    const book = toBook(fromDelivery(deliveryEntry, 'en-us'), 'en-us');
    expect(book.chapters[0]).toEqual({
      id: 'frame-story',
      title: 'The Arabian Nights',
      blocks: [
        { type: 'heading', text: 'A heading' },
        { type: 'paragraph', text: 'In the chronicles…' },
      ],
    });
    expect(book.credits[0]).not.toHaveProperty('notes'); // empty notes are dropped
  });

  it('lets validation reject an unknown block type instead of dropping it', () => {
    const entry = structuredClone(deliveryEntry);
    entry.chapters[0]?.blocks.push({ quote: { text: 'x', _metadata: { uid: 'cs3' } } } as never);
    expect(() => toBook(fromDelivery(entry, 'en-us'), 'en-us')).toThrow(
      'chapters[0].blocks[2].type must be "heading" or "paragraph"',
    );
  });

  it('fails when references were not included (only uids came back)', () => {
    const entry = { ...deliveryEntry, chapters: [{ uid: 'blt2', _content_type_uid: 'chapter' }] };
    expect(() => toBook(fromDelivery(entry, 'en-us'), 'en-us')).toThrow('chapters[0].id');
  });
});

describe('toEntries', () => {
  it('turns blocks into Modular Blocks items and back without loss', () => {
    const book = loadBook('en-us');
    const entries = toEntries(book);
    expect(entries.chapters[0]?.blocks[0]).toEqual({
      paragraph: { text: book.chapters[0]?.blocks[0]?.text },
    });
    const roundTrip = toBook(
      fromDelivery(
        { ...entries.book, chapters: entries.chapters, credits: entries.credits },
        'en-us',
      ),
      'en-us',
    );
    expect(roundTrip).toEqual(book);
  });

  it('writes blocks with the uids the chapter content type defines', () => {
    const chapterType = JSON.parse(readFileSync('cms/content-types/chapter.json', 'utf8'));
    const field = chapterType.schema.find((f: { uid: string }) => f.uid === 'blocks');
    const defined = field.blocks.map((b: { uid: string }) => b.uid).sort();
    const used = toModularBlocks([
      { type: 'heading', text: 'h' },
      { type: 'paragraph', text: 'p' },
    ]).flatMap((item) => Object.keys(item));
    expect(used.sort()).toEqual(defined);
  });
});

describe('untranslatedEntries', () => {
  it('lists entries that came back in another locale (Contentstack fallback)', () => {
    const entry = {
      ...deliveryEntry,
      locale: 'es-419',
      chapters: [{ ...deliveryEntry.chapters[0], locale: 'en-us' }],
      credits: [{ ...deliveryEntry.credits[0], publish_details: { locale: 'es-419' } }],
    };
    expect(untranslatedEntries(entry, 'es-419')).toEqual(['The Arabian Nights (en-us)']);
  });

  it('accepts a fully translated book', () => {
    const entry = {
      ...deliveryEntry,
      locale: 'es-419',
      chapters: deliveryEntry.chapters.map((c) => ({ ...c, locale: 'es-419' })),
      credits: deliveryEntry.credits.map((c) => ({ ...c, locale: 'es-419' })),
    };
    expect(untranslatedEntries(entry, 'es-419')).toEqual([]);
  });
});
