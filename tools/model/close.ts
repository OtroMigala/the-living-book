// A grayscale morphological closing over a rectangle of an image, channel by channel: a maximum
// filter, then a minimum filter, each over a (2r + 1)² window. On light paper it erases dark
// details thinner than the window, such as printed letters, and keeps what is larger: stains, the
// paper's tone, the shadow of the gutter. Both filters are separable (a row pass, then a column
// pass), so each pixel looks at 2(2r + 1) neighbours instead of (2r + 1)².

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

type Pick = (a: number, b: number) => number;

/** One 1-D pass of a max or min filter inside `rect`, along x or y; edges clamp to the rect. */
function pass(
  src: Uint8Array,
  width: number,
  channels: number,
  rect: Rect,
  radius: number,
  axis: 'x' | 'y',
  pick: Pick,
): Uint8Array {
  const out = src.slice();
  const right = rect.left + rect.width - 1;
  const bottom = rect.top + rect.height - 1;
  for (let y = rect.top; y <= bottom; y++) {
    for (let x = rect.left; x <= right; x++) {
      for (let c = 0; c < channels; c++) {
        let best = src[(y * width + x) * channels + c] ?? 0;
        for (let d = -radius; d <= radius; d++) {
          const xx = axis === 'x' ? Math.min(right, Math.max(rect.left, x + d)) : x;
          const yy = axis === 'y' ? Math.min(bottom, Math.max(rect.top, y + d)) : y;
          best = pick(best, src[(yy * width + xx) * channels + c] ?? 0);
        }
        out[(y * width + x) * channels + c] = best;
      }
    }
  }
  return out;
}

/** The closing of `rect` in raw interleaved pixels (`channels` bytes a pixel); the rest is kept. */
export function closeRegion(
  pixels: Uint8Array,
  width: number,
  channels: number,
  rect: Rect,
  radius: number,
): Uint8Array {
  let out = pass(pixels, width, channels, rect, radius, 'x', Math.max);
  out = pass(out, width, channels, rect, radius, 'y', Math.max);
  out = pass(out, width, channels, rect, radius, 'x', Math.min);
  return pass(out, width, channels, rect, radius, 'y', Math.min);
}
