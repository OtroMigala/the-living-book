// npm run cms:pull — fetches the published book from Contentstack's Delivery API and writes the
// snapshot the site is built from (contract K02).
//
//   no credentials (local runs, CI on pull requests)   → keep the committed snapshot
//   Contentstack unreachable, or nothing published yet → keep the committed snapshot, with a warning
//   Spanish not translated yet (English came back)     → keep the committed Spanish snapshot
//   content published but broken                       → fail the build (F04 AC1)
//
// Needs CONTENTSTACK_API_KEY and CONTENTSTACK_DELIVERY_TOKEN; CONTENTSTACK_ENVIRONMENT defaults to
// production (the preview build sets it to preview, F06).

import { writeFileSync } from 'node:fs';
import { fromDelivery, REGION_HOSTS, untranslatedEntries } from '../../src/content/contentstack.ts';
import { snapshotPath, toBook } from '../../src/content/load.ts';
import { DEFAULT_LOCALE, LOCALES } from '../../src/content/model.ts';
import { validateBook } from '../../src/content/validate.ts';
import { ContentstackError, env, request } from './http.ts';

const inActions = Boolean(process.env.GITHUB_ACTIONS);
const warn = (msg: string) => console.log(inActions ? `::warning::${msg}` : `warning: ${msg}`);
const fail = (msg: string) => {
  console.log(inActions ? `::error::${msg}` : `error: ${msg}`);
  process.exitCode = 1;
};

const credentials = env(['CONTENTSTACK_API_KEY', 'CONTENTSTACK_DELIVERY_TOKEN'] as const);
if (Array.isArray(credentials)) {
  console.log(`cms:pull: no credentials (${credentials.join(', ')}), using the committed snapshot`);
} else {
  const environment = process.env.CONTENTSTACK_ENVIRONMENT ?? 'production';
  const headers = {
    api_key: credentials.CONTENTSTACK_API_KEY,
    access_token: credentials.CONTENTSTACK_DELIVERY_TOKEN,
  };
  let calls = 0;
  for (const locale of LOCALES) {
    const query = new URLSearchParams({ environment, locale, include_fallback: 'true' });
    query.append('include[]', 'chapters');
    query.append('include[]', 'credits');
    const url = `${REGION_HOSTS.delivery}/v3/content_types/book/entries?${query}`;
    let entries: unknown[];
    try {
      calls++;
      const json = await request('GET', url, headers);
      entries = Array.isArray(json.entries) ? json.entries : [];
    } catch (error) {
      const detail =
        error instanceof ContentstackError
          ? `HTTP ${error.status}, code ${String(error.code)}: ${error.message}`
          : String(error);
      warn(
        `Contentstack not reachable or not seeded (${detail}); using the committed ${locale} snapshot`,
      );
      continue;
    }
    if (entries.length === 0) {
      warn(`no published book entry in ${environment}/${locale}; using the committed snapshot`);
      continue;
    }
    const untranslated = locale === DEFAULT_LOCALE ? [] : untranslatedEntries(entries[0], locale);
    if (untranslated.length > 0) {
      warn(
        `${locale}: not translated in Contentstack yet (${untranslated.join(', ')}); using the committed snapshot`,
      );
      continue;
    }
    try {
      const book = toBook(fromDelivery(entries[0], locale), locale);
      const errors = validateBook(book);
      if (errors.length > 0) throw new Error(errors.join('; '));
      writeFileSync(snapshotPath(locale), `${JSON.stringify(book, null, 2)}\n`);
      const blocks = book.chapters.reduce((n, c) => n + c.blocks.length, 0);
      console.log(
        `cms:pull: ${environment}/${locale}: ${book.chapters.length} chapter(s), ${blocks} blocks, ${book.credits.length} credits`,
      );
    } catch (error) {
      fail(`the ${locale} content in Contentstack is invalid: ${(error as Error).message}`);
    }
  }
  console.log(`cms:pull: ${calls} Delivery API call(s)`);
}
