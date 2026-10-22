// The 3D lab (Stage 4, step 1): the model the app uses loads, satisfies the contract at runtime,
// stays within the runtime budgets of spec 02, and renders nothing while idle (Q03 AC2, AC3).
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import type { LabState } from '../src/three/lab.ts';
import { readBudgets } from '../tools/budget-check/budgets.ts';

const budgets = readBudgets(readFileSync('specs/02-budget.md', 'utf8'));
const limit = (id: string, tier: 'mobile' | 'desktop') => budgets.get(id)?.[tier] ?? 0;

// WebGL in CI comes from a software renderer in Chromium; the lab is tested there.
test.skip(
  ({ browserName }) => browserName !== 'chromium',
  'WebGL tests run in the Chromium projects',
);

test('the model loads, uses its anchors and stays within the runtime budgets', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('lab/');
  await page.waitForFunction(
    () => window.__lab?.ready === true || window.__lab?.error !== undefined,
    null,
    {
      timeout: 20_000,
    },
  );
  const lab = (await page.evaluate(() => window.__lab)) as LabState;

  expect(lab.error, 'WebGL started').toBeUndefined();
  expect(lab.anchors).toBe('model');
  const tier = lab.tier as 'mobile' | 'desktop';
  expect(lab.drawCalls).toBeLessThanOrEqual(limit('BR4', tier));
  expect(lab.triangles).toBeLessThanOrEqual(limit('BR5', tier));
  expect(lab.pixelRatio).toBeLessThanOrEqual(limit('BR3', tier));
  expect(errors).toEqual([]);
});

test('nothing is rendered while nothing changes (BR2)', async ({ page }) => {
  await page.goto('lab/');
  await page.waitForFunction(() => window.__lab?.ready === true, null, { timeout: 20_000 });
  const before = await page.evaluate(() => window.__lab?.renders);
  await page.waitForTimeout(1000);
  expect(await page.evaluate(() => window.__lab?.renders)).toBe(before);
});

test('the phone profile gets the mobile tier and its pixel ratio cap', async ({ page }, info) => {
  test.skip(info.project.name !== 'pova6', 'only the phone profile');
  await page.goto('lab/');
  await page.waitForFunction(() => window.__lab?.ready === true, null, { timeout: 20_000 });
  const lab = (await page.evaluate(() => window.__lab)) as LabState;
  expect(lab.tier).toBe('mobile');
  expect(lab.pixelRatio).toBe(limit('BR3', 'mobile'));
});
