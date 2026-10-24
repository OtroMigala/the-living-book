// The opening view (F01 AC2): the book opens on the whole scene, every object in the picture, and
// then comes down to reading. A camera on the orbit of free-look.ts (azimuth 0, the reader's side),
// `polar` degrees from straight above, looking at a target from a distance that fits every point.
//
//   With the camera at target + d · back, where back = (0, cos θ, −sin θ), its right r and up u are
//   fixed by θ alone. A point p, with q = p − target, lies x = q · r across, y = q · u up, and
//   depth = d − q · back in front of the camera. It is in the picture when |x| ≤ kx · depth and
//   |y| ≤ ky · depth, with ky = tan(fov / 2) · (1 − margin) and kx = ky · aspect. Depth grows with
//   d one for one, so each point asks d ≥ |x| / kx + q · back (and the same with y): the distance is
//   the largest of those. Perspective makes the near side larger, so the picture is then centred
//   by moving the target across, a few rounds, and the distance measured again.

import { Vector3 } from 'three';

const RADIANS = Math.PI / 180;

export interface Framing {
  target: Vector3;
  distance: number;
}

/** Where each point lands in the picture, −1 to 1 across and up, inside the margin. */
function placeOf(points: Vector3[], target: Vector3, distance: number, axes: Axes) {
  return points.map((p) => {
    const q = p.clone().sub(target);
    const depth = distance - q.dot(axes.back);
    return { x: q.dot(axes.right) / (axes.kx * depth), y: q.dot(axes.up) / (axes.ky * depth) };
  });
}

interface Axes {
  back: Vector3;
  right: Vector3;
  up: Vector3;
  kx: number;
  ky: number;
}

/** The nearest distance from `target` at which every point is in the picture. */
function nearestDistance(points: Vector3[], target: Vector3, axes: Axes): number {
  let distance = 0;
  for (const p of points) {
    const q = p.clone().sub(target);
    const behind = q.dot(axes.back);
    distance = Math.max(
      distance,
      Math.abs(q.dot(axes.right)) / axes.kx + behind,
      Math.abs(q.dot(axes.up)) / axes.ky + behind,
    );
  }
  return distance;
}

/**
 * The opening view of `points` (the corners of every object), seen `polar` degrees from straight
 * above with a vertical field of view of `fov` degrees, in a picture `aspect` wide for 1 high,
 * leaving `margin` of each half of the picture empty around it.
 */
export function wholeView(
  points: Vector3[],
  polar: number,
  fov: number,
  aspect: number,
  margin: number,
): Framing {
  const t = polar * RADIANS;
  const ky = Math.tan((fov * RADIANS) / 2) * (1 - margin);
  const axes: Axes = {
    back: new Vector3(0, Math.cos(t), -Math.sin(t)),
    right: new Vector3(-1, 0, 0),
    up: new Vector3(0, Math.sin(t), Math.cos(t)),
    kx: ky * aspect,
    ky,
  };
  const target = points
    .reduce((sum, p) => sum.add(p), new Vector3())
    .multiplyScalar(1 / Math.max(1, points.length));
  let distance = nearestDistance(points, target, axes);
  for (let round = 0; round < 4; round++) {
    const placed = placeOf(points, target, distance, axes);
    const xs = placed.map((p) => p.x);
    const ys = placed.map((p) => p.y);
    const midX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const midY = (Math.min(...ys) + Math.max(...ys)) / 2;
    target
      .addScaledVector(axes.right, midX * axes.kx * distance)
      .addScaledVector(axes.up, midY * axes.ky * distance);
    distance = nearestDistance(points, target, axes);
  }
  return { target, distance };
}
