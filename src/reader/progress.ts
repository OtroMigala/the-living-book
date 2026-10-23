// F15 AC2: how much of the 3D book has arrived, by bytes. The build lists the files the 3D view
// loads and their sizes (pages/book-bytes.json); the page reports the bytes of each as they come.
// A file never counts for more than its listed size, so the share reaches 1 exactly when every
// file has arrived, and it only moves forward: a report that would lower it is ignored.

export class ByteProgress {
  private readonly expected: Map<string, number>;
  private readonly got = new Map<string, number>();
  private readonly total: number;
  private shown = 0;

  constructor(expected: Record<string, number>) {
    this.expected = new Map(Object.entries(expected).filter(([, bytes]) => bytes > 0));
    this.total = [...this.expected.values()].reduce((sum, bytes) => sum + bytes, 0);
  }

  /** Records `bytes` received so far of `file`; returns the share of the whole, from 0 to 1. */
  report(file: string, bytes: number): number {
    const limit = this.expected.get(file);
    if (limit === undefined || this.total === 0) return this.shown;
    this.got.set(file, Math.max(this.got.get(file) ?? 0, Math.min(bytes, limit)));
    const sum = [...this.got.values()].reduce((a, b) => a + b, 0);
    this.shown = Math.max(this.shown, sum / this.total);
    return this.shown;
  }

  /** Marks `file` as complete, whatever its reports said (a compressed transfer, a cache hit). */
  done(file: string): number {
    return this.report(file, this.expected.get(file) ?? 0);
  }

  /** Everything has arrived (the view that needed it is ready): the share is 1. */
  complete(): number {
    for (const file of this.expected.keys()) this.done(file);
    return this.shown;
  }

  get share(): number {
    return this.shown;
  }
}
