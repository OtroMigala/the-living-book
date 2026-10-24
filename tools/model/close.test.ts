import { describe, expect, it } from 'vitest';
import { closeRegion } from './close.ts';

/** A 20 × 20 grey image (one channel) at 200, with dark pixels set at 40. */
function image(dark: [number, number][]): Uint8Array {
  const pixels = new Uint8Array(20 * 20).fill(200);
  for (const [x, y] of dark) pixels[y * 20 + x] = 40;
  return pixels;
}
const at = (pixels: Uint8Array, x: number, y: number) => pixels[y * 20 + x];
const all = { left: 0, top: 0, width: 20, height: 20 };

describe('closeRegion', () => {
  it('erases a dark stroke thinner than the window, like a printed letter', () => {
    const stroke = Array.from({ length: 10 }, (_, i) => [5 + i, 10] as [number, number]);
    const out = closeRegion(image(stroke), 20, 1, all, 2);
    expect(stroke.map(([x, y]) => at(out, x, y))).toEqual(stroke.map(() => 200));
  });

  it('keeps a dark patch wider than the window, like a stain', () => {
    const patch: [number, number][] = [];
    for (let y = 4; y < 14; y++) for (let x = 4; x < 14; x++) patch.push([x, y]);
    const out = closeRegion(image(patch), 20, 1, all, 2);
    expect(at(out, 9, 9)).toBe(40);
    expect(at(out, 4, 4)).toBe(40);
  });

  it('changes nothing outside the rectangle', () => {
    const out = closeRegion(
      image([
        [2, 2],
        [15, 15],
      ]),
      20,
      1,
      { left: 10, top: 10, width: 10, height: 10 },
      2,
    );
    expect(at(out, 2, 2)).toBe(40);
    expect(at(out, 15, 15)).toBe(200);
  });

  it('works on each channel of interleaved pixels', () => {
    const rgb = new Uint8Array(20 * 20 * 3).fill(200);
    rgb[(10 * 20 + 10) * 3 + 1] = 40; // one dark green value
    const out = closeRegion(rgb, 20, 3, all, 1);
    expect(out[(10 * 20 + 10) * 3 + 1]).toBe(200);
  });
});
