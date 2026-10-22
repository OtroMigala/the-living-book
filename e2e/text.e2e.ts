// Spike B bench (Stage 4, step 3): HTML text on the 3D page. Asserts what F03 asks, for the flat
// view (B): the HTML page within 2 CSS px of the 3D page at three window sizes, also after a turn
// (AC2), and text that can be selected, is in the accessibility tree and is found by find-in-page
// (AC1). Prints, without judging, what the spike report compares: the tilted view (A), text size,
// and the hand-off between the HTML and the texture that replaces it during a turn. A is printed
// rather than asserted because it is the approach under test: Playwright's WebKit on Windows draws
// matrix3d without its perspective, so A's HTML misses the page there, and that is a finding.
import { expect, type Page, type TestInfo, test } from '@playwright/test';
import type { TextState } from '../src/three/text-lab.ts';

const sizesFor = (info: TestInfo): [number, number][] =>
  info.project.name === 'pova6'
    ? [[360, 688]]
    : [
        [1280, 720],
        [1920, 1080],
      ];

async function open(page: Page, info: TestInfo): Promise<TextState> {
  await page.goto('lab/text/');
  await page.waitForFunction(
    () => window.__text?.ready === true || window.__text?.error !== undefined,
    null,
    { timeout: 30_000 },
  );
  const state = (await page.evaluate(() => window.__text)) as TextState;
  // Chromium always has WebGL here (SwiftShader in CI); other browsers depend on the machine.
  test.skip(
    state.error !== undefined && info.project.name !== 'chromium' && info.project.name !== 'pova6',
    `no WebGL in this browser here: ${state.error}`,
  );
  expect(state.error, 'WebGL started').toBeUndefined();
  return state;
}

const set = (page: Page, options: Parameters<NonNullable<Window['__textLab']>['set']>[0]) =>
  page.evaluate(async (o) => (await window.__textLab?.set(o)) as TextState, options);

const worst = (s: TextState) => Math.max(...s.alignment.map((a) => a.error));

/** The text area of a visible page, in CSS px of the window. */
function textArea(s: TextState, side: 'left' | 'right') {
  const page = s.alignment.find((a) => a.side === side);
  const [tl, , br] = page?.html ?? [];
  if (!tl || !br) throw new Error(`no ${side} page on screen`);
  const inset = 16;
  return {
    x: tl[0] + inset,
    y: tl[1] + inset,
    width: br[0] - tl[0] - 2 * inset,
    height: br[1] - tl[1] - 2 * inset,
  };
}

/**
 * Compares two screenshots of the same page area: where the ink is (its centroid), how much ink
 * there is, and the share of pixels whose ink differs by more than a quarter. Decoded by the
 * browser itself, so no image library is needed.
 */
async function compare(page: Page, a: Buffer, b: Buffer) {
  return page.evaluate(
    async (png) => {
      const decode = async (b64: string) => {
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
        ctx.drawImage(bitmap, 0, 0);
        return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
      };
      const [x, y] = await Promise.all([decode(png.a), decode(png.b)]);
      // Ink: 0 on the paper (#f7f1e3), 1 on the ink (#2b2118), from luminance.
      const lum = (d: Uint8ClampedArray, i: number) =>
        0.2126 * (d[i] ?? 0) + 0.7152 * (d[i + 1] ?? 0) + 0.0722 * (d[i + 2] ?? 0);
      const paper = 0.2126 * 247 + 0.7152 * 241 + 0.0722 * 227;
      const ink = 0.2126 * 43 + 0.7152 * 33 + 0.0722 * 24;
      const amount = (d: Uint8ClampedArray, i: number) =>
        Math.min(1, Math.max(0, (paper - lum(d, i)) / (paper - ink)));
      let [sa, xa, ya, sb, xb, yb, differ, ea, eb] = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      const w = x.width;
      for (let row = 0; row < x.height; row++) {
        for (let col = 0; col < w; col++) {
          const i = (row * w + col) * 4;
          const da = amount(x.data, i);
          const db = amount(y.data, i);
          sa += da;
          xa += da * col;
          ya += da * row;
          sb += db;
          xb += db * col;
          yb += db * row;
          if (Math.abs(da - db) > 0.25) differ++;
          // Edge energy: how sharply ink changes to paper. Blur spreads each edge over more
          // pixels with smaller steps, and the sum of squared steps drops.
          if (col + 1 < w && row + 1 < x.height) {
            const right = i + 4;
            const below = i + 4 * w;
            ea += (amount(x.data, right) - da) ** 2 + (amount(x.data, below) - da) ** 2;
            eb += (amount(y.data, right) - db) ** 2 + (amount(y.data, below) - db) ** 2;
          }
        }
      }
      return {
        dx: xb / sb - xa / sa,
        dy: yb / sb - ya / sa,
        inkRatio: sb / sa,
        differ: differ / (x.width * x.height),
        /** Edge energy of the second image against the first: below 1 means softer. */
        sharpness: eb / ea,
      };
    },
    { a: a.toString('base64'), b: b.toString('base64') },
  );
}

