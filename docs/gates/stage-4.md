# Gate — Stage 4: the 3D core

- **Date:** 2026-10-22
- **Decision:** *pending* (the owner)

## Scope as understood

Playbook row: *risky core, with spikes and approvals → spike reports, ADRs, metrics vs budget, approval points*. The three risks that could sink the project were tested with spikes before the reader was built on them. Two things were added along the way: tilting the book with the mouse wheel (F16, the owner's choice in spike B), and the browser-test harness, the secret scan and the license check moved here from Stage 3 (decision D2 of the Stage 3 gate).

- **In scope:** spikes A (a page that bends as it turns), B (HTML text on the 3D page) and C (pagination); the reader in 2D and 3D on the placeholder model; a URL per page; Lighthouse in CI.
- **Not in scope:** the fallback chain and its switch (F09, Stage 5), publishing from Contentstack and the preview (F05, F06, Stage 5), the real model (Stage 6).

## What was produced

| Artifact | Where |
| --- | --- |
| The book's reader, 3D with a 2D fallback, both languages: a URL per page, the language switch keeps the page, turns by buttons, keys, an edge tap or a drag of the edge (the halfway rule), tilt by wheel, drag or ↑ ↓ | `/book/` and `/es/libro/` (not linked from the site yet), `src/reader/` |
| Spike reports and their decisions: a bend on the GPU, flat HTML text for reading with the tilt on request, pagination at build time in Firefox | [A](../spikes/A-page-turn.md), [B](../spikes/B-page-text.md), [C](../spikes/C-pagination.md); ADRs [0007](../adr/0007-page-bend-on-the-gpu.md), [0008](../adr/0008-html-text-flat-for-reading-tilt-by-wheel.md), [0009](../adr/0009-pagination-at-build-time.md) |
| Other decisions: licenses for tools, three.js without a framework, CI in Playwright's image | ADRs [0005](../adr/0005-license-policy-for-tools.md), [0006](../adr/0006-three-without-a-framework.md), [0010](../adr/0010-ci-in-the-playwright-image.md) |
| The build's pagination pass: every chapter, both languages, two page classes | `tools/paginate/`, `dist/pages/breaks.json` |
| Checks: browser tests in four projects with axe, Lighthouse (median of 3, both tiers), secret scan, license check, model contract, Playwright image version | `e2e/`, `tools/lighthouse/`, `tools/secret-scan/`, `tools/license-check/`, `tools/model/`, `tools/deps-check/` |
| On-device measurement without developer tools: the last turn's frame times and the long tasks since the first paint | `/book/?debug=1` |
| Placeholder model, passing the contract | `public/models/`, `npm run check:model` |

## Metrics snapshot

From the [ledger](../performance.md#stage-4--gate-2026-10-22). Every budget that can be measured today is met:

- **Load (Lighthouse in CI, median of 3, mobile):** LCP 1.51 s on the book (≤ 2.5 s), CLS 0.000 (≤ 0.05), TBT 214 ms (≤ 300 ms). On the reference phone itself the start blocks the main thread for 0–10 ms.
- **Turning a page on the Pova 6:** frame time p95 11.2 ms, one frame per refresh of its 90 Hz screen (BR1 ≤ 33.3 ms). The PC on the real reader is *pending*.
- **Bytes:** 0.3 KB of entry JavaScript (≤ 50 KB), 161.2 KB for the book with the 3D view (≤ 350 KB), 40.6 KB of fonts (≤ 100 KB). Nothing is drawn while nothing moves (BR2).
- **Tests:** 152 unit tests; 173 browser tests locally, 160 on CI's Linux, in Chromium, Firefox, WebKit and the phone's profile; axe finds 0 serious or critical issues.
- **CI:** checks 2 min 49 s and Lighthouse 2 min 8 s in parallel, Deploy 3 min 41 s (BC6 ≤ 5 min).

Two numbers to read with care. Lighthouse's TBT runs WebGL on SwiftShader, a GPU emulated on the CPU, and multiplies by 4: it reads 168–214 ms for a start that blocks the phone 0–10 ms. And the source model is still 24.85 MiB against 2 MiB on mobile, which is Stage 6's work.

## Acceptance criteria built in this stage

The traceability table assigns 21 criteria to Stage 4. **All 21 are in progress with evidence**; none is *met*, because each is verified in Stage 5, 6 or 7. Ten list something missing: six are tests of code that exists (decision D1), and four wait by design: the PC run (the owner), a fixture with images (pages have none yet), the review of the Stage 6 diff, and the manual screen-reader pass (Stage 7).

| Criterion | Evidence | Missing |
| --- | --- | --- |
| F01 AC1 body text ≥ 16 px | 16 px in the reader's browser tests at 1280 × 720 and at the phone's size; 16 px on the Pova 6 (spike B) | — |
| F02 AC1 every way to turn | Buttons, ← →, Home, End, an edge tap and an edge drag, in 3D and 2D | Tests of PageUp and PageDown (the code handles them) |
| F02 AC2 the halfway rule | 7 unit tests of the gesture module; browser tests in 3D (let go at 25% it falls back, at 75% it completes) and in 2D | — |
| F03 AC1 select, accessibility tree, find | Browser tests on the reader: a double click selects, the accessibility snapshot has the text, `window.find` finds a word | — |
| F03 AC2 alignment within 2 px | The reader: 0 px flat in three engines, 0.47 px in the phone's profile, also after a turn; the spike B bench at 1280 × 720, 1920 × 1080 and 360 × 688 | — |
| F07 AC1 content of any length | 22 unit tests of the paginator: the real chapter at four page sizes, a short text, a word longer than a line, an empty chapter; the build fails on an overflowing page or a lost word | A fixture with many images (pages have no images yet) |
| F07 AC2 the same breaks in 3D and 2D | Both views show the pages of the same breaks, through one reader core | A browser test that compares them |
| F08 AC1 a URL per page | Reload and a pasted link open the same page | A back and forward test |
| F16 AC1 wheel tilt | Browser tests: the wheel eases to the angle; with reduced motion it changes at once | — |
| Q01 AC1 Lighthouse within BL1–BL3 | In CI on every push, median of 3, mobile and desktop | — |
| Q03 AC1 BR1 on both devices | Pova 6: p95 11.2 ms on the real reader | The PC on the real reader |
| Q03 AC2 nothing drawn while idle | 0 renders in 1 s, browser test | — |
| Q03 AC3 tiers and render counts | Unit tests of the tier settings; draw calls and triangles checked on the 3D lab page | The same counts on the reader |
| K01 AC1 `check:model` | Unit tests on fixture GLBs; runs in CI | — |
| K03 AC1 the placeholder scene | Passes `check:model` in CI | The review of the Stage 6 diff (by design) |
| Q05 AC1 axe in 3D, 2D and reading | 0 serious or critical issues on every page; the book in 3D (axe runs in the Chromium projects) | axe on the 2D view (`?mode=2d`) |
| Q05 AC2 keyboard, focus, announcements | Keys and buttons tested; page changes announced in a polite live region | The manual NVDA pass (Stage 7) |
| Q05 AC3 reduced motion | Browser tests: turns without the animation, the tilt at once | — |
| Q08 AC2 the pure core has unit tests | Paginator, gesture, addresses, content, tiers, homography, curl | A coverage report |
| Q09 AC1 three engines | Browser tests pass in Chromium, Firefox and WebKit, on Windows and on CI's Linux | — |
| C05 AC1 no token in the repository or the build | `check:secrets` on the repository and `dist/` in CI, and with the real values in the deploy | — |

## Risks

Retired in this stage, with evidence in the [register](../risks.md): R01 (the bend is fast enough), R02 (HTML stays on the 3D page), R03 (pagination is deterministic), R13 (secret scan), and at this gate R09 (CI without a GPU: the split between CI and devices is in place) and R10 (text large enough on the phone). Open: R05 (the model's weight, Stage 6), R06 (the magnifier's glass), R08 (the book is one static mesh), R11 (iOS Safari losing the WebGL context), R12 (scope against time), R14, R15.

## Evidence for the playbook's hypotheses

From the [AI usage log](../ai-usage.md) (60 tasks in this stage) and git:

- **H3, spikes:** three spikes, each ending in a choice made with numbers; one small one (6c) rejected its approach.
- **H5, spec churn:** 8 `docs(specs):` commits, 3 that change what a spec says and 5 that change statuses only.
- **H6, CI perf gates:** the Lighthouse check found two regressions on its first runs (CLS 0.079 and LCP 4.65 s on the book) that every browser test had passed. CI's GPU-free runners cannot judge frame time; the devices do (R09).
- **H8, agent work:** 16 tasks right first time, 26 self-corrected, 11 corrected by a check, 2 by the owner, 5 failed (all of them the browser install on CI). The agent's own tooling was the weak spot (7 of 8 self-corrected), and twice a claim reached the owner before a test that could have refuted it (tasks 31 and 54).

## Decisions for the owner

| # | Question | Options | Recommendation |
| --- | --- | --- | --- |
| D1 | The six missing tests in the table above | (a) **go with changes**: PageUp and PageDown, back and forward, the comparison of 3D and 2D breaks, the reader's render counts, axe on the 2D view and a coverage report of the core become Stage 5's first step, beside the verification of F02, F07 and F08 that Stage 5 owns. (b) close them before the go | **(a)**: each is a small test of code that exists, and Stage 5 verifies these criteria anyway |
| D2 | BL3 in CI | (a) keep the Lighthouse check failing over 300 ms, and take the device readout as BL3's evidence at gates; (b) make the book's mobile TBT a warning in CI | **(a)**: it passes with room (214 ms), and it caught two real regressions. Revisit if it starts failing on runner noise |
| D3 | ADR 0010 reads the license policy (ADR 0005) as covering the project's packages, not the operating system of the CI image, which contains GPL software as the GitHub runner did | confirm / reject | **Confirm**: nothing from the image is shipped or linked into the project |

## Exit criteria

- [x] Spikes A, B and C reported, decided and approved (ADRs 0007–0009)
- [x] The reader in 2D and 3D on the placeholder model, live
- [x] Every measurable budget within its limit, in the ledger
- [x] Ledger and AI usage entries for this stage
- [x] All 21 criteria built in Stage 4 in progress with evidence
- [ ] BR1 on the PC, on the real reader (*pending*: the owner's run)
- [ ] Owner decisions D1–D3
- [ ] Self-assessment (H9)
- [ ] Explicit go

## Self-assessment (H9)

*Pending*: the owner's understanding of Stage 4, from 1 to 5, and any question left open.

## How to check this stage yourself

```sh
npm ci
npm run ci                 # format, lint, types, 152 unit tests, specs, versions, licenses, model, build, budgets, secrets
npm run e2e                # browser tests in Chromium, Firefox, WebKit and the phone's profile
npm run check:lighthouse   # after a build: Lighthouse, median of 3, both tiers
```

On the live site, open `https://otromigala.github.io/the-living-book/book/?debug=1`: turn a page by dragging its outer edge and let go before halfway (it falls back) or after (it turns); tilt the book with the wheel; switch to Español and land on the same page; read the line under the buttons.
