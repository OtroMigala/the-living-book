// Dust in the air of an old room (spike D): motes floating over the table, warm as the candle's
// light, drawn in the scene's own pass (no extra pass, BR6). They move only when a frame is drawn
// anyway, so nothing is drawn for them at rest (BR2); the 3D view shows them only away from the
// reading view, where they would cross the text.

import {
  AdditiveBlending,
  type Box3,
  BufferGeometry,
  CanvasTexture,
  Float32BufferAttribute,
  Points,
  PointsMaterial,
  Vector3,
} from 'three';

/** A small seeded random generator (mulberry32): the same motes on every load. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Where `count` motes float in `space`, as x, y, z triples: even at random, the same every load. */
export function motePositions(space: Box3, count: number): Float32Array {
  const random = seeded(7);
  const extent = space.getSize(new Vector3());
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = space.min.x + random() * extent.x;
    positions[i * 3 + 1] = space.min.y + random() * extent.y;
    positions[i * 3 + 2] = space.min.z + random() * extent.z;
  }
  return positions;
}

/** `count` motes spread through `space`, each a soft round dot `size` metres across. */
export function dustMotes(
  space: Box3,
  count: number,
  size: number,
): Points<BufferGeometry, PointsMaterial> {
  const positions = motePositions(space, count);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  const dot = document.createElement('canvas');
  dot.width = 32;
  dot.height = 32;
  const context = dot.getContext('2d');
  if (context) {
    const glow = context.createRadialGradient(16, 16, 0, 16, 16, 16);
    glow.addColorStop(0, 'rgba(255, 255, 255, 1)');
    glow.addColorStop(0.4, 'rgba(255, 255, 255, 0.35)');
    glow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = glow;
    context.fillRect(0, 0, 32, 32);
  }
  const material = new PointsMaterial({
    size,
    map: new CanvasTexture(dot),
    color: 0xffdcaa,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    blending: AdditiveBlending,
    sizeAttenuation: true,
  });
  return new Points(geometry, material);
}
