# Stage 6: the real model (in progress)

- **Date:** 2026-10-23
- **State:** in progress, **not at the gate**. This file says where the stage stands and what comes next, so work can resume in a new session. It becomes the gate's summary when the stage ends.

## Scope

Playbook row: *real model integration → only bindings and configuration change (H2)*. Carried in from the Stage 5 gate: F05 not working (D1), the preview copy's build moved (D2, done), BR1 on the PC with the real model (D3).

## Done

| Step | What | Commits |
| --- | --- | --- |
| 6.0 | The preview copy built in the Lighthouse job (D2). It cost 4 s; the checks job's time comes from the browser tests and the container | `e007f9f` |
| 6.1 | `npm run model:optimize` (glTF-Transform, sharp): one file per tier, textures resized and re-encoded as WebP, the glass without transmission, credits in the file. `check:model` reads WebP and fails on an image it cannot read | `aacc99e`, `2e6d6d4` |
| 6.2 | Each tier loads its own model (`MODEL_PATHS`), made in every build and not committed; the progress line per tier | `9f93f03`, `752de4b`, `7f0e33a` (undone later), `4c85a1f`, `d505180`, `1fc83f0` |
| 6.2b | The reader prints on the model's own paper, after the owner found the first integration ugly: the model's printed text erased, the pages ink only, margins over the flat paper, and a turning sheet made of the model's paper in its shape and light. Spec 03, "Page paper" | `977b4d5`, `c2f4617`, `a20c1aa`, `9ae08f5`, `28c3291` |

| 6.3 | The model's credit note published in Contentstack (both locales, production and preview) through the Seed workflow, on the owner's request; then `main` pushed. The first CI run with the real model **failed**: BL3 in Lighthouse and three browser tests (ledger, R21, R22). The deploy, started by hand after the seed, failed the same tests and **published nothing**: the site stays on `3ba14fd`, the placeholder model and the old note | — (runs 40048224657, 40048211076, 40048344245) |
| 6.4 | BR1 on the PC (D3): p95 5.1 ms in every turn at 200 Hz, one frame per refresh | — (ledger) |
| 6.6 | Spike D, at the owner's request: a marquetry table on a carpet and a candle holder beside the book, from the owner's reference scene at real size (the table 0.85 m), in the model file, simplified per tier (no fringes on phones), credited in Contentstack, `CREDITS.md` and the file; dust in the air away from the reading view, the desk's edges in shadow | `a731ee3`, `42083fc`, `9e1d29f`, `582ce6d`, `f673a3f`, `6c3358b` |
| 6.5 | F17, at the owner's request: hold F and the mouse (or the arrows, by 5° steps) circles the camera around the book, rising over the closed books behind it; the pages are textures meanwhile, and letting F go eases the view back to reading by the shorter way. First built turning the camera where it stands; changed to the orbit at the owner's choice (decision 5) | `d448e0d`, `b186385`, `0f4be09`; `1b5b827`, `90f5dd4`, `41a7422` |

Locally, `npm run ci` (203 unit tests) and the browser tests (259 passed, 62 skipped, none flaky, with 2 workers) passed; Lighthouse, a CI job of its own, had not been run with the real model, and is what failed.

**The site is live with the real model and the opening view** (`9c80b27`, deployed in 8 min 30 s) (GitHub Pages, from `fece8da`; `75ab7f0` passed every browser test and deployed in 5 min 43 s). R21 is retired: the browser tests watch a turn from before its key, and run in three CI jobs (the run 3 min 53 s). **CI stays red for Lighthouse alone** (BL3, R22): the deploy does not run Lighthouse, so it does not block publishing.

## Next, in order

