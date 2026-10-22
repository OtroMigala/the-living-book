import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readBudgets } from '../budget-check/budgets.ts';
import { format, judge, median } from './summary.ts';

describe('median', () => {
  it('takes the middle value, so one slow run does not move it', () => {
    expect(median([2100, 9000, 2000])).toBe(2100);
  });

  it('averages the two middle values of an even count', () => {
    expect(median([1, 4, 2, 3])).toBe(2.5);
  });

  it('refuses an empty list', () => {
    expect(() => median([])).toThrow();
  });
});

describe('judge on the real spec', () => {
  const budgets = readBudgets(readFileSync('specs/02-budget.md', 'utf8'));
  const run = (lcp: number, cls: number, tbt: number) => ({ BL1: lcp, BL2: cls, BL3: tbt });

  it('reads BL1–BL3 for each tier', () => {
    expect(budgets.get('BL1')).toMatchObject({ mobile: 2500, desktop: 1500 });
    expect(budgets.get('BL2')).toMatchObject({ mobile: 0.05, desktop: 0.05 });
    expect(budgets.get('BL3')).toMatchObject({ mobile: 300, desktop: 150 });
  });

  it('passes medians within the budget, even if one run is over it', () => {
    const verdicts = judge(
      [run(2000, 0, 100), run(2400, 0.01, 120), run(4000, 0, 900)],
      budgets,
      'mobile',
    );
    expect(verdicts.map((v) => [v.id, v.median, v.ok])).toEqual([
      ['BL1', 2400, true],
      ['BL2', 0, true],
      ['BL3', 120, true],
    ]);
  });

  it('uses the tier’s own limit: 2 s is fine on mobile, over on desktop', () => {
    const runs = [run(2000, 0, 0), run(2000, 0, 0), run(2000, 0, 0)];
    expect(judge(runs, budgets, 'mobile')[0]?.ok).toBe(true);
    expect(judge(runs, budgets, 'desktop')[0]).toMatchObject({ limit: 1500, ok: false });
  });

  it('fails when the spec has no limit', () => {
    expect(() => judge([run(1, 0, 0)], new Map(), 'mobile')).toThrow(/BL1/);
  });
});

describe('format', () => {
  it('shows LCP in seconds, CLS unitless and TBT in milliseconds', () => {
    expect(format('BL1', 2534.2)).toBe('2.53 s');
    expect(format('BL2', 0.0123)).toBe('0.012');
    expect(format('BL3', 120.4)).toBe('120 ms');
  });
});
