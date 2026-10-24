// The smallest client that the seed and pull scripts need: JSON in, JSON out, and an error that
// carries Contentstack's own message and code, so a failure in CI says what went wrong.
// Plain fetch instead of the official SDKs: two scripts, a handful of calls, no extra dependency.

export class ContentstackError extends Error {
  readonly status: number;
  readonly code: unknown;
  readonly details: unknown;

  constructor(status: number, message: string, code: unknown, details: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * How long a call may wait for Contentstack. Without a limit, a call that got no answer held a
 * deploy until its job's 10-minute limit cancelled it (2026-10-24): stopped, the caller goes on
 * as it does when Contentstack cannot be reached (K02).
 */
export const REQUEST_TIMEOUT_MS = 30_000;

export async function request(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: unknown,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Record<string, unknown>> {
  const init: RequestInit = {
    method,
    headers: { ...headers, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  const response = await fetch(url, init);
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const message =
      typeof json.error_message === 'string' ? json.error_message : response.statusText;
    throw new ContentstackError(response.status, message, json.error_code, json.errors);
  }
  return json;
}

/** Reads required environment variables, or returns the names that are missing. */
export function env<const K extends string>(names: readonly K[]): Record<K, string> | K[] {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length > 0) return missing;
  return Object.fromEntries(names.map((n) => [n, process.env[n] ?? ''])) as Record<K, string>;
}
