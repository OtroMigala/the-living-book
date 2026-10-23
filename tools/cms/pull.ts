// npm run cms:pull — fetches the published book from Contentstack's Delivery API and writes the
// snapshot the site is built from (contract K02). The decisions are in pull-books.ts; this file
// gives them the network, the disk and the environment.
//
//   no credentials (local runs, CI on pull requests)   → keep the committed snapshot
//
// Needs CONTENTSTACK_API_KEY and CONTENTSTACK_DELIVERY_TOKEN; CONTENTSTACK_ENVIRONMENT defaults to
// production (the preview build sets it to preview, F06).

import { writeFileSync } from 'node:fs';
import { snapshotPath } from '../../src/content/load.ts';
import { env, request } from './http.ts';
import { pullBooks } from './pull-books.ts';

const inActions = Boolean(process.env.GITHUB_ACTIONS);

const credentials = env(['CONTENTSTACK_API_KEY', 'CONTENTSTACK_DELIVERY_TOKEN'] as const);
if (Array.isArray(credentials)) {
  console.log(`cms:pull: no credentials (${credentials.join(', ')}), using the committed snapshot`);
} else {
  const calls = await pullBooks(
    {
      apiKey: credentials.CONTENTSTACK_API_KEY,
      deliveryToken: credentials.CONTENTSTACK_DELIVERY_TOKEN,
    },
    process.env.CONTENTSTACK_ENVIRONMENT ?? 'production',
    {
      get: (url, headers) => request('GET', url, headers),
      write: (locale, book) =>
        writeFileSync(snapshotPath(locale), `${JSON.stringify(book, null, 2)}\n`),
      log: (message) => console.log(message),
      warn: (message) => console.log(inActions ? `::warning::${message}` : `warning: ${message}`),
      fail: (message) => {
        console.log(inActions ? `::error::${message}` : `error: ${message}`);
        process.exitCode = 1;
      },
    },
  );
  console.log(`cms:pull: ${calls} Delivery API call(s)`);
}
