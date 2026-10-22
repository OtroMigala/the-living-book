// Turning a page by hand (F02), without the DOM, so it is unit-tested (Q08 AC2).
//
// A page's outer edge has a grip. A tap on it turns the page. A drag carries the sheet with the
// pointer: the turn's progress is how far the edge has travelled towards where it lands, and on
// release the page completes the turn past halfway and falls back before it (F02 AC2).

/** Movement under this many CSS px, released within TAP_MS, is a tap, not a drag. */
export const TAP_PX = 6;
export const TAP_MS = 400;

export type Step = 1 | -1;

/**
 * How far a turn has gone (0 to 1) when the grip has moved from startX to x. Forward, the right
 * page's edge travels left; back, the left page's edge travels right. In a spread the edge lands
 * two page widths away (on the far side of the other page); on a single page, one width away.
 */
export function progressOf(
  step: Step,
  startX: number,
  x: number,
  pageWidth: number,
  pagesPerView: 1 | 2,
): number {
  const travel = pageWidth * pagesPerView;
  if (travel <= 0) return 0;
  const moved = step > 0 ? startX - x : x - startX;
  return Math.min(1, Math.max(0, moved / travel));
}

/** Released past halfway, the turn completes; before it, the page falls back (F02 AC2). */
export const completes = (progress: number) => progress >= 0.5;

export const isTap = (distance: number, ms: number) => distance < TAP_PX && ms < TAP_MS;

/** The time left to finish a turn from `progress`, at the same speed as a whole turn. */
export function remainingMs(progress: number, complete: boolean, turnMs: number): number {
  return Math.round(turnMs * (complete ? 1 - progress : progress));
}
