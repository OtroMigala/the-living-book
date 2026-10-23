/// <reference lib="dom" />
// The device as the quality tiers see it (tiers.ts stays pure), read from the browser. The 3D view
// and the reader's progress line both ask here, so they agree on the tier, and on the model it loads.

import type { DeviceInfo } from './tiers.ts';

export const readDevice = (): DeviceInfo => ({
  devicePixelRatio: window.devicePixelRatio,
  coarsePointer: matchMedia('(pointer: coarse)').matches,
  narrow: window.innerWidth < 600,
  saveData: Boolean(
    (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData,
  ),
});
