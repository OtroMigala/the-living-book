// Spike C: build-time pagination measures in one engine and ships its breaks to all. Which
// engine's breaks fit in which? Every engine paginates; then each one's breaks are laid out in
// each other one. Printed, not asserted: it is the spike's question, and the answer depends on the
// platform (on Linux, Chromium measures text narrower than on Windows, and than Firefox and WebKit).
//
// It launches the three engines at once, so it has its own project that runs after all the others
// (playwright.config.ts): beside them it slowed the WebGL benches into timeouts.
import { chromium, firefox, type Page, test, webkit } from '@playwright/test';
import type { PagesState } from '../src/pagination/pages-lab.ts';

async function open(page: Page): Promise<PagesState> {
  await page.goto('lab/pages/');
  await page.waitForFunction(() => window.__pages?.ready === true, null, { timeout: 30_000 });
  return (await page.evaluate(() => window.__pages)) as PagesState;
}

test('the breaks of each engine laid out in each other one, on this platform', async ({
  baseURL,
}) => {
  test.setTimeout(120_000);
  const engines = { chromium, firefox, webkit };
  const open3 = await Promise.all(
    Object.entries(engines).map(async ([name, type]) => {
      // No arguments: from the chromium project, WebKit inherited its Chromium-only flag and
      // refused to start on Linux (on Windows it ignored it).
      const browser = await type.launch({ args: [] });
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
