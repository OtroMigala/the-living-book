import { describe, expect, it } from 'vitest';
import { curlPoint, SERIES_LIMIT } from './curl.ts';

const W = 0.1756; // page width from the contract, metres
const BEND = 1.2; // radians of bend at mid-turn

/** Length of the page's cross-section, measured by walking it in small straight steps. */
function arcLength(progress: number, bend: number, steps = 2000) {
  let length = 0;
  let prev = curlPoint(0, progress, bend, W);
  for (let i = 1; i <= steps; i++) {
    const p = curlPoint((W * i) / steps, progress, bend, W);
    length += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  return length;
}

describe('curlPoint', () => {
  it('turns back as the mirror image of a forward turn, with the edge still trailing', () => {
    for (const p of [0.2, 0.5, 0.7]) {
      for (const s of [0.3 * W, W]) {
        const forward = curlPoint(s, p, BEND, W);
        const back = curlPoint(s, 1 - p, -BEND, W);
        expect(back.x).toBeCloseTo(-forward.x, 12);
        expect(back.y).toBeCloseTo(forward.y, 12);
        expect(back.nx).toBeCloseTo(forward.nx, 12);
        expect(back.ny).toBeCloseTo(-forward.ny, 12);
      }
    }
  });

  it('lies flat towards −X before the turn and towards +X after it', () => {
    const before = curlPoint(W, 0, BEND, W);
    const after = curlPoint(W, 1, BEND, W);
    expect(before.x).toBeCloseTo(-W);
    expect(before.y).toBeCloseTo(0);
    expect(after.x).toBeCloseTo(W);
    expect(after.y).toBeCloseTo(0);
  });

  it('stays attached to the spine', () => {
    for (const p of [0, 0.3, 0.5, 0.8]) {
      const spine = curlPoint(0, p, BEND, W);
      expect(spine.x).toBeCloseTo(0);
      expect(spine.y).toBeCloseTo(0);
    }
  });

  it('never stretches: the cross-section is always as long as the page is wide', () => {
    for (const p of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      expect(arcLength(p, BEND)).toBeCloseTo(W, 4);
    }
  });

  it('bends: halfway through, the edge lags behind a rigid page', () => {
    const bent = curlPoint(W, 0.5, BEND, W);
    const rigid = curlPoint(W, 0.5, 0, W);
    // A rigid page stands upright at mid-turn; the bent one's edge is still on the −X side.
    expect(rigid.x).toBeCloseTo(0);
    expect(bent.x).toBeLessThan(-0.01);
  });

  it('is seamless where it switches between the series and the exact formula', () => {
    // Evaluate both branches with the same parameters on each side of SERIES_LIMIT: curlPoint
    // takes one branch, the test computes the other by hand, and they must agree.
    const theta0 = 0.9; // any angle
    const progress = theta0 / Math.PI;
    const exact = (k: number) => ({
      x: (Math.sin(theta0 - k * W) - Math.sin(theta0)) / k,
      y: (Math.cos(theta0 - k * W) - Math.cos(theta0)) / k,
    });
    const series = (k: number) => {
      const a = (k * W * W) / 2;
      const b = (k * k * W * W * W) / 6;
      const c = Math.cos(theta0);
      const s = Math.sin(theta0);
      return { x: -W * c - a * s + b * c, y: W * s - a * c - b * s };
    };
    for (const factor of [0.999, 1.001]) {
      // maxBend chosen so that k·w = factor × SERIES_LIMIT at this progress.
      const maxBend = (factor * SERIES_LIMIT) / Math.sin(Math.PI * progress);
      const k = (factor * SERIES_LIMIT) / W;
      const point = curlPoint(W, progress, maxBend, W);
      const other = factor < 1 ? exact(k) : series(k);
      // The bound promised in curl.ts: the series error is of order k³·s⁴/24, about 7e-9 m here.
      expect(Math.hypot(point.x - other.x, point.y - other.y)).toBeLessThan(1e-8);
    }
  });

  it('gives unit normals', () => {
    const p = curlPoint(W / 3, 0.4, BEND, W);
    expect(Math.hypot(p.nx, p.ny)).toBeCloseTo(1);
  });
});
