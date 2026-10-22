// The Lighthouse check's arithmetic (Q01 AC1): the median of each metric over the runs, judged
// against the load budgets BL1–BL3 of specs/02-budget.md for the tier the runs emulated.

import type { Budget } from '../budget-check/budgets.ts';

export type Tier = 'mobile' | 'desktop';

/** The three metrics of the load budgets and the Lighthouse audit that measures each. */
export const METRICS = [
  { id: 'BL1', name: 'LCP', audit: 'largest-contentful-paint', unit: 'ms' },
  { id: 'BL2', name: 'CLS', audit: 'cumulative-layout-shift', unit: '' },
  { id: 'BL3', name: 'TBT', audit: 'total-blocking-time', unit: 'ms' },
] as const;

export type MetricId = (typeof METRICS)[number]['id'];

/**
 * The middle value once sorted; with an even count, the mean of the two middle ones. Unlike the
 * mean, one run slowed by the machine (a busy CI runner) does not move it.
 */
export function median(values: readonly number[]): number {
  if (values.length === 0) throw new Error('median of no values');
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const upper = sorted[mid] as number;
  return sorted.length % 2 === 1 ? upper : ((sorted[mid - 1] as number) + upper) / 2;
}

export interface Verdict {
  id: MetricId;
  name: string;
  runs: number[];
  median: number;
  limit: number;
  ok: boolean;
}

/** Each metric's median against its budget for the tier. Throws if the spec has no limit. */
export function judge(
  runs: readonly Record<MetricId, number>[],
  budgets: ReadonlyMap<string, Budget>,
  tier: Tier,
): Verdict[] {
  return METRICS.map(({ id, name }) => {
    const limit = budgets.get(id)?.[tier];
    if (limit === null || limit === undefined) {
      throw new Error(`${id}: no ${tier} limit in specs/02-budget.md`);
    }
    const values = runs.map((r) => r[id]);
    const m = median(values);
    return { id, name, runs: values, median: m, limit, ok: m <= limit };
  });
}

/** 2534.2 ms → "2.53 s"; 120.4 ms → "120 ms"; a CLS of 0.0123 → "0.012". */
export function format(id: MetricId, value: number): string {
  if (id === 'BL2') return value.toFixed(3);
  if (id === 'BL1') return `${(value / 1000).toFixed(2)} s`;
  return `${Math.round(value)} ms`;
}
