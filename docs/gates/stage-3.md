# Gate — Stage 3: scaffold

- **Date:** 2026-10-22
- **Decision:** **go with changes** (owner, 2026-10-22): D1 approved; D2 option (a).

## Scope as understood

Playbook row: *scaffold → tokens, interfaces/stubs, static layout, content model*. Two things were added by the owner along the way: a site live on GitHub Pages "today", and the Contentstack connection. The Spanish text, decided at the Stage 2 gate, was transcribed and published in this stage too.

- **In scope:** design tokens, the framework, the content model in code and in Contentstack, the static reading layout in both languages, deployment, and the checks that guard them.
- **Not in scope:** anything 3D (Stage 4), pagination and spread URLs (Stage 4), optimizing the model (Stage 6).

## What was produced

| Artifact | Where |
| --- | --- |
| Live site in two languages: reading mode, credits, diagnostics | https://otromigala.github.io/the-living-book/ · `/es/` · `/credits/` · `/es/creditos/` · `/diagnostics/` |
| Framework decision: Astro, static output, 3D as a later island | [ADR 0003](../adr/0003-astro-static-site.md) |
| Typeface: Literata, self-hosted, OFL approved by the owner | [ADR 0004](../adr/0004-literata-typeface.md) |
| Design tokens, with a test that computes their contrast | `src/styles/tokens.css`, `tools/contrast/` |
| Content model in code: types, loader, validator, parity check | `src/content/` |
| Content model in Contentstack: 3 content types; 6 entries per locale | `cms/content-types/`, stack *The Living Book* |
| Seed and pull scripts; Seed workflow; Deploy pulls from Contentstack and falls back to the snapshot | `tools/cms/`, `.github/workflows/` |
| Spanish text: faithful transcription of the 1902 scan and the adapted version, with every edit listed | `assets-src/text/` |
| Interface text per locale, hreflang, a language switch that keeps the paragraph | `src/i18n/ui.ts`, `src/components/` |
| Byte-budget check that reads its limits from spec 02 | `tools/budget-check/` |
| Diagnostics page; the reference phone measured with it | `/diagnostics/`, input report §4 |

## Metrics snapshot

