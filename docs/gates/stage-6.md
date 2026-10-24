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

All checks pass locally: `npm run ci` (203 unit tests) and the browser tests (259 passed, 62 skipped, none flaky, with 2 workers).

**Nothing of Stage 6 since `e007f9f` is pushed**: 12 commits wait on `main`, on purpose. The owner chose to write the model's credit note in Contentstack, and the real model goes live only after that note says the model was edited (CC BY-SA 4.0).

## Next, in order

1. **The owner publishes the credit note** in Contentstack: *Entries → Credit → "Books with magnifier"*, field *Notes*, both locales, then publish to production. The texts are in the repository's snapshot (`content/snapshot/*.json`, the 3D model's credit):
   - en-us: *Edited for this project: page markers added, the magnifier and the closed books moved, the printed text erased from the open pages, textures reduced and the glass simplified for the web. The edited model is shared under CC BY-SA 4.0.*
   - es-419: *Editado para este proyecto: se añadieron marcas de página, se movieron la lupa y los libros cerrados, se borró el texto impreso de las páginas abiertas, y se redujeron las texturas y se simplificó el vidrio para la web. El modelo editado se comparte bajo CC BY-SA 4.0.*
2. **Push `main`**, then read CI's and the deploy's times: software rendering is about three times slower with the real model (R21), against BC6 (checks job ≤ 5 min) and BC5 (the deploy counts toward publish → live ≤ 10 min). If over: split the browser tests in two parallel jobs.
3. **BR1 on the devices** (D3): the owner opens `/the-living-book/book/?debug=1` on the Pova 6 and on the PC (at the monitor's refresh rate) and turns pages; the debug line gives the turn's p50 and p95. Headless Chromium on the PC's GPU drew one frame per refresh at 60 Hz with the real model (ledger).
4. **R20, F05**: GitHub has not started the content watch on its schedule since 20:40 UTC. Next in the plan: a test workflow without an environment; then an outside trigger, which needs a GitHub token the owner creates.
5. **The stage's close**: traceability statuses (K01 AC2 once CI passes with the real model), ledger snapshot, AI-usage counts, and the gate, with the H2 evidence below.

## Decisions waiting for the owner

| # | Question | Now | Options |
| --- | --- | --- | --- |
| 1 | How far the text runs on the page | to 13 cm off the spine: lines of about 28 characters on the phone | 13.6 cm: a little wider, nearer the curve of the page's edge |
| 2 | The direction of 6.2b (ink on the model's paper, the sheet of its paper) | taken as approved ("Mucho mejor", 2026-10-23) | — |

## Known, not done

- The text jumps 1–2 px when a page starts to turn: the HTML lies on a flat plane, the sheet on the paper's curve. Tilting the reading plane 1.8° to follow the paper would remove most of it.
- On the phone the open book's paper texture is 512 px: soft up close. Keeping that one texture at 1024 px would cost 4 MiB of BM1 (20 → 24 of 32 MiB).

## Evidence for H2 (Stage 6 changes only bindings and configuration)

**Not held.** Beyond the model's paths and the build (bindings and configuration), the real model needed: page margins in the CSS, ink-only pages and a new turning sheet in the 3D code, an asset step that erases the model's printing, and a new contract clause ("Page paper"). The placeholder had flat boxes; the real book's paper is curved, printed and lit, and the contract did not describe it.

## How to resume

```sh
npm run dev          # makes the models, serves http://localhost:4321/the-living-book/book/
npm run ci           # every check, the build included
npx playwright test --workers=2   # the browser tests; 2 workers keep software rendering from starving the machine
```

`astro preview` runs one server at a time (Astro 7); with `npm run dev` on 4321 it takes 4322, the port the browser tests reuse.
