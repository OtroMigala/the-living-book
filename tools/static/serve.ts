// A static server for dist/ under the site's base path, as GitHub Pages serves it. Used by the
// build's pagination pass (tools/paginate) and the Lighthouse check (tools/lighthouse).

import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize } from 'node:path';

export const BASE = '/the-living-book/';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.glb': 'model/gltf-binary',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

export interface Served {
  /** The site's root, with the base path: http://127.0.0.1:PORT/the-living-book/ */
  url: string;
  close(): void;
}

/** Serves a directory on a free local port, under a base path (the site's, by default). */
export async function serve(dir = 'dist', base = BASE): Promise<Served> {
  const server = createServer(async (request, response) => {
    const path = decodeURIComponent(new URL(request.url ?? '/', 'http://x').pathname);
    if (!path.startsWith(base)) return response.writeHead(404).end();
    let file = normalize(join(dir, path.slice(base.length)));
    if (!file.startsWith(normalize(dir))) return response.writeHead(403).end();
    if (path.endsWith('/')) file = join(file, 'index.html');
    try {
      const body = await readFile(file);
      response.writeHead(200, {
        'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
      });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}${base}`, close: () => server.close() };
}
