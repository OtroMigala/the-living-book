// The 2D reader (Stage 4, step 5b): the book as pages, from the build's breaks (ADR 0009). Opens on
// its contents page, beside page 1 on a spread (F18), with body text at 16 px (F01 AC1), turns with
// buttons and keys and says where the reader is (F02 AC1, Q05 AC2), names each page in the address
// (F08 AC1), keeps the place across page classes and languages (F13), paginates by itself when the
// build's pages do not fit, and leaves the article to read without JavaScript (F10). The contents
// page, the running heads and the turn buttons out of sight are F18's.
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

/** The pages on screen, flat (2D) or over the 3D desk. */
const shown = (page: Page, selector = '') =>
  page.locator(`#reader-view .page${selector}, #reader-pages .page${selector}`);

/** Where a view starts: page 1 beside the contents on a spread; the contents page alone. */
const start = (s: ReaderState) => (s.pagesPerView === 2 ? 1 : 0);

test('opens on the contents page from the build, nothing overflowing, body text at 16 px (F18 AC1, F07, F01 AC1)', async ({
  page,
  browserName,
}, info) => {
  const s = await open(page);
  // On a spread the contents page faces page 1; alone, it comes first.
  expect(s.page).toBe(start(s));
  await expect(shown(page, '.contents')).toBeVisible();
  expect(s.overflowing).toBe(0);
  expect(s.pageClass).toBe(info.project.name === 'pova6' ? 'compact' : 'regular');
  expect(s.scale, 'pages at their class size').toBe(1);
  // Chromium on Linux measures text apart from every other engine: it paginates by itself.
  if (!(browserName === 'chromium' && process.platform === 'linux')) expect(s.source).toBe('build');
  if (s.page === 0) await page.keyboard.press('ArrowRight');
  const size = await shown(page, ':not(.contents)')
    .locator('p')
    .first()
    .evaluate((p) => getComputedStyle(p).fontSize);
  expect(size).toBe('16px');
  expect(await page.locator('#book-article').isHidden()).toBe(true);
});

test('turns with the buttons and the keys, and says where the reader is (F02 AC1, Q05 AC2)', async ({
  page,
}) => {
  const first = await open(page);
  const spread = first.pagesPerView === 2;
  const where = page.locator('#reader-where');
  await expect(where).toHaveAttribute('aria-live', 'polite');
  await expect(where).toHaveText(spread ? `Page 1 of ${first.total}` : 'Contents');
  await expect(page.locator('#reader-prev')).toBeDisabled();
  // Out of sight until the keyboard reaches it (F18 AC3): pressed as a keyboard would.
  await page.locator('#reader-next').press('Enter');
  const second = await state(page);
  expect(second.page).toBe(spread ? 2 : 1);
  await expect(where).toHaveText(
    spread ? `Pages 2–3 of ${first.total}` : `Page 1 of ${first.total}`,
  );
  await page.keyboard.press('ArrowRight');
  expect((await state(page)).page).toBe(spread ? 4 : 2);
  await page.keyboard.press('ArrowLeft');
  expect((await state(page)).page).toBe(spread ? 2 : 1);
  await page.keyboard.press('End');
  const end = await state(page);
  expect(end.span?.last).toBeDefined();
  await expect(page.locator('#reader-next')).toBeDisabled();
  // Home opens the contents page (F18 AC2).
  await page.keyboard.press('Home');
  expect((await state(page)).page).toBe(start(first));
  await expect(shown(page, '.contents')).toBeVisible();
});

test('PageDown and PageUp turn too (F02 AC1)', async ({ page }) => {
  const first = await open(page);
  await page.keyboard.press('PageDown');
  expect((await state(page)).page).toBe(first.pagesPerView === 2 ? 2 : 1);
  await page.keyboard.press('PageUp');
  expect((await state(page)).page).toBe(first.page);
});

