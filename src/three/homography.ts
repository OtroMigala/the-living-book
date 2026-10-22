// Maps a rectangle onto any four points, as a camera maps a flat page onto the screen (spike B).
//
// A pinhole camera sends a plane to the screen through a projective transform: in homogeneous
// coordinates, (X, Y, W) = H · (x, y, 1), and the screen point is (X / W, Y / W). H is 3 × 3 with
// eight unknowns (the ninth entry is fixed at 1), so four point pairs determine it exactly. That is
// why an HTML page can sit exactly on a 3D page seen at any angle: the four projected corners give
// H, and CSS `matrix3d` applies it to every point of the element.

export type Point = [number, number];

/** Row-major 3 × 3: [a, b, c, d, e, f, g, h, i] maps (x, y) to ((ax + by + c), (dx + ey + f)) / (gx + hy + i). */
export type Homography = [number, number, number, number, number, number, number, number, number];

/**
 * The homography that sends the rectangle (0, 0)–(width, height) to the quad [topLeft, topRight,
 * bottomRight, bottomLeft]. Heckbert's closed form for the unit square, then scaled to the size.
 */
export function rectToQuad(
  width: number,
  height: number,
  quad: [Point, Point, Point, Point],
): Homography {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = quad;
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  if (den === 0) throw new Error('the quad is degenerate');
  // g and h are the perspective terms: both 0 when the quad is a parallelogram (no foreshortening).
  const g = (dx3 * dy2 - dx2 * dy3) / den;
  const h = (dx1 * dy3 - dx3 * dy1) / den;
  const a = x1 - x0 + g * x1;
  const b = x3 - x0 + h * x3;
  const d = y1 - y0 + g * y1;
  const e = y3 - y0 + h * y3;
  return [a / width, b / height, x0, d / width, e / height, y0, g / width, h / height, 1];
}

export function apply(m: Homography, [x, y]: Point): Point {
  const w = m[6] * x + m[7] * y + m[8];
  return [(m[0] * x + m[1] * y + m[2]) / w, (m[3] * x + m[4] * y + m[5]) / w];
}

/**
 * The same map as a CSS `matrix3d` (column-major 4 × 4) for an element whose transform origin is
 * its top-left corner. The element is flat (z = 0), so the third row and column are the identity.
 */
export function toMatrix3d(m: Homography): string {
  const [a, b, c, d, e, f, g, h, i] = m;
  return `matrix3d(${[a, d, 0, g, b, e, 0, h, 0, 0, 1, 0, c, f, 0, i].join(',')})`;
}

/** How much a short vertical segment at (x, y) is stretched on screen: the local vertical scale. */
export function verticalScale(m: Homography, [x, y]: Point, step = 1): number {
  const [x0, y0] = apply(m, [x, y]);
  const [x1, y1] = apply(m, [x, y + step]);
  return Math.hypot(x1 - x0, y1 - y0) / step;
}