test('the flat HTML page lies on the 3D page, also after a turn (F03 AC2)', async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  for (const [width, height] of sizesFor(info)) {
    await test.step(`${width} × ${height}`, async () => {
      await page.setViewportSize({ width, height });
      const flat = await open(page, info);
      expect(worst(flat), JSON.stringify(flat.alignment)).toBeLessThanOrEqual(2);

      const tilted = await set(page, { view: 'tilted', tilt: 20 });

      await set(page, { view: 'flat' });
      const turned = await page.evaluate(async () => (await window.__textLab?.turn()) as TextState);
      expect(turned.spread).toBe(1);
      expect(worst(turned), JSON.stringify(turned.alignment)).toBeLessThanOrEqual(2);

      console.log(
        `[${info.project.name} ${width}×${height}] ${flat.layout?.pageClass} ×${flat.layout?.pages}, ` +
          `alignment flat ${worst(flat)} px, tilted 20° ${worst(tilted)} px, after a turn ${worst(turned)} px; ` +
          `text flat ${flat.textPx?.top} px, tilted 20° ${tilted.textPx?.top}–${tilted.textPx?.bottom} px; ` +
          `paint ${flat.paint.map((p) => `${p.paintMs}+${p.uploadMs}`).join(', ')} ms`,
      );
    });
  }
});

// The owner prefers the tilted view. Any tilt squeezes the text's height, and the perspective of a
// near camera shrinks the far lines further; a longer lens, farther back, evens the lines out.
// Printed for the spike report, at the first window size.
test('tilted view: body text size by tilt and lens', async ({ page }, info) => {
  test.setTimeout(60_000);
  await open(page, info);
  for (const fov of [35, 20, 12]) {
    const row: string[] = [];
    for (const tilt of [5, 10, 15, 20]) {
      const s = await set(page, { view: 'tilted', tilt, fov });
      row.push(`${tilt}°: ${s.textPx?.top}–${s.textPx?.bottom} px`);
    }
    console.log(`[${info.project.name}] lens ${fov}°, top–bottom line: ${row.join(', ')}`);
  }
});

test('the text can be selected, is in the accessibility tree and is found (F03 AC1)', async ({
  page,
}, info) => {
  await open(page, info);
  const right = page.locator('#text-pages .page:not([hidden])').last();
  const paragraph = right.locator('p').nth(1);
  const text = (await paragraph.textContent()) ?? '';
  const word = text.split(' ').find((w) => /^[A-Za-z]{6,}$/.test(w)) ?? '';
  expect(word, 'a plain word on the page').not.toBe('');

  // A double click on the paragraph selects a word, as on any web page.
  await paragraph.dblclick({ position: { x: 60, y: 12 } });
  const selected = await page.evaluate(() => window.getSelection()?.toString().trim() ?? '');
  expect(selected.length).toBeGreaterThan(0);

  const snapshot = await right.ariaSnapshot();
  expect(snapshot).toContain(text.slice(0, 40));

  // window.find is what the browser's find bar does, as a script can call it.
  await page.evaluate(() => window.getSelection()?.removeAllRanges());
  const found = await page.evaluate(
    (w) => (window as Window & { find?: (s: string) => boolean }).find?.(w) ?? null,
    word,
  );
  if (found === null) info.annotations.push({ type: 'note', description: 'no window.find' });
  else expect(found).toBe(true);
});

test('hand-off: the texture of each page against its HTML, and A against B with no tilt', async ({
  page,
}, info) => {
  test.setTimeout(60_000);
  await open(page, info);
  const scale = await page.evaluate(() => window.devicePixelRatio);
  const px = (n: number) => Math.round((n / scale) * 100) / 100;
  const percent = (n: number) => `${(n * 100).toFixed(2)}%`;

  // Every page on screen in both spreads: a word drawn in the wrong place shows up only on the
  // page that has it (the owner found two on pages 3 and 4 that the first version missed).
  for (const spread of [0, 1]) {
    if (spread === 1) await page.evaluate(async () => window.__textLab?.turn());
    const state = await set(page, { text: 'html' });
    const pages = state.alignment.map((a) => ({ page: a.page, clip: textArea(state, a.side) }));
    const html = [];
    for (const p of pages) html.push(await page.screenshot({ clip: p.clip }));
    await set(page, { text: 'texture' });
    for (const [i, p] of pages.entries()) {
      const result = await compare(
        page,
        html[i] as Buffer,
        await page.screenshot({ clip: p.clip }),
      );
      console.log(
        `[${info.project.name}] page ${p.page}, texture vs HTML: ink moved (${px(result.dx)}, ` +
          `${px(result.dy)}) CSS px, ink ×${result.inkRatio.toFixed(3)}, sharpness ` +
          `×${result.sharpness.toFixed(3)}, ${percent(result.differ)} of pixels differ`,
      );
      expect(result.inkRatio, 'there is ink to compare').toBeGreaterThan(0.5);
      // Criterion 3 of the spike: the texture's ink within 0.5 CSS px of the HTML's. A misplaced
      // word moves it: the bug on pages 3 and 4 moved it 1.76 and 2 px, while the share of
      // differing pixels only went from 0.03% to 0.12%. WebKit places its HTML glyphs about half
      // a pixel from its canvas glyphs (measured), so there it is printed, not asserted.
      if (info.project.name !== 'webkit') {
        expect(Math.abs(px(result.dx)), 'ink moved sideways').toBeLessThanOrEqual(0.5);
        expect(Math.abs(px(result.dy)), 'ink moved up or down').toBeLessThanOrEqual(0.5);
      }
    }
  }

  const state = await set(page, { text: 'html' });
  const clip = textArea(state, 'right');
  const flat = await page.screenshot({ clip });
  await set(page, { view: 'tilted', tilt: 0 });
  const noTilt = await compare(page, flat, await page.screenshot({ clip }));
  console.log(
    `[${info.project.name}] A at 0° vs B: ink moved (${px(noTilt.dx)}, ${px(noTilt.dy)}) CSS px, ` +
      `sharpness ×${noTilt.sharpness.toFixed(3)}, ${percent(noTilt.differ)} of pixels differ`,
  );
});
