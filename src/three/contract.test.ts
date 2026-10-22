import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseTables } from '../../tools/spec-check/spec.ts';
import { FALLBACK_PAGES } from './contract.ts';

// The fallback page table in specs/03-contract.md and FALLBACK_PAGES must say the same thing:
// the spec is what the owner reads, the constant is what the code uses.
describe('FALLBACK_PAGES matches spec 03', () => {
  const table = parseTables(readFileSync('specs/03-contract.md', 'utf8')).find(
    (t) => t.header[1] === 'Centre (x, y, z) in metres',
  );
  const numbers = (cell: string) =>
    [...cell.replaceAll('−', '-').matchAll(/[+-]?\d+\.\d+/g)].map((m) => Number(m[0]));

  for (const [key, label] of [
    ['verso', 'page_left'],
    ['recto', 'page_right'],
  ] as const) {
    it(`${key} (${label})`, () => {
      const row = table?.rows.find((r) => r.cells[0]?.includes(label));
      expect(row, `a row for ${label}`).toBeDefined();
      const page = FALLBACK_PAGES[key];
      expect(numbers(row?.cells[1] ?? '')).toEqual(page.centre);
      expect(numbers(row?.cells[2] ?? '')).toEqual([page.width, page.height]);
    });
  }
});
