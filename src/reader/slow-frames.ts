// F09 AC3: is the 3D book too slow on this device? The view draws only while something moves
// (BR2), so the frames worth judging are the animated ones: turns and tilts. This keeps the
// durations of the latest 3 s of them, however far apart the animations were, and says "slow"
// when the median of those frames is over the tier's frame budget (BR1): at least half of them
// were late. The median, not the mean: hiccups while the textures load must not count as a slow
// device. The reader is then offered flat pages; nothing switches without the reader's say.

export class SlowFrames {
  private readonly budgetMs: number;
  private readonly windowMs: number;
  private readonly frames: number[] = [];
  private total = 0;

  constructor(budgetMs: number, windowMs = 3000) {
    this.budgetMs = budgetMs;
    this.windowMs = windowMs;
  }

  /** Adds an animated frame's duration (ms). True when 3 s of frames ran slower than budget. */
  add(ms: number): boolean {
    this.frames.push(ms);
    this.total += ms;
    // Drop the oldest frames while the rest still cover the window.
    while (this.frames.length > 1 && this.total - (this.frames[0] ?? 0) >= this.windowMs) {
      this.total -= this.frames.shift() ?? 0;
    }
    if (this.total < this.windowMs) return false;
    const sorted = [...this.frames].sort((a, b) => a - b);
    return (sorted[Math.floor(sorted.length / 2)] ?? 0) > this.budgetMs;
  }
}
