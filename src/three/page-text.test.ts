import { describe, expect, it } from 'vitest';
import { alphaOf } from './page-text.ts';

describe('alphaOf', () => {
  it('reads the coverage of lighter ink from a computed colour', () => {
    expect(alphaOf('rgba(43, 33, 24, 0.7)')).toBe(0.7);
    expect(alphaOf('rgb(43 33 24 / 0.45)')).toBe(0.45);
  });

  it('takes an opaque or unreadable colour as full ink', () => {
    expect(alphaOf('rgb(43, 33, 24)')).toBe(1);
    expect(alphaOf('oklch(0.3 0.02 60)')).toBe(1);
    expect(alphaOf('rgba(43, 33, 24, x)')).toBe(1);
  });
});
