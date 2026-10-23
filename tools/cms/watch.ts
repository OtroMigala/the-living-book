// npm run cms:watch — the scheduled check of F05 (ADR 0011). Compares what is published in
// Contentstack now (one Sync call) with what the site was built from (its content-version.json),
// and writes deploy=true to the step's output when a deploy should start. The workflow starts it.
//
// Needs CONTENTSTACK_API_KEY, CONTENTSTACK_DELIVERY_TOKEN, SITE_URL (the site's root, ending in
// "/") and DEPLOY_RUNS (`gh run list --workflow deploy.yml --json status,conclusion,event,createdAt`).

import { appendFileSync } from 'node:fs';
import { type DeployRun, decide, signatureOf, syncAll } from './content-version.ts';
import { env, request } from './http.ts';

const needed = env([
  'CONTENTSTACK_API_KEY',
  'CONTENTSTACK_DELIVERY_TOKEN',
  'SITE_URL',
  'DEPLOY_RUNS',
] as const);
if (Array.isArray(needed)) throw new Error(`cms:watch: missing ${needed.join(', ')}`);
const environment = process.env.CONTENTSTACK_ENVIRONMENT ?? 'production';

const { items, calls } = await syncAll(
  environment,
  { apiKey: needed.CONTENTSTACK_API_KEY, deliveryToken: needed.CONTENTSTACK_DELIVERY_TOKEN },
  (url, headers) => request('GET', url, headers),
);
const current = signatureOf(items);

// The CDN in front of GitHub Pages keeps files for minutes: ask for this moment's copy.
const response = await fetch(`${needed.SITE_URL}content-version.json?t=${Date.now()}`);
const live = response.ok
  ? (((await response.json()) as { signature?: string | null }).signature ?? null)
  : null;

const runs = JSON.parse(needed.DEPLOY_RUNS) as DeployRun[];
const { deploy, reason } = decide({ live, current, runs, now: new Date() });
console.log(
  `cms:watch: ${environment}: ${items.length} items, ${calls} Sync call(s); published ${current}, ` +
    `site ${live ?? 'none'}: ${deploy ? 'deploy' : 'no deploy'} (${reason})`,
);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `deploy=${deploy}\n`);
