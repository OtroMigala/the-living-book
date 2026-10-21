# Spec 01 — Vision, requirements and success metrics

- **Status:** draft, waiting for the Stage 1 gate ([`docs/gates/stage-1.md`](../docs/gates/stage-1.md))
- **Stage:** 1 (requirements and success metrics) of [`workflow-playbook-v0.md`](../workflow-playbook-v0.md)
- **Owner:** Alejo decides; Claude Code drafts and keeps it in sync
- **Revisions after implementation starts:** 0 (each one is counted for H5)

## The idea

The Living Book is a web page with an open book on a desk, three closed books beside it and a magnifying glass. You read it like a real book: you turn pages by dragging a corner, tapping an edge or pressing a key. The text on the pages is real HTML, so it can be selected, read aloud by a screen reader and indexed by search engines. The words and pictures come from Contentstack: an editor publishes a change and the book shows it, with nobody touching the code. That is what "living" means here.

When 3D cannot run well, the same book appears as a 2D flip book, and anyone can switch to a plain reading mode. Same content, same position, in all three.

## Why it exists

1. **Portfolio piece for a Contentstack application.** It shows content modeling, delivery, the publish-to-live flow and editor preview inside an interface that is not an ordinary page.
2. **Evidence of engineering discipline.** Budgets, accessibility and fallbacks, with measured results instead of claims.
3. **Pilot for the workflow playbook.** Hypotheses H1–H9 are measured while building it.

## Audiences

| Who | What they need |
| --- | --- |
| Reviewer at Contentstack (engineer or recruiter) | See it work within 30 seconds; find the CMS story and the numbers in the README |
| Reader on a mid-range phone | Readable text, page turns that do not stutter, a fast start on slow 4G |
| Reader using a keyboard or screen reader | All content and every action, without the mouse and without seeing the 3D |
| Editor (Alejo, in Contentstack) | Change content without a developer; preview it before publishing |
| Alejo, as a student | Understand every technique, not only have it working |

## Assumptions

Each one is confirmed or corrected at the Stage 1 gate. A wrong assumption changes the requirements listed under "If wrong".

| ID | Assumption | If wrong |
| --- | --- | --- |
| A1 | The book holds Alejo's portfolio and the story of how the book was made, split into volumes (see open question Q1) | F04, F11 and the content model change; nothing else |
| A2 | Contentstack's Free plan is enough: 3 users, 100K API calls/month, 1K entries, 1K assets, 10 content types, 1 stack | C03 tightens; F05/F06 may need another route |
| A3 | Content is fetched at build time and the site is static, so API calls grow with builds, not with visitors | F05 needs a rebuild trigger; C03 is easy to meet |
| A4 | The book has two languages, Spanish and English; which one is the default is open question Q3 | F13 is dropped or becomes Won't |
| A5 | `books_with_magnifier.glb` (CC BY-SA 4.0) is the final model, edited in Blender where needed | C02 and F14 change; Stage 2 analysis changes |
| A6 | Reference devices exist to measure frame time: one desktop and one mid-range phone owned by Alejo | Q03 can only be checked in lab conditions |

## Requirements

Priority uses MoSCoW: **Must** (the project fails without it), **Should** (expected, dropped only with a reason in the gate summary), **Could** (if time allows), **Won't** (out of scope for v1, listed so nobody builds it by accident).

Acceptance criteria and how each is verified live in [`traceability.md`](traceability.md). `npm run check:specs` fails if a requirement here has no criterion there.

### Functional

| ID | Requirement | Priority | Notes |
| --- | --- | --- | --- |
| F01 | A 3D reading scene: the open book on a desk with the closed books and the magnifier, the current spread legible at the default view | Must | On narrow screens the camera frames one page, not the spread |
| F02 | Page turning by dragging a corner, tapping or clicking a page edge, the keyboard and visible buttons; a drag follows the pointer and completes or cancels on release | Must | Core risk, Stage 4 spike |
| F03 | Page text and images are DOM elements aligned with the 3D page: selectable, in the accessibility tree, found by the browser's search | Must | Core risk, Stage 4 spike |
| F04 | All reading content (volumes, chapters, pages, images with alt text, credits) comes from Contentstack; none is written in the code | Must | Content model designed in Stage 3 |
| F05 | Publishing in Contentstack updates the public site without a code change | Must | "Living"; target time in traceability |
| F06 | An editor previews unpublished changes inside the book before publishing | Should | Contentstack Live Preview, if the Free plan includes it (risk R07) |
| F07 | Content of any length flows into pages automatically: no text cut off, overflowing or repeated | Must | Pagination engine, Stage 4 spike |
| F08 | Every spread has its own URL; reload, back/forward and a shared link open the same spread | Must | |
| F09 | Fallback chain 3D → 2D flip book → reading mode, chosen automatically and switchable by hand at any time, keeping the reader's position | Must | Fail-soft invariant |
| F10 | Reading mode: the whole content as one semantic article that works without JavaScript and prints cleanly | Must | Also the no-JS and SEO baseline |
| F11 | The closed books on the desk, and a table of contents, open the other volumes | Should | Depends on A1 |
| F12 | A magnifier that enlarges the part of the page under it | Could | The model's lens uses glass transmission, which is expensive (risk R06) |
| F13 | Two languages, Spanish and English, switchable while keeping the position | Should | Depends on A4 and on locales in the Free plan |
| F14 | Credits for the model and every third-party asset, on the site and in `CREDITS.md` | Must | CC BY-SA 4.0 attribution is a license condition |
| F15 | Progressive loading: the title and the first spread's text are in the initial HTML, the 3D arrives later, and progress reflects bytes | Must | Learned in the previous portfolio (spec 02, D1 and D4) |

