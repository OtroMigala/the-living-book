// The 2D reader (Stage 4, step 5b): the book as pages, from the build's breaks (ADR 0009). Opens at
// the first page with body text at 16 px (F01 AC1), turns with buttons and keys and says where the
// reader is (F02 AC1, Q05 AC2), names each page in the address (F08 AC1), keeps the place across
// page classes and languages (F13), paginates by itself when the build's pages do not fit, and
// leaves the article to read without JavaScript (F10).
import { expect, type Page, test } from '@playwright/test';
import type { ReaderState } from '../src/reader/reader.ts';

// These tests are about where the reader goes, not how it gets there: with reduced motion a page
// changes at once (Q05 AC3). The animated turn is tested in book3d.e2e.ts.
test.use({ reducedMotion: 'reduce' });

async function open(page: Page, path = 'book/'): Promise<ReaderState> {
  await page.goto(path);
  return ready(page);
}

async function ready(page: Page): Promise<ReaderState> {
  await page.waitForFunction(() => window.__reader?.ready === true, null, { timeout: 20_000 });
  return (await page.evaluate(() => window.__reader)) as ReaderState;
}

const state = async (page: Page) => (await page.evaluate(() => window.__reader)) as ReaderState;

test('opens at page 1 from the build, nothing overflowing, body text at 16 px (F07, F01 AC1)', async ({
  page,
  browserName,
}, info) => {
  const s = await open(page);
  expect(s.page).toBe(1);
  expect(s.overflowing).toBe(0);
  expect(s.pageClass).toBe(info.project.name === 'pova6' ? 'compact' : 'regular');
  expect(s.scale, 'pages at their class size').toBe(1);
  // Chromium on Linux measures text apart from every other engine: it paginates by itself.
  if (!(browserName === 'chromium' && process.platform === 'linux')) expect(s.source).toBe('build');
  const size = await page
    .locator('#reader-view .page p, #reader-pages .page p')
    .first()
    .evaluate((p) => getComputedStyle(p).fontSize);
  expect(size).toBe('16px');
  expect(await page.locator('#book-article').isHidden()).toBe(true);
});

test('turns with the buttons and the keys, and says where the reader is (F02 AC1, Q05 AC2)', async ({
  page,
}) => {
  const first = await open(page);
  const where = page.locator('#reader-where');
  await expect(where).toHaveAttribute('aria-live', 'polite');
  await expect(page.locator('#reader-prev')).toBeDisabled();
  await page.locator('#reader-next').click();
  const second = await state(page);
  expect(second.page).toBe(2);
  await expect(where).toHaveText(
    first.pagesPerView === 2 ? `Pages 2–3 of ${first.total}` : `Page 2 of ${first.total}`,
  );
  await page.keyboard.press('ArrowRight');
  expect((await state(page)).page).toBe(first.pagesPerView === 2 ? 4 : 3);
  await page.keyboard.press('ArrowLeft');
  expect((await state(page)).page).toBe(2);
  await page.keyboard.press('End');
  const end = await state(page);
  expect(end.span?.last).toBeDefined();
  await expect(page.locator('#reader-next')).toBeDisabled();
  await page.keyboard.press('Home');
  expect((await state(page)).page).toBe(1);
});

test('PageDown and PageUp turn too (F02 AC1)', async ({ page }) => {
  await open(page);
  await page.keyboard.press('PageDown');
  expect((await state(page)).page).toBe(2);
  await page.keyboard.press('PageUp');
  expect((await state(page)).page).toBe(1);
});

test('back and forward bring back the same page (F08 AC1)', async ({ page }) => {
  await open(page);
  await page.keyboard.press('PageDown');
  await page.keyboard.press('PageDown');
  const before = await state(page);
  await page.goto('credits/');
  await page.goBack();
  expect((await ready(page)).page).toBe(before.page);
  await page.goForward();
  await expect(page).toHaveURL(/\/credits\/$/);
  await page.goBack();
  expect((await ready(page)).page).toBe(before.page);
});

test('the address names the page: reload and a pasted link open it (F08 AC1)', async ({
  page,
  context,
}) => {
  await open(page);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  const before = await state(page);
  expect(page.url()).toContain(`#page=${before.page}&class=${before.pageClass}`);
  await page.reload();
  expect((await ready(page)).page).toBe(before.page);
  const other = await context.newPage();
  await other.goto(page.url());
  expect((await ready(other)).page).toBe(before.page);
});

