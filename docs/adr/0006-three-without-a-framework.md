# ADR 0006 — three.js on its own, without React Three Fiber

- **Status:** proposed at Stage 4, step 1 (waiting for the owner's review)
- **Date:** 2026-10-22
- **Stage:** 4

## Context

The 3D book needs WebGL. The owner's previous 3D project (Su-30) used React Three Fiber (R3F), a React renderer for three.js. This site is built with Astro and has no React anywhere (ADR 0003): the pages are static HTML, and the few scripts are plain modules.

Budgets that apply: BB2 (all JS of the 3D mode ≤ 350 KB gzip), BL3 (TBT), BR2 (no rendering while idle).

## Decision

**three.js 0.186.1 (MIT), used directly from a plain TypeScript module**, loaded only by the pages that show 3D. The scene is built imperatively (`Scene`, `PerspectiveCamera`, `GLTFLoader`), and it renders on demand: after loading, on resize and, later, while a page turns.

Measured on the 3D lab page: 148.6 KB gzip for three.js and the GLB loader together (BB2 ≤ 350 KB).

## Alternatives

| Option | Why not, for now |
| --- | --- |
| React Three Fiber + drei, inside an Astro island | Adds React, React DOM and R3F (roughly 50 KB gzip or more) to a site that has no other use for React, plus Astro's React integration. Its declarative style shines in large scenes with much state; this scene is one book, a few objects and a page that turns |
| Another 3D engine (Babylon.js, PlayCanvas) | Larger, and the team (the owner) already knows three.js |

## Consequences

- The scene code is ordinary TypeScript: `tsc` and Biome check it fully, unlike `.astro` files.
- Render-on-demand is explicit: nothing renders unless the code calls `render()`. Tested in the browser (no renders in one second of idle).
- If the scene grows a lot of interactive state (Stage 5), revisit: moving to R3F later costs a rewrite of the scene modules, not of the rest of the site.
