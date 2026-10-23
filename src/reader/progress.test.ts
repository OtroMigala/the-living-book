import { describe, expect, it } from 'vitest';
import { ByteProgress } from './progress.ts';

const files = { '/a.js': 600, '/model.glb': 400 };

describe('ByteProgress (F15 AC2)', () => {
  it('weighs each file by its bytes', () => {
    const progress = new ByteProgress(files);
    expect(progress.done('/a.js')).toBeCloseTo(0.6);
    expect(progress.report('/model.glb', 200)).toBeCloseTo(0.8);
    expect(progress.done('/model.glb')).toBe(1);
  });

  it('only moves forward: a smaller report later changes nothing', () => {
    const progress = new ByteProgress(files);
    progress.report('/model.glb', 300);
    expect(progress.report('/model.glb', 100)).toBeCloseTo(0.3);
  });

  it('counts a file for no more than its listed size, so the end is exactly 1', () => {
    const progress = new ByteProgress(files);
    // An uncompressed transfer can be larger than the compressed size the build listed.
    expect(progress.report('/a.js', 5000)).toBeCloseTo(0.6);
    expect(progress.done('/model.glb')).toBe(1);
  });

  it('ignores files it was not told about', () => {
    expect(new ByteProgress(files).report('/other.js', 999)).toBe(0);
  });

  it('completes at once when told everything has arrived', () => {
    const progress = new ByteProgress(files);
    progress.report('/model.glb', 100);
    expect(progress.complete()).toBe(1);
  });

  it('stays at 0 when there is nothing to count', () => {
    expect(new ByteProgress({}).report('/a.js', 10)).toBe(0);
  });
});
