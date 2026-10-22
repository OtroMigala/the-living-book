# ADR 0004 — Literata as the book's typeface, self-hosted

- **Status:** accepted (license class approved by the owner, 2026-10-21; this choice of face reviewed at the Stage 3 gate)
- **Date:** 2026-10-21
- **Stage:** 3

## Context

Pagination (F07, Stage 4) breaks the text into pages at build time. The browser must then draw each page with exactly the metrics the paginator used, on every device; with a system font stack, Windows, Android and iOS would each pick a different face and the pages would overflow (risk R03). So the site needs one web font of its own.

Almost every free typeface is under the SIL Open Font License (OFL), which was not in C02's allowlist. The owner approved OFL fonts on 2026-10-21.

## Decision

**Literata**, regular and italic, Latin subset, from `@fontsource/literata` 5.3.0, served from the site itself.

- Literata was designed by TypeTogether for reading long text on screens (it was the Google Play Books face): a large x-height and open shapes that stay clear at 16 px on an entry-level phone screen.
- The Latin subset covers English and Spanish. Two files: 40.6 KB measured by `npm run check:budgets`, against BB6's 100 KB.
- Headings use the regular weight in a larger size, so no bold file is shipped.
- The regular file is preloaded, with `font-display: optional`: no font swap after first paint, so no layout shift (BL2).

## Alternatives

| Option | Why not |
| --- | --- |
| EB Garamond (OFL) | Beautiful in print, but its small x-height makes 16 px screen text harder to read |
| A system font stack | Free and zero bytes, but different metrics on every OS: deterministic pagination is impossible |
| Google Fonts served from Google | A third-party request on every page view, and the files could change under the paginator |

## Consequences

- OFL requires the license to travel with the font: the text is published at `/licenses/literata-OFL.txt` and the font is credited on the site and in `CREDITS.md`.
- With `optional`, a reader on a very slow first visit may see the fallback serif in reading mode. Paginated modes will wait for the font (`document.fonts.load`) before showing pages.
