# Spec 02 — Budgets

- **Status:** draft, waiting for the Stage 2 gate ([`docs/gates/stage-2.md`](../docs/gates/stage-2.md))
- **Stage:** 2 (inputs and budgets)
- **Replaces:** the provisional numbers of Q01–Q04 in [`01-vision.md`](01-vision.md). Those requirements now point here, so each number lives in one place.
- **Based on:** [`docs/inputs/report.md`](../docs/inputs/report.md)

Invariant 1 of the playbook: every resource that can run out gets a number before code. A budget is a ceiling, not a target to fill.

Units: KB = 1,024 bytes, MiB = 1,024 KB. `npm run check:budgets` reads the limits from the tables below, so this file is the only place each number lives.

## Tiers

The app picks a tier at start and can drop to a lower one while running (the policy is built in Stage 5, F09 AC3).

| Tier | Reference device | Used when |
| --- | --- | --- |
| **Mobile** | Tecno Pova 6 (Mali-G57 MC2) | Coarse pointer or narrow screen, `Save-Data`, or the desktop tier misses its frame budget |
| **Desktop** | PC with Radeon RX 9060 XT | Fine pointer and a wide screen |
| 2D | — | No WebGL 2, lost context, or the mobile tier misses its frame budget (F09) |

## Budgets

**Checked by:** *CI* means an automatic check fails the build; *gate* means it is measured by hand at each gate and written in the ledger. Lighthouse runs use the mobile profile unless noted.

### Load

| ID | Metric | Mobile | Desktop | Why this number | Checked by |
| --- | --- | --- | --- | --- | --- |
| BL1 | LCP, median of 3 | ≤ 2.5 s | ≤ 1.5 s | Core Web Vitals "good". The first spread's text is in the initial HTML (F15), so LCP never waits for 3D | CI (Lighthouse), from Stage 3 |
| BL2 | CLS | ≤ 0.05 | ≤ 0.05 | Half of the 0.1 "good" limit, room for the font swap | CI (Lighthouse) |
| BL3 | TBT | ≤ 300 ms | ≤ 150 ms | 3D code is loaded after first paint; on the 4× slowed CPU of the mobile profile, evaluating three.js still costs a few hundred ms if it lands inside the measured window | CI (Lighthouse) |

### Bytes (transferred, compressed)

| ID | Metric | Mobile | Desktop | Why this number | Checked by |
| --- | --- | --- | --- | --- | --- |
| BB1 | Entry JS (what first paint needs) | ≤ 50 KB | ≤ 50 KB | Shell only: routing, mode switch, language. Pagination happens at build time | CI (build output) |
| BB2 | JS for 3D mode, excluding WebAssembly decoders | ≤ 350 KB | ≤ 350 KB | three.js is roughly half of it | CI (build output) |
| BB3 | WebAssembly decoders (Meshopt, KTX2), only if an ADR adopts them | ≤ 300 KB | ≤ 300 KB | The previous portfolio measured the KTX2 transcoder at 246 KB gzip | CI (build output) |
| BB4 | Model file | ≤ 2 MiB | ≤ 6 MiB | Today 24.85 MiB, 98.8% textures. At 512² the 16 maps fit easily; geometry is 0.27 MiB before compression | CI (`check:model`, K01) |
| BB5 | Everything transferred before the 3D book is interactive | ≤ 3 MiB | ≤ 8 MiB | Model + JS + fonts, with margin. On the 1.6 Mbps Lighthouse link 3 MiB takes about 16 s, which is why the reader is never kept waiting for it (F15) | gate (request log) |
| BB6 | Web fonts | ≤ 100 KB | ≤ 100 KB | One text face in two weights, Latin subset | CI (build output) |

### Runtime

| ID | Metric | Mobile | Desktop | Why this number | Checked by |
| --- | --- | --- | --- | --- | --- |
| BR1 | Frame time p95 during a page turn | ≤ 33.3 ms | ≤ 16.7 ms | 30 and 60 frames per second. The Mali-G57 MC2 is entry level and fill-rate bound | gate (trace on the real devices) |
| BR2 | Frames rendered while idle | 0 | 0 | Nothing moves, nothing renders: battery and heat | CI (frame counter in e2e), from Stage 4 |
| BR3 | Device pixel ratio of the canvas | ≤ 1.5 | ≤ 2 | The phone's native ratio is 3 (measured): ≈ 2.23 million pixels per frame for the GPU to fill. At 1.5 it is ≈ 0.56 million, a quarter, since pixels grow with the square of the ratio | CI (unit test of the tier settings) |
| BR4 | Draw calls per frame | ≤ 20 | ≤ 30 | The model uses 5; pages, shadows and UI add the rest | CI (`renderer.info` in e2e) |
| BR5 | Triangles per frame | ≤ 50,000 | ≤ 150,000 | The model has 5,432; a bending page needs a dense grid | CI (`renderer.info` in e2e) |
| BR6 | Extra full-scene passes (transmission, post-processing) | 0 | ≤ 1 | Transmission renders the scene again every frame (R06) | CI (unit test of the tier settings) |

### GPU memory (estimates: browsers do not report it)

| ID | Metric | Mobile | Desktop | Why this number | Checked by |
| --- | --- | --- | --- | --- | --- |
| BM1 | Model textures, RGBA8 + mipmaps | ≤ 32 MiB | ≤ 96 MiB | Today 149.33 MiB. The magnifier's four 2048² maps alone are 85.33 MiB for an object 20 cm wide | CI (`check:model`) |
| BM2 | Page textures and render targets | ≤ 32 MiB | ≤ 64 MiB | Up to 4 page faces visible during a turn | gate (computed from the sizes in code) |
| BM3 | Total (BM1 + BM2 + geometry) | ≤ 64 MiB | ≤ 192 MiB | Half of the original 128 MB ceiling of Q04: Safari on iOS kills pages that use too much memory (R11), and there is no iPhone among the reference devices | CI + gate |

### Content and operations

| ID | Metric | Budget | Why this number | Checked by |
| --- | --- | --- | --- | --- |
| BC1 | Content types | ≤ 5 | Free plan allows 10 | CI (content-model script, C03) |
| BC2 | Entries, all locales | ≤ 50 | Free plan allows 1,000 | CI (seed script) |
| BC3 | Assets | ≤ 50 | Free plan allows 1,000 | CI (seed script) |
| BC4 | Delivery API calls per month | ≤ 10,000 | 10% of the Free plan's 100,000. Content is fetched at build time (A3), plus one Sync call per check for new publishes, every 10 minutes: about 4,320 a month (ADR 0011). Calls grow with builds and time, not visitors | gate (Contentstack usage page) |
| BC5 | Publish-to-live time | ≤ 10 min | F05 | gate (3 timed runs) |
| BC6 | CI run, wall time | ≤ 5 min | Today 19 s. A slow CI is a skipped CI | gate (Actions log) |

## What is not budgeted

- **Real GPU memory and real frame time in CI.** CI runners have no GPU (R09). CI checks what is deterministic (bytes, counts, settings); frame time is measured on the real devices at the gates and logged as manual.
- **Words per page.** That is a result of the page classes in the contract, not a resource that runs out.
