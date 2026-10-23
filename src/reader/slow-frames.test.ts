import { describe, expect, it } from 'vitest';
import { SlowFrames } from './slow-frames.ts';

/** Feeds `count` frames of `ms` each and returns whether any of them was judged slow. */
const feed = (slow: SlowFrames, count: number, ms: number) => {
  let said = false;
  for (let i = 0; i < count; i++) said = slow.add(ms) || said;
  return said;
};

describe('SlowFrames (F09 AC3)', () => {
  it('says nothing before 3 s of animated frames, however slow they are', () => {
    // 2.9 s of frames at 100 ms: slow, but not for long enough.
    expect(feed(new SlowFrames(33.3), 29, 100)).toBe(false);
  });

  it('says slow once 3 s of frames ran slower than the budget', () => {
    // The phone's budget is 33.3 ms (30 frames a second); these run at 25.
    expect(feed(new SlowFrames(33.3), 75, 40)).toBe(true);
  });

  it('never says slow when the frames keep within the budget, for as long as they last', () => {
    // A 90 Hz screen, as on the Pova 6: 11.1 ms a frame, for a minute of turns.
    expect(feed(new SlowFrames(33.3), 5400, 11.1)).toBe(false);
  });

  it('judges the latest 3 s only: a slow start forgotten by smooth frames after it', () => {
    const slow = new SlowFrames(16.7);
    feed(slow, 20, 100); // 2 s of hiccups while things load
    expect(feed(slow, 600, 10)).toBe(false); // then 6 s at 100 frames a second
  });

  it('judges the median: one long frame in smooth ones is not slow', () => {
    const slow = new SlowFrames(16.7);
    slow.add(400);
    expect(feed(slow, 400, 8)).toBe(false);
  });

  it('says slow when most frames are late, even with fast ones among them', () => {
    const slow = new SlowFrames(33.3);
    let said = false;
    // Two late frames (50 ms) for every quick one (10 ms), for 4 s.
    for (let i = 0; i < 110; i++) said = slow.add(i % 3 === 2 ? 10 : 50) || said;
    expect(said).toBe(true);
  });
});