### Quality

Numbers marked *provisional* are set from experience with the previous portfolio. Stage 2 replaces them with the budget spec, after the model and the inputs are measured.

| ID | Requirement | Priority | Notes |
| --- | --- | --- | --- |
| Q01 | Load performance, Lighthouse mobile profile, median of 3 runs: LCP ≤ 2.5 s, CLS ≤ 0.05, TBT ≤ 300 ms | Must | LCP and CLS are the Core Web Vitals "good" thresholds; TBT is provisional |
| Q02 | Bytes: entry JS ≤ 50 KB gzip; all JS for 3D mode ≤ 350 KB gzip; ≤ 4 MB transferred before the 3D book is interactive | Must | Provisional |
| Q03 | Runtime: frame time p95 during a page turn ≤ 16.7 ms on the reference desktop and ≤ 33.3 ms on the reference phone; no frames rendered while idle | Must | 60 fps and 30 fps; provisional until Stage 2 |
| Q04 | GPU memory for textures and geometry ≤ 128 MB in the mobile tier | Must | Provisional; the Stage 2 model analysis sets it |
| Q05 | Accessibility: WCAG 2.2 AA in all three modes; everything works by keyboard; page changes are announced; reduced motion is respected | Must | |
| Q06 | Search and sharing: every spread URL has its own title and description; Lighthouse SEO ≥ 95 | Should | |
| Q07 | Resilience: every enhancement has a tested fallback, and no failure leaves a blank screen | Must | WebGL missing or lost, CMS unreachable at build, image missing |
| Q08 | Code quality: TypeScript strict, lint and format clean, unit tests on the pure core, CI green on `main` | Must | CI baseline built in Stage 1 |
| Q09 | Works on the latest two versions of Chrome, Edge, Firefox and Safari (macOS and iOS) | Must | 3D needs WebGL 2; otherwise 2D |

### Constraints

| ID | Requirement | Priority | Notes |
| --- | --- | --- | --- |
| C01 | Monthly cost is $0: free tiers only | Must | Contentstack Free, GitHub, free hosting |
| C02 | Licenses: dependencies MIT, Apache-2.0, BSD, ISC, Zlib, CC0 or CC BY; anything else needs the owner's approval in an ADR | Must | The model is CC BY-SA 4.0: open question Q2 |
| C03 | Stay inside the Contentstack Free plan with margin: ≤ 10 content types, ≤ 1K entries, ≤ 1K assets, ≤ 50% of the monthly API calls | Must | Limits read from contentstack.com/pricing on 2026-10-21 |
| C04 | Dependencies pinned to exact versions, each at least 14 days old when installed | Must | Same rule as the Su-30 project |
| C05 | No secret in the repository or the client bundle; the Contentstack management token never leaves CI | Must | The delivery token is read-only, but it is still kept out of the repo |

### Process

| ID | Requirement | Priority | Notes |
| --- | --- | --- | --- |
| P01 | Evidence for H1–H9 is logged at every gate: `docs/ai-usage.md`, `docs/performance.md` and the gate summary | Must | The playbook experiment depends on it |

## Success, in five numbers

What a reviewer should see in the README at the end of Stage 7:

1. **LCP** on Lighthouse mobile (Q01).
2. **Frame time p95** during a page turn, on a real phone (Q03).
3. **Publish-to-live time**, from "Publish" in Contentstack to the change on the public site (F05).
4. **Accessibility:** axe serious and critical issues in each mode, which should be 0 (Q05).
5. **Fallback coverage:** failure cases tested and passing (Q07).

## Not in v1

User accounts, comments or annotations, search across volumes, an authoring interface outside Contentstack, photorealism, offline mode, VR or AR, sound.

## Open questions for the gate

The full list, with recommendations, is in [`docs/gates/stage-1.md`](../docs/gates/stage-1.md#decisions-for-the-owner).
