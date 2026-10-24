# Spec 01 — Vision, requirements and success metrics

- **Status:** draft, waiting for the Stage 1 gate ([`docs/gates/stage-1.md`](../docs/gates/stage-1.md))
- **Stage:** 1 (requirements and success metrics) of [`workflow-playbook-v0.md`](../workflow-playbook-v0.md)
- **Owner:** Alejo decides; Claude Code drafts and keeps it in sync
- **Revisions after implementation started** (Stage 3 on; each one is counted for H5): 13. One budget change (BM1 on desktop from 96 to 112 MiB, for the tabletop's marquetry at its source's resolution, the owner's choice, Stage 6); one requirement added and one criterion changed with it (F18: the book carries its own controls, and F02 AC1's on-screen buttons show when the keyboard reaches them, at the owner's request, Stage 6); two contract changes (the scene around the books in the model file, with the furniture at real size and credited, and the model's budget per tier, spike D, Stage 6); one contract clarification (spec 03: how a page is measured, after spike C and ADR 0009, Stage 4); two requirements added (F16: tilting the book with the mouse wheel, after spike B and ADR 0008, Stage 4; F17: looking around with the F key held, at the owner's request, Stage 6); two requirement changes (C02: fonts under the OFL allowed, commit ff34cf1; F17: from turning the camera where it stands to circling the book, after the owner saw it, Stage 6); two clarifications in spec 02 (units, commit 9761895; BR3's reason with the measured pixel ratio, commit 19f92a0); one plan change in the traceability table (8 criteria moved from Stage 3 to Stage 4 at the Stage 3 gate); one criterion clarified (F01 AC2: the whole scene is the opening view, and the reading view comes after it, since both cannot be one view; the owner, Stage 6). Status updates in the traceability table are not counted

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
| A1 | **Confirmed at the gate:** the book holds the frame story of *One Thousand and One Nights* (King Shahryar and his brother, up to the start of the first night), from public-domain translations (ADR 0002) | F04, F11 and the content model change; nothing else |
| A2 | **Mostly confirmed at the gate:** Contentstack's Free plan is enough (3 users, 100K API calls/month, 1K entries, 1K assets, 10 content types, 1 stack). The stack accepted a second language and two environments and shows Webhooks and Launch; Live Preview was not found | C03 tightens; F05/F06 may need another route |
| A3 | Content is fetched at build time and the site is static, so API calls grow with builds, not with visitors | F05 needs a rebuild trigger; C03 is easy to meet. The trigger is a check every 10 minutes (ADR 0011), one call each and one more for the preview twice an hour, so calls also grow with time: about 5,760 a month |
| A4 | **Confirmed at the gate:** two languages; English is the stack's master language and the site's default, Spanish the second | F13 is dropped or becomes Won't |
| A5 | `books_with_magnifier.glb` (CC BY-SA 4.0) is the final model, edited in Blender where needed | C02 and F14 change; Stage 2 analysis changes |
| A6 | **Confirmed at the gate:** reference phone Tecno Pova 6 (MediaTek Helio G99 Ultimate, Mali-G57 MC2 GPU, 1080×2460 screen at 120 Hz); reference desktop with an AMD Radeon RX 9060 XT. The phone is the binding constraint | Q03 can only be checked in lab conditions |

## Requirements

Priority uses MoSCoW: **Must** (the project fails without it), **Should** (expected, dropped only with a reason in the gate summary), **Could** (if time allows), **Won't** (out of scope for v1, listed so nobody builds it by accident).

Acceptance criteria and how each is verified live in [`traceability.md`](traceability.md). `npm run check:specs` fails if a requirement here has no criterion there.

### Functional

