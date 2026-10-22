// Reading mode works with JavaScript off (F10, F15), in both languages (F13), with a sensible
// heading order and its own title and description (Q06).
import { expect, test } from '@playwright/test';

const PAGES = [
  { path: '', lang: 'en-US', firstWords: 'In the chronicles of the ancient dynasty' },
  { path: 'es/', lang: 'es-419', firstWords: 'En uno de los cuatro mayores imperios' },
];

test.describe('reading mode without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  for (const page of PAGES) {
    test(`the whole book is readable at /${page.path}`, async ({ page: browser }) => {
      await browser.goto(page.path);
      await expect(browser.locator('html')).toHaveAttribute('lang', page.lang);
      // 28 blocks: the frame story in both languages (K02 parity).
      await expect(browser.locator('[data-block]')).toHaveCount(28);
      await expect(browser.locator('[data-block]').first()).toContainText(page.firstWords);
      await expect(browser.locator('[data-block]').last()).toBeVisible();
    });

    test(`headings never skip a level at /${page.path}`, async ({ page: browser }) => {
      await browser.goto(page.path);
      const levels = await browser
        .locator('h1, h2, h3, h4, h5, h6')
        .evaluateAll((hs) => hs.map((h) => Number(h.tagName.slice(1))));
      expect(levels[0]).toBe(1);
      for (let i = 1; i < levels.length; i++) {
        expect(levels[i] ?? 0).toBeLessThanOrEqual((levels[i - 1] ?? 0) + 1);
      }
    });
  }
});

test('every public page has its own title and description (Q06)', async ({ page }) => {
  const seen = new Set<string>();
  for (const path of ['', 'credits/', 'es/', 'es/creditos/']) {
    await page.goto(path);
    const title = await page.title();
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(title.length, `title of /${path}`).toBeGreaterThan(10);
    expect(description?.length ?? 0, `description of /${path}`).toBeGreaterThan(30);
    expect(seen.has(title), `title of /${path} is repeated`).toBe(false);
    seen.add(title);
  }
});
