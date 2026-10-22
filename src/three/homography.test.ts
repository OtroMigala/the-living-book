import { describe, expect, it } from 'vitest';
import { apply, type Point, rectToQuad, toMatrix3d, verticalScale } from './homography.ts';

const close = (p: Point, q: Point, digits = 9) => {
  expect(p[0]).toBeCloseTo(q[0], digits);
  expect(p[1]).toBeCloseTo(q[1], digits);
};

describe('rectToQuad', () => {
  // A trapezoid like a page seen from below its top edge: the far edge is narrower.
  const quad: [Point, Point, Point, Point] = [
    [120, 40],
    [380, 40],
    [420, 400],
    [80, 400],
  ];
  const m = rectToQuad(331, 395, quad);

  it('sends each corner of the rectangle to its corner of the quad', () => {
    close(apply(m, [0, 0]), quad[0]);
    close(apply(m, [331, 0]), quad[1]);
    close(apply(m, [331, 395]), quad[2]);
    close(apply(m, [0, 395]), quad[3]);
  });

  it('agrees with a real pinhole projection inside the page, not only at the corners', () => {
    // A plane tilted away from a camera at the origin, projected with focal length 500.
    const camera = ([x, y]: Point): Point => {
      const z = 2 + y / 400; // the top of the page (y = 0) is nearer than its bottom
      return [(500 * (x - 165)) / z + 300, (500 * (y - 200)) / z / 2 + 300];
    };
    const corners = [
      [0, 0],
      [331, 0],
      [331, 395],
      [0, 395],
    ].map((p) => camera(p as Point)) as [Point, Point, Point, Point];
    const h = rectToQuad(331, 395, corners);
    for (const p of [
      [100, 50],
      [165, 200],
      [300, 380],
    ] as Point[]) {
      close(apply(h, p), camera(p), 6);
    }
  });

  it('has no perspective terms for a parallelogram, so a flat view needs only a 2D transform', () => {
    const flat = rectToQuad(544, 648, [
      [10, 20],
      [554, 20],
      [554, 668],
      [10, 668],
    ]);
    expect(flat[6]).toBeCloseTo(0, 12);
    expect(flat[7]).toBeCloseTo(0, 12);
    expect(flat[0]).toBeCloseTo(1, 12);
    expect(flat[4]).toBeCloseTo(1, 12);
  });

  it('refuses a quad whose corners are all on one line', () => {
    expect(() =>
      rectToQuad(10, 10, [
        [0, 0],
        [1, 1],
        [2, 2],
        [3, 3],
      ]),
    ).toThrow(/degenerate/);
  });
});

describe('toMatrix3d', () => {
  it('writes the 3 × 3 map column by column into a 4 × 4 that leaves z alone', () => {
    expect(toMatrix3d([1, 2, 3, 4, 5, 6, 7, 8, 9])).toBe(
      'matrix3d(1,4,0,7,2,5,0,8,0,0,1,0,3,6,0,9)',
    );
  });
});

describe('verticalScale', () => {
  it('is 1 for the identity and shrinks where a trapezoid narrows', () => {
    expect(verticalScale([1, 0, 0, 0, 1, 0, 0, 0, 1], [5, 5])).toBeCloseTo(1, 12);
    const m = rectToQuad(100, 100, [
      [30, 0],
      [70, 0],
      [100, 100],
      [0, 100],
    ]);
    expect(verticalScale(m, [50, 0])).toBeLessThan(verticalScale(m, [50, 99]));
  });
});