test('"Read as an article" opens the article at the paragraph on screen (F09 AC2)', async ({
  page,
}) => {
  await open(page);
  await page.keyboard.press('PageDown');
  await page.keyboard.press('PageDown');
  const s = await state(page);
  // The element in the article that holds the first word on screen: the chapter's title, or a block.
  const expected = await page.evaluate((at) => {
    const section = document.querySelectorAll('#book-article section[aria-labelledby]')[at.chapter];
    return at.block === 0
      ? section?.querySelector('h2')?.id
      : section?.querySelectorAll('[data-block]')[at.block - 1]?.id;
  }, s.span?.first ?? { chapter: 0, block: 0, word: 0 });
  expect(expected).toBeTruthy();
  const link = page.locator('[data-reader-article]');
  expect(await link.getAttribute('href')).toMatch(new RegExp(`#${expected}$`));
  await link.click();
  await page.waitForURL(new RegExp(`#${expected}$`));
  await expect(page.locator(`#${expected}`)).toBeInViewport();
});

test("the site's Book link opens the book at the paragraph being read (F09 AC2)", async ({
  page,
}) => {
  // The reading mode, with paragraph 12 at the top of the window.
  await page.goto('#frame-story-12');
  await page.getByRole('link', { name: 'Book', exact: true }).click();
  await page.waitForURL(/\/book\//);
  const s = await ready(page);
  expect(s.target).toEqual({ chapter: 0, block: 12, word: 0 });
  expect(s.targetOnScreen).toBe(true);
});

test('a link from the other page class opens the same text (F08)', async ({ page }, info) => {
  // On the phone, a link copied from the spread; on a wide screen, one from the phone.
  const link =
    info.project.name === 'pova6' ? 'book/#page=4&class=regular' : 'book/#page=9&class=compact';
  const s = await open(page, link);
  expect(s.target, 'the address was read as a place in the text').not.toBeNull();
  expect(s.targetOnScreen).toBe(true);
});

test('the language switch lands on the same place (F13)', async ({ page }) => {
  await open(page);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  const english = await state(page);
  const block = english.span?.first.block ?? 0;
  await page.locator('[data-reader-switch]').click();
  await page.waitForURL(/\/es\/libro\//);
  const spanish = await ready(page);
  // Same blocks in both languages (K02 parity): the Spanish view holds the English view's start.
  expect(spanish.span?.first.block ?? 99).toBeLessThanOrEqual(block);
  expect(spanish.span?.last.block ?? -1).toBeGreaterThanOrEqual(block);
});

test("when the build's pages are not used, the browser paginates and keeps the place (ADR 0009)", async ({
  page,
}) => {
  const s = await open(page, 'book/?paginate=browser#page=3&class=compact');
  expect(s.source).toBe('browser');
  expect(s.overflowing).toBe(0);
  expect(s.total).toBeGreaterThan(1);
});

test('without JavaScript the article is there to read (F10)', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('book/');
  await expect(page.locator('#book-article')).toBeVisible();
  await expect(page.locator('#reader')).toBeHidden();
  await context.close();
});

test('flat pages turn by a tap on their edge, and by a drag past halfway (F02 AC1, AC2)', async ({
  page,
}) => {
  const first = await open(page, 'book/?mode=2d');
  const grip = page.locator('#reader-view .grip[data-step="1"]').last();
  const box = await grip.boundingBox();
  if (!box) throw new Error('no grip on screen');
  const width =
    (await grip.evaluate((g) => g.closest('.page')?.getBoundingClientRect().width)) ?? 0;
  const x0 = box.x + box.width / 2;
  const y0 = box.y + box.height / 2;
  const drag = async (share: number) => {
    await page.mouse.move(x0, y0);
    await page.mouse.down();
    await page.mouse.move(x0 - width * first.pagesPerView * share, y0, { steps: 6 });
    await page.mouse.up();
  };
  await drag(0.2);
  expect((await state(page)).page, 'a short drag does not turn').toBe(first.page);
  await drag(0.7);
  await page.waitForFunction((p) => (window.__reader?.page ?? p) > p, first.page);
  const turned = (await state(page)).page;
  await page.mouse.click(x0, y0);
  await page.waitForFunction((p) => (window.__reader?.page ?? p) > p, turned);
});
