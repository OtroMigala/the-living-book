import { Box3, Matrix4, PerspectiveCamera, Quaternion, Ray, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { clampPolar, floorAt, ORBIT_LOWEST, orbit, orbitFloor, shorterTurn } from './free-look.ts';

const target = new Vector3(0.1, 0.02, -0.05);
const distance = 0.4;

/** The reading camera as view3d.ts aims it, tilted `tilt` degrees, looking at the target. */
const reading = (tilt: number) => {
  const camera = new PerspectiveCamera();
  const t = (tilt * Math.PI) / 180;
  camera.position.set(0, Math.cos(t), -Math.sin(t)).multiplyScalar(distance).add(target);
  camera.up.set(0, 0, 1);
  camera.lookAt(target);
  return camera;
};

/** The camera's orientation on the orbit, as `camera.lookAt` makes it. */
const orientation = (polar: number, azimuth: number) => {
  const { position, up } = orbit(target, distance, polar, azimuth);
  return new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(position, target, up));
};
const right = (q: Quaternion) => new Vector3(1, 0, 0).applyQuaternion(q);
const degrees = (radians: number) => (radians * 180) / Math.PI;

describe('orbit', () => {
  it('with no turn, is the reading view, flat or tilted', () => {
    for (const tilt of [0, 10, 20, 30, 40]) {
      const camera = reading(tilt);
      expect(orbit(target, distance, tilt, 0).position.distanceTo(camera.position)).toBeLessThan(
        1e-12,
      );
      // angleTo takes an acos near 1, which keeps about 1e-6° of rounding.
      expect(degrees(orientation(tilt, 0).angleTo(camera.quaternion))).toBeLessThan(1e-4);
    }
  });

  it('moves the camera toward the screen’s right with the azimuth, and lower with the angle', () => {
    const camera = reading(20);
    const side = right(camera.quaternion);
    const moved = orbit(target, distance, 20, 10).position.sub(camera.position);
    expect(moved.dot(side)).toBeGreaterThan(0);
    expect(orbit(target, distance, 30, 0).position.y).toBeLessThan(camera.position.y);
  });

  it('keeps the book in the middle, at the same distance, with the horizon level, all the way round', () => {
    for (let polar = 1; polar <= ORBIT_LOWEST; polar += 1) {
      for (let azimuth = -180; azimuth <= 180; azimuth += 5) {
        const { position, up } = orbit(target, distance, polar, azimuth);
        expect(position.distanceTo(target)).toBeCloseTo(distance, 12);
        expect(up.length()).toBeCloseTo(1, 12);
        expect(up.dot(target.clone().sub(position))).toBeCloseTo(0, 12);
        expect(right(orientation(polar, azimuth)).y).toBeCloseTo(0, 9);
      }
    }
  });

  it('straight above, turns the picture about its centre, as a turntable', () => {
    const above = orbit(target, distance, 0, 0).position;
    for (const azimuth of [30, 90, 180]) {
      expect(orbit(target, distance, 0, azimuth).position.distanceTo(above)).toBeLessThan(1e-12);
      expect(degrees(orientation(0, azimuth).angleTo(orientation(0, 0)))).toBeCloseTo(azimuth, 6);
    }
  });
});

describe('clampPolar and shorterTurn', () => {
  it('keep the camera between straight above and 80° from it', () => {
    expect(clampPolar(-10)).toBe(0);
    expect(clampPolar(35)).toBe(35);
    expect(clampPolar(120)).toBe(ORBIT_LOWEST);
  });

  it('give the way back to the reading view that turns least', () => {
    expect(shorterTurn(291)).toBe(-69);
    expect(shorterTurn(-291)).toBe(69);
    expect(shorterTurn(40)).toBe(40);
    expect(shorterTurn(-720 + 15)).toBe(15);
  });
});

describe('orbitFloor and floorAt', () => {
  // A stack of books behind the open book, on the far side (+z), as in the model.
  const stack = new Box3(new Vector3(-0.1, 0, 0.08), new Vector3(0.1, 0.12, 0.3));
  const floor = orbitFloor(target, distance, [stack]);

  /** Whether the line from the book to the camera crosses the stack. */
  const blocked = (polar: number, azimuth: number) => {
    const { position } = orbit(target, distance, polar, azimuth);
    const hit = new Ray(target, position.clone().sub(target).normalize()).intersectBox(
      stack,
      new Vector3(),
    );
    return hit !== null && hit.distanceTo(target) <= distance;
  };

  it('with nothing on the desk, lets the camera down to 80° all the way round', () => {
    expect(orbitFloor(target, distance, [])).toEqual(new Array(180).fill(ORBIT_LOWEST));
  });

  it('keeps the camera out of and in front of what stands on the desk', () => {
    expect(blocked(ORBIT_LOWEST, 180), 'the stack is in the way, low behind the book').toBe(true);
    // Every tenth of a degree, between the samples too.
    for (let tenth = 0; tenth < 3600; tenth++) {
      const azimuth = tenth / 10;
      expect(blocked(floorAt(floor, azimuth), azimuth), `${azimuth}°`).toBe(false);
    }
    expect(floorAt(floor, 180)).toBeLessThan(ORBIT_LOWEST);
    expect(floorAt(floor, 0), 'nothing on the reader’s side').toBe(ORBIT_LOWEST);
  });

  it('rises at most 1° per degree of the way round, so the camera climbs instead of jumping', () => {
    for (let i = 0; i < floor.length; i++) {
      const next = floor[(i + 1) % floor.length] ?? 0;
      expect(Math.abs(next - (floor[i] ?? 0))).toBeLessThanOrEqual(2 + 1e-9);
    }
  });

  it('reads between samples, all the way round', () => {
    const steps = [10, 20, 30, ...new Array(177).fill(40)];
    expect(floorAt(steps, 1)).toBe(15);
    expect(floorAt(steps, 361)).toBe(15);
    expect(floorAt(steps, -1)).toBe(25);
    expect(floorAt([], 50)).toBe(ORBIT_LOWEST);
  });
});