test('the contents page lists the chapters, the other ways to read, and the way back to the page last read (F18 AC1)', async ({
  page,
}) => {
  const first = await open(page);
  const contents = shown(page, '.contents');
  await expect(contents.getByRole('heading', { name: 'Contents' })).toBeVisible();
  // One line per chapter of the article, its title and its first page.
  const titles = await page.locator('#book-article section h2').allTextContents();
  const lines = contents.locator('.toc a');
  await expect(lines).toHaveCount(titles.length);
  await expect(lines.first()).toContainText(titles[0] ?? '');
  await expect(lines.first().locator('span').last()).toHaveText('1');
  // The other ways to read: the article, the other language, the credits; and the other view,
  // while there is one (flat pages here are the 3D view's fallback, without a way back).
  await expect(contents.locator('[data-reader-article]')).toHaveAttribute(
    'href',
    /\/the-living-book\/(#|$)/,
  );
  const language = contents.locator('[data-reader-switch]');
  await expect(language).toHaveAttribute('href', /\/es\/libro\/#page=0&/);
  await expect(language).toHaveAttribute('lang', 'es-419');
  await expect(contents.getByRole('link', { name: 'Credits' })).toHaveAttribute(
    'href',
    /\/credits\/$/,
  );
  await expect(contents.locator('[data-reader-mode]')).toHaveCount(first.mode === '3d' ? 1 : 0);
  // A chapter's line opens its first page.
  await lines.first().click();
  expect((await state(page)).page).toBe(1);
  // Away and back: the contents page offers to go on where the reader was.
  await page.keyboard.press('PageDown');
  await page.keyboard.press('PageDown');
  const away = (await state(page)).page;
  await page.keyboard.press('Home');
  const back = contents.locator('.continue a');
  await expect(back).toHaveText(`Continue at page ${away}`);
  await expect(language).toHaveAttribute('href', /\/es\/libro\/#page=[1-9]/);
  await back.click();
  expect((await state(page)).page).toBe(away);
});

test("every page of text but a chapter's first has a running head that opens the contents page, and every one its number (F18 AC2)", async ({
  page,
}) => {
  const first = await open(page);
  if (first.page === 0) await page.keyboard.press('ArrowRight');
  const text = shown(page, ':not(.contents):not(.blank)');
  // Page 1 starts the chapter under its title: no running head over it, only its number.
  await expect(text.first().locator('.running-head')).toHaveCount(0);
  await expect(text.first().locator('.folio')).toHaveText('1');
  await page.keyboard.press('ArrowRight');
  const s = await state(page);
  const title = (await page.locator('#book-article section h2').first().textContent()) ?? '';
  const numbers = await text.locator('.folio').allTextContents();
  expect(numbers).toEqual(s.pagesPerView === 2 ? ['2', '3'] : ['2']);
  const head = text.first().locator('.running-head');
  await expect(head).toHaveText(title);
  await head.click();
  expect((await state(page)).page).toBe(start(s));
  await expect(shown(page, '.contents')).toBeVisible();
});

test('no bar over the desk: the turn buttons are out of sight until the keyboard reaches them (F18 AC3)', async ({
  page,
  browserName,
}) => {
  await open(page);
  const next = page.locator('#reader-next');
  const size = (selector: string) =>
    page.locator(selector).evaluate((e) => {
      const r = e.getBoundingClientRect();
      return Math.max(r.width, r.height);
    });
  expect(await size('#reader-next'), 'out of sight').toBeLessThanOrEqual(1);
  expect(await size('#reader-where'), 'read out, not shown').toBeLessThanOrEqual(1);
  await expect(page.locator('#reader-note')).toBeEmpty();
  expect(await size('#reader-note'), 'no message, no room taken').toBeLessThanOrEqual(1);
  // WebKit moves the focus to buttons and links with Alt+Tab, as Safari's default.
  const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab';
  for (let i = 0; i < 30 && !(await next.evaluate((b) => b === document.activeElement)); i++) {
    await page.keyboard.press(tab);
  }
  await expect(next).toBeFocused();
  expect(await size('#reader-next'), 'shown once reached').toBe(44);
  await expect(next).toBeInViewport();
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
  // The link is on the contents page (F18), and keeps the place last read.
  await page.keyboard.press('Home');
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
  // The switch is on the contents page (F18), and keeps the place last read.
  await page.keyboard.press('Home');
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

test('printed, the book is the whole article, without the reader (F10 AC2)', async ({ page }) => {
  await open(page);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('#reader')).toBeHidden();
  await expect(page.locator('#book-article')).toBeVisible();
  // The whole text, from the first paragraph to the last.
  await expect(page.locator('#book-article [data-block]').last()).toBeVisible();
  await page.emulateMedia({ media: 'screen' });
  await expect(page.locator('#reader')).toBeVisible();
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
