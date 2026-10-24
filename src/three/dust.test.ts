import { Box3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { motePositions } from './dust.ts';

describe('motePositions', () => {
  const space = new Box3(new Vector3(-0.6, 0, -0.4), new Vector3(0.7, 0.6, 0.5));

  it('puts every mote inside the space, and the same motes on every load', () => {
    const positions = motePositions(space, 500);
    expect(positions).toHaveLength(1500);
    for (let i = 0; i < 500; i++) {
      const p = new Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      expect(space.containsPoint(p), `mote ${i}`).toBe(true);
    }
    expect(motePositions(space, 500)).toEqual(positions);
  });

  it('spreads them through the whole space, not in a corner', () => {
    const positions = motePositions(space, 500);
    const ys = Array.from({ length: 500 }, (_, i) => positions[i * 3 + 1] ?? 0);
    const low = ys.filter((y) => y < 0.3).length;
    // About half below the middle height: for 500 motes chance keeps it within ±10%.
    expect(low).toBeGreaterThan(200);
    expect(low).toBeLessThan(300);
  });
});
