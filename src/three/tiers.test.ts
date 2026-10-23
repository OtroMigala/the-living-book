import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readBudgets } from '../../tools/budget-check/budgets.ts';
import { FRAME_BUDGET_MS, PIXEL_RATIO_CAP, pixelRatioFor, tierFor } from './tiers.ts';

const desktop = { devicePixelRatio: 1, coarsePointer: false, narrow: false, saveData: false };
// The owner's Tecno Pova 6, as measured with /diagnostics/.
const pova6 = { devicePixelRatio: 3, coarsePointer: true, narrow: true, saveData: false };

describe('tierFor', () => {
  it('puts touch, narrow screens and Save-Data in the mobile tier', () => {
    expect(tierFor(desktop)).toBe('desktop');
    expect(tierFor(pova6)).toBe('mobile');
    expect(tierFor({ ...desktop, saveData: true })).toBe('mobile');
  });
});

describe('pixelRatioFor (BR3)', () => {
  it('caps the reference phone at 1.5 and never raises a low ratio', () => {
    expect(pixelRatioFor(pova6)).toBe(1.5);
    expect(pixelRatioFor({ ...desktop, devicePixelRatio: 3 })).toBe(2);
    expect(pixelRatioFor(desktop)).toBe(1);
  });

  it('uses the caps written in spec 02', () => {
    const br3 = readBudgets(readFileSync('specs/02-budget.md', 'utf8')).get('BR3');
    expect(PIXEL_RATIO_CAP).toEqual({ mobile: br3?.mobile, desktop: br3?.desktop });
  });
});

describe('FRAME_BUDGET_MS (BR1)', () => {
  it('uses the frame budgets written in spec 02', () => {
    const br1 = readBudgets(readFileSync('specs/02-budget.md', 'utf8')).get('BR1');
    expect(FRAME_BUDGET_MS).toEqual({ mobile: br1?.mobile, desktop: br1?.desktop });
  });
});
