# Spike C — Pagination

- **Stage:** 4, step 4. **Risk:** R03 (pagination is not deterministic, or forces text that is too small). **Requirements:** F07 (AC1, AC2), F01 AC1; it also decides how F08's spread URLs can work.
- **Status:** **done**: measured in three engines, on two systems and on the Pova 6; decision in [ADR 0009](../adr/0009-pagination-at-build-time.md), accepted by the owner (paginate at build time, measured by Firefox, checked in the browser).
- **Bench:** `/lab/pages/` (code: `src/pagination/`).

## Question

Can the text be split into pages once, so that in every engine and on both reference devices no page overflows and no word is lost or repeated (F07 AC1)? Specs 02 and 03 say pagination happens at build time; spike B showed that a different font moves every page break (R03's early signal). Is build time safe, or must each reader's browser paginate for itself, and at what cost?

## Two places to paginate

| | Build time | In the reader's browser |
| --- | --- | --- |
| Who measures the text | A headless Chromium during the build (Playwright is already a development tool), with the real CSS and font | The reader's own browser, once the font has loaded |
| What ships | The page breaks, in the HTML | The paginator's code, with the 3D and 2D modes' JavaScript (not the entry JS, BB1) |
| Why it could fail | Another engine measures a line slightly longer, a paragraph takes one more line, and the page overflows | Time on the phone's main thread; and breaks that differ between browsers, so a page number does not name the same text everywhere |

Both use the same algorithm (`paginate.ts`): greedy, block by block; a paragraph that does not fit is split at the last word that does (found by binary search: each test is one layout); a heading is never the last thing on a page. The algorithm only asks a question, "does this page fit?", so it is unit-tested with a fake measurer and runs in the browser with a real one (`dom.ts`).

**The font.** The reading mode loads Literata with `font-display: optional`, which, when the font is late, keeps the fallback for the whole page view (good for the reading mode: no layout shift). Pages cannot accept that: their breaks depend on the font's exact widths. So pages use a second name for the same file, *Literata Paged*, with `font-display: block`: the browser waits for it (up to about 3 s) before drawing page text, and the paginator waits for it before measuring. The file is the same, so it downloads once.

## Method

- **Correctness:** unit tests with fixtures (short, long, a very long word, an empty chapter, headings), and in the browsers every page of the real text in both locales and both page classes is checked for overflow, and the words of all pages joined must equal the text.
- **Determinism:** each engine paginates; a signature (a hash of the breaks) tells at a glance whether two engines or devices agree. Then Chromium's breaks are laid out in Firefox and WebKit, counting the pages that overflow there.
- **Font:** a browser test delays the font file so the reading mode's Literata misses its window, and checks that the pages still use Literata.
- **Cost:** time to paginate one locale in one page class, and the number of layouts it took.

## Decision criteria (set before the numbers)

1. **Correct everywhere** (F07 AC1): no page overflows and every word appears once, in order, in every engine, both classes and both locales. Required of any approach.
2. **Build time qualifies** only if Chromium's breaks, laid out in Firefox and WebKit, overflow on no page (with a safety margin stated, if one is needed). The owner's two devices both run Chromium; matching signatures there count as confirmation.
3. **Font:** pages are laid out in Literata even when the reading mode's font came too late.
4. **Paginating in the browser qualifies** only if one locale in one class takes ≤ 50 ms of main thread on the phone (a task over 50 ms is a "long task": it delays the response to input and counts in TBT, BL3).
5. If both qualify, build time wins (the specs say so, and it costs the reader nothing); if only one does, that one; if neither, build time with a margin plus a check in the browser that re-paginates where a page overflows.

## Results

The criteria above were committed before the bench existed.

### In the browser tests (`npm run e2e`, 2026-10-22, on the owner's PC)

Each engine paginates the first chapter in both languages and both page classes, twice: measuring pages as they are shown (no slack), and 1 px narrower (1 px slack, see below). Pages: 16 compact and 7 regular in English, 15 and 6 in Spanish.

| | Chromium | Firefox | WebKit | Phone profile (Chromium) |
| --- | --- | --- | --- | --- |
| Every page fits; every word once, in order (8 cases) | yes | yes | yes | yes |
| Signatures without slack: en compact, en regular, es compact, es regular | 72b3d75f, 37e0e6d9, 287eea23, d7e37e89 | the same, except es compact: **1b9fd8df** | the same as Chromium | the same as Chromium |
| Signatures with 1 px slack | b4e7eb97, 37e0e6d9, bfa73c2a, 785524cf | **the same** | **the same** | **the same** |
| Chromium's breaks laid out here, without slack | — | **1 of 15** Spanish compact pages overflows, by 24 px (one line) | none | — |
| The same with 1 px slack | — | none | none | — |
| Time per language and class, first run | 13–33 ms | 14–28 ms | 36–74 ms | 19–31 ms (the PC's processor) |

**Why Firefox differed.** On that page a line of the second paragraph measures exactly 287.00 px in Chromium, in a text area 287 px wide; in Firefox the same line measures a few hundredths of a pixel more and wraps, so the paragraph takes 11 lines instead of 10. Each engine rounds text widths in its own internal units, and a line that ties with the margin can go either way.

**The 1 px slack.** The paginator measures each page with its text area 1 px narrower than it is shown (`--measure-slack` in `page.css`). Greedy line breaking never needs more lines when it has more room, so a page that fits 1 px narrower fits in any engine whose widths differ by less than that. With the slack, all three engines produced the same breaks, and Chromium's fitted everywhere. The cost: a line can end up to 1 px short of the margin, which no reader sees.

**The font.** With the font files held back 800 ms, the reading mode's Literata fell back (as `font-display: optional` allows) and the pages were still laid out in Literata (*Literata Paged*, `font-display: block`).

### In CI (GitHub Actions, Linux; deploy run 39804436580)

The first push of these results asserted that, with 1 px of slack, Chromium's breaks fit in every engine. On Linux they did not, the deploy stopped, and the owner found the bench missing. The cross-engine check is now a printed matrix, run alone after the other tests (`e2e/pages-matrix.cross.ts`): each engine's breaks laid out in each other engine, on the platform at hand.

| On Linux | Signatures with 1 px slack (en compact, en regular, es compact, es regular) | Its breaks overflow, with 1 px slack, in… |
| --- | --- | --- |
| Firefox | b4e7eb97, 37e0e6d9, bfa73c2a, 785524cf: **the same as on Windows** | WebKit: none. Chromium: 1 of 15 es compact pages and 1 of 6 es regular |
| WebKit | the same as Firefox, and as on Windows | Firefox: none. Chromium: the same two pages |
| Chromium | **3ffcaf49, eeb2e415, f2515481, 6575735d**: different from Chromium on Windows; the slack changes only one of them | Firefox and WebKit: 1 of 15 es compact pages |

Each overflow is one line (24 px). So Firefox and WebKit measure text the same on both systems, and Chromium on Windows measures like them; **Chromium on Linux is the odd one**, off by more than 1 px in both directions (some lines wider, some narrower). That is consistent with glyph widths rounded to whole pixels by the system's font settings; not confirmed.

### Reading them against the criteria

1. **Correct everywhere:** yes, in three engines, two systems, both classes, both languages.
2. **Build time:** not with the build's own Chromium, which is Linux's. Measured with Firefox or WebKit and 1 px of slack, the breaks fit in Firefox, WebKit and Chromium on Windows, but not in Chromium on Linux (one line, on one or two pages). Chrome on Android is also built on Linux: **the owner's phone decides** whether mobile readers measure like the desktop engines or like Linux's Chromium.
3. **Font:** yes.
4. **Paginating in the browser:** exact by construction in every browser, 13–74 ms on the PC; the phone decides it (*pending*: the owner's run).

### On the reference devices

The owner's run on the Pova 6 (Chrome 155 on Android, the phone's own view; 2026-10-22):

| | Pova 6 |
| --- | --- |
| Every page fits; every word once, in order | yes, 8 of 8 cases |
| Signatures without slack | 72b3d75f, 37e0e6d9, 287eea23, d7e37e89: as Chromium on Windows and WebKit |
| Signatures with 1 px slack | b4e7eb97, 37e0e6d9, bfa73c2a, 785524cf: **the desktop family** (Firefox and WebKit on both systems, Chromium on Windows), not Linux's Chromium |
| Time, the first pagination on the page (English, compact, cold) | **75.3 ms** |
| Time, the other seven | 26.8–42.2 ms (a second, warm run: 25.8–47.6 ms) |
| Font in the pages and in the reading mode | Literata |

The PC's numbers were not sent; Chromium on Windows is measured by the browser tests.

### Against the criteria

1. **Correct everywhere:** yes: three engines, two systems, the phone; both classes, both languages.
2. **Build time:** qualifies if the build measures with Firefox or WebKit and 1 px of slack: their breaks are exactly the phone's, Chromium on Windows', and each other's. Only Chromium on Linux desktops would overflow, by one line on one or two pages.
3. **Font:** yes.
4. **Paginating in the browser:** fails as written: the first, cold pagination took 75.3 ms on the phone, over the 50 ms of a long task; the later ones fit.
5. So, by the rule set beforehand: **build time, with the 1 px margin, plus a check in the browser that re-paginates where a page overflows** (Chromium on Linux, a reader's larger text setting, a font that never arrived). Proposed in [ADR 0009](../adr/0009-pagination-at-build-time.md).
