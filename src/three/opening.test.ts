import { Box3, PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { orbit } from './free-look.ts';
import { wholeView } from './opening.ts';

/** The corners of boxes like the model's: the open book in front, books and a magnifier behind. */
const boxes = [
  new Box3(new Vector3(-0.176, -0.001, -0.135), new Vector3(0.176, 0.023, 0.074)),
  new Box3(new Vector3(-0.099, 0, 0.103), new Vector3(0.124, 0.048, 0.295)),
  new Box3(new Vector3(0.125, 0, 0.082), new Vector3(0.227, 0.192, 0.231)),
  new Box3(new Vector3(-0.111, 0.049, 0.082), new Vector3(0.126, 0.091, 0.299)),
  new Box3(new Vector3(-0.081, 0.086, 0.108), new Vector3(0.076, 0.115, 0.296)),
];
const corners = boxes.flatMap((b) =>
  [0, 1, 2, 3, 4, 5, 6, 7].map(
    (i) =>
      new Vector3(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z),
  ),
);

/** Every corner on screen, in normalized device coordinates, through a real three.js camera. */
function onScreen(polar: number, aspect: number, margin: number) {
  const { target, distance } = wholeView(corners, polar, 35, aspect, margin);
  const camera = new PerspectiveCamera(35, aspect, 0.01, 10);
  const { position, up } = orbit(target, distance, polar, 0);
  camera.position.copy(position);
  camera.up.copy(up);
  camera.lookAt(target);
  camera.updateMatrixWorld();
  return corners.map((c) => c.clone().project(camera));
}

describe('wholeView', () => {
  for (const [name, aspect] of [
    ['a wide window', 1280 / 670],
    ['a phone held upright', 360 / 600],
  ] as const) {
    it(`puts every object in the picture, inside the margin, in ${name}`, () => {
      for (const polar of [0, 20, 30, 40]) {
        const points = onScreen(polar, aspect, 0.08);
        const xs = points.map((p) => p.x);
        const ys = points.map((p) => p.y);
        for (const p of points) {
          expect(Math.abs(p.x)).toBeLessThanOrEqual(0.92 + 1e-9);
          expect(Math.abs(p.y)).toBeLessThanOrEqual(0.92 + 1e-9);
          expect(p.z, 'in front of the camera').toBeLessThan(1);
        }
        // Tight on one side or the other, and centred: no more room than the margin asks.
        expect(Math.max(...xs.map(Math.abs), ...ys.map(Math.abs))).toBeGreaterThan(0.919);
        expect(Math.abs(Math.min(...xs) + Math.max(...xs)) / 2).toBeLessThan(0.01);
        expect(Math.abs(Math.min(...ys) + Math.max(...ys)) / 2).toBeLessThan(0.01);
      }
    });
  }

  it('stands back further for a narrower picture', () => {
    const wide = wholeView(corners, 30, 35, 2, 0.08).distance;
    const narrow = wholeView(corners, 30, 35, 0.6, 0.08).distance;
    expect(narrow).toBeGreaterThan(wide);
  });
});
