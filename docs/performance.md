# Metrics ledger

Append-only: one section per gate, newest last. Every number comes with the command that produced it; a number nobody measured is written as *pending*. A value that gets worse than the previous gate needs a reason in its row (invariant 7 in the playbook).

Budgets: the provisional targets are in [`specs/01-vision.md`](../specs/01-vision.md) (Q01–Q04). Stage 2 replaces them with the budget spec.

## Stage 1 — 2026-10-21

No application yet. This snapshot is the starting point of the repository, the CI and the specs.

| Metric | Value | Budget | How it was measured |
| --- | --- | --- | --- |
| Source model size | 26,054,464 B (24.8 MiB) | none: source file, never shipped | `ls -l assets-src/books_with_magnifier.glb` |
| Source model contents | 13 nodes, 5 meshes, 5 materials, 16 textures (PNG and JPEG), 0 animations | Stage 2 | JSON chunk of the GLB read with Node |
| Source model extensions | `KHR_materials_transmission` | — | same |
| Requirements | 30: Must 25, Should 3, Could 2 (F11 lowered at the gate) | — | `npm run check:specs` |
| Acceptance criteria | 42: planned 38, in progress 4, met 0 | — | `npm run check:specs` |
| Traceability issues | 0 | 0 | `npm run check:specs` |
| Risks: total / retired / open / open with score ≥ 6 | 18 / 3 / 15 / 10 | — | `docs/risks.md` at the go |
| Unit tests | 16 passing, 2 files | all passing | `npx vitest run` |
| Local `npm run ci` wall time | 2,201 ms (median of 3: 2,168 / 2,201 / 2,218) | — | three timed runs, Windows 11, Node 24.18.0 |
| CI on GitHub: first run | success; job 11 s, run 19 s from creation to completion (`npm ci` 2 s; each check ≤ 1 s, the log's resolution) | — | `gh run view 39693926015` (commit 429157b) |
| CI on GitHub: trigger | 0 runs from 4 pushes to `main` (the last one edited the workflow file), checked up to 20 min later, with GitHub's status page reporting Actions operational. Runs started by hand (`workflow_dispatch`) work. Open as risk R18 | every push runs CI | `gh api repos/OtroMigala/the-living-book/actions/runs?event=push` → 0 |
| Direct devDependencies / installed packages | 4 / 41 | — | `package.json`, `npm ls --all --parseable` |
| `node_modules` size | 150 MB | — | `du -sh node_modules` (mostly the native Biome and TypeScript 7 binaries) |

## Stage 2 — 2026-10-21

Inputs measured; still no application. Model numbers come from `npm run report:model` ([`inputs/model-report.generated.md`](inputs/model-report.generated.md)); the analysis is in [`inputs/report.md`](inputs/report.md). The budgets these numbers are compared against start here: [`specs/02-budget.md`](../specs/02-budget.md).

| Metric | Value | Budget (mobile / desktop) | How it was measured |
| --- | --- | --- | --- |
| Source model file | 24.85 MiB (images 24.56 MiB) | BB4: ≤ 2 / ≤ 6 MiB, for the delivered file | `npm run report:model` |
| Source model textures in GPU memory (estimate) | 149.33 MiB (magnifier 85.33 MiB) | BM1: ≤ 32 / ≤ 96 MiB | same, RGBA8 + mipmaps |
| Source model draw calls / triangles | 5 / 5,432 | model share: ≤ 10 / ≤ 20,000 | same |
| Source model geometry in GPU buffers | 0.27 MiB | — | same |
| Open book page (scene coordinates) | 0.1756 × 0.2092 m per page, spine on Z at x = 0, surface y 0.019–0.023 m | — | scratch analysis of `Open_book` vertices |
| English text (Lang frame story) | 1,336 words, 28 paragraphs (19 with dialogue) | — | `wc -w`, `awk` on `assets-src/text/lang-1898-frame.en.txt` |
| Spanish text (Maucci) | not available as text | — | Wikisource index status (gap G06) |
| Requirements / acceptance criteria | 33 (Must 28, Should 3, Could 2) / 48 (planned 43, in progress 5) | — | `npm run check:specs` |
| Budgets defined | 24 (load 3, bytes 6, runtime 6, memory 3, content and operations 6) | — | `specs/02-budget.md` |
| Gaps open | 12 (owner 5, agent 2, both 3, no action needed 2) | — | `docs/inputs/gaps.md` |
| Risks: total / retired / open / open with score ≥ 6 | 19 / 3 / 16 / 10 | — | `docs/risks.md` |
| Unit tests | 24 passing, 3 files (+8: asset report) | all passing | `npx vitest run` |
| Local `npm run ci` wall time | 2,256 ms (median of 3: 2,238 / 2,256 / 2,267) | BC6: ≤ 5 min | three timed runs; +55 ms on Stage 1 for the new tests |
| CI on GitHub | push trigger still not firing (R18); runs started by hand pass | every push runs CI | `gh run list` |
| Stage 2 gate | go; owner's self-assessment 4 of 5 | — | `docs/gates/stage-2.md` |

## Stage 3 — in progress, 2026-10-21

First deployment. Measured on commit a7856f4.

| Metric | Value | Budget | How it was measured |
| --- | --- | --- | --- |
| Live site | https://otromigala.github.io/the-living-book/ : `/`, `/credits/`, `/diagnostics/` answer 200 | — | `curl` |
| Home page transferred | 4,865 B gzip (11,816 B uncompressed), CSS inlined, 0 requests besides the HTML | — | `curl -I` with `Accept-Encoding: gzip` |
| Entry JS of the home page | 0 KB | BB1: ≤ 50 KB | `npm run check:budgets` |
| Web fonts | 0 KB (system serif stack for now) | BB6: ≤ 100 KB | same |
| Build | 3 pages in 350–530 ms | — | `astro build` |
| Unit tests | 50 passing, 7 files | all passing | `npx vitest run` |
| CI on GitHub, triggered by a push | success, 20 s | BC6: ≤ 5 min | run 39700887241 |
| Deploy on GitHub, triggered by a push | success, 37 s from push to published | — | run 39700887272 |
| Web fonts (Literata regular + italic, Latin) | 40.6 KB in 2 files | BB6: ≤ 100 KB | `npm run check:budgets` |
| Contentstack Delivery API from the deploy job | reachable; HTTP 422, code 118 (no `book` content type yet), build fell back to the committed snapshot; 1 call | BC4: ≤ 10,000 calls/month | deploy run 39709418215 |
| Unit tests | 55 passing, 8 files | all passing | `npx vitest run` |
| Contentstack seed | 3 content types (BC1: ≤ 5), 5 entries in `en-us` (BC2: ≤ 50), published to `production` and `preview` | BC1, BC2 | seed run 39710078564 |
| Site built from Contentstack | `production/en-us`: 1 chapter, 28 blocks, 3 credits, 1 Delivery API call | BC4: ≤ 10,000 calls/month | deploy run 39710132783 |
| Reference phone, measured | viewport 360 × 688 CSS px, pixel ratio 3, WebGL 2, Mali-G57 MC2, max texture 8192, ASTC + ETC2 | BR3: pixel ratio ≤ 1.5 | `/diagnostics/` on the Tecno Pova 6, 2026-10-22 |
| Spanish text (adapted) | 1,145 words, 28 paragraphs, same structure as the English (parity test) | — | `wc -w`; `src/content/content.test.ts` |
| Site in two languages, built from Contentstack | `en-us` and `es-419`: 1 chapter, 28 blocks, 4 credits each; 2 Delivery API calls per build; 5 pages | BC2: 12 entries in total (6 per locale) ≤ 50 | deploy run 39714056680 |
| Home page JS (language switch) | 0.2 KB | BB1: ≤ 50 KB | `npm run check:budgets` |
