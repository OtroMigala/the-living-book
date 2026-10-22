// Accessibility with axe (Q05 AC1): every public page, in both languages and both colour schemes,
// against WCAG 2.2 A and AA rules. The criterion fails on serious or critical issues; minor and
// moderate ones are printed so they are not lost.
//
// axe-core is MPL-2.0, approved by the owner for testing only (ADR 0005); it never ships.
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const PAGES = ['', 'credits/', 'es/', 'es/creditos/', 'diagnostics/', 'lab/'];
const SCHEMES = ['light', 'dark'] as const;
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// axe reads the DOM, so one engine is enough: Chromium, at desktop size and at the phone's size.
test.skip(({ browserName }) => browserName !== 'chromium', 'axe runs in the Chromium projects');

for (const path of PAGES) {
  for (const scheme of SCHEMES) {
    test(`/${path} in ${scheme} mode has no serious or critical issues`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto(path);
      const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

      for (const v of violations) {
        console.log(`[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} element(s)) ${v.helpUrl}`);
      }
      const blocking = violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target.join(' ')}`);
      expect(blocking).toEqual([]);
    });
  }
}

// A control: a page broken on purpose must fail. If axe were misconfigured (wrong tags, not
// injected), the tests above would pass on anything; this one would not.
test('axe catches a deliberately broken page', async ({ page }) => {
  await page.setContent(`<!doctype html><html lang="en"><head><title>broken</title></head><body>
    <main><img src="photo.jpg"><p style="color:#bbb;background:#fff">Low contrast text</p></main>
  </body></html>`);
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(violations.map((v) => v.id)).toEqual(
    expect.arrayContaining(['image-alt', 'color-contrast']),
  );
});
