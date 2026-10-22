# ADR 0005 — License policy: what ships and what only builds

- **Status:** axe-core accepted by the owner (2026-10-22); the rest of the tool list proposed at Stage 4 step 0b, waiting for the owner's confirmation
- **Date:** 2026-10-22
- **Stage:** 4

## Context

C02 lists the licenses allowed in this project and asks for an ADR for anything else. Until Stage 4 only the *direct* dependencies were checked, by hand. The first automated check of the whole lockfile (340 packages, including transitive ones and optional platform builds) found licenses outside the list that came in with Astro and Vite in Stage 3, unnoticed:

| License | Packages | Pulled in by | What they do |
| --- | --- | --- | --- |
| MPL-2.0 | `lightningcss` and its platform builds (12) | Vite | Minifies CSS at build time |
| LGPL-3.0-or-later | `@img/sharp-libvips-*` (10), and with Apache-2.0 in `@img/sharp-*` (4) | Astro, through the optional `sharp` | Image processing at build time; libvips is a shared library used unmodified |
| BlueOak-1.0.0 | `common-ancestor-path`, `lru-cache`, `sax` | Astro, unstorage, svgo | Small utilities; BlueOak is a permissive license like MIT |
| 0BSD | `tslib` (optional, not installed here) | WebAssembly helpers | Public-domain-like |

At the same time the owner approved **axe-core** (MPL-2.0) for the accessibility tests.

None of these reaches the reader's browser. Three of them (MPL-2.0, LGPL-3.0, BlueOak-1.0.0) are the licenses the owner accepted for build tools in the Su-30 project on 2026-10-15; 0BSD is new and more permissive than MIT.

## Decision

Two lists, enforced by `npm run check:licenses` (in `npm run ci` and in CI) on every package in `package-lock.json`:

| Where the package is | Allowed licenses |
| --- | --- |
| **Shipped**: reachable from `dependencies`, its files reach the browser | MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, Zlib, CC0-1.0, CC-BY-4.0, and OFL-1.1 for fonts |
| **Tools**: reachable only from `devDependencies`, never shipped, used unmodified | Everything above, plus MPL-2.0, LGPL-3.0-or-later, BlueOak-1.0.0, 0BSD |
| Anywhere | Never GPL or AGPL (strong copyleft) |

To make "shipped" mean what it says, `package.json` was reorganized: **`dependencies` holds only what reaches the browser** (today the Literata font; three.js in Stage 4), and Astro moved to `devDependencies`, because a static site runs no Node package in production.

## Why the tool-only licenses are acceptable

- **MPL-2.0** is copyleft per file: only changes to the MPL files themselves would have to be shared. We use axe-core and lightningcss unmodified, as tools.
- **LGPL-3.0** applies to libvips, a library `sharp` loads unmodified. Nothing is distributed: it runs on the build machine.
- **BlueOak-1.0.0** and **0BSD** are permissive, like MIT.

## Consequences

- A new dependency with a license outside both lists fails CI on the commit that adds it, instead of being found stages later.
- If the owner does not confirm the tool list, the alternative is to replace the tools: a different CSS minifier for Vite, no image service in Astro, and other accessibility tooling (all mainstream options use axe-core).
- When the 3D code ships (Stage 4), the check covers it automatically through `dependencies`.
