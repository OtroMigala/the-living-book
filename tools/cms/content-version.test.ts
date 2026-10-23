import { describe, expect, it } from 'vitest';
import { type DeployRun, decide, type SyncItem, signatureOf, syncAll } from './content-version.ts';

const entry = (uid: string, locale: string, at: string): SyncItem => ({
  type: 'entry_published',
  event_at: at,
  content_type_uid: 'chapter',
  data: { uid, locale, title: 'A title' },
});

describe('signatureOf', () => {
  const a = entry('blt1', 'en-us', '2026-10-23T10:00:00.000Z');
  const b = entry('blt1', 'es-419', '2026-10-23T10:00:00.000Z');

  it('does not depend on the order of the items', () => {
    expect(signatureOf([a, b])).toBe(signatureOf([b, a]));
  });

  it('changes when an entry is published again, or one is unpublished', () => {
    const republished = entry('blt1', 'en-us', '2026-10-23T11:00:00.000Z');
    expect(signatureOf([republished, b])).not.toBe(signatureOf([a, b]));
    expect(signatureOf([b])).not.toBe(signatureOf([a, b]));
  });

  it('ignores fields that do not say what is published, such as the title', () => {
    const retitled = { ...a, data: { uid: 'blt1', locale: 'en-us', title: 'Another' } };
    expect(signatureOf([retitled, b])).toBe(signatureOf([a, b]));
  });
});

describe('syncAll', () => {
  it('asks the EU delivery endpoint for an initial sync, and follows the pages', async () => {
    const urls: URL[] = [];
    const { items, calls } = await syncAll(
      'production',
      { apiKey: 'key', deliveryToken: 'token' },
      async (url, headers) => {
        expect(headers).toEqual({ api_key: 'key', access_token: 'token' });
        const parsed = new URL(url);
        urls.push(parsed);
        return parsed.searchParams.has('init')
          ? { items: [entry('a', 'en-us', 't1')], pagination_token: 'p2' }
          : { items: [entry('b', 'en-us', 't2')], sync_token: 's' };
      },
    );
    expect(calls).toBe(2);
    expect(items).toHaveLength(2);
    expect(urls[0]?.origin).toBe('https://eu-cdn.contentstack.com');
    expect(urls[0]?.pathname).toBe('/v3/stacks/sync');
    expect(urls[0]?.searchParams.get('environment')).toBe('production');
    expect(urls[1]?.searchParams.get('pagination_token')).toBe('p2');
  });

  it('stops after 20 pages whatever the answers say', async () => {
    const { calls } = await syncAll(
      'production',
      { apiKey: 'k', deliveryToken: 't' },
      async () => ({ items: [], pagination_token: 'again' }),
    );
    expect(calls).toBe(20);
  });
});

describe('decide', () => {
  const now = new Date('2026-10-23T12:00:00Z');
  const run = (over: Partial<DeployRun>): DeployRun => ({
    status: 'completed',
    conclusion: 'success',
    event: 'push',
    createdAt: '2026-10-23T09:00:00Z',
    ...over,
  });

  it('does nothing when the site has what is published', () => {
    expect(decide({ live: 'x', current: 'x', runs: [], now }).deploy).toBe(false);
  });

  it('deploys when the content changed, or the site has no version yet', () => {
    expect(decide({ live: 'x', current: 'y', runs: [run({})], now })).toEqual({
      deploy: true,
      reason: 'the content changed',
    });
    expect(decide({ live: null, current: 'y', runs: [], now }).deploy).toBe(true);
  });

  it('waits while a deploy is queued or running', () => {
    const runs = [run({ status: 'in_progress', conclusion: '' })];
    expect(decide({ live: 'x', current: 'y', runs, now }).deploy).toBe(false);
  });

  it('does not retry within an hour a deploy it started that failed, and does after', () => {
    const failed = run({
      event: 'workflow_dispatch',
      conclusion: 'failure',
      createdAt: '2026-10-23T11:30:00Z',
    });
    expect(decide({ live: 'x', current: 'y', runs: [failed], now }).deploy).toBe(false);
    const later = new Date('2026-10-23T12:31:00Z');
    expect(decide({ live: 'x', current: 'y', runs: [failed], now: later }).deploy).toBe(true);
  });
});
