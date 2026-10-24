import { Matrix4, PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { clampLook, LOOK_LIMITS, lookAxes } from './free-look.ts';

/** The reading camera as view3d.ts aims it, tilted `tilt` degrees, looking at the origin. */
const reading = (tilt: number) => {
  const camera = new PerspectiveCamera();
  const t = (tilt * Math.PI) / 180;
  camera.position.set(0, Math.cos(t), -Math.sin(t));
  camera.up.set(0, 0, 1);
  camera.lookAt(0, 0, 0);
  return camera.quaternion.clone();
};

/** The camera's orientation for a look, as `camera.lookAt` makes it from forward and up. */
const orientation = (base: Quaternion, yaw: number, pitch: number) => {
  const { forward, up } = lookAxes(base, yaw, pitch);
  return new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(new Vector3(), forward, up));
};
const degrees = (radians: number) => (radians * 180) / Math.PI;
const TILTS = [0, 10, 20, 30, 40];

describe('lookAxes', () => {
  it('with no look, is the reading view, flat or tilted', () => {
    for (const tilt of TILTS) {
      const base = reading(tilt);
      expect(degrees(orientation(base, 0, 0).angleTo(base))).toBeLessThan(1e-6);
    }
  });

  it('turns toward the screen’s right with yaw, and toward its top with pitch', () => {
    const base = reading(0);
    const right = new Vector3(1, 0, 0).applyQuaternion(base);
    const top = new Vector3(0, 1, 0).applyQuaternion(base);
    expect(lookAxes(base, 10, 0).forward.dot(right)).toBeGreaterThan(0.17);
    expect(lookAxes(base, 0, 10).forward.dot(top)).toBeGreaterThan(0.17);
  });

  it('at the horizon, keeps the horizon level', () => {
    for (const tilt of TILTS) {
      const look = orientation(reading(tilt), 0, 90 - tilt);
      expect(new Vector3(0, 0, -1).applyQuaternion(look).y).toBeCloseTo(0, 9);
      expect(new Vector3(1, 0, 0).applyQuaternion(look).y).toBeCloseTo(0, 9);
    }
  });

  // Within the limits, the up vector never comes near the view's own axis, and a degree of input
  // never turns the picture by more than a few degrees: no flip anywhere. Past 62° back it flips.
  it('never flips the picture within the limits, and does past them', () => {
    for (const tilt of TILTS) {
      const base = reading(tilt);
      for (let yaw = -LOOK_LIMITS.side; yaw <= LOOK_LIMITS.side; yaw += 1) {
        for (let pitch = -LOOK_LIMITS.back; pitch <= 90 - tilt; pitch += 1) {
          const { forward, up } = lookAxes(base, yaw, pitch);
          expect(up.clone().addScaledVector(forward, -up.dot(forward)).length()).toBeGreaterThan(
            0.7,
          );
          const here = orientation(base, yaw, pitch);
          if (yaw < LOOK_LIMITS.side) {
            expect(degrees(here.angleTo(orientation(base, yaw + 1, pitch)))).toBeLessThan(4);
          }
          if (pitch < 90 - tilt) {
            expect(degrees(here.angleTo(orientation(base, yaw, pitch + 1)))).toBeLessThan(4);
          }
        }
      }
    }
    const flat = reading(0);
    expect(degrees(orientation(flat, 0, -62).angleTo(orientation(flat, 0, -63)))).toBeGreaterThan(
      90,
    );
  });
});

describe('clampLook', () => {
  it('stops at 75° to each side, 45° back and the horizon', () => {
    expect(clampLook(100, -80, 0)).toEqual({ yaw: 75, pitch: -45 });
    expect(clampLook(-100, 100, 0)).toEqual({ yaw: -75, pitch: 90 });
    expect(clampLook(0, 100, 40)).toEqual({ yaw: 0, pitch: 50 });
    expect(clampLook(12, -7, 20)).toEqual({ yaw: 12, pitch: -7 });
  });
});
