// The reader's 3D view (Stage 4, step 5c): the HTML pages lie on the drawn pages, flat and tilted,
// within 2 CSS px (F03 AC2, by the pixel probe); their text can be selected and found (F03 AC1);
// nothing is drawn while nothing changes (BR2); the mouse wheel tilts the book with an easing, and
// at once with reduced motion (F16 AC1, Q05 AC3); holding F, the camera looks around (F17); ?mode=2d
// gives flat pages.
//
// Where a browser has no WebGL here (Firefox on the CI runner), the reader is in 2D and these
// tests are skipped: the 2D view has its own tests in book.e2e.ts.
import { readFileSync } from 'node:fs';
import { expect, type Page, type TestInfo, test } from '@playwright/test';
import type { ReaderState } from '../src/reader/reader.ts';
import { readBudgets } from '../tools/budget-check/budgets.ts';

const budgets = readBudgets(readFileSync('specs/02-budget.md', 'utf8'));
const limit = (id: string, tier: 'mobile' | 'desktop') => budgets.get(id)?.[tier] ?? 0;

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

test('a page turns as a bending sheet, forward and back, and the HTML comes back (F02)', async ({
  page,
}, info) => {
  await open3d(page, info, 'book/#page=2&class=regular');
  const before = (await page.evaluate(() => window.__reader?.page)) ?? 0;
  for (const [key, direction] of [
    ['ArrowRight', 'forward'],
    ['ArrowLeft', 'backward'],
  ] as const) {
    // Every shader is compiled before the reader is shown (BL3), and the turning sheet draws with
    // the still pages' program. Counted before each turn: the alignment probe has its own.
    const programs = await page.evaluate(() => window.__view3d?.programs());
    expect(programs, 'shader programs before the turn').toBeGreaterThan(0);
    await page.keyboard.press(key);
    // While it turns, the HTML is hidden and the pages are textures. Read in the page, in the first
    // frame the turn is seen: a turn lasts 900 ms, and a busy test machine can take longer than
    // that between two calls (CI did, 2026-10-23, and the check found the turn already over).
    const during = await page.waitForFunction(
      () =>
        window.__view3d?.turning === true && {
          visibility: getComputedStyle(document.getElementById('reader-pages') as HTMLElement)
            .visibility,
          programs: window.__view3d?.programs() ?? -1,
        },
      null,
      { timeout: 5_000 },
    );
    const seen = (await during.jsonValue()) as { visibility: string; programs: number };
    expect(seen.visibility, 'the HTML hidden while the sheet turns').toBe('hidden');
    // A sheet with shaders of its own would compile them in the turn's first frame.
    expect(seen.programs, 'a turn compiled a shader').toBe(programs);
    await page.waitForFunction(() => window.__view3d?.turning === false, null, { timeout: 5_000 });
    await expect(page.locator('#reader-pages')).toHaveCSS('visibility', 'visible');
    const turn = await page.evaluate(() => window.__view3d?.lastTurn);
    expect(turn?.direction).toBe(direction);
    // Animated, not a jump: at least one frame drawn before the one that lands the sheet. How many
    // depends on the machine, not on the reader: with the real model, software rendering under
    // four browsers in parallel drew 2 frames in a turn, the PC's GPU 54–55 (Stage 6). Speed is
    // BR1's, measured on the devices.
    expect(turn?.frames ?? 0, 'frames drawn in the turn').toBeGreaterThanOrEqual(2);
    expect(worst(await probe(page)), 'the HTML back on the page').toBeLessThanOrEqual(2);
    console.log(
      `[${info.project.name}] ${direction}: ${turn?.frames} frames, p95 ${turn?.p95} ms, textures painted in ${turn?.paintMs} ms`,
    );
  }
  expect(await page.evaluate(() => window.__reader?.page)).toBe(before);
});

test('?debug=1 shows the long tasks since the first paint and the last turn (BL3, BR1)', async ({
  page,
}, info) => {
  await open3d(page, info, 'book/?debug=1');
  const readout = page.locator('#reader-debug');
  await expect(readout).toBeVisible();
  // Chromium reports long tasks; Firefox and WebKit do not, and the readout says so.
  const chromium = info.project.name === 'chromium' || info.project.name === 'pova6';
  await expect(readout).toContainText(chromium ? 'ms blocking, longest' : 'not reported here');
  await expect(readout).toContainText('3d: turn a page');
  await page.keyboard.press('ArrowRight');
  await expect(readout).toContainText('forward: ', { timeout: 5_000 });
  console.log(`[${info.project.name}] ${await readout.textContent()}`);
});

