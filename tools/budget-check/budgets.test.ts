import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseLimit, readBudgets, scriptsOf } from './budgets.ts';

describe('parseLimit', () => {
  it('converts sizes to bytes and times to milliseconds', () => {
    expect(parseLimit('≤ 50 KB')).toEqual({ value: 50 * 1024, unit: 'KB' });
    expect(parseLimit('≤ 2 MiB')).toEqual({ value: 2 * 1024 * 1024, unit: 'MiB' });
    expect(parseLimit('≤ 2.5 s')).toEqual({ value: 2500, unit: 's' });
    expect(parseLimit('≤ 150,000')).toEqual({ value: 150000, unit: '' });
    expect(parseLimit('0')).toEqual({ value: 0, unit: '' });
  });

  it('returns null for text that is not a limit', () => {
    expect(parseLimit('Why this number')).toBeNull();
  });
});

describe('readBudgets on the real spec', () => {
  const budgets = readBudgets(readFileSync('specs/02-budget.md', 'utf8'));

  it('finds the byte budgets the build check uses', () => {
    expect(budgets.get('BB1')).toMatchObject({ mobile: 50 * 1024, desktop: 50 * 1024 });
    expect(budgets.get('BB6')).toMatchObject({ mobile: 100 * 1024 });
  });

  it('reads the runtime and memory tables too', () => {
    expect(budgets.get('BR3')).toMatchObject({ mobile: 1.5, desktop: 2 });
    expect(budgets.get('BM3')).toMatchObject({ mobile: 64 * 1024 * 1024 });
  });
});

describe('scriptsOf', () => {
  it('collects inline code, external scripts and module preloads, but not data blocks', () => {
    const html = `
      <script type="module">console.log(1)</script>
      <script src="/a.js"></script>
      <script type="application/ld+json">{"@type":"Book"}</script>
      <link rel="modulepreload" href="/b.js">`;
    expect(scriptsOf(html)).toEqual({ inline: ['console.log(1)'], external: ['/a.js', '/b.js'] });
  });
});
