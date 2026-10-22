// Spike C bench (Stage 4, step 4): pagination in each browser. Asserts F07 AC1 on the real text
// (no page overflows, every word once, in order, in both languages and both page classes) and that
// pages wait for Literata. Prints, for the spike report, what decides build time against the
// reader's browser: whether another engine's breaks fit here, and how long paginating takes.
import { chromium, expect, firefox, type Page, test, webkit } from '@playwright/test';
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

// Build-time pagination measures in one engine and ships its breaks to all. Which engine's breaks
// fit in which? Every engine paginates; then each one's breaks are laid out in each other one.
// Printed, not asserted: it is the spike's question, and the answer depends on the platform
// (on Linux, Chromium measures text narrower than on Windows, and than Firefox and WebKit).
test('the breaks of each engine laid out in each other one, on this platform', async ({
  baseURL,
}, info) => {
  test.skip(info.project.name !== 'chromium', 'one run covers the three engines');
  test.setTimeout(120_000);
  const engines = { chromium, firefox, webkit };
  const open3 = await Promise.all(
    Object.entries(engines).map(async ([name, type]) => {
      const browser = await type.launch();
      const page = await browser.newPage({ baseURL: baseURL ?? '' });
      return { name, browser, page, state: await open(page) };
    }),
  );
  for (const from of open3) {
    for (const into of open3) {
      if (from === into) continue;
      for (const ref of from.state.results) {
        const overflows = await into.page.evaluate(
          ([lang, cls, breaks]) => window.__pagesLab?.overflows(lang, cls, breaks) ?? [],
          [ref.lang, ref.pageClass, ref.breaks] as const,
        );
        const over = overflows.filter((px) => px > 0);
        console.log(
          `[${process.platform}] ${from.name} → ${into.name}, ${ref.lang} ${ref.pageClass}, ` +
            `slack ${ref.slack} px: ${over.length} of ${overflows.length} pages overflow` +
            (over.length > 0 ? ` (by ${over.join(', ')} px)` : ''),
        );
      }
    }
  }
  for (const r of open3) {
    console.log(
      `[${process.platform}] ${r.name} signatures: ` +
        r.state.results
          .map((x) => `${x.lang} ${x.pageClass} ${x.slack}px ${x.signature}`)
          .join(', '),
    );
    await r.browser.close();
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
