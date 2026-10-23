// npm run cms:watch — the scheduled check of F05 and F06 (ADR 0011). Compares what is published in
// Contentstack now (one Sync call per environment) with what the site was built from (its
// content-version.json), and writes deploy=true to the step's output when a deploy should start.
// The workflow starts it. Production is checked every time, the preview about twice an hour.
//
// Needs CONTENTSTACK_API_KEY, CONTENTSTACK_DELIVERY_TOKEN, SITE_URL (the site's root, ending in
// "/") and DEPLOY_RUNS (`gh run list --workflow deploy.yml --json status,conclusion,event,createdAt`).

import { appendFileSync } from 'node:fs';
import { type DeployRun, decide, previewDue, signatureOf, syncAll } from './content-version.ts';
import { env, request } from './http.ts';

const needed = env([
  'CONTENTSTACK_API_KEY',
  'CONTENTSTACK_DELIVERY_TOKEN',
  'SITE_URL',
  'DEPLOY_RUNS',
] as const);
if (Array.isArray(needed)) throw new Error(`cms:watch: missing ${needed.join(', ')}`);
const credentials = {
  apiKey: needed.CONTENTSTACK_API_KEY,
  deliveryToken: needed.CONTENTSTACK_DELIVERY_TOKEN,
};
const get = (url: string, headers: Record<string, string>) => request('GET', url, headers);

// The CDN in front of GitHub Pages keeps files for minutes: ask for this moment's copy.
const response = await fetch(`${needed.SITE_URL}content-version.json?t=${Date.now()}`);
const site = response.ok
  ? ((await response.json()) as { signature?: string | null; preview?: { signature?: string } })
  : {};

const inActions = Boolean(process.env.GITHUB_ACTIONS);
const warn = (message: string) => console.log(inActions ? `::warning::${message}` : message);
const output = (deploy: boolean) => {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `deploy=${deploy}\n`);
};

// Contentstack unreachable: nothing can be compared, and a deploy would only use the committed
// content. Say so and wait for the next check.
let production: Awaited<ReturnType<typeof syncAll>>;
try {
  production = await syncAll('production', credentials, get);
} catch (error) {
  warn(`cms:watch: production could not be read (${(error as Error).message}); no deploy`);
  output(false);
  process.exit(0);
}
let live = site.signature ?? null;
let current = signatureOf(production.items);
let calls = production.calls;
// The preview is compared only when it can be read: a delivery token without the preview
// environment must not stop the checks of the public site.
let withPreview = previewDue(new Date(), process.env.GITHUB_EVENT_NAME);
if (withPreview) {
  try {
    const preview = await syncAll('preview', credentials, get);
    calls += preview.calls;
    live = live === null ? null : `${live}|${site.preview?.signature ?? 'none'}`;
    current = `${current}|${signatureOf(preview.items)}`;
  } catch (error) {
    warn(
      `cms:watch: preview could not be read (${(error as Error).message}); checked production only`,
    );
    withPreview = false;
  }
}

const runs = JSON.parse(needed.DEPLOY_RUNS) as DeployRun[];
const { deploy, reason } = decide({ live, current, runs, now: new Date() });
console.log(
  `cms:watch: production${withPreview ? ' and preview' : ''}, ${calls} Sync call(s); ` +
    `published ${current}, site ${live ?? 'none'}: ${deploy ? 'deploy' : 'no deploy'} (${reason})`,
);
output(deploy);
