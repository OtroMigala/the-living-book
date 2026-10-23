// npm run cms:version — prints, as JSON, the signature of what is published in Contentstack's
// environment (F05, ADR 0011). The deploy runs it before pulling the content and puts the result
// into the site as content-version.json: signed before the pull, a publish during the deploy makes
// the signature older than the site, and the next check deploys again instead of missing it.
//
// Without credentials (local runs, CI on pull requests) the signature is null.

import { signatureOf, syncAll } from './content-version.ts';
import { env, request } from './http.ts';

const environment = process.env.CONTENTSTACK_ENVIRONMENT ?? 'production';
const credentials = env(['CONTENTSTACK_API_KEY', 'CONTENTSTACK_DELIVERY_TOKEN'] as const);
if (Array.isArray(credentials)) {
  console.error(`cms:version: no credentials (${credentials.join(', ')})`);
  console.log(JSON.stringify({ environment, signature: null }));
} else {
  const { items, calls } = await syncAll(
    environment,
    {
      apiKey: credentials.CONTENTSTACK_API_KEY,
      deliveryToken: credentials.CONTENTSTACK_DELIVERY_TOKEN,
    },
    (url, headers) => request('GET', url, headers),
  );
  const signature = signatureOf(items);
  console.error(`cms:version: ${environment}: ${items.length} items, ${calls} Sync call(s)`);
  console.log(JSON.stringify({ environment, signature, items: items.length }));
}
