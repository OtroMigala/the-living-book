import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContentstackError, request } from './http.ts';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('request', () => {
  it('stops waiting for a call that gets no answer', async () => {
    // A server that never answers: the call ends only if its signal aborts it.
    vi.stubGlobal(
      'fetch',
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(init.signal?.reason));
        }),
    );
    const started = Date.now();
    await expect(request('GET', 'https://example.org', {}, undefined, 50)).rejects.toThrow();
    expect(Date.now() - started).toBeLessThan(2_000);
  });

  it("carries Contentstack's message and code when it answers with an error", async () => {
    vi.stubGlobal(
      'fetch',
      async () =>
        new Response(JSON.stringify({ error_message: 'Not found', error_code: 141 }), {
          status: 404,
        }),
    );
    const failure = await request('GET', 'https://example.org', {}).catch((e: unknown) => e);
    expect(failure).toBeInstanceOf(ContentstackError);
    expect((failure as ContentstackError).code).toBe(141);
    expect((failure as ContentstackError).message).toBe('Not found');
  });
});