| ID | Requirement | Priority | Notes |
| --- | --- | --- | --- |
| F01 | A 3D reading scene: the open book on a desk with the closed books and the magnifier, shown whole when the book opens, then the current spread legible at the reading view | Must | On narrow screens the camera frames one page, not the spread. The whole scene and legible text cannot be one view (the text would be under 16 px), so the book opens on the whole scene and comes down to reading (the owner, Stage 6). The desk is a marquetry table on a carpet, with a candle holder beside the book (spike D, Stage 6) |
| F02 | Page turning by dragging a corner, tapping or clicking a page edge, the keyboard and visible buttons; a drag follows the pointer and completes or cancels on release | Must | Core risk, Stage 4 spike |
| F03 | Page text and images are DOM elements aligned with the 3D page: selectable, in the accessibility tree, found by the browser's search | Must | Core risk, Stage 4 spike |
| F04 | All reading content (volumes, chapters, pages, images with alt text, credits) comes from Contentstack; none is written in the code | Must | Content model designed in Stage 3 |
| F05 | Publishing in Contentstack updates the public site without a code change | Must | "Living"; target time in traceability |
| F06 | An editor previews unpublished changes inside the book before publishing | Should | Live Preview is not available on the Free plan (Stage 2 gate), so through a build of the `preview` environment |
| F07 | Content of any length flows into pages automatically: no text cut off, overflowing or repeated | Must | Pagination engine, Stage 4 spike |
| F08 | Every spread has its own URL; reload, back/forward and a shared link open the same spread | Must | |
| F09 | Fallback chain 3D → 2D flip book → reading mode, chosen automatically and switchable by hand at any time, keeping the reader's position | Must | Fail-soft invariant |
| F10 | Reading mode: the whole content as one semantic article that works without JavaScript and prints cleanly | Must | Also the no-JS and SEO baseline |
| F11 | The closed books on the desk, and a table of contents, open other volumes (for example, later tales of the *Nights*) | Could | Lowered from Should at the gate: the content is one text (A1). Dropped at the Stage 5 gate by the owner ("Deja fuera esos 2 puntos", 2026-10-23) |
| F12 | A magnifier that enlarges the part of the page under it | Could | The model's lens uses glass transmission, which is expensive (risk R06). Dropped at the Stage 5 gate by the owner ("Deja fuera esos 2 puntos", 2026-10-23) |
| F13 | Two languages, Spanish and English, switchable while keeping the position | Should | Depends on A4 and on locales in the Free plan |
| F14 | Credits for the model, the text (edition and translator) and every third-party asset, on the site and in `CREDITS.md` | Must | CC BY-SA 4.0 attribution is a license condition; the text is public domain, but naming the edition is honest and lets anyone check it |
| F15 | Progressive loading: the title and the first spread's text are in the initial HTML, the 3D arrives later, and progress reflects bytes | Must | Learned in the previous portfolio (spec 02, D1 and D4) |
| F16 | The reader can tilt the book away from the flat reading view and back, with the mouse wheel and a smooth movement; the default view is flat | Should | Added in Stage 4 after spike B (ADR 0008): the owner prefers how the tilted book looks, and wants no extra button |
| F17 | While the F key is held, the camera can circle the open book: the mouse moves it around the book and down toward the desk; let go, the view goes back to reading | Should | Added in Stage 6 at the owner's request (2026-10-23): a free camera unlocked by holding F. It first turned the camera where it stands; the reading camera is close, so the book left the picture, and the owner chose to circle it instead ("orbitemos", the same day). A keyboard user holds F and uses the arrows (Q05 AC2). Desktop only: a phone has no F key |
| F18 | The book carries its own controls: a contents page before the first page, where the book opens, lists the chapters and leads to the reading mode, to flat or 3D pages, to the other language and to the credits; the running head of the pages of text leads back to it; nothing floats over the desk but a message when one is needed | Should | Asked by the owner (2026-10-24): "no quisiera que todos los controles de la página me aparezcan por ahí flotando… eso rompe bastante la inmersión… meterlos como una especie de índice o página de configuración dentro de las páginas del libro". The owner accepts less visible controls for it. The keyboard keeps every action (Q05 AC2): the turn buttons show when it reaches them, and screen readers still hear each page |

