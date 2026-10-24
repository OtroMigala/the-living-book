// npm run check:lighthouse — Q01 AC1, after `npm run build`. Serves dist/, opens Playwright's
// Chromium with a debugging port and runs Lighthouse (performance only) three times on each page,
// with the mobile profile and with the desktop profile. The median of each metric must be within
// the load budgets BL1–BL3 of its tier (specs/02-budget.md). Every run's HTML report goes to
// lighthouse-report/, with the trace of the book's first run per tier; in GitHub Actions the
// medians also go to the run's summary page.

import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import lighthouse, { desktopConfig } from 'lighthouse';
import { readBudgets } from '../budget-check/budgets.ts';
import { serve } from '../static/serve.ts';
import { format, judge, METRICS, type MetricId, type Tier, type Verdict } from './summary.ts';

// The reading page (all text in the HTML) and the book (the same text, then the 3D view).
const PAGES = [
  { name: 'home', path: '' },
  { name: 'book', path: 'book/' },
];
const TIERS: Tier[] = ['mobile', 'desktop'];
const RUNS = 3;
const OUT = 'lighthouse-report';

async function freePort(): Promise<number> {
  const probe = createServer();
  await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const { port } = probe.address() as AddressInfo;
  await new Promise((resolve) => probe.close(resolve));
  return port;
}

const budgets = readBudgets(await readFile('specs/02-budget.md', 'utf8'));
await mkdir(OUT, { recursive: true });
const site = await serve('dist');
const port = await freePort();
// The full Chromium in its new headless mode, which behaves like the browser people run, rather
// than Playwright's default headless shell. SwiftShader gives it WebGL without a GPU, so on the
// book's page the 3D view starts inside the measured window, as it does for a reader.
const browser = await chromium.launch({
  channel: 'chromium',
  args: [`--remote-debugging-port=${port}`, '--enable-unsafe-swiftshader'],
});

interface Result {
  page: string;
  tier: Tier;
  verdicts: Verdict[];
  /** Whether the 3D view's code was requested during the run. */
  loaded3d: boolean[];
  benchmark: number[];
}
const results: Result[] = [];
try {
  for (const page of PAGES) {
    for (const tier of TIERS) {
      const runs: Record<MetricId, number>[] = [];
      const loaded3d: boolean[] = [];
      const benchmark: number[] = [];
      for (let i = 1; i <= RUNS; i++) {
        const result = await lighthouse(
          site.url + page.path,
          { port, output: 'html', logLevel: 'error', onlyCategories: ['performance'] },
          tier === 'desktop' ? desktopConfig : undefined,
        );
        if (!result) throw new Error(`${page.name} ${tier}: Lighthouse returned nothing`);
        const { lhr } = result;
        if (lhr.runtimeError) {
          throw new Error(
            `${page.name} ${tier}: ${lhr.runtimeError.code} ${lhr.runtimeError.message}`,
          );
        }
        const value = (audit: string) => {
          const v = lhr.audits[audit]?.numericValue;
          if (v === undefined) throw new Error(`${page.name} ${tier}: no value for ${audit}`);
          return v;
        };
        runs.push({
          BL1: value(METRICS[0].audit),
          BL2: value(METRICS[1].audit),
          BL3: value(METRICS[2].audit),
        });
        const requests = lhr.audits['network-requests']?.details;
        const urls =
          requests?.type === 'table' ? requests.items.map((item) => String(item.url ?? '')) : [];
        loaded3d.push(urls.some((url) => /\/view3d\.[^/]*\.js$/.test(url)));
        benchmark.push(Math.round(lhr.environment.benchmarkIndex));
        await writeFile(join(OUT, `${page.name}-${tier}-${i}.html`), String(result.report));
        // The book's first run per tier keeps its trace too: the report names the script of each
        // long task, the trace what the main thread did in it (R22, Stage 6). It opens in the
        // Performance panel of Chromium's developer tools.
        if (page.name === 'book' && i === 1) {
          const trace = JSON.stringify(result.artifacts.Trace);
          await writeFile(join(OUT, `${page.name}-${tier}-${i}.trace.json`), trace);
        }
      }
      results.push({
        page: page.name,
        tier,
        verdicts: judge(runs, budgets, tier),
        loaded3d,
        benchmark,
      });
    }
  }
} finally {
  await browser.close();
  site.close();
}

const engine = `Chromium ${browser.version()}`;
const lines = [
  `lighthouse: ${engine}, ${RUNS} runs per page and tier, median of each metric`,
  ...results.flatMap(({ page, tier, verdicts, loaded3d, benchmark }) => [
    `${page} ${tier}: 3D code loaded ${loaded3d.map((l) => (l ? 'yes' : 'no')).join('/')}, ` +
      `benchmark index ${benchmark.join('/')}`,
    ...verdicts.map(
      (v) =>
        `${v.ok ? 'ok  ' : 'FAIL'} ${v.id} ${v.name} ${page} ${tier}: ${format(v.id, v.median)} ` +
        `(runs ${v.runs.map((r) => format(v.id, r)).join(', ')}; budget ${format(v.id, v.limit)})`,
    ),
  ]),
];
for (const line of lines) console.log(line);
await writeFile(
  join(OUT, 'summary.json'),
  JSON.stringify({ engine, runs: RUNS, results }, null, 2),
);

// The medians as a table on the Actions run's page.
if (process.env.GITHUB_STEP_SUMMARY) {
  const table = [
    `### Lighthouse (Q01): median of ${RUNS} runs, ${engine}`,
    '',
    '| Page | Tier | LCP (BL1) | CLS (BL2) | TBT (BL3) |',
    '| --- | --- | --- | --- | --- |',
    ...results.map(
      ({ page, tier, verdicts }) =>
        `| ${page} | ${tier} | ${verdicts
          .map((v) => `${v.ok ? '' : '❌ '}${format(v.id, v.median)} / ${format(v.id, v.limit)}`)
          .join(' | ')} |`,
    ),
    '',
  ];
  await appendFile(process.env.GITHUB_STEP_SUMMARY, table.join('\n'));
}

process.exitCode = results.some((r) => r.verdicts.some((v) => !v.ok)) ? 1 : 0;
