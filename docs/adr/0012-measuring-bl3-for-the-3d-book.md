# ADR 0012 — How BL3 is measured for the 3D book

- **Status:** proposed, 2026-10-24, waiting for the owner
- **Stage:** 6 (risk R22)
- **Evidence:** the ledger (`docs/performance.md`, Stage 6): CI's Lighthouse runs and their traces, the owner's screenshot from the Pova 6, the PC's runs with `?debug=1`

## Context

BL3 caps the main thread's blocking at load: Total Blocking Time ≤ 300 ms on mobile and ≤ 150 ms on desktop, measured by Lighthouse in CI (Q01 AC1, `npm run check:lighthouse`). The CI runner has no GPU: Chromium draws WebGL with SwiftShader, which does a GPU's work on the CPU.

With the real model, the book's page failed BL3 in every CI run, and the opening view (F01 AC2) made it worse:

| Where | Book, mobile | Book, desktop |
| --- | --- | --- |
| CI, Lighthouse, real model | TBT 993–1,395 ms | 470–592 ms |
| CI, Lighthouse, with the opening | 7,339–8,080 ms | 2,072–2,549 ms |
| Pova 6, real GPU, `?debug=1` | 38 ms blocking, the longest task 88 ms | — |
| PC, RX 9060 XT, `?debug=1`, with the opening | 0–40 ms (360 × 688) | 34–40 ms (1280 × 720) |

CI's trace says why. The main thread waits in each frame's commit for the GPU process (404 ms in the first frame that shows the canvas, while the GPU process runs a 429 ms task), and Lighthouse counts each such frame as a long task. A real GPU does that work in a few milliseconds. The opening's 1.6 s camera move draws many frames during the load, each one a long task under SwiftShader. A first try to move the GPU's work out of the visible frame made TBT worse (ledger), and any camera movement during the load will cost the same under SwiftShader.

So in CI, BL3 on the 3D book measures how fast the CPU emulates a GPU, not what a reader waits for.

## Options

| Option | For | Against |
| --- | --- | --- |
| **1. Keep BL3 as it is** | Nothing changes | CI stays red for good, or the 3D start must not draw during the load: no opening view (F01 AC2), and a simpler scene. Both go against the owner's choices ("no sacrificaremos fidelidad") |
| **2. Split BL3 for the book** | Each part measured where it can be. In CI, Lighthouse keeps BL1 and BL2 on the 3D book as now, and judges BL3 on the book without the 3D view (`book/?mode=2d`): the HTML, the reader and the pagination, which software can measure faithfully. The 3D start's blocking is measured on the reference devices with `?debug=1` (the same definition: each long task's time past 50 ms, summed, since the first paint), ≤ 300 ms on the Pova 6 and ≤ 150 ms on the PC, at every gate, as BR1 is | The 3D start's BL3 is no longer checked on every push: a regression would show at the next gate, or when the owner opens `?debug=1` |
| 3. Lighthouse on a runner with a GPU | The same check as now, on real hardware | GitHub's GPU runners are paid; the project uses the free plan |
| 4. Lighthouse with fewer frames counted (for example, the TBT window ending before the 3D view starts) | CI turns green | It hides what it measures: rejected |

## Recommendation

**Option 2.** Spec 02's BL3 row would say how each part is measured. `check:lighthouse` would add the book in 2D for BL3, keeping today's 3D runs for BL1 and BL2. The gate summaries would record the devices' readings, as they already do for BR1. The CI's TBT on the 3D book would still be printed, as information, so a large change stays visible.

## If accepted

1. Spec 02, BL3: "the book's 3D start: on the reference devices, `?debug=1`, at the gates; everything else: Lighthouse in CI". It goes in its own `docs(specs)` commit, counted for H5.
2. `tools/lighthouse/cli.ts`: the book in 2D is judged for BL3; the 3D book's TBT is printed, not judged.
3. R22 retired, with this ADR as its evidence.
