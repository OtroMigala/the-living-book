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

## Stage 3 — gate, 2026-10-22

Measured on commit b44ff6a and the deploys of the same night.

| Metric | Value | Budget | How it was measured |
| --- | --- | --- | --- |
| Pages | 5 (reading and credits in each language, diagnostics) | — | `astro build` |
| Home page, English / Spanish | 5.2 KB / 5.2 KB gzip | — | `npm run check:budgets` |
| Entry JS of the home page | 0.2 KB (the language switch) | BB1: ≤ 50 KB | same |
| Web fonts | 40.6 KB, 2 files | BB6: ≤ 100 KB | same |
| Content in Contentstack | 3 content types; 6 entries, each in `en-us` and `es-419` | BC1: ≤ 5; BC2: ≤ 50 | seed run 39713538587 |
| Delivery API calls per build | 2 | BC4: ≤ 10,000 per month | deploy run 39714056680 |
| Unit tests | 59 passing, 7 files (+35 since Stage 2) | all passing | `npx vitest run` |
| Local `npm run ci` wall time, now with build and budgets | 4,905 ms (median of 3: 4,836 / 4,905 / 5,431) | — | three timed runs |
| CI on GitHub, job time | before 02:22 UTC: 20 s; after: 2.5–5.2 min, all of it in `npm ci` | BC6: ≤ 5 min (**broken**: 5 min 11 s on run 39714608388) | step timings of 14 CI runs |
| Why CI slowed down | npm incident "Degraded Package Install and Publishing", identified 02:33 UTC; no dependency changed between the last fast run (`bcc38c4`) and the first slow one (`e9e1e3d`) | — | status.npmjs.org; `gh run view` |
| Commits | 44 | — | `git log --oneline \| wc -l` |
| Stage 3 gate | go with changes; 8 criteria moved to Stage 4; owner's self-assessment low ("casi no sé qué hiciste") | — | `docs/gates/stage-3.md` |

## Stage 4 — in progress