/** Drags a grip by a share of the way its edge travels, and lets go. */
async function dragGrip(page: Page, step: 1 | -1, share: number) {
  const box = await page.locator(`.grip[data-step="${step}"]`).last().boundingBox();
  const state = (await page.evaluate(() => window.__reader)) as ReaderState;
  const pageWidth =
    (await page
      .locator('.grip')
      .first()
      .evaluate((g) => g.closest('.page')?.getBoundingClientRect().width)) ?? 0;
  if (!box) throw new Error('no grip on screen');
  const x0 = box.x + box.width / 2;
  const y0 = box.y + box.height / 2;
  const travel = pageWidth * state.pagesPerView * share * (step > 0 ? -1 : 1);
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) await page.mouse.move(x0 + (travel * i) / 8, y0);
  await page.mouse.up();
}

test('a page follows a drag of its edge, and the halfway rule decides (F02 AC1, AC2)', async ({
  page,
}, info) => {
  await open3d(page, info, 'book/#page=2&class=regular');
  const at = async () => (await page.evaluate(() => window.__reader?.page)) ?? 0;
  const settle = () =>
    page.waitForFunction(() => window.__view3d?.turning === false, null, { timeout: 5_000 });
  const start = await at();

  await dragGrip(page, 1, 0.25);
  await settle();
  expect(await at(), 'let go before halfway: the page falls back').toBe(start);
  expect(await page.evaluate(() => window.__view3d?.lastTurn?.completed)).toBe(false);
  expect(worst(await probe(page))).toBeLessThanOrEqual(2);

  await dragGrip(page, 1, 0.75);
  await settle();
  const turned = await at();
  expect(turned, 'let go past halfway: the turn completes').toBeGreaterThan(start);

  const grip = await page.locator('.grip[data-step="1"]').last().boundingBox();
  if (grip) await page.mouse.click(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.waitForFunction((p) => (window.__reader?.page ?? p) > p, turned, { timeout: 5_000 });
});

test('a window resized during a turn waits for the page to land (F02)', async ({ page }, info) => {
  await open3d(page, info);
  // A drag holds the turn for as long as the test needs: start one, then resize the window.
  const grip = page.locator('.grip[data-step="1"]').last();
  const box = await grip.boundingBox();
  if (!box) throw new Error('no grip on screen');
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 40, y, { steps: 4 });
  await page.waitForFunction(() => window.__view3d?.turning === true, null, { timeout: 5_000 });
  const size = page.viewportSize() ?? { width: 1280, height: 720 };
  await page.setViewportSize({ width: size.width - 120, height: size.height - 40 });
  await page.waitForTimeout(300);
  const visibility = () =>
    page.evaluate(
      () => getComputedStyle(document.getElementById('reader-pages') as HTMLElement).visibility,
    );
  expect(await visibility(), 'the HTML stays off the turning sheet').toBe('hidden');
  await page.mouse.up(); // let go before halfway: the page falls back
  await page.waitForFunction(() => window.__view3d?.turning === false, null, { timeout: 5_000 });
  expect(await visibility()).toBe('visible');
  // Laid out for the new size once the page has landed.
  expect(worst(await probe(page))).toBeLessThanOrEqual(2);
});

test('with reduced motion the pages change without the turn (Q05 AC3)', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const first = await open3d(page, info);
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction((p) => (window.__reader?.page ?? p) !== p, first.page);
  expect(await page.evaluate(() => window.__view3d?.lastTurn)).toBeNull();
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

test('↑ and ↓ tilt the book, and so does a vertical drag on the desk (F16 AC2)', async ({
  page,
}, info) => {
  // With reduced motion each change lands at once, so the angle can be read right after it.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open3d(page, info);
  const tilt = () => page.evaluate(() => window.__view3d?.tilt ?? Number.NaN);
  await page.keyboard.press('ArrowDown');
  expect(await tilt()).toBe(5);
  await page.keyboard.press('ArrowUp');
  expect(await tilt()).toBe(0);

  // A drag down the desk, beside the pages: 150 px tilts it 20°.
  const box = await page.locator('#reader-canvas').boundingBox();
  if (!box) throw new Error('no desk on screen');
  const x = box.x + 6;
  const y = box.y + 40;
  if (info.project.name === 'pova6') {
    // A real touch on the phone's profile: the pointer events say "touch".
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    for (let i = 1; i <= 6; i++) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x, y: y + (150 * i) / 6 }],
      });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x, y + 150, { steps: 6 });
    await page.mouse.up();
  }
  expect(await tilt()).toBeCloseTo(20, 5);
});

