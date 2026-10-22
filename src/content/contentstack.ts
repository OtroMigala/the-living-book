// Mapping between Contentstack's entries and the app's Book (contract K02). Pure functions: the
// HTTP calls live in tools/cms/. The content types are defined in cms/content-types/*.json.
//
// Shapes on the wire:
//   chapter.blocks is a Modular Blocks field: [{ paragraph: { text } }, { heading: { text } }]
//   book.chapters and book.credits are references; the Delivery API inlines the referenced
//   entries when the request asks for include[]=chapters&include[]=credits.

import type { Block, Book, Credit, Locale } from './model.ts';

export const REGION_HOSTS = {
  delivery: 'https://eu-cdn.contentstack.com',
  management: 'https://eu-api.contentstack.com',
} as const;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const asList = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** One Modular Blocks item → a Block. Unknown block types are kept, so validation names them. */
function fromModularBlock(item: unknown): unknown {
  if (!isObject(item)) return item;
  const [type, value] = Object.entries(item)[0] ?? [];
  return { type, text: isObject(value) ? value.text : undefined };
}

/**
 * A book entry from the Delivery API (with chapters and credits included) → the snapshot shape.
 * The result is untrusted until `toBook` and `validateBook` accept it.
 */
export function fromDelivery(entry: unknown, locale: Locale): unknown {
  if (!isObject(entry)) return entry;
  return {
    locale,
    title: entry.title,
    subtitle: entry.subtitle,
    description: entry.description,
    chapters: asList(entry.chapters).map((c) =>
      isObject(c)
        ? { id: c.chapter_id, title: c.title, blocks: asList(c.blocks).map(fromModularBlock) }
        : c,
    ),
    credits: asList(entry.credits).map((c) => {
      if (!isObject(c)) return c;
      const credit: Record<string, unknown> = {
        role: c.role,
        title: c.title,
        author: c.author,
        url: c.url,
        license: c.license,
      };
      if (typeof c.notes === 'string' && c.notes.trim()) credit.notes = c.notes;
      return credit;
    }),
  };
}

export interface ChapterEntry {
  title: string;
  chapter_id: string;
  blocks: Record<string, { text: string }>[];
}

export type CreditEntry = Omit<Credit, 'notes'> & { notes: string };

/** The app's blocks → Modular Blocks items for the Content Management API. */
export const toModularBlocks = (blocks: Block[]): ChapterEntry['blocks'] =>
  blocks.map((b) => ({ [b.type]: { text: b.text } }));

/** Entry payloads to seed the stack from a book. References are filled in by the seed script. */
export function toEntries(book: Book): {
  book: { title: string; subtitle: string; description: string };
  chapters: ChapterEntry[];
  credits: CreditEntry[];
} {
  return {
    book: { title: book.title, subtitle: book.subtitle, description: book.description },
    chapters: book.chapters.map((c) => ({
      title: c.title,
      chapter_id: c.id,
      blocks: toModularBlocks(c.blocks),
    })),
    credits: book.credits.map((c) => ({ ...c, notes: c.notes ?? '' })),
  };
}
