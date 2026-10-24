// Free look (F17): while F is held, the camera circles the open book, always looking at it. A point
// on a sphere around the book: `polar` degrees from straight above (the tilt of F16 is this angle),
// `azimuth` degrees around the vertical, toward the reading view's right.
//
//   With θ the polar angle and φ the azimuth, the reading view's camera sits at φ = 0 on the
//   reader's side (−z), and the screen's right is −x there:
//     position = target + distance · (−sin θ sin φ, cos θ, −sin θ cos φ)
//     up       = (cos θ sin φ, sin θ, cos θ cos φ)
//   The up vector is the sphere's tangent toward the pole, so it is always perpendicular to the
//   view, never parallel to it. The camera's right is then (−cos φ, 0, sin φ): horizontal at every
//   point, so the horizon stays level all the way round. Straight above (θ = 0) the up vector is
//   the page's top turned by φ: there the azimuth turns the picture about its centre, as a
//   turntable seen from above.
//
//   Down stops 80° from straight above, before the camera reaches the desk, and higher where
//   something stands on the desk: the closed books and the magnifier stand between the open book
//   and a low camera on the far side. The floor, the lowest the camera may go at each azimuth, is
//   found by casting the line from the book to the camera against boxes around those things, and
//   halving the angle until the line is clear. It may rise only 1° per degree of the way round, so
//   the camera climbs over a book as it comes near, instead of jumping where the book begins.

import { type Box3, Ray, Vector3 } from 'three';

export const ORBIT_LOWEST = 80;
/** The floor is measured every 2° of azimuth. */
const FLOOR_STEP = 2;
/** Degrees the floor may rise per degree of azimuth. */
const FLOOR_SLOPE = 1;

const RADIANS = Math.PI / 180;

/** A polar angle kept between straight above and ORBIT_LOWEST. */
export function clampPolar(degrees: number): number {
  return Math.min(ORBIT_LOWEST, Math.max(0, degrees));
}

/** The same turn between −180° and 180°: from there, the way back to 0 is the shorter one. */
export function shorterTurn(degrees: number): number {
  return degrees - 360 * Math.round(degrees / 360);
}

/** Where the camera is and which way is up, on a sphere of `distance` around `target`. */
export function orbit(
  target: Vector3,
  distance: number,
  polar: number,
  azimuth: number,
): { position: Vector3; up: Vector3 } {
  const t = polar * RADIANS;
  const f = azimuth * RADIANS;
  const position = new Vector3(-Math.sin(t) * Math.sin(f), Math.cos(t), -Math.sin(t) * Math.cos(f))
    .multiplyScalar(distance)
    .add(target);
  const up = new Vector3(Math.cos(t) * Math.sin(f), Math.sin(t), Math.cos(t) * Math.cos(f));
  return { position, up };
}

/**
 * The lowest polar angle the camera may take at each azimuth, every FLOOR_STEP degrees from 0,
 * orbiting `target` at `distance` with `obstacles` on the desk: the line from the target to the
 * camera misses every obstacle, so the camera is neither inside one nor behind it.
 */
export function orbitFloor(target: Vector3, distance: number, obstacles: Box3[]): number[] {
  const ray = new Ray();
  const hit = new Vector3();
  const blocked = (polar: number, azimuth: number) => {
    const { position } = orbit(target, distance, polar, azimuth);
    ray.set(target, position.sub(target).normalize());
    return obstacles.some(
      (box) => ray.intersectBox(box, hit) !== null && hit.distanceTo(target) <= distance,
    );
  };
  const clear: number[] = [];
  for (let azimuth = 0; azimuth < 360; azimuth += FLOOR_STEP) {
    // Higher is clearer for what stands on the desk: halve between clear and blocked, 12 times,
    // to within 80° / 2¹² = 0.02°.
    let low = 0;
    let high = ORBIT_LOWEST;
    if (blocked(high, azimuth)) {
      for (let i = 0; i < 12; i++) {
        const middle = (low + high) / 2;
        if (blocked(middle, azimuth)) high = middle;
        else low = middle;
      }
    } else low = high;
    clear.push(low);
  }
  // Where a box's side begins, the clear angle jumps between two samples, and a line between them
  // would let the camera behind it: each sample keeps the least of itself and its neighbours.
  const n = clear.length;
  const near = clear.map((c, i) =>
    Math.min(c, clear[(i + n - 1) % n] ?? c, clear[(i + 1) % n] ?? c),
  );
  // The largest angles, none past those, that change at most FLOOR_SLOPE per degree: at each
  // azimuth, every sample's angle plus the slope times the way round to it, the least of them.
  return near.map((_, i) =>
    Math.min(
      ...near.map((c, j) => {
        const apart = Math.min(Math.abs(i - j), n - Math.abs(i - j)) * FLOOR_STEP;
        return c + FLOOR_SLOPE * apart;
      }),
    ),
  );
}

/** The floor at any azimuth, between its two nearest samples, all the way round. */
export function floorAt(floor: number[], azimuth: number): number {
  if (floor.length === 0) return ORBIT_LOWEST;
  const at = (((azimuth % 360) + 360) % 360) / FLOOR_STEP;
  const i = Math.floor(at);
  const a = floor[i % floor.length] ?? ORBIT_LOWEST;
  const b = floor[(i + 1) % floor.length] ?? ORBIT_LOWEST;
  return a + (b - a) * (at - i);
}