test('tilted to 10°, 25° and 40°, the HTML stays on the 3D pages, or textures show them (F16 AC3)', async ({
  page,
}, info) => {
  await open3d(page, info);
  for (const angle of [10, 25, 40]) {
    await page.evaluate((a) => window.__view3d?.setTilt(a), angle);
    if (await page.evaluate(() => window.__view3d?.textures)) {
      // A browser that draws matrix3d without its perspective (ADR 0008, point 4).
      await expect(page.locator('#reader-pages')).toHaveCSS('opacity', '0');
    } else {
      expect(worst(await probe(page)), `${angle}°`).toBeLessThanOrEqual(2);
    }
  }
});

const look = (page: Page) =>
  page.evaluate(() => {
    const v = window.__view3d;
    return { ...(v?.look ?? { on: false, yaw: Number.NaN, pitch: Number.NaN }), tilt: v?.tilt };
  });

test('holding F, the mouse turns the camera; let go, the view eases back to reading (F17 AC1, AC3)', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'pova6', 'a phone has no F key');
  await open3d(page, info);
  // Low on the screen, so the mouse can go far up without leaving the page (no events outside it).
  await page.mouse.move(300, 650);
  await page.keyboard.down('f');
  // 0.2° per pixel: right and up as the mouse goes.
  await page.mouse.move(400, 650, { steps: 4 });
  expect(await look(page)).toMatchObject({ on: true, yaw: 20, pitch: 0 });
  await page.mouse.move(400, 600, { steps: 4 });
  expect(await look(page)).toMatchObject({ yaw: 20, pitch: 10 });
  // While the camera looks around, the pages are textures; the HTML stays for screen readers.
  await expect(page.locator('#reader-pages')).toHaveCSS('opacity', '0');
  await expect(page.locator('#reader-pages .page p').first()).toBeAttached();
  // The limits: 75° to each side, and up to the horizon (90° from the flat view).
  await page.mouse.move(1270, 5, { steps: 4 });
  expect(await look(page)).toMatchObject({ yaw: 75, pitch: 90 });

  // Let go: the angles on every frame until the look ends, as the wheel's tilt is sampled.
  await page.evaluate(() => {
    const samples: number[] = [];
    (window as Window & { __yaws?: number[] }).__yaws = samples;
    const tick = () => {
      samples.push(window.__view3d?.look.yaw ?? 0);
      if (window.__view3d?.look.on) requestAnimationFrame(tick);
    };
    tick();
  });
  await page.keyboard.up('f');
  await page.waitForFunction(() => window.__view3d?.look.on === false, null, { timeout: 10_000 });
  const yaws = await page.evaluate(() => (window as Window & { __yaws?: number[] }).__yaws ?? []);
  expect(
    yaws.filter((a) => a > 0.5 && a < 74.5).length,
    'angles on the way back: an easing, not a jump',
  ).toBeGreaterThan(0);
  expect(await look(page)).toMatchObject({ on: false, yaw: 0, pitch: 0 });
  await expect(page.locator('#reader-pages')).toHaveCSS('opacity', '1');
  expect(worst(await probe(page)), 'the HTML back on the pages').toBeLessThanOrEqual(2);
  // And nothing more is drawn once it has landed (BR2).
  const renders = await page.evaluate(() => window.__view3d?.renders);
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => window.__view3d?.renders)).toBe(renders);
});

test('with reduced motion, letting F go is back to reading at once (F17 AC1, Q05 AC3)', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'pova6', 'a phone has no F key');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open3d(page, info);
  await page.mouse.move(400, 300);
  await page.keyboard.down('f');
  await page.mouse.move(400, 200, { steps: 4 });
  expect(await look(page)).toMatchObject({ on: true, yaw: 0, pitch: 20 });
  await page.keyboard.up('f');
  expect(await look(page)).toMatchObject({ on: false, yaw: 0, pitch: 0 });
});

