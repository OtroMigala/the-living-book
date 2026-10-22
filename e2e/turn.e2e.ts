// Spike A bench (Stage 4, step 2): every case runs, and the GPU and CPU variants draw the same
// page. Frame times are printed, not judged: CI has no GPU (risk R09), so the budgets are checked
// on the reference devices and written in the spike report.
import { expect, test } from '@playwright/test';
import type { TurnState } from '../src/three/turn-lab.ts';

test.skip(
  ({ browserName }) => browserName !== 'chromium',
  'WebGL tests run in the Chromium projects',
);

test('the bench runs every case, and the GPU and CPU variants agree', async ({ page }, info) => {
  test.setTimeout(120_000);
  await page.goto('lab/turn/?turns=1&auto=1');
  await page.waitForFunction(
    () => window.__turn?.done === true || window.__turn?.error !== undefined,
    null,
    {
      timeout: 110_000,
    },
  );
  const turn = (await page.evaluate(() => window.__turn)) as TurnState;

  expect(turn.error).toBeUndefined();
  expect(turn.results).toHaveLength(5);
  for (const r of turn.results) expect(r.frames).toBeGreaterThan(10);
  // Same formula in GLSL and in TypeScript: under 1% of the pixels may differ (edge antialiasing).
  expect(turn.variantsDiffer ?? 1).toBeLessThan(0.01);

  console.log(`[${info.project.name}] ${JSON.stringify(turn.device)}`);
  for (const r of turn.results) {
    console.log(
      `[${info.project.name}] ${r.variant} ${r.mesh}: frame p50 ${r.frameP50} p95 ${r.frameP95} max ${r.frameMax} ms, dropped ${r.dropped}/${r.frames}, cpu p95 ${r.cpuP95} ms, gpu p95 ${r.gpuP95 ?? 'n/a'} ms`,
    );
  }
});
