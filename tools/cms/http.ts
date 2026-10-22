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

export async function request(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: unknown,
): Promise<Record<string, unknown>> {
  const init: RequestInit = { method, headers: { ...headers, 'Content-Type': 'application/json' } };
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
