// Quality tiers (spec 02): which budget column a device falls in, and the canvas pixel ratio it
// gets. Pure, so it is unit-tested; a test also checks PIXEL_RATIO_CAP against BR3 in the spec.

export type Tier = 'mobile' | 'desktop';

export interface DeviceInfo {
  devicePixelRatio: number;
  coarsePointer: boolean;
  /** Viewport narrower than 600 CSS px. */
  narrow: boolean;
  saveData: boolean;
}

/** BR3. The phone measured at ×3 would otherwise fill four times the pixels of ×1.5. */
export const PIXEL_RATIO_CAP: Record<Tier, number> = { mobile: 1.5, desktop: 2 };

/** BR1, ms: 30 frames a second on the phone, 60 on the PC. Slower than this, flat pages are offered. */
export const FRAME_BUDGET_MS: Record<Tier, number> = { mobile: 33.3, desktop: 16.7 };

/**
 * Anisotropic filtering, at most this many samples, for every texture of the model and the pages.
 * A surface seen at a slant squeezes its texture in one direction only: without it, the GPU takes
 * the blurrier mipmap that suits the squeezed direction for both; with it, it samples along the
 * squeeze and keeps the detail across it. A phone's GPU pays more for each sample: fewer there.
 */
export const ANISOTROPY: Record<Tier, number> = { mobile: 4, desktop: 16 };

export const tierFor = (d: DeviceInfo): Tier =>
  d.coarsePointer || d.narrow || d.saveData ? 'mobile' : 'desktop';

export const pixelRatioFor = (d: DeviceInfo): number =>
  Math.min(d.devicePixelRatio, PIXEL_RATIO_CAP[tierFor(d)]);
