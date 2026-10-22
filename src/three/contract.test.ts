import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseTables } from '../../tools/spec-check/spec.ts';
import { FALLBACK_PAGES, PAGE_CLASSES } from './contract.ts';

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

// The page classes live in three places: the spec's table, the code, and the CSS tokens.
describe('PAGE_CLASSES matches spec 03 and tokens.css', () => {
  const table = parseTables(readFileSync('specs/03-contract.md', 'utf8')).find(
    (t) => t.header[2] === 'Logical page (CSS px)',
  );
  const tokens = readFileSync('src/styles/tokens.css', 'utf8');
  const token = (name: string) =>
    Number(new RegExp(String.raw`--${name}:\s*(\d+)px`).exec(tokens)?.[1] ?? Number.NaN);

  for (const [key, label] of [
    ['compact', 'Compact'],
    ['regular', 'Regular'],
  ] as const) {
    it(`${key}`, () => {
      const row = table?.rows.find((r) => r.cells[0] === label);
      expect(row, `a row for ${label}`).toBeDefined();
      const size = [...(row?.cells[2] ?? '').matchAll(/\d+/g)].map((m) => Number(m[0]));
      expect(size).toEqual([PAGE_CLASSES[key].width, PAGE_CLASSES[key].height]);
      expect(token(`page-${key}-width`)).toBe(PAGE_CLASSES[key].width);
      expect(token(`page-${key}-height`)).toBe(PAGE_CLASSES[key].height);
    });
  }
});