test('holding F, the arrows turn the camera, not the pages; F with Ctrl, in a field or after the window leaves does not (F17 AC2)', async ({
  page,
}, info) => {
  test.skip(info.project.name === 'pova6', 'a phone has no F key');
  // With reduced motion each step lands at once, so the angle can be read right after it.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open3d(page, info);
  const at = () => page.evaluate(() => window.__reader?.page);
  const start = await at();
  await page.keyboard.down('f');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowUp');
  expect(await look(page)).toMatchObject({ on: true, yaw: 10, pitch: 5, tilt: 0 });
  expect(await at(), 'no page turned').toBe(start);
  await page.keyboard.up('f');
  expect(await look(page)).toMatchObject({ on: false, yaw: 0, pitch: 0 });

  // Ctrl + F is the browser's find: the camera stays.
  await page.mouse.move(400, 300);
  await page.keyboard.down('Control');
  await page.keyboard.down('f');
  await page.mouse.move(500, 300, { steps: 4 });
  await page.keyboard.up('f');
  await page.keyboard.up('Control');
  expect(await look(page)).toMatchObject({ on: false, yaw: 0 });

  // An F typed in a field is a letter.
  await page.evaluate(() => {
    const field = document.createElement('input');
    field.id = 'typing';
    document.body.append(field);
    field.focus();
  });
  await page.keyboard.down('f');
  await page.mouse.move(400, 300, { steps: 4 });
  await page.keyboard.up('f');
  expect(await look(page)).toMatchObject({ on: false, yaw: 0 });
  await expect(page.locator('#typing')).toHaveValue('f');
  await page.evaluate(() => document.getElementById('typing')?.remove());

  // The window leaves while F is down: its keyup never comes, and the view goes back.
  await page.keyboard.down('f');
  await page.mouse.move(500, 300, { steps: 4 });
  expect((await look(page)).on).toBe(true);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  expect(await look(page)).toMatchObject({ on: false, yaw: 0 });
  await page.keyboard.up('f');
});

test('the 3D and 2D views show the same page breaks (F07 AC2)', async ({ page }, info) => {
  const three = await open3d(page, info);
  await page.goto('book/?mode=2d');
  await page.waitForFunction(() => window.__reader?.ready === true, null, { timeout: 20_000 });
  const two = (await page.evaluate(() => window.__reader)) as ReaderState;
  expect(two.mode).toBe('2d');
  expect(two.pageClass).toBe(three.pageClass);
  expect(two.total).toBe(three.total);
  expect(two.breaks).toBe(three.breaks);
});

test('every frame stays within the draw-call and triangle budgets, also mid-turn (Q03 AC3)', async ({
  page,
}, info) => {
  await open3d(page, info);
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => window.__view3d?.turning === true, null, { timeout: 5_000 });
  await page.waitForFunction(() => window.__view3d?.turning === false, null, { timeout: 5_000 });
  const frame = await page.evaluate(() => window.__view3d?.frame);
  const tier = info.project.name === 'pova6' ? 'mobile' : 'desktop';
  console.log(
    `[${info.project.name}] most in one frame: ${frame?.maxCalls} draw calls, ${frame?.maxTriangles} triangles`,
  );
  expect(frame?.maxCalls ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(limit('BR4', tier));
  expect(frame?.maxTriangles ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(limit('BR5', tier));
});

test('the switch shows the same place as flat pages, and back in 3D (F09 AC2)', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open3d(page, info);
  await page.keyboard.press('PageDown');
  await page.keyboard.press('PageDown');
  const read = async () => (await page.evaluate(() => window.__reader)) as ReaderState;
  const three = await read();
  const toggle = page.locator('#reader-mode');
  await expect(toggle).toBeVisible();
  await toggle.click();
  await page.waitForFunction(() => window.__reader?.mode === '2d');
  const two = await read();
  expect(two.page).toBe(three.page);
  expect(two.span).toEqual(three.span);
  await expect(page.locator('#reader-canvas')).toBeHidden();
  await expect(page.locator('#reader-view .page').first()).toBeVisible();
  // Meanwhile the 3D view sleeps: ↓ does not tilt it, and nothing is drawn.
  const renders = await page.evaluate(() => window.__view3d?.renders);
  await page.keyboard.press('ArrowDown');
  expect(await page.evaluate(() => window.__view3d?.tilt)).toBe(0);
  expect(await page.evaluate(() => window.__view3d?.renders)).toBe(renders);
  await toggle.click();
  await page.waitForFunction(() => window.__reader?.mode === '3d');
  expect((await read()).page).toBe(three.page);
  expect(worst(await probe(page))).toBeLessThanOrEqual(2);
});

test('when the GPU context is lost, the book goes on flat at the same page (F09 AC1)', async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open3d(page, info);
  await page.keyboard.press('PageDown');
  const before = (await page.evaluate(() => window.__reader)) as ReaderState;
  const lost = await page.evaluate(() => {
    const canvas = document.getElementById('reader-canvas') as HTMLCanvasElement;
    const lose = canvas.getContext('webgl2')?.getExtension('WEBGL_lose_context');
    lose?.loseContext();
    return lose !== undefined && lose !== null;
  });
  test.skip(!lost, 'this browser cannot simulate a lost context');
  await page.waitForFunction(() => window.__reader?.mode === '2d', null, { timeout: 5_000 });
  expect(await page.evaluate(() => window.__reader?.page)).toBe(before.page);
  await expect(page.locator('#reader-view .page').first()).toBeVisible();
  await expect(page.locator('#reader-note')).not.toBeEmpty();
  await expect(page.locator('#reader-mode')).toBeHidden();
});

