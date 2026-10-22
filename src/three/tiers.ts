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

export const tierFor = (d: DeviceInfo): Tier =>
  d.coarsePointer || d.narrow || d.saveData ? 'mobile' : 'desktop';

export const pixelRatioFor = (d: DeviceInfo): number =>
  Math.min(d.devicePixelRatio, PIXEL_RATIO_CAP[tierFor(d)]);
