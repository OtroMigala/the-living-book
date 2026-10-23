// The pull's decisions (contract K02), apart from the network and the disk so they can be tested:
// which endpoint and token it reads with, when it writes a locale's snapshot, and when it keeps
// the committed one.
//
//   Contentstack unreachable, or nothing published yet → keep the committed snapshot, with a warning
//   Spanish not translated yet (English came back)     → keep the committed Spanish snapshot
//   content published but broken                       → fail the build (F04 AC1)

import { fromDelivery, REGION_HOSTS, untranslatedEntries } from '../../src/content/contentstack.ts';
import { toBook } from '../../src/content/load.ts';
import { type Book, DEFAULT_LOCALE, LOCALES, type Locale } from '../../src/content/model.ts';
import { validateBook } from '../../src/content/validate.ts';
import { ContentstackError } from './http.ts';

export interface PullDeps {
  /** GETs a URL with these headers: the JSON, or a throw when the request fails. */
  get(url: string, headers: Record<string, string>): Promise<Record<string, unknown>>;
  /** Writes a locale's snapshot. */
  write(locale: Locale, book: Book): void;
  log(message: string): void;
  warn(message: string): void;
  fail(message: string): void;
}

/** Pulls each locale's published book. Returns the number of Delivery API calls (BC4). */
export async function pullBooks(
  credentials: { apiKey: string; deliveryToken: string },
  environment: string,
  deps: PullDeps,
): Promise<number> {
  // The delivery token only: it reads published content and cannot change any.
  const headers = { api_key: credentials.apiKey, access_token: credentials.deliveryToken };
  let calls = 0;
  for (const locale of LOCALES) {
    const query = new URLSearchParams({ environment, locale, include_fallback: 'true' });
    query.append('include[]', 'chapters');
    query.append('include[]', 'credits');
    const url = `${REGION_HOSTS.delivery}/v3/content_types/book/entries?${query}`;
    let entries: unknown[];
    try {
      calls++;
      const json = await deps.get(url, headers);
      entries = Array.isArray(json.entries) ? json.entries : [];
    } catch (error) {
      const detail =
        error instanceof ContentstackError
          ? `HTTP ${error.status}, code ${String(error.code)}: ${error.message}`
          : String(error);
      deps.warn(
        `Contentstack not reachable or not seeded (${detail}); using the committed ${locale} snapshot`,
      );
      continue;
    }
    if (entries.length === 0) {
      deps.warn(
        `no published book entry in ${environment}/${locale}; using the committed snapshot`,
      );
      continue;
    }
    const untranslated = locale === DEFAULT_LOCALE ? [] : untranslatedEntries(entries[0], locale);
    if (untranslated.length > 0) {
      deps.warn(
        `${locale}: not translated in Contentstack yet (${untranslated.join(', ')}); using the committed snapshot`,
      );
      continue;
    }
    try {
      const book = toBook(fromDelivery(entries[0], locale), locale);
      const errors = validateBook(book);
      if (errors.length > 0) throw new Error(errors.join('; '));
      deps.write(locale, book);
      const blocks = book.chapters.reduce((n, c) => n + c.blocks.length, 0);
      deps.log(
        `cms:pull: ${environment}/${locale}: ${book.chapters.length} chapter(s), ${blocks} blocks, ${book.credits.length} credits`,
      );
    } catch (error) {
      deps.fail(`the ${locale} content in Contentstack is invalid: ${(error as Error).message}`);
    }
  }
  return calls;
}