test('a slow 3D view offers flat pages, and switches only when asked (F09 AC3)', async ({
  page,
  browserName,
}, info) => {
  test.skip(browserName !== 'chromium', 'slowing the CPU down needs Chromium');
  await open3d(page, info);
  // Twenty times slower: every frame of a turn misses the tier's budget.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 20 });
  const note = page.locator('#reader-note');
  // Forward and back, so the book never runs out of pages (a spread has 7 at 1280 × 720).
  for (let turn = 0; turn < 8 && ((await note.textContent()) ?? '') === ''; turn++) {
    await page.keyboard.press(turn % 2 === 0 ? 'ArrowRight' : 'ArrowLeft');
    await page.waitForFunction(() => window.__view3d?.turning === false, null, { timeout: 30_000 });
  }
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  await expect(note).toContainText('runs slowly');
  // Offered, not done: the book is still in 3D until the reader chooses.
  expect(await page.evaluate(() => window.__reader?.mode)).toBe('3d');
  const at = await page.evaluate(() => window.__reader?.page);
  await note.getByRole('button', { name: 'Switch to flat pages' }).click();
  await page.waitForFunction(() => window.__reader?.mode === '2d');
  expect(await page.evaluate(() => window.__reader?.page)).toBe(at);
  await expect(note).toBeEmpty();
});

test("the 3D view's download shows as bytes, and the line only moves forward (F15 AC2)", async ({
  page,
}, info) => {
  // Every value the line takes, from the first paint on.
  await page.addInitScript(() => {
    const w = window as unknown as { __progress: number[] };
    w.__progress = [];
    const watch = () => {
      const bar = document.getElementById('book-progress');
      if (!bar) return void requestAnimationFrame(watch);
      new MutationObserver(() => {
        if (!bar.hidden) w.__progress.push(Number(bar.getAttribute('aria-valuenow')));
      }).observe(bar, { attributes: true, attributeFilter: ['aria-valuenow', 'hidden'] });
    };
    watch();
  });
  // The model a little late, so the line is seen between the code and the model.
  await page.route('**/models/*.glb', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    await route.continue();
  });
  await open3d(page, info);
  const values = await page.evaluate(
    () => (window as unknown as { __progress: number[] }).__progress,
  );
  console.log(`[${info.project.name}] progress: ${values.join(', ')}`);
  expect(values.length).toBeGreaterThan(1);
  expect(
    values.some((v) => v > 0 && v < 100),
    'values between the start and the end',
  ).toBe(true);
  for (let i = 1; i < values.length; i++) {
    expect(values[i], 'never backwards').toBeGreaterThanOrEqual(values[i - 1] ?? 0);
  }
  expect(values.at(-1)).toBe(100);
  await expect(page.locator('#book-progress')).toBeHidden();
});

test("each tier loads its own model, and the progress line counts that model's bytes (spec 03)", async ({
  page,
}, info) => {
  const tier = info.project.name === 'pova6' ? 'mobile' : 'desktop';
  const other = tier === 'mobile' ? 'desktop' : 'mobile';
  const models: string[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('.glb')) models.push(new URL(request.url()).pathname);
  });
  await open3d(page, info);
  expect(models).toEqual([`/the-living-book/models/book-${tier}.glb`]);
  const listing = (await (await page.request.get('pages/book-bytes.json')).json()) as Record<
    string,
    Record<string, number>
  >;
  const listed = Object.keys(listing[tier] ?? {});
  expect(listed).toContain(`/the-living-book/models/book-${tier}.glb`);
  expect(listed).not.toContain(`/the-living-book/models/book-${other}.glb`);
});

test('?mode=2d gives flat pages, without the 3D desk', async ({ page }) => {
  await page.goto('book/?mode=2d');
  await page.waitForFunction(() => window.__reader?.ready === true, null, { timeout: 20_000 });
  expect(await page.evaluate(() => window.__reader?.mode)).toBe('2d');
  await expect(page.locator('#reader-canvas')).toBeHidden();
  await expect(page.locator('#reader-view .page').first()).toBeVisible();
});