0. **The controls inside the book** (the owner, 2026-10-24: "no quisiera que todos los controles de la página me aparezcan por ahí flotando… meterlos como una especie de índice o página de configuración dentro de las páginas del libro"): a settings and contents page inside the book instead of the bar, with the accessibility it keeps written in the spec first.
1. **BR1 on the Pova 6**: done (the owner's screenshot, ledger): p95 11.2 ms at 90 Hz, one frame per refresh; the start blocked 38 ms, the longest task 88 ms. One turn on the screenshot: more turns would make it firmer.
2. **R22, BL3**: the owner decides [ADR 0012](../adr/0012-measuring-bl3-for-the-3d-book.md) (proposed): in CI, every frame the 3D view draws during the load is a long task under SwiftShader (7.8 s of TBT with the opening view), while the Pova 6 and the PC block 0–40 ms. Recommended: BL3 for the book in 2D in CI, and the 3D start on the devices at each gate, as BR1.
3. **Push**, then a green CI, and the times against BC6 and BC5.
4. **F01 AC2**: done (`cb88eae`, `e7fb178`, `a9711c7`): the book opens on the whole scene, then comes down to reading; the owner reviews it on the live site. The desk is not in the model yet: the owner will bring one, and the framing takes in whatever the model holds.
5. **R20, F05**: GitHub has not started the content watch on its schedule since 20:40 UTC. Next in the plan: a test workflow without an environment; then an outside trigger, which needs a GitHub token the owner creates.
6. **The stage's close**: traceability statuses (K01 AC2 once CI passes with the real model), ledger snapshot, AI-usage counts, and the gate, with the H2 evidence below.

## Decisions waiting for the owner

| # | Question | Now | Options |
| --- | --- | --- | --- |
| 1 | How far the text runs on the page | to 13 cm off the spine: lines of about 28 characters on the phone | 13.6 cm: a little wider, nearer the curve of the page's edge |
| 2 | The direction of 6.2b (ink on the model's paper, the sheet of its paper) | taken as approved ("Mucho mejor", 2026-10-23) | — |
| 3 | How BR1 is measured on the Pova 6 | taken as approved ("me parece tal como está también", 2026-10-23): the owner's run, as in Stage 4: open `/the-living-book/book/?debug=1`, turn a few pages, send screenshots of the debug line | the phone over USB debugging, with Android's platform-tools (adb) installed on the PC: the agent turns the pages and reads the numbers itself |
| 4 | The order of the next steps | taken as approved (same answer): BL3 first (step 1): its long tasks may be what the failing browser tests wait behind | the browser tests first (step 2) |
| 5 | What the free look turns (F17) | **decided** ("dale, orbitemos", 2026-10-23): the camera around the open book, always looking at it | the camera where it stands, as first built: the book left the picture after about 40° to a side |
| 7 | Spike D (the scene) | **decided** (2026-10-24): real size ("no son 59 cm sino el correcto 85"), the sources committed, the fringes off on phones, the credits, the air kept without what paled the table, no dust while reading | — |
| 6 | What the opening view shows (F01 AC2) | **decided** ("me gustaría que tengamos una vista inicial de todo", 2026-10-23): the whole scene first, then down to reading | — |

## Known, not done

- The text jumps 1–2 px when a page starts to turn: the HTML lies on a flat plane, the sheet on the paper's curve. Tilting the reading plane 1.8° to follow the paper would remove most of it.
- On the phone the open book's paper texture is 512 px: soft up close. Keeping that one texture at 1024 px would cost 4 MiB of BM1 (20 → 24 of 32 MiB).

## Evidence for H2 (Stage 6 changes only bindings and configuration)

**Not held.** Beyond the model's paths and the build (bindings and configuration), the real model needed: page margins in the CSS, ink-only pages and a new turning sheet in the 3D code, an asset step that erases the model's printing, and a new contract clause ("Page paper"). The placeholder had flat boxes; the real book's paper is curved, printed and lit, and the contract did not describe it. Then CI's first run with the real model failed BL3 and three browser tests (R21, R22): what they need is *pending* (step 1).

## How to resume

```sh
npm run dev          # makes the models, serves http://localhost:4321/the-living-book/book/
npm run ci           # every check, the build included
npx playwright test --workers=2   # the browser tests; 2 workers keep software rendering from starving the machine
```

`astro preview` runs one server at a time (Astro 7); with `npm run dev` on 4321 it takes 4322, the port the browser tests reuse.