| Metric | Value | Budget | How it was measured |
| --- | --- | --- | --- |
| Browser tests | 32 passing: 8 tests × 4 projects (Chromium, Firefox, WebKit, Pova 6 profile), 20.1 s locally | all passing | `npm run e2e` |
| Entry JS of the home page | 0.3 KB (language switch, after the fix) | BB1: ≤ 50 KB | `npm run check:budgets` |
| CI on GitHub with browser tests | job 1 min 23 s: `npm ci` 5 s (the npm slowdown is gone), browsers 46 s, browser tests 19 s; report uploaded (206 KB) | BC6: ≤ 5 min | run 39719043789 |
| Accessibility (axe, WCAG 2.2 A + AA) | 0 issues of any impact: 5 pages × light and dark × desktop and Pova 6 size (20 runs); control page with planted errors fails as it must | Q05 AC1: 0 serious or critical | `npm run e2e` |
| Browser tests, total | 54 passing, 22 skipped (axe runs only in the Chromium projects), 20.9 s locally | all passing | `npm run e2e` |
| License check | 340 packages: 1 shipped (OFL-1.1), 339 tools; 0 problems under ADR 0005 | C02 | `npm run check:licenses` |
| Secret scan | 92 files (repository + dist), 0 findings; control with a planted value found it | C05: 0 | `npm run check:secrets` |
| Unit tests | 69 passing, 9 files | all passing | `npx vitest run` |
| Deploy with every guard | job 2 min 1 s; 54 browser tests; secret scan with the 3 real token values over 100 files: 0 findings | BC6: ≤ 5 min | deploy run on commit after 0b fix |
| CI with every guard | job 1 min 37 s | BC6: ≤ 5 min | CI run on the same commit |
| Placeholder model | 10,228 B; 7 draw calls, 84 triangles, no textures; passes all 10 clauses of `check:model` | BB4, BM1, model share of BR4/BR5 | `npm run check:model` |
| Source model against the contract | fails 3 clauses: clear page area (magnifier, Book_2, Book_3), file 24.85 MiB, textures 149.33 MiB; anchors missing (warning) | — | `npm run check:model assets-src/books_with_magnifier.glb` |
| 3D-mode JS (three.js + GLB loader) | 148.6 KB gzip, 1 file | BB2: ≤ 350 KB | `npm run check:budgets` |
| 3D lab at runtime | 11 draw calls, 88 triangles; pixel ratio 1.5 on the Pova 6 profile; 0 renders in 1 s of idle | BR4 ≤ 20, BR5 ≤ 50,000, BR3 ≤ 1.5, BR2 = 0 | `npm run e2e` (lab tests) |
| Spike A bench | 5 cases run; GPU and CPU variants agree (< 1% pixels differ); in SwiftShader, CPU time p95 0.4 ms (GPU bend, any grid) vs 2.5 ms (CPU bend, 96 × 64) | BR1 on real devices: pending | `npm run e2e`, `docs/spikes/A-page-turn.md` |
| Spike A on the Pova 6 (Chrome 155) | frame p95 11.2 ms for every case (90 Hz display), 0 dropped of 328; main thread p95 1.2–1.5 ms, 4.6 ms for the CPU-bent dense page | BR1 mobile ≤ 33.3 ms | owner's run of `/lab/turn/` |
| Spike A on the PC (Edge 155, RX 9060 XT) | frame p95 5.1–5.2 ms (200 Hz); GPU time p95 0.09–0.12 ms; main thread p95 0.2 ms, 1.1 ms for the CPU-bent dense page | BR1 desktop ≤ 16.7 ms | owner's run of `/lab/turn/` |
| Edited source model `bookV3.glb` | 25,962,640 B; passes scale, nodes, anchors and clear page area; fails credits, size, textures (Stage 6) | BB4, BM1 | `npm run check:model assets-src/bookV3.glb` |
| Spike B, flat HTML page (B) against the 3D page | 0 px at 1280 × 720 and 1920 × 1080 in Chromium, Firefox and WebKit; 0.33 px in the phone profile; the same after a turn | F03 AC2: ≤ 2 px | `npm run e2e` (text tests) |
| Spike B, tilted HTML page (A, 20°) | 0.12–1.1 px in Chromium, Firefox and the phone profile; 222–264 px in Playwright's WebKit on Windows (no perspective in `matrix3d`); 0.12–0.24 px in WebKit on Linux (CI) | F03 AC2: ≤ 2 px | `npm run e2e` (text tests), deploy run 39730007009 |
| Spike B, body text on screen | flat 16 px at every size; tilted 20°: top line 12.7–13.5 px | F01 AC1: ≥ 16 px | `npm run e2e` (text tests) |
| Spike B, texture against the HTML it replaces | ink moved 0.10–0.18 px (Chromium, Firefox, phone profile), 0.54 px (WebKit); pixels differing 0.00–0.03% on the desktop engines, 6.3% in the phone profile (texture at ×1.5, HTML at ×3) | criterion 3: ≤ 0.5 px | `npm run e2e` (text tests) |
| Spike B, paint + upload of one page texture, on the PC | Chromium 3.4–7.5 + 2.8–8.2 ms; Firefox 2–7 + 1–2 ms; WebKit 19–345 + 11–49 ms | criterion 5: ≤ 16.7 ms on the phone (pending) | `npm run e2e` (text tests) |
| Unit tests | 96 passing, 14 files | all passing | `npm run ci` |
| Browser tests, total | 81 passing, 39 skipped (axe and WebGL-only tests outside their projects), 36.8 s locally | all passing | `npm run e2e` |
| Spike B after the owner's first look: texture against HTML on all four pages | ink moved ≤ 0.11 px (Chromium, Firefox), ≤ 0.05 px (phone profile), 0.46–0.54 px (WebKit); with the old painter, 1.76 and 2 px on pages 3 and 4 | criterion 3: ≤ 0.5 px | `npm run e2e` (text tests) |
| Body text on screen by tilt and lens, 1280 × 720 | lens 35°: 15.3–16.6 px at 5°, 12.7–17.8 px at 20°; lens 20°: 15.6–16.3 / 13.7–16.5 px; lens 12°: 15.7–16.2 / 14.2–15.9 px | F01 AC1: ≥ 16 px | `npm run e2e` (text tests) |
| Unit tests | 97 passing, 14 files | all passing | `npm run ci` |
| Browser tests, total | 85 passing, 39 skipped, 35.0 s locally | all passing | `npm run e2e` |
| Spike B on the Pova 6 (Chrome 155, "desktop site" mode) | flat page within 0.47 px; 16 px text; paint + upload 3.9–9.5 ms per page; turn with textures p95 11.2 ms (90 Hz), 82 frames; font Literata; canvas 1470 × 2739 px at ratio 1.5 | F03 AC2 ≤ 2 px; criterion 5 ≤ 16.7 ms; BR1 mobile ≤ 33.3 ms | owner's run of `/lab/text/` |
| Tilt by the mouse wheel (F16), browser tests | 300 px of wheel → 20°, reached through 7–8 intermediate frames (Chromium, WebKit); with reduced motion, no intermediate angle; back to flat the HTML lies on the page again | F16 AC1 | `npm run e2e` (text tests) |
| Browser tests, total | 91 passing, 41 skipped, 39.6 s locally | all passing | `npm run e2e` |
| Spike B on the Pova 6, second run (same mode) | font Literata in the HTML and the canvas; paint + upload 3.7–4.3 ms per page, 14.3 ms for the first page painted (9.2 + 5.1: the first one pays for warming up); flat page within 0.47 px | criterion 5: ≤ 16.7 ms | owner's run of `/lab/text/` |
| Spike C, pagination of the first chapter (2 languages × 2 page classes) | every page fits and every word appears once in Chromium, Firefox and WebKit; identical breaks in all three with 1 px of measuring slack; without it, Chromium's breaks overflow 1 of 15 Spanish compact pages in Firefox by one line | F07 AC1; criterion 2 | `npm run e2e` (pagination tests) |
| Spike C on Linux (CI): breaks of each engine laid out in each other, 1 px slack | Firefox and WebKit: the same breaks as on Windows, fitting each other; Chromium on Linux: different breaks, overflowing Firefox and WebKit by one line on 1 page, and overflowed by theirs on 2 pages | criterion 2 | deploy run 39804436580 (`e2e/pages-matrix.cross.ts`) |
| Spike C on the Pova 6 (Chrome 155, Android) | every page fits, every word once (8 of 8); signatures with 1 px slack identical to Firefox, WebKit and Chromium on Windows; first, cold pagination 75.3 ms, the other seven 26.8–42.2 ms | criterion 4: ≤ 50 ms (fails for the cold run) | owner's run of `/lab/pages/` |
| Build-time pagination pass (ADR 0009) | 382 layouts, 119 ms in the page locally and 173 ms on the CI runner; the whole build 5.1 s locally; the deploy's `npm run ci` step 4 s → 8 s; `pages/breaks.json` 4.8 KB | BC6: ≤ 5 min | `npm run build`; deploy runs 39804436580 and 39806948532 |
| CI with build-time pagination | job 2 min 3 s: browsers 40 s, build with the pagination pass 3 s, browser tests 66 s | BC6: ≤ 5 min | CI run 39806948815 (re-run) |
| The build's breaks in each browser, on Linux (CI) | Firefox and WebKit: no page overflows; Chromium and the phone profile on Linux: 1 of 15 es compact pages and 1 of 6 es regular (the reader re-paginates there) | ADR 0009 | deploy run 39806948532 |
| 2D reader (`/book/`), browser tests | opens at page 1 from the build's breaks, no page overflowing, body text 16 px at 1280 × 720 and in the phone profile; 7 tests × 4 projects passing; axe: 0 serious or critical issues on `/book/` and `/es/libro/`, light and dark | F01 AC1, F02 AC1 (keys, buttons), F07, F08 AC1, F13, Q05 AC1–AC2 | `npm run e2e` |
| CI and deploy with the 2D reader | CI job 2 min 40 s, deploy job 2 min 18 s; browser install 43–45 s on the first try; 131 browser tests passing on Linux | BC6: ≤ 5 min | runs 39813143652 and 39813143452 |
| 3D reader (`/book/`), browser tests | HTML pages on the drawn pages: 0 px flat (Chromium, Firefox, WebKit), 0.47 px in the phone profile, also after a turn; tilted 20°: within 2 px, or textures in Playwright's WebKit on Windows (ADR 0008, point 4); 0 renders in 1 s idle; wheel tilt with easing, instant with reduced motion | F03 AC1–AC2, BR2, F16 AC1, Q05 AC3 | `npm run e2e` (book3d tests) |
| Animated page turn in the reader, browser tests (software rendering, not the devices) | forward and back: HTML hidden during the turn and back on the page within 2 px after it; textures for a turn painted in 2.7–4.2 ms in the phone profile, 21–67 ms in the desktop engines under parallel load | BR1 on the devices: pending (`?debug=1`) | `npm run e2e` (book3d tests) |
| The book's JavaScript with the animated turn | 160.1 KB gzip in 9 files | BB2: ≤ 350 KB | `npm run check:budgets` |
| Browser tests, total | 167 passing, 54 skipped, 57.0 s locally | all passing | `npm run e2e` |
| Turning by hand (F02), browser tests | 3D: a drag let go at 25% falls back (HTML back on the page within 2 px), at 75% completes; a tap on the edge turns; 2D: a drag at 20% does not turn, at 70% does, a tap turns | F02 AC1–AC2 | `npm run e2e` (book and book3d tests) |
| The book's JavaScript with turning by hand | 160.7 KB gzip in 9 files | BB2: ≤ 350 KB | `npm run check:budgets` |
| Unit tests | 140 passing | all passing | `npm run ci` |
| Lighthouse locally, median of 3 (Lighthouse 13.5.0, Chromium 156, benchmark index 3252–3475), mobile / desktop | home: LCP 1.20 / 0.32 s, CLS 0.000 / 0.000, TBT 0 / 0 ms; book: LCP 1.51 / 0.45 s, CLS 0.000 / 0.000, TBT 80 ms (runs 197, 80, 73) / 0 ms; the 3D view's code loaded in every run of the book | BL1: ≤ 2.5 / 1.5 s; BL2: ≤ 0.05; BL3: ≤ 300 / 150 ms | `npm run check:lighthouse` |
| CLS of the book before the fix above | 0.079 mobile (over BL2), 0.021 desktop: the site's header removed under the reader moved `<main>` | BL2: ≤ 0.05 | `npm run check:lighthouse`, layout-shifts audit |
| Lighthouse check, wall time locally | 1 min 19 s for 12 runs (2 pages × 2 tiers × 3) | BC6: ≤ 5 min for the CI run | `time npm run check:lighthouse` |
| Lighthouse in CI, first run (benchmark index 3799–4334), mobile / desktop | home as locally; book: **LCP 4.65 s (runs 4.65, 1.65, 4.65 s)** / 0.92 s, CLS 0.000 / 0.000, TBT 155 / 7 ms. In every run, local and CI, the first 3D request started before the first paint (28 ms against 51 ms in CI) | BL1: ≤ 2.5 / 1.5 s | CI run 39839102795 (rerun), reports artifact |
| Lighthouse locally, after the 3D view waits for the paint report | book: LCP 1.51 / 0.45 s in 3 of 3 runs, CLS 0.000, TBT 98 ms (runs 270, 98, 83) / 0 ms; first 3D request 10–11 ms after the paint | BL1–BL3 | `npm run check:lighthouse`; request times from the reports |
| Browser tests, total | 169 passing, 52 skipped, 1.1 min locally | all passing | `npm run e2e` |
| Lighthouse in CI after both fixes (benchmark index 2056–2312, a slower runner), mobile / desktop | home: LCP 1.20 / 0.32 s, CLS 0.000, TBT 0 / 0 ms; book: LCP 1.51 / 0.45 s in 3 of 3 runs, CLS 0.000, **TBT 279 ms (runs 264, 279, 297)** / 56 ms: mobile TBT at 93% of its budget | BL1–BL3 (BL3 mobile ≤ 300 ms) | CI run 39842060991 (rerun) |
| Where the book's mobile TBT comes from, in CI | one long task of 294 ms (simulated, 4× slowdown) attributed to the book's script: the 3D start runs as one task; then 126 ms and 85 ms tasks; main thread "Other" 794 ms (WebGL drawn by SwiftShader on the CPU), script evaluation 306 ms | BL3 | long-tasks and mainthread-work-breakdown audits of `book-mobile-2.html` |
| CI with the Lighthouse job | jobs in parallel: checks 3 min 35 s, Lighthouse 2 min 7 s (12 runs); BB2 160.9 KB | BC6: ≤ 5 min | CI run 39842060991 (rerun) |
| The 3D view's start, by phase, at 4× CPU slowdown, SwiftShader / GPU (step 6b, before) | three.js evaluated 66 / 43 ms; WebGL context 101 / 39 ms, in the same task; **first render 99 / 142 ms** (shaders compiled on the main thread) | BL3 | Chrome trace with temporary `performance.mark`s, `/book/` at 412 × 823 |
| The same, after compiling with `compileAsync` before the reader is shown | first render 38 / 33 ms; the context in a task of its own | BL3: no task over 50 ms is the aim | same trace |
| Lighthouse locally after step 6b, median of 3 | book mobile: TBT **15 ms** (runs 24, 15, 15; was 98 ms), LCP 1.51 s, CLS 0.000; book desktop: TBT 0 ms, LCP 0.45 s; home unchanged | BL1–BL3 | `npm run check:lighthouse` |
| Lighthouse in CI after step 6b (benchmark index 2219–2307) | book mobile: TBT **168 ms** (runs 167, 168, 200; was 279 ms on the same class of runner), LCP 1.51 s, CLS 0.000; book desktop: TBT 50 ms, LCP 0.45 s; home unchanged. One long task left: 275 ms at 4× | BL3: ≤ 300 / 150 ms | CI run 39892956010 |
| Why CI's TBT stays higher: WebGL drawn by SwiftShader | locally with SwiftShader forced, 4 Lighthouse runs: the task that shows the reader is 18, 79, 67 and 74 ms observed, and the first `render()` is 11, 62, 54 and 58 ms of it. SwiftShader has no `KHR_parallel_shader_compile` (the RX 9060 XT with D3D11 has it), so `compileAsync` cannot wait for the link and the first render does | BL3 | `lh-swiftshader.mjs` (scratch script, temporary marks); `getExtension` in each configuration |
| Unit tests | 148 passing | all passing | `npm run ci` |
| The book's JavaScript (BB2, now measured on `/book/`) | 159.3 KB gzip in 9 files with the 3D view; 5.3 KB before it loads | BB2: ≤ 350 KB | `npm run check:budgets` |
| Browser tests, total | 159 passing, 54 skipped, 53.7 s locally | all passing | `npm run e2e` |
| 2D reader's JavaScript | 3.8 KB gzip in 3 files | — (the entry JS of the home page stays 0.3 KB, BB1) | gzip of the scripts `dist/book/index.html` loads |
| Unit tests | 132 passing | all passing | `npm run ci` |
| Browser tests, total | 137 passing, 52 skipped, 48.5 s locally | all passing | `npm run e2e` |
| Spike C, time to paginate one language in one class, on the PC | Chromium 13–33 ms, Firefox 14–28 ms, WebKit 36–74 ms, phone profile 19–31 ms (60–134 layouts) | criterion 4: ≤ 50 ms on the phone (pending) | `npm run e2e` (pagination tests) |
| Unit tests | 119 passing, 15 files | all passing | `npm run ci` |
| Browser tests, total | 98 passing, 46 skipped, 38.5 s locally | all passing | `npm run e2e` |
| Web fonts after adding the pages' face | 40.6 KB in 2 files: the same files under a second name | BB6: ≤ 100 KB | `npm run check:budgets` |
| Spike B on the PC (Edge 155, RX 9060 XT) | tilted 40°: page within 0.93 px, text 9.6–15.75 px; paint + upload 2.3–5.9 ms per page; turn with textures p95 5.1 ms (200 Hz); **font: fallback** | F03 AC2 ≤ 2 px; BR1 desktop ≤ 16.7 ms | owner's run of `/lab/text/` |
