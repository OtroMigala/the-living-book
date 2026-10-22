// Spike C bench (Stage 4, step 4): pagination in each browser. Asserts F07 AC1 on the real text
// (no page overflows, every word once, in order, in both languages and both page classes) and that
// pages wait for Literata. Prints, for the spike report, what decides build time against the
// reader's browser: how long paginating takes.
import { expect, type Page, test } from '@playwright/test';
import type { ChapterPages } from '../src/pagination/build-pass.ts';
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

// Whether one engine's breaks fit in another (build-time pagination) is in pages-matrix.cross.ts.

test("the build's breaks fit in this browser (ADR 0009)", async ({ page, browserName }, info) => {
  const response = await page.request.get('pages/breaks.json');
  expect(response.ok(), 'the build wrote pages/breaks.json').toBe(true);
  const built = (await response.json()) as {
    engine: string;
    slack: number;
    books: Record<string, Record<string, ChapterPages>>;
  };
  await open(page);
  for (const lang of ['en-us', 'es-419'] as const) {
    const chapter = Object.values(built.books[lang] ?? {})[0];
    for (const cls of ['compact', 'regular'] as const) {
      const overflows = await page.evaluate(
        ([l, c, p]) => window.__pagesLab?.overflows(l, c, p) ?? [],
        [lang, cls, chapter?.[cls] ?? []] as const,
      );
      const over = overflows.filter((px) => px > 0);
      console.log(
        `[${info.project.name} ${process.platform}] built by ${built.engine}, ${lang} ${cls}: ` +
          `${over.length} of ${overflows.length} pages overflow here`,
      );
      // Chromium on Linux measures text apart from every other engine (spike C): there the
      // reader re-paginates by itself (ADR 0009, point 3). Everywhere else the build's breaks fit.
      if (!(browserName === 'chromium' && process.platform === 'linux')) expect(over).toEqual([]);
    }
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
