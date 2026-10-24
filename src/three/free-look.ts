// Free look (F17): while F is held, the camera turns where it stands. A look is two angles from the
// reading view, in degrees: yaw turns the view toward the screen's right, pitch toward its top.
//
//   In the reading camera's own frame (x right, y up, looking down −z), the look turns −z by yaw
//   about y, then by pitch about x:
//     forward = (sin yaw, cos yaw · sin pitch, −cos yaw · cos pitch),   up = (0, cos pitch, sin pitch)
//   That rotation alone keeps the reading camera's up, which in the flat view is the page's top and
//   lies on the desk: looking to the side, the horizon would stand on end. So the up vector leans
//   toward the world's vertical by how level the view is, 1 − |forward · Y|: looking straight down,
//   the page's top stays up and the picture does not spin; at the horizon, the horizon is level.
//
//   Limits: at 90° to a side, pitch would turn the view about its own axis (gimbal lock), so the
//   sides stop at 75°. Back toward the reader the leaning up vector turns over at 62° (the tests
//   find the flip), so back stops at 45°. Up stops at the horizon: above it is only the background.

import { type Quaternion, Vector3 } from 'three';

export const LOOK_LIMITS = { side: 75, back: 45 } as const;

const WORLD_UP = new Vector3(0, 1, 0);
const RADIANS = Math.PI / 180;

/** A look kept within its limits, for a book tilted `tilt` degrees (F16): up to the horizon. */
export function clampLook(
  yaw: number,
  pitch: number,
  tilt: number,
): { yaw: number; pitch: number } {
  return {
    yaw: Math.min(LOOK_LIMITS.side, Math.max(-LOOK_LIMITS.side, yaw)),
    pitch: Math.min(90 - tilt, Math.max(-LOOK_LIMITS.back, pitch)),
  };
}

/** Where the camera looks and which way is up, for a look of (yaw, pitch) from the reading view. */
export function lookAxes(
  reading: Quaternion,
  yaw: number,
  pitch: number,
): { forward: Vector3; up: Vector3 } {
  const y = yaw * RADIANS;
  const p = pitch * RADIANS;
  const forward = new Vector3(
    Math.sin(y),
    Math.cos(y) * Math.sin(p),
    -Math.cos(y) * Math.cos(p),
  ).applyQuaternion(reading);
  const turned = new Vector3(0, Math.cos(p), Math.sin(p)).applyQuaternion(reading);
  const level = 1 - Math.abs(forward.y);
  const up = turned
    .multiplyScalar(1 - level)
    .addScaledVector(WORLD_UP, level)
    .normalize();
  return { forward, up };
}
