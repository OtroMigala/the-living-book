import { describe, expect, it } from 'vitest';
import type { Locale } from '../../src/content/model.ts';
import { ContentstackError } from './http.ts';
import { type PullDeps, pullBooks } from './pull-books.ts';

// A delivered book entry with its chapters and credits included, as in contentstack.test.ts.
const entry = {
  title: 'One Thousand and One Nights',
  subtitle: 'The frame story',
  description: 'How Scheherazade began.',
  chapters: [
    {
      title: 'The Arabian Nights',
      chapter_id: 'frame-story',
      blocks: [{ paragraph: { text: 'In the chronicles…' } }],
    },
  ],
  credits: [
    {
      role: 'Text',
      title: 'The Arabian Nights Entertainments',
      author: 'Andrew Lang',
      url: 'https://www.gutenberg.org/ebooks/128',
      license: 'Public domain',
      notes: '',
    },
  ],
};

/** A pull against a fake Delivery API that answers each locale as given. */
async function pull(answer: (locale: string) => Promise<Record<string, unknown>>) {
  const requests: { url: URL; headers: Record<string, string> }[] = [];
  const written: Locale[] = [];
  const warnings: string[] = [];
  const failures: string[] = [];
  const deps: PullDeps = {
    get: (url, headers) => {
      const parsed = new URL(url);
      requests.push({ url: parsed, headers });
      return answer(parsed.searchParams.get('locale') ?? '');
    },
    write: (locale) => {
      written.push(locale);
    },
    log: () => {},
    warn: (message) => {
      warnings.push(message);
    },
    fail: (message) => {
      failures.push(message);
    },
  };
  const calls = await pullBooks({ apiKey: 'key', deliveryToken: 'token' }, 'production', deps);
  return { calls, requests, written, warnings, failures };
}

describe('pullBooks (K02 AC1)', () => {
  it('reads both locales from the EU delivery endpoint with the delivery token, and writes them', async () => {
    const r = await pull(async () => ({ entries: [entry] }));
    expect(r.calls).toBe(2);
    for (const { url, headers } of r.requests) {
      expect(url.origin).toBe('https://eu-cdn.contentstack.com');
      expect(url.searchParams.get('environment')).toBe('production');
      expect(headers).toEqual({ api_key: 'key', access_token: 'token' });
    }
    expect(r.written).toEqual(['en-us', 'es-419']);
    expect(r.warnings).toEqual([]);
  });

  it('keeps the committed snapshots when Contentstack is unreachable', async () => {
    const r = await pull(async () => {
      throw new TypeError('fetch failed');
    });
    expect(r.written).toEqual([]);
    expect(r.warnings).toHaveLength(2);
    expect(r.warnings[0]).toContain('not reachable');
    expect(r.failures).toEqual([]);
  });

  it('keeps them when nothing is published, and when Spanish came back in English', async () => {
    const english = { ...entry, publish_details: { locale: 'en-us' } };
    const r = await pull(async (locale) =>
      locale === 'en-us' ? { entries: [] } : { entries: [english] },
    );
    expect(r.written).toEqual([]);
    expect(r.warnings).toHaveLength(2);
    expect(r.warnings[0]).toContain('no published book entry in production/en-us');
    expect(r.warnings[1]).toContain('es-419: not translated in Contentstack yet');
  });

  it('fails the build on published content that is broken (F04 AC1)', async () => {
    const r = await pull(async () => ({ entries: [{ ...entry, title: '' }] }));
    expect(r.written).toEqual([]);
    expect(r.failures).toHaveLength(2);
    expect(r.failures[0]).toContain('invalid');
  });

  it("reports Contentstack's own status and code when it refuses a request", async () => {
    const r = await pull(async () => {
      throw new ContentstackError(401, 'Unauthorized', 109, undefined);
    });
    expect(r.warnings[0]).toContain('HTTP 401, code 109: Unauthorized');
  });
});
