/// <reference lib="dom" />
// The language switch keeps the reader's place (F13): both languages have the same blocks with the
// same ids, so the switch can point at the paragraph the reader is on.
import { expect, test } from '@playwright/test';

test('switching language lands on the same paragraph', async ({ page }) => {
  await page.goto('es/');
  const paragraph = page.locator('#frame-story-12');
  // Bring paragraph 12 to the top of the reading area, as a reader scrolling there would.
  await paragraph.evaluate((p) => p.scrollIntoView());
  await page.getByRole('link', { name: 'Read in English' }).click();

  await expect(page).toHaveURL(/\/the-living-book\/#frame-story-12$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en-US');
  await expect(page.locator('#frame-story-12')).toBeInViewport();
});

test('at the top of the page, the switch opens the other language at the top', async ({ page }) => {
  await page.goto('');
  await page.getByRole('link', { name: 'Leer en español' }).click();
  await expect(page).toHaveURL(/\/the-living-book\/es\/$/);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the switch still works, landing on the same page in the other language', async ({
    page,
  }) => {
    await page.goto('credits/');
    await page.getByRole('link', { name: 'Leer en español' }).click();
    await expect(page).toHaveURL(/\/the-living-book\/es\/creditos\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es-419');
  });
});
