// npm run cms:version — prints, as JSON, the signature of what is published in Contentstack's
// production environment, and with WITH_PREVIEW=true of its preview environment too (F05, F06,
// ADR 0011). The deploy runs it before pulling the content and ships the result as
// content-version.json: signed before the pull, a publish during the deploy makes the signature
// older than the site, and the next check deploys again instead of missing it. The preview's
// signature is shipped even when the preview copy could not be built, so broken preview content
// starts one deploy, not one every check.
//
// Without credentials (local runs, CI on pull requests) the signatures are null.

import { signatureOf, syncAll } from './content-version.ts';
import { env, request } from './http.ts';

const withPreview = process.env.WITH_PREVIEW === 'true';
const credentials = env(['CONTENTSTACK_API_KEY', 'CONTENTSTACK_DELIVERY_TOKEN'] as const);

async function sign(environment: string): Promise<{ signature: string | null; items?: number }> {
  if (Array.isArray(credentials)) return { signature: null };
  const { items, calls } = await syncAll(
    environment,
    {
      apiKey: credentials.CONTENTSTACK_API_KEY,
      deliveryToken: credentials.CONTENTSTACK_DELIVERY_TOKEN,
    },
    (url, headers) => request('GET', url, headers),
  );
  console.error(`cms:version: ${environment}: ${items.length} items, ${calls} Sync call(s)`);
  return { signature: signatureOf(items), items: items.length };
}

if (Array.isArray(credentials)) {
  console.error(`cms:version: no credentials (${credentials.join(', ')})`);
}
const production = await sign('production');
const version = withPreview
  ? { environment: 'production', ...production, preview: await sign('preview') }
  : { environment: 'production', ...production };
console.log(JSON.stringify(version));