From the [ledger](../performance.md#stage-3--gate-2026-10-22): home page 5.2 KB gzip with 0.2 KB of JavaScript (BB1: ≤ 50 KB) and 40.6 KB of fonts (BB6: ≤ 100 KB); 5 pages; both languages built from Contentstack with 2 Delivery API calls per build; 59 unit tests in 7 files; local `npm run ci` (now including the build) 4.9 s. CI on GitHub went from about 20 s to about 5 minutes during an npm registry incident (see below).

## Acceptance criteria built in this stage

The traceability table assigns 19 criteria to Stage 3. **11 are in progress with evidence; 8 have not been started.**

| Criterion | State | Evidence or what is missing |
| --- | --- | --- |
| F04 AC1 content validator | in progress | Validator and tests; the build fails on invalid CMS content. Missing: a check that no reading text is in the source code |
| F10 AC1 reading mode without JavaScript | in progress | The pages are static HTML with the full text. Missing: an automated browser test with JavaScript off, and axe |
| F13 AC1 two languages | in progress | `/es/` live, `lang` set, parity test on the real content. Missing: an automated test of the switch |
| F14 AC1 credits | in progress | Credits page from the content, in both languages. Missing: a test comparing it with `CREDITS.md` |
| F15 AC1 text in the initial HTML | in progress | Verified with `curl` on the live site. Missing: an automated check and a Lighthouse trace |
| Q02 AC1 byte budgets | in progress | BB1 and BB6 checked in CI. BB2–BB5 apply once 3D exists |
| Q06 AC1 titles and descriptions | in progress | Each page has its own; hreflang added. Missing: a Lighthouse SEO run |
| K02 AC1 content from the EU endpoint, with fallback | in progress | All three paths seen in real deploys: not seeded (fallback), English given for Spanish (refused), both locales pulled |
| K02 AC2 parity between locales | in progress | Tests on the real snapshots; it stopped a deploy whose content was out of sync |
| C02 AC1 licenses | in progress | Every license approved and credited. Missing: an automated license check |
| C03 AC1 Free-plan limits | in progress | 3 content types; 6 entries, each in 2 locales; 2 calls per build. Missing: an automated count |
| F08 AC1 a URL per spread | **not started** | Spreads need pagination (Stage 4) |
| Q01 AC1 Lighthouse in CI | **not started** | |
| K01 AC1 `check:model` | **not started** | |
| K03 AC1 placeholder scene | **not started** | Needs the 3D code of Stage 4 |
| Q05 AC1 axe in all modes | **not started** | |
| Q08 AC2 tests of the pure core | **not started** | The core (pagination, turn state, tiers) does not exist yet |
| Q09 AC1 three browsers | **not started** | |
| C05 AC1 secret scan | **not started** | Tokens are only in GitHub secrets today, but nothing checks the build output |

## Decisions for the owner

| # | Question | Options | Recommendation |
| --- | --- | --- | --- |
| D1 | Approve ADR 0003 (Astro) | approve / revisit | **Approve**: it delivered 0.2 KB of JavaScript on the home page with the full text in the HTML |
| D2 | The 8 criteria not started | (a) **go with changes**: Stage 4 begins with a browser-test harness (Playwright with axe, JavaScript off, Chromium, Firefox and WebKit), a secret scan and a license check, before any 3D code; K01, K03, F08 and Q08 AC2 move to Stage 4, where the code they test is written; Q01 (Lighthouse) moves with the harness. (b) finish them before the go | **(a)**. Stage 4 needs the harness anyway, for the alignment probe and the frame counter of its spikes. Moving the stages in the traceability table is a spec revision after implementation started, and it is counted for H5 |

### Answers (2026-10-22)

| # | Answer | Effect |
| --- | --- | --- |
| D1 | Approved: "not what I usually use, but it fits the needs of the project better" | ADR 0003 accepted |
| D2 | (a), go with changes | F08 AC1, Q01 AC1, K01 AC1, K03 AC1, Q05 AC1, Q08 AC2, Q09 AC1 and C05 AC1 now say Built: 4 in the traceability table. Stage 4 starts with the browser-test harness, the secret scan and the license check, before any 3D code. R09 and R13 move to Stage 4 |

## External incident during this gate

From 02:22 UTC on 2026-10-22, `npm ci` on GitHub's runners took between 2 and 5 minutes instead of 2–5 s, with no dependency change between a fast and a slow run (commits `bcc38c4` and `e9e1e3d`). npm's status page reports "Degraded Package Install and Publishing", identified at 02:33 UTC. While it lasts, CI breaks its own budget BC6 (≤ 5 minutes). No change made; recorded in the ledger.

## Exit criteria

- [x] Tokens, layout and content model in code and in Contentstack
- [x] The site deploys from Contentstack on every push, in two languages
- [x] Ledger and AI usage entries for this stage
- [x] All 19 criteria built in Stage 3 at least in progress, or moved by the owner's decision (11 in progress, 8 moved to Stage 4)
- [x] Owner decisions D1 and D2
- [x] Self-assessment (H9)
- [x] Explicit go (with changes)

## Self-assessment (H9)

- **Understanding:** no number given. The owner's words: "En este caso, casi no sé qué hiciste, la verdad" (this time I hardly know what you did). Read as low, well below the 4 of Stages 1 and 2.
- **Why, as far as the log shows:** Stage 3 was the longest stage so far (20 logged tasks, 22 commits), across several chat turns, with many technical pieces (framework, tokens, CMS scripts, workflows, i18n) and the owner busy with other inputs at the same time (tokens, diagnostics, proofreading). The plain-language summary came only at the end.
- **Change for Stage 4:** small steps inside the stage. Before each step, two or three lines on what and why; after it, something the owner can open or try. The agent stops after each spike for questions. Recorded in `CLAUDE.md`.

## How to check this stage yourself

```sh
npm ci
npm run ci          # format, lint, types, 59 tests, specs, versions, build, budgets
npm run dev         # the site at http://localhost:4321/the-living-book/
```

Then, on the live site: open `/es/`, scroll to the middle of the text and press "English": you land on the same paragraph.

### Follow-up check of understanding (2026-10-22)

After the plain-language walkthrough, the owner summarized Stage 3 in their own words: "configure the project so content can be edited from Contentstack, decoupling code changes from content updates; Contentstack also runs a pre-CI/CD flow". The first half is right. The second is not: Contentstack stores and publishes content; the CI/CD (pull, checks, build, deploy) runs in GitHub Actions, and today a publish in Contentstack does not start it (the webhook comes in Stage 5). Corrected in the chat before starting Stage 4, at the owner's request ("only move on if I am right").
