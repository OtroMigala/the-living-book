// Spike C bench (Stage 4, step 4): pagination in each browser. Asserts F07 AC1 on the real text
// (no page overflows, every word once, in order, in both languages and both page classes) and that
// pages wait for Literata. Prints, for the spike report, what decides build time against the
// reader's browser: whether another engine's breaks fit here, and how long paginating takes.
import { chromium, expect, type Page, test } from '@playwright/test';
import type { PagesState } from '../src/pagination/pages-lab.ts';

async function open(page: Page): Promise<PagesState> {
  await page.goto('lab/pages/');
  await page.waitForFunction(() => window.__pages?.ready === true, null, { timeout: 30_000 });
  return (await page.evaluate(() => window.__pages)) as PagesState;
}

test('every page fits and every word appears once, in both languages and classes (F07 AC1)', async ({
  page,
}, info) => {
  const state = await open(page);
  expect(state.results).toHaveLength(8);
  for (const r of state.results) {
    const name = `${r.lang} ${r.pageClass}, slack ${r.slack} px`;
    expect(r.complete, `${name}: every word once, in order`).toBe(true);
    expect(r.overflowing, `${name}: pages that overflow`).toBe(0);
    console.log(
      `[${info.project.name}] ${name}: ${r.pages} pages, signature ${r.signature}, ` +
        `${r.layouts} layouts, ${r.ms} ms (warm ${r.msWarm} ms)`,
    );
  }
});

// Build-time pagination would measure in Chromium and ship its breaks to every browser.
test("Chromium's breaks laid out in this browser (build-time pagination)", async ({
  page,
}, info) => {
  test.skip(
    info.project.name === 'chromium' || info.project.name === 'pova6',
    'Chromium is the reference',
  );
  const here = await open(page);
  const browser = await chromium.launch();
  const reference = await open(await browser.newPage({ baseURL: info.project.use.baseURL ?? '' }));
  await browser.close();
  for (const ref of reference.results) {
    const overflows = await page.evaluate(
      ([lang, cls, breaks]) => window.__pagesLab?.overflows(lang, cls, breaks) ?? [],
      [ref.lang, ref.pageClass, ref.breaks] as const,
    );
    const own = here.results.find(
      (r) => r.lang === ref.lang && r.pageClass === ref.pageClass && r.slack === ref.slack,
    );
    const over = overflows.filter((px) => px > 0);
    // Measured without slack, Firefox overflowed one Spanish page by a line: a line Chromium found
    // exactly 287.00 px wide in a 287 px measure. With 1 px of slack no page may overflow.
    if (ref.slack > 0) expect(over, `${ref.lang} ${ref.pageClass}: overflowing pages`).toEqual([]);
    console.log(
      `[${info.project.name}] ${ref.lang} ${ref.pageClass}, slack ${ref.slack} px: signature ${own?.signature} here, ` +
        `${ref.signature} in Chromium; Chromium's pages overflowing here: ${over.length} of ` +
        `${overflows.length}${over.length > 0 ? ` (by ${over.join(', ')} px)` : ''}`,
    );
  }
});

test('pages wait for Literata even when the reading font comes too late (criterion 3)', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'chromium', 'one engine is enough for the font timing');
  // Hold the font files back: the reading mode's Literata (font-display: optional) misses its
  // window and falls back; the pages' face (font-display: block) must still be Literata.
  await page.route('**/*.woff2', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.continue();
  });
  const state = await open(page);
  expect(state.device.fontInReading, 'the delay pushed the reading font to its fallback').toBe(
    'fallback',
  );
  expect(state.device.fontInPages).toBe('Literata');
  for (const r of state.results) expect(r.overflowing).toBe(0);
});
