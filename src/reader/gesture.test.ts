import { describe, expect, it } from 'vitest';
import { completes, isTap, progressOf, remainingMs, TAP_MS, TAP_PX } from './gesture.ts';

describe('progressOf', () => {
  it('follows the right page edge leftwards when turning forward', () => {
    // A spread of 544 px pages: the edge travels 1088 px to land.
    expect(progressOf(1, 1100, 1100, 544, 2)).toBe(0);
    expect(progressOf(1, 1100, 556, 544, 2)).toBeCloseTo(0.5, 6);
    expect(progressOf(1, 1100, 12, 544, 2)).toBe(1);
  });
  it('follows the left page edge rightwards when turning back', () => {
    expect(progressOf(-1, 100, 372, 544, 2)).toBeCloseTo(0.25, 6);
  });
  it('travels one page width on a single page', () => {
    expect(progressOf(1, 340, 175, 330, 1)).toBeCloseTo(0.5, 6);
  });
  it('stays between 0 and 1 when the pointer goes the wrong way or too far', () => {
    expect(progressOf(1, 500, 600, 544, 2)).toBe(0);
    expect(progressOf(-1, 100, 5000, 544, 2)).toBe(1);
    expect(progressOf(1, 500, 0, 0, 2)).toBe(0);
  });
});

describe('the halfway rule (F02 AC2)', () => {
  it('completes a turn released at or past halfway, and drops one released before it', () => {
    expect(completes(0.49)).toBe(false);
    expect(completes(0.5)).toBe(true);
    expect(completes(0.9)).toBe(true);
  });
  it('finishes at the speed of a whole turn, from wherever the sheet was let go', () => {
    expect(remainingMs(0.25, true, 900)).toBe(675);
    expect(remainingMs(0.25, false, 900)).toBe(225);
  });
});

describe('isTap', () => {
  it('tells a tap from a drag by distance and time', () => {
    expect(isTap(0, 100)).toBe(true);
    expect(isTap(TAP_PX, 100)).toBe(false);
    expect(isTap(2, TAP_MS)).toBe(false);
  });
});
