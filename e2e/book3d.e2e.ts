// The reader's 3D view (Stage 4, step 5c): the HTML pages lie on the drawn pages, flat and tilted,
// within 2 CSS px (F03 AC2, by the pixel probe); their text can be selected and found (F03 AC1);
// nothing is drawn while nothing changes (BR2); the mouse wheel tilts the book with an easing, and
// at once with reduced motion (F16 AC1, Q05 AC3); ?mode=2d gives flat pages.
//
// Where a browser has no WebGL here (Firefox on the CI runner), the reader is in 2D and these
// tests are skipped: the 2D view has its own tests in book.e2e.ts.
import { expect, type Page, type TestInfo, test } from '@playwright/test';
import type { ReaderState } from '../src/reader/reader.ts';

async function open3d(page: Page, info: TestInfo, path = 'book/') {
  await page.goto(path);
  await page.waitForFunction(() => window.__reader?.ready === true, null, { timeout: 30_000 });
  const state = (await page.evaluate(() => window.__reader)) as ReaderState;
  test.skip(state.mode !== '3d' && info.project.name === 'firefox', 'no WebGL in this Firefox');
  expect(state.mode, 'the 3D view where WebGL runs').toBe('3d');
  return state;
}

const probe = (page: Page) => page.evaluate(() => window.__view3d?.probe() ?? []);
const worst = (errors: { error: number }[]) => Math.max(...errors.map((e) => e.error));

test('the HTML pages lie on the drawn pages, flat, tilted and after a turn (F03 AC2)', async ({
  page,
}, info) => {
  await open3d(page, info);
  const flat = await probe(page);
  expect(flat.length).toBeGreaterThan(0);
  expect(worst(flat), JSON.stringify(flat)).toBeLessThanOrEqual(2);

  await page.evaluate(() => window.__view3d?.setTilt(20));
  const textures = await page.evaluate(() => window.__view3d?.textures);
  // A browser that draws matrix3d without perspective shows textures instead (ADR 0008).
  if (!textures) expect(worst(await probe(page))).toBeLessThanOrEqual(2);

  await page.evaluate(() => window.__view3d?.setTilt(0));
  await page.keyboard.press('ArrowRight');
  expect(worst(await probe(page))).toBeLessThanOrEqual(2);
  console.log(`[${info.project.name}] flat ${worst(flat)} px; tilted 20°: textures ${textures}`);
});

test('the text on the 3D pages can be selected and found (F03 AC1)', async ({ page }, info) => {
  await open3d(page, info);
  const paragraph = page.locator('#reader-pages .page p').first();
  const word = ((await paragraph.textContent()) ?? '')
    .split(' ')
    .find((w) => /^[A-Za-z]{6,}$/.test(w));
  await paragraph.dblclick({ position: { x: 40, y: 10 } });
  expect(
    (await page.evaluate(() => window.getSelection()?.toString().trim() ?? '')).length,
  ).toBeGreaterThan(0);
  await page.evaluate(() => window.getSelection()?.removeAllRanges());
  const found = await page.evaluate(
    (w) => (window as Window & { find?: (s: string) => boolean }).find?.(w ?? '') ?? null,
    word,
  );
  if (found !== null) expect(found).toBe(true);
});

test('nothing is drawn while nothing changes (BR2)', async ({ page }, info) => {
  await open3d(page, info);
  const before = await page.evaluate(() => window.__view3d?.renders);
  await page.waitForTimeout(1000);
  expect(await page.evaluate(() => window.__view3d?.renders)).toBe(before);
});

/** The tilt on every frame after a wheel over the desk, until it settles. */
async function wheelTilt(page: Page, deltaY: number) {
  await page.evaluate(() => {
    const samples: number[] = [];
    (window as Window & { __tilts?: number[] }).__tilts = samples;
    const tick = () => {
      samples.push(window.__view3d?.tilt ?? 0);
      requestAnimationFrame(tick);
    };
    tick();
  });
  await page.mouse.move(12, 12);
  await page.mouse.wheel(0, deltaY);
  await page.waitForFunction(
    () => {
      const v = window.__view3d;
      return v !== undefined && v.tiltTarget > 0 && v.tilt === v.tiltTarget;
    },
    null,
    { timeout: 10_000 },
  );
  const target = await page.evaluate(() => window.__view3d?.tiltTarget ?? 0);
  const samples = await page.evaluate(
    () => (window as Window & { __tilts?: number[] }).__tilts ?? [],
  );
  return { target, between: samples.filter((a) => a > 0.5 && a < target - 0.5) };
}

test('the mouse wheel tilts the book with an easing, and back to flat (F16 AC1)', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'pova6', 'a phone has no mouse wheel');
  await open3d(page, info);
  const down = await wheelTilt(page, 300);
  expect(down.target).toBeGreaterThan(0);
  expect(down.between.length, 'angles on the way: an easing, not a jump').toBeGreaterThan(0);
  await page.mouse.wheel(0, -1000);
  await page.waitForFunction(() => window.__view3d?.tilt === 0, null, { timeout: 10_000 });
  expect(worst(await probe(page))).toBeLessThanOrEqual(2);
});

test('with reduced motion the wheel changes the angle at once (F16 AC1, Q05 AC3)', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'pova6', 'a phone has no mouse wheel');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open3d(page, info);
  const down = await wheelTilt(page, 300);
  expect(down.between).toEqual([]);
});

test('?mode=2d gives flat pages, without the 3D desk', async ({ page }) => {
  await page.goto('book/?mode=2d');
  await page.waitForFunction(() => window.__reader?.ready === true, null, { timeout: 20_000 });
  expect(await page.evaluate(() => window.__reader?.mode)).toBe('2d');
  await expect(page.locator('#reader-canvas')).toBeHidden();
  await expect(page.locator('#reader-view .page').first()).toBeVisible();
});
