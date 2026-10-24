import { describe, expect, it } from 'vitest';
import { profileLean } from './page-mesh.ts';

const degrees = (radians: number[]) => radians.map((r) => Math.round((r * 180) / Math.PI));

describe('profileLean', () => {
  it('is flat along a flat profile', () => {
    expect(
      degrees(
        profileLean([
          [0, 1],
          [1, 1],
          [2, 1],
        ]),
      ),
    ).toEqual([0, 0, 0]);
  });

  it('averages the two faces at a corner, as smooth normals do, and keeps each end face', () => {
    expect(
      degrees(
        profileLean([
          [0, 0],
          [1, 0],
          [2, 1],
        ]),
      ),
    ).toEqual([0, 23, 45]);
  });
});
