# ADR 0009 — Paginate at build time, measured by Firefox, checked in the browser

- **Status:** proposed after spike C (waiting for the owner's approval)
- **Stage:** 4, step 4
- **Evidence:** [spike C report](../spikes/C-pagination.md): browser tests in three engines on Windows and Linux, and the owner's Pova 6

## Context

F07 asks that content of any length flows into pages with nothing cut off, lost or repeated; F07 AC2 that 3D and 2D break pages in the same places; F08 that every spread has its own URL. Specs 02 and 03 say pagination happens at build time, for two page classes. Risk R03 was that page breaks are not deterministic across fonts and browsers; spike B saw its first signal (a fallback font moved every break).

Spike C built one greedy paginator (`src/pagination/paginate.ts`, 22 unit tests) that only asks "does this page fit?", and measured where its breaks fall in each engine.

## What the spike found

- **Correct everywhere.** No page overflowed and no word was lost or repeated, in Chromium, Firefox and WebKit, on Windows and Linux, and on the Pova 6.
- **Ties at the margin.** Measured exactly at the page's width, one Spanish page broke differently in Firefox: a line Chromium found exactly 287.00 px wide in a 287 px measure wraps in Firefox. Measuring 1 px narrower than the page is shown removes such ties: greedy line breaking never needs more lines with more room.
- **Two families of measurement.** With that 1 px, Firefox and WebKit (on Windows and Linux), Chromium on Windows and Chrome on the Pova 6 produce **identical** breaks (same signatures). Chromium on Linux desktops measures differently, by more than 1 px in both directions; no small margin reconciles it.
- **The font.** A second name for Literata with `font-display: block` (*Literata Paged*) keeps pages in Literata even when the reading mode's font arrives too late.
- **Cost in the browser.** On the Pova 6 the first, cold pagination of one language in one page class took 75.3 ms, over the 50 ms of a long task; later ones 26.8–47.6 ms.

## Decision (proposed)

1. **Pages are computed at build time**, for each chapter, locale and page class, by the same paginator running in **Firefox** (Playwright, already a development tool) with **1 px of measuring slack**. Firefox, because it measures like the phone, Chromium on Windows and WebKit, on any system, while the build runs on Linux, where Chromium measures apart. The breaks ship with the site.
2. **Pages use *Literata Paged*** (`font-display: block`), the same file as the reading mode's font under a name that waits for it.
3. **The browser checks each page when it shows it** (one layout), and if a page overflows, re-paginates that chapter itself, in small pieces between frames so no task is long. This covers Chromium on Linux, a reader's larger text setting, and a font that never arrived. The 2D mode uses the same breaks, so F07 AC2 holds by construction.
4. **A spread is named by its page number**, which is the same for nearly every reader because the breaks are; a reader whose browser re-paginated is taken to the page that holds the same first word.

## Rejected

- **Paginating in each reader's browser only.** Exact by construction and simpler to build, but the cold run on the phone took 75.3 ms (criterion 4 asked ≤ 50 ms), and it would run on every visit. Kept as the fallback in point 3.
- **Measuring with the build's Chromium.** It is Chromium on Linux: its breaks overflow in Firefox and WebKit.
- **Automatic hyphenation.** Its dictionaries differ between browsers, and so would the breaks. Pages are set ragged-right, unhyphenated.

## Consequences

- The deploy installs Firefox before the build, and the build runs a pagination pass in it; CI time grows by the browser start and about 60–140 layouts per chapter, locale and class (to be measured against BC6, ≤ 5 min).
- Specs 02 and 03 already say "at build time"; spec 03 gains the 1 px slack and the font rule in its own commit once this is accepted.
- R03 is retired when this is accepted.
- The bench pages (`/lab/text/`, `/lab/pages/`) are replaced by the real reader in the next step.
