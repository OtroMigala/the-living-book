# ADR 0003 — Astro for a static site with the 3D book as an island

- **Status:** accepted by the owner at the Stage 3 gate, 2026-10-22 ("not what I usually use, but it fits the needs of the project better")
- **Date:** 2026-10-21
- **Stage:** 3

## Context

Several Must requirements are about what the browser receives *before* any JavaScript runs:

- **F10:** reading mode works without JavaScript.
- **F15:** the title and the first spread's text are in the initial HTML.
- **Q06:** every spread has its own URL, title and description.
- **BB1:** the entry needs ≤ 50 KB of JavaScript.

The 3D book (Stage 4) needs three.js, about half of BB2's 350 KB, and must load after first paint. Hosting is GitHub Pages: static files only, no server.

## Decision

**Astro 7.3.6** (MIT), output `static`.

- Every page is rendered to HTML at build time. The book's text is in that HTML, so reading mode, search engines and screen readers get it with no JavaScript at all.
- A page sends JavaScript only where it asks for it. The diagnostics page has one small script; the home page has none (measured: 0 KB against BB1's 50 KB).
- In Stage 4 the 3D book becomes an *island*: a component hydrated in the browser after the page has painted, so three.js never delays the text (F15, BL1).
- Content is read at build time from the snapshot (K02); `.astro` pages stay thin, and the logic lives in plain `.ts` modules that `tsc` and Vitest check.

## Alternatives

| Option | Why not |
| --- | --- |
| Vite + React single-page app (as in the Su-30 project) | Text would arrive with JavaScript, failing F10 and F15, unless a prerender step is built by hand: that step is what Astro already is |
| Next.js with static export | Its client runtime (React plus router) alone is close to or over BB1's 50 KB on every page, and server features are of no use on GitHub Pages |
| Hand-written HTML + a script per page | No components or layout reuse; each spread URL (F08) would be a file to maintain by hand |

## Consequences

- **Type checking:** `tsc` checks `src/**/*.ts` and `tools/`. `.astro` files are not type-checked, because `@astrojs/check` does not support TypeScript 7 yet; this is why pages hold no logic.
- **Lint:** Biome does not see variables used in Astro templates, so `noUnusedVariables` and `noUnusedImports` are turned off for `.astro` files only (`biome.json`).
- **Dependencies:** 207 packages installed. *Corrected in Stage 4:* this record first said Astro's optional `sharp` was not installed, read from `npm ls sharp --depth=0`, which only lists direct dependencies. It is installed (with its LGPL libvips binary), and its license is handled in [ADR 0005](0005-license-policy-for-tools.md). npm reported that `esbuild`'s install script was not approved by its new `allow-scripts` policy; the build works without it.
- **Astro is a tool, not a runtime:** since Stage 4 it sits in `devDependencies`, because the static site runs no Node package in production (ADR 0005).
- **Base path:** the site lives at `/the-living-book/` (GitHub Pages project site); links use `import.meta.env.BASE_URL`.
