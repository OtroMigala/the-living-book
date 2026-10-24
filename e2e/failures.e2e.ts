// The failure suite (Q07 AC1): whatever fails, the reader never faces a blank screen. Each test
// breaks one thing the book depends on and checks that pages with text are on screen, in 3D or
// flat, and that none of them overflows. Covered elsewhere: a lost GPU context (book3d.e2e.ts,
// F09 AC1), no JavaScript (book.e2e.ts, F10), and Contentstack unreachable at build
// (tools/cms/pull-books.test.ts; CI builds from the committed content, without credentials, on
// every push).
import { expect, type Page, test } from '@playwright/test';
import type { ReaderState } from '../src/reader/reader.ts';

test.use({ reducedMotion: 'reduce' });

/** Opens the book, and once it is ready, its state and the length of the text on screen. */
async function read(page: Page) {
  await page.goto('book/');
  await page.waitForFunction(() => window.__reader?.ready === true, null, { timeout: 30_000 });
  // A phone opens on the contents page alone (F18): the text starts on the next page.
  if ((await page.evaluate(() => window.__reader?.page)) === 0) {
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => window.__reader?.page === 1);
  }
  const state = (await page.evaluate(() => window.__reader)) as ReaderState;
  const text = await page.evaluate(
    () =>
      [
        ...document.querySelectorAll<HTMLElement>(
          '#reader-view .page:not(.contents), #reader-pages .page:not(.contents)',
        ),
      ]
        .filter((p) => p.getClientRects().length > 0 && getComputedStyle(p).visibility !== 'hidden')
        .map((p) => p.textContent ?? '')
        .join(' ')
        .trim().length,
  );
  return { state, text };
}

test('without WebGL, the book is flat pages with text (Q07, F09 AC1)', async ({ page }) => {
  await page.addInitScript(() => {
    const proto = HTMLCanvasElement.prototype as unknown as {
      getContext: (this: HTMLCanvasElement, type: string, ...rest: unknown[]) => unknown;
    };
    const getContext = proto.getContext;
    // Every WebGL context is refused, as by a browser or a device without WebGL.
    proto.getContext = function (type, ...rest) {
      return /webgl/i.test(type) ? null : getContext.call(this, type, ...rest);
    };
  });
  const { state, text } = await read(page);
  expect(state.mode).toBe('2d');
  expect(state.overflowing).toBe(0);
  expect(text).toBeGreaterThan(200);
});

test('when the 3D code cannot be downloaded, the book is flat pages (Q07)', async ({ page }) => {
  await page.route('**/_astro/view3d.*.js', (route) => route.abort());
  const { state, text } = await read(page);
  expect(state.mode).toBe('2d');
  expect(text).toBeGreaterThan(200);
});

test('when the model is missing, the book is flat pages (Q07)', async ({ page }) => {
  await page.route('**/models/*.glb', (route) => route.fulfill({ status: 404 }));
  const { state, text } = await read(page);
  expect(state.mode).toBe('2d');
  expect(text).toBeGreaterThan(200);
});

test("when the build's page breaks are missing, the browser paginates (Q07, ADR 0009)", async ({
  page,
}) => {
  await page.route('**/pages/breaks.json', (route) => route.fulfill({ status: 404 }));
  const { state, text } = await read(page);
  expect(state.source).toBe('browser');
  expect(state.overflowing).toBe(0);
  expect(text).toBeGreaterThan(200);
});

test('when the fonts are missing, the pages still fit, in a fallback font (Q07)', async ({
  page,
}) => {
  await page.route('**/*.woff2', (route) => route.fulfill({ status: 404 }));
  const { state, text } = await read(page);
  // Measured in another font, the build's breaks do not fit: the browser paginates again.
  expect(state.overflowing).toBe(0);
  expect(text).toBeGreaterThan(200);
});
