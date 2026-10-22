// Budget checks on the build output. The limits are read from specs/02-budget.md itself, so the
// spec stays the single source of each number (invariant 5): change the spec, and CI follows.

import { gzipSync } from 'node:zlib';
import { parseTables } from '../spec-check/spec.ts';

export interface Budget {
  id: string;
  mobile: number | null;
  desktop: number | null;
  unit: string;
}

const UNITS: Record<string, number> = { B: 1, KB: 1024, MiB: 1024 * 1024, ms: 1, s: 1000 };

/** "≤ 50 KB" → 51200 (bytes); "≤ 2.5 s" → 2500 (ms); "0" → 0; "≤ 20" → 20. Null if not a limit. */
export function parseLimit(cell: string): { value: number; unit: string } | null {
  const m = /^(?:≤\s*)?([\d.,]+)\s*(B|KB|MiB|ms|s)?$/.exec(cell.trim());
  if (!m?.[1]) return null;
  const unit = m[2] ?? '';
  return { value: Number(m[1].replace(/,/g, '')) * (UNITS[unit] ?? 1), unit };
}

/** Reads every table with ID, Mobile and Desktop columns. */
export function readBudgets(markdown: string): Map<string, Budget> {
  const budgets = new Map<string, Budget>();
  for (const table of parseTables(markdown)) {
    const id = table.header.indexOf('ID');
    const mobile = table.header.indexOf('Mobile');
    const desktop = table.header.indexOf('Desktop');
    if (id < 0 || mobile < 0 || desktop < 0) continue;
    for (const row of table.rows) {
      const key = row.cells[id] ?? '';
      const m = parseLimit(row.cells[mobile] ?? '');
      const d = parseLimit(row.cells[desktop] ?? '');
      budgets.set(key, {
        id: key,
        mobile: m?.value ?? null,
        desktop: d?.value ?? null,
        unit: m?.unit ?? d?.unit ?? '',
      });
    }
  }
  return budgets;
}

/** Inline <script> bodies and the src of external scripts and module preloads in an HTML page. */
export function scriptsOf(html: string): { inline: string[]; external: string[] } {
  const inline: string[] = [];
  const external: string[] = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const src = /\bsrc="([^"]+)"/.exec(m[1] ?? '')?.[1];
    // JSON-LD and other data blocks are not code.
    const type = /\btype="([^"]+)"/.exec(m[1] ?? '')?.[1];
    if (src) external.push(src);
    else if (!type || type === 'module' || type === 'text/javascript') inline.push(m[2] ?? '');
  }
  for (const m of html.matchAll(/<link\b[^>]*rel="modulepreload"[^>]*href="([^"]+)"/gi)) {
    if (m[1]) external.push(m[1]);
  }
  return { inline, external };
}

export const gzipBytes = (data: string | Uint8Array) => gzipSync(data, { level: 9 }).byteLength;

/**
 * Relative modules a bundled file imports. Static imports (`import … from "./x.js"`,
 * `import "./x.js"`, `export … from "./x.js"`) load before the code runs; dynamic ones
 * (`import("./x.js")`) load later, when the code asks for them.
 */
export function importsOf(js: string, includeDynamic: boolean): string[] {
  const found = new Set<string>();
  for (const m of js.matchAll(/\b(?:import|from)\s*["']([^"']+)["']/g)) if (m[1]) found.add(m[1]);
  if (includeDynamic) {
    for (const m of js.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)) if (m[1]) found.add(m[1]);
  }
  return [...found].filter((s) => s.startsWith('./') || s.startsWith('../') || s.startsWith('/'));
}
