# Gate — Stage 5: feature completion

- **Date:** 2026-10-23
- **Decision:** *pending* (the owner). F11 and F12 dropped by the owner before the gate ("Deja fuera esos 2 puntos").

## Scope as understood

Playbook row: *feature completion, then freeze → complete app on placeholders, e2e matrix*. The stage began with the six tests the Stage 4 gate left missing (D1), built what was left of the reader around the placeholder model, and connected publishing in Contentstack to the site. Along the way the owner asked for a cleaner bar in harmony with the scene, and agreed to link the book from the site.

- **In scope:** the fallback chain and its switch (F09), publishing and preview (F05, F06), printing (F10 AC2), progress by bytes (F15 AC2), the failure suite (Q07), the tilt's touch and keyboard tests (F16 AC2, AC3), and the verification of the criteria Stage 5 owns.
- **Not in scope:** the real model (Stage 6). F11 and F12, dropped.

## What was produced

| Artifact | Where |
| --- | --- |
| The view switch: 3D book ↔ flat pages at the same place; a lost GPU context goes on flat; a slow 3D view offers flat pages, never switches alone | `src/reader/reader.ts` (`useView`), `src/reader/slow-frames.ts`, `/book/` |
| The reader's bar on the desk: arrows for the turns, quiet links, two rows on a phone | `src/components/Book.astro`, desk tokens in `src/styles/tokens.css` |
| The book linked from the site; the article and the book open each other at the same paragraph | `src/layouts/Base.astro`, `src/components/Reading.astro` (`#at=`) |
| Publishing: the deploy signs what is published; a scheduled check deploys when it changes | [ADR 0011](../adr/0011-publish-from-contentstack.md), `tools/cms/`, `.github/workflows/content-watch.yml` |
| The preview copy at `/preview/` (built, not published: debt D1) | `tools/preview/`, [debt register](../debt.md) |
| The failure suite: five ways to break the book, in four projects | `e2e/failures.e2e.ts` |
| Printing the article, not the reader; the progress line by bytes | `src/components/Book.astro`, `src/reader/progress.ts`, `tools/book-bytes/` |
| Checks: no reading text in the code, a coverage report of the pure core, the content pull tested against a fake API | `tools/text-check/`, `vitest.config.ts`, `tools/cms/pull-books.ts` |

## Metrics snapshot

From the [ledger](../performance.md#stage-5--gate-2026-10-23): LCP 1.50 s on the book on mobile (≤ 2.5 s), CLS 0.000 (≤ 0.05), TBT 157 ms in CI's simulation (≤ 300 ms; the phone measured 0–10 ms of blocking at Stage 4); 162.5 KB of JavaScript for the book (≤ 350 KB); 192 unit tests, the pure core 95.3% covered; 255 browser tests in four projects, none flaky; CI 3 min 22 s (≤ 5 min).

## Acceptance criteria of this stage

| Criterion | State | Evidence or what is missing |
| --- | --- | --- |
| F02 AC1, AC2; F04 AC1; F07 AC2; F08 AC1; F16 AC1; K02 AC1, AC2 (verified here) | **met** | Every input tested; validator and the source check; 3D and 2D compared; reload, back, forward and a pasted link; the pull's decisions tested and a live build |
| F07 AC1 content of any length | in progress | A fixture with many images: pages have none yet |
| F05 AC1 a publish live within 10 minutes, no commit | in progress, **not working** | The check and the deploy work when started by hand; GitHub has never started the check on its schedule (R20). The three timed publishes wait for it |
| F06 AC1 preview | in progress, **blocked** | The copy builds and is checked in CI; the delivery token cannot read the preview environment (debt D1) |
| F09 AC1, AC2, AC3 the fallback chain | in progress | No WebGL and a lost context go flat at the same page; the switch keeps the place in both directions; slow frames offer flat pages (browser tests, CPU slowed 20×). Verified in Stage 7 |
| F10 AC2 printing | in progress | Print emulated in four projects; the owner's look at a print preview is the verification (Stage 7) |
| F15 AC2 progress by bytes | in progress | Every value recorded: 0, 2, 5, 94, 100, never backwards |
| F16 AC2, AC3 tilt by touch and keys; alignment while tilted | in progress | A real touch in the phone's profile; 10°, 25°, 40° within 2 px or textures |
| Q07 AC1 no blank screen | in progress | The failure suite, 20 of 20; it found and fixed the reader not starting without its fonts |
| F11, F12 | **dropped** | The owner's decision |

## Risks and debt

New: **R20** (score 9), GitHub never starting the scheduled check. Debt **D1**, the preview's token. Still open: R05 (the model's weight, Stage 6), R06 (the magnifier's glass), R08, R11, R12, R14, R15.

## Evidence for the playbook's hypotheses

- **H6, CI checks catch regressions:** the new checks found 4 bugs this stage that no earlier test had (the fonts, a resize mid-turn, axe checking the wrong page, a bar that shrank the text).
- **H8, agent work:** 20 tasks: 9 right first time, 5 self-corrected, 5 corrected by a check, 1 failed. Outside services (a token's scope, GitHub's scheduler) behaved unlike what the agent expected, twice.
- **H5, spec churn:** 9 spec commits, 3 of them changing content.

## Decisions for the owner

| # | Question | Options | Recommendation |
| --- | --- | --- | --- |
| D1 | F05 does not work while GitHub ignores the schedule (R20) | (a) carry it into Stage 6: check the schedule once more, then a test workflow, then, if needed, an outside scheduler or the webhook relay, with a GitHub token the owner creates following written steps; (b) hold the gate until it works | **(a)**: the rest of the stage is done, and Stage 6 does not depend on it |
| D2 | CI's checks job went up to 3 min 22–3 min 58 s with the preview copy (BC6 ≤ 5 min), and the real model will add more | Move the preview copy's build to the Lighthouse job, which runs beside it and takes about 2 min | **Yes**, as Stage 6's first step |
| D3 | BR1 on the PC, on the real reader, deferred since Stage 4 | Run it with the real model in Stage 6 | **Yes**: the numbers that matter are the real model's |

## Exit criteria

- [x] The reader complete on the placeholder model: views, switch, fallbacks, printing, progress
- [x] The criteria Stage 5 verifies: 8 met, 1 waiting for images (F07 AC1)
- [x] Ledger and AI usage entries for this stage
- [ ] F05 working (D1)
- [ ] Owner decisions D1–D3
- [ ] Self-assessment (H9)
- [ ] Explicit go

## How to check this stage yourself

```sh
npm run ci                 # format, lint, types, 192 unit tests, specs, text, versions, licenses, model, build, budgets, secrets
npm run e2e                # 255 browser tests, the failure suite among them
npm run coverage           # the pure core's coverage
```

On the live site: from the home page, scroll to the middle and press **Book**; turn a few pages; press **Flat pages** and **3D book**; press **Read as an article**. Print the book's page and look at the preview.
