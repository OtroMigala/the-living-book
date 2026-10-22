# Spike C — Pagination

- **Stage:** 4, step 4. **Risk:** R03 (pagination is not deterministic, or forces text that is too small). **Requirements:** F07 (AC1, AC2), F01 AC1; it also decides how F08's spread URLs can work.
- **Status:** bench and tests being built.
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

*Pending.*
