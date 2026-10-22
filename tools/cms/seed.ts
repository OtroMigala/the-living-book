// npm run cms:seed — creates or updates the content types in cms/content-types/ and the English
// entries from content/snapshot/en-us.json, then publishes them to every environment.
// Runs only from the "Seed Contentstack" workflow, which holds the management token (C05).
// Safe to run again: everything is matched by a stable key and updated in place.
//
// Needs CONTENTSTACK_API_KEY and CONTENTSTACK_MANAGEMENT_TOKEN.

import { readFileSync } from 'node:fs';
import { REGION_HOSTS, toEntries } from '../../src/content/contentstack.ts';
import { loadBook } from '../../src/content/load.ts';
import { ContentstackError, env, request } from './http.ts';

const ENVIRONMENTS = ['production', 'preview'];
const LOCALE = 'en-us';
// Referenced types first: a reference field can only point to a type that already exists.
const CONTENT_TYPES = ['chapter', 'credit', 'book'];

const credentials = env(['CONTENTSTACK_API_KEY', 'CONTENTSTACK_MANAGEMENT_TOKEN'] as const);
if (Array.isArray(credentials)) {
  console.error(`cms:seed: missing ${credentials.join(', ')}`);
  process.exit(1);
}
const headers = {
  api_key: credentials.CONTENTSTACK_API_KEY,
  authorization: credentials.CONTENTSTACK_MANAGEMENT_TOKEN,
  branch: 'main',
};
const api = (path: string) => `${REGION_HOSTS.management}/v3${path}`;
const call = (method: string, path: string, body?: unknown) =>
  request(method, api(path), headers, body);

/** Contentstack answers 422 (error code 118 for content types) when something does not exist. */
const isNotFound = (e: unknown) => e instanceof ContentstackError && [404, 422].includes(e.status);

async function upsertContentType(uid: string) {
  const definition = JSON.parse(readFileSync(`cms/content-types/${uid}.json`, 'utf8'));
  try {
    await call('GET', `/content_types/${uid}`);
  } catch (e) {
    if (!isNotFound(e)) throw e;
    await call('POST', '/content_types', { content_type: definition });
    console.log(`content type ${uid}: created`);
    return;
  }
  await call('PUT', `/content_types/${uid}`, { content_type: definition });
  console.log(`content type ${uid}: updated`);
}

/** Finds an entry by a field value, then updates it or creates it. Returns its uid. */
async function upsertEntry(
  contentType: string,
  key: { field: string; value: string } | null,
  entry: object,
): Promise<string> {
  const query = key
    ? `&query=${encodeURIComponent(JSON.stringify({ [key.field]: key.value }))}`
    : '';
  const found = await call('GET', `/content_types/${contentType}/entries?locale=${LOCALE}${query}`);
  const existing = Array.isArray(found.entries)
    ? (found.entries[0] as { uid?: string })
    : undefined;
  const label = `${contentType} ${key ? key.value : '(single)'}`;
  if (existing?.uid) {
    await call('PUT', `/content_types/${contentType}/entries/${existing.uid}?locale=${LOCALE}`, {
      entry,
    });
    console.log(`entry ${label}: updated`);
    return existing.uid;
  }
  const created = await call('POST', `/content_types/${contentType}/entries?locale=${LOCALE}`, {
    entry,
  });
  const uid = (created.entry as { uid?: string } | undefined)?.uid;
  if (!uid) throw new Error(`no uid returned when creating ${label}`);
  console.log(`entry ${label}: created`);
  return uid;
}

async function publish(contentType: string, uid: string) {
  await call('POST', `/content_types/${contentType}/entries/${uid}/publish`, {
    entry: { environments: ENVIRONMENTS, locales: [LOCALE] },
  });
}

try {
  for (const uid of CONTENT_TYPES) await upsertContentType(uid);

  const entries = toEntries(loadBook('en-us'));
  const chapters: string[] = [];
  for (const chapter of entries.chapters) {
    chapters.push(
      await upsertEntry('chapter', { field: 'chapter_id', value: chapter.chapter_id }, chapter),
    );
  }
  const credits: string[] = [];
  for (const credit of entries.credits) {
    credits.push(await upsertEntry('credit', { field: 'url', value: credit.url }, credit));
  }
  const book = await upsertEntry('book', null, {
    ...entries.book,
    chapters: chapters.map((uid) => ({ uid, _content_type_uid: 'chapter' })),
    credits: credits.map((uid) => ({ uid, _content_type_uid: 'credit' })),
  });

  // References first, so the book never points at an unpublished entry.
  for (const uid of chapters) await publish('chapter', uid);
  for (const uid of credits) await publish('credit', uid);
  await publish('book', book);
  console.log(
    `cms:seed: published ${chapters.length} chapter(s), ${credits.length} credit(s) and the book to ${ENVIRONMENTS.join(', ')}`,
  );
} catch (e) {
  if (e instanceof ContentstackError) {
    console.error(`cms:seed: HTTP ${e.status}, code ${String(e.code)}: ${e.message}`);
    if (e.details) console.error(JSON.stringify(e.details, null, 2));
  } else {
    console.error(e);
  }
  process.exit(1);
}
