// What is published in a Contentstack environment, as a short signature (F05, ADR 0011). The
// deploy writes the signature it built from into the site (content-version.json); a scheduled
// check compares it with the signature now and starts a deploy when they differ.
//
// The signature comes from an initial sync: one call lists every published entry and asset of
// the environment, in every locale, each with the time it was published. Publishing, unpublishing
// or deleting anything changes the list, and so the signature.

import { createHash } from 'node:crypto';
import { REGION_HOSTS } from '../../src/content/contentstack.ts';

export interface SyncItem {
  type?: unknown;
  event_at?: unknown;
  content_type_uid?: unknown;
  data?: unknown;
}

/** A signature of a sync's items: the same items in any order give the same signature. */
export function signatureOf(items: SyncItem[]): string {
  const lines = items.map((item) => {
    const data = (typeof item.data === 'object' && item.data !== null ? item.data : {}) as Record<
      string,
      unknown
    >;
    return [item.type, item.content_type_uid, data.uid, data.locale, item.event_at, data._version]
      .map((v) => String(v ?? ''))
      .join('|');
  });
  return createHash('sha256').update(lines.sort().join('\n')).digest('hex').slice(0, 16);
}

export type Get = (
  url: string,
  headers: Record<string, string>,
) => Promise<Record<string, unknown>>;

/** Every item of an initial sync of an environment, following its pages (100 items each). */
export async function syncAll(
  environment: string,
  credentials: { apiKey: string; deliveryToken: string },
  get: Get,
): Promise<{ items: SyncItem[]; calls: number }> {
  const headers = { api_key: credentials.apiKey, access_token: credentials.deliveryToken };
  const items: SyncItem[] = [];
  let query = new URLSearchParams({ init: 'true', environment });
  let calls = 0;
  // A bound on the pages, so a misbehaving answer cannot spend the API budget (BC4).
  while (calls < 20) {
    calls++;
    const json = await get(`${REGION_HOSTS.delivery}/v3/stacks/sync?${query}`, headers);
    if (Array.isArray(json.items)) items.push(...(json.items as SyncItem[]));
    if (typeof json.pagination_token !== 'string') break;
    query = new URLSearchParams({ pagination_token: json.pagination_token });
  }
  return { items, calls };
}

/** A run of the Deploy workflow, as `gh run list --json status,conclusion,event,createdAt` gives it. */
export interface DeployRun {
  status: string;
  conclusion: string;
  event: string;
  createdAt: string;
}

export interface WatchFacts {
  /** The signature the site was built from; null when the site has none. */
  live: string | null;
  /** The signature of what is published now. */
  current: string;
  runs: DeployRun[];
  now: Date;
}

/**
 * Whether the scheduled check starts a deploy. Not while a deploy is queued or running (it will
 * publish the newest content anyway), and not again within an hour of a deploy it started that
 * failed: broken content fails the deploy by design, and retrying every 10 minutes would not
 * mend it.
 */
export function decide(facts: WatchFacts): { deploy: boolean; reason: string } {
  if (facts.live === facts.current) {
    return { deploy: false, reason: 'the site has the published content' };
  }
  if (facts.runs.some((run) => run.status !== 'completed')) {
    return { deploy: false, reason: 'a deploy is already queued or running' };
  }
  const started = facts.runs
    .filter((run) => run.event === 'workflow_dispatch')
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const hour = 60 * 60 * 1000;
  if (
    started?.conclusion === 'failure' &&
    facts.now.getTime() - new Date(started.createdAt).getTime() < hour
  ) {
    return { deploy: false, reason: 'the last deploy it started failed less than an hour ago' };
  }
  return {
    deploy: true,
    reason: facts.live === null ? 'the site has no content version yet' : 'the content changed',
  };
}

/**
 * Whether this check also looks at the preview environment (F06): about twice an hour, at the
 * checks that start in minutes 0–9 and 30–39 (the :07 and :37 ones, if on time), and on every run
 * started by hand. The preview has no deadline,
 * and each look costs one Delivery API call (BC4).
 */
export function previewDue(now: Date, event?: string): boolean {
  return event === 'workflow_dispatch' || now.getUTCMinutes() % 30 < 10;
}