### Quality

The numbers for Q01–Q04 live in one place, [spec 02 (budgets)](02-budget.md), set in Stage 2 after measuring the inputs. Stage 1 had provisional values here.

| ID | Requirement | Priority | Notes |
| --- | --- | --- | --- |
| Q01 | Load performance within the load budgets (BL1–BL3: LCP, CLS, TBT) | Must | |
| Q02 | Transferred bytes within the byte budgets (BB1–BB6) | Must | |
| Q03 | Runtime within the runtime budgets (BR1–BR6): frame time during a page turn, no rendering while idle, pixel ratio, draw calls, triangles, extra passes | Must | Frame time is measured on the reference devices |
| Q04 | Estimated GPU memory within the memory budgets (BM1–BM3) | Must | Browsers do not report it; computed from texture and buffer sizes |
| Q05 | Accessibility: WCAG 2.2 AA in all three modes; everything works by keyboard; page changes are announced; reduced motion is respected | Must | |
| Q06 | Search and sharing: every spread URL has its own title and description; Lighthouse SEO ≥ 95 | Should | |
| Q07 | Resilience: every enhancement has a tested fallback, and no failure leaves a blank screen | Must | WebGL missing or lost, CMS unreachable at build, image missing |
| Q08 | Code quality: TypeScript strict, lint and format clean, unit tests on the pure core, CI green on `main` | Must | CI baseline built in Stage 1 |
| Q09 | Works on the latest two versions of Chrome, Edge, Firefox and Safari (macOS and iOS) | Must | 3D needs WebGL 2; otherwise 2D |

### Constraints

| ID | Requirement | Priority | Notes |
| --- | --- | --- | --- |
| C01 | Monthly cost is $0: free tiers only | Must | Contentstack Free, GitHub, free hosting |
| C02 | Licenses: dependencies MIT, Apache-2.0, BSD, ISC, Zlib, CC0 or CC BY; fonts under the SIL Open Font License; anything else needs the owner's approval in an ADR | Must | Model CC BY-SA 4.0 approved at the Stage 1 gate; OFL fonts approved 2026-10-21 (ADR 0004) |
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

## Changes at the Stage 1 gate (2026-10-21)

Made before any implementation, so they do not count as churn for H5.

- **A1 confirmed, with different content:** the owner chose the frame story of *One Thousand and One Nights* instead of the portfolio. Editions and the open question about abridging are in [ADR 0002](../docs/adr/0002-book-content.md).
- **F11 lowered to Could:** with one text there are no other volumes to open yet.
- **F14 extended** to name the text's edition and translator.
- **A6 confirmed** with the owner's devices.
- **C02:** the owner accepted the model's CC BY-SA 4.0 license; the code is under MIT (`LICENSE`).
- **F06:** Contentstack's docs say Live Preview is enabled by contacting support, and the owner did not find it in the stack's settings; whether it can be enabled on the Free plan is checked in Stage 2 (R07).
- **A2 and A4 confirmed** when the owner created the stack: English master language, Spanish added, two environments, EU region.

## Changes in Stage 2 (2026-10-21)

Planned refinements, not churn: Stage 1 marked these numbers as provisional.

- **Q01–Q04** now point to [spec 02 (budgets)](02-budget.md) instead of carrying numbers. Two ceilings moved with the measurements: bytes before the 3D book is interactive went from 4 MB to 3 MiB (mobile), and total GPU memory from 128 MB to 64 MiB (mobile), because the model's real cost is all in textures that can shrink.
- **Contracts** K01–K03 added in [spec 03](03-contract.md).
- **At the Stage 2 gate:** F06 changes mechanism (no Live Preview on the Free plan: preview builds instead); hosting is GitHub Pages; the Spanish text will be transcribed from the 1902 scans (ADR 0002 amendment).
