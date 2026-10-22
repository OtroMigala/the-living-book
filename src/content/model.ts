// The content model as the app sees it (contract K02). Contentstack's own types are mapped to
// these at build time, so no page or component depends on how the CMS stores things.
//
// Invariants from spec 03: a book has ordered chapters; a chapter has ordered blocks; a block is a
// heading or a paragraph (images later, always with alt text). Both locales have the same blocks
// in the same order, which is what lets a language switch keep the reader's place (F13).

export const LOCALES = ['en-us', 'es-419'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en-us';

/** The `lang` attribute for each locale (BCP 47: lowercase language, region as written). */
export const HTML_LANG: Record<Locale, string> = { 'en-us': 'en-US', 'es-419': 'es-419' };

export type Block = { type: 'heading'; text: string } | { type: 'paragraph'; text: string };

export interface Chapter {
  id: string;
  title: string;
  blocks: Block[];
}

export interface Credit {
  /** What is credited, e.g. "3D model" or "English text". */
  role: string;
  title: string;
  author: string;
  url: string;
  license: string;
  notes?: string;
}

export interface Book {
  locale: Locale;
  title: string;
  subtitle: string;
  description: string;
  chapters: Chapter[];
  credits: Credit[];
}
