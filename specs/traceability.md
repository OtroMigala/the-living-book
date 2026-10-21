# Traceability

One row per acceptance criterion. Requirements are defined in [`01-vision.md`](01-vision.md) (and in later specs); this table says how each one is proven, in which stage it is built and in which stage it is verified.

`npm run check:specs` runs in CI and fails when:

- a requirement (other than Won't) has no row here, or a row points to a requirement that does not exist;
- a row has no verification method, an unknown status, or stages outside 1–8 (or is verified before it is built).

**Stages:** 1 requirements · 2 inputs and budgets · 3 scaffold · 4 risky core · 5 features · 6 real model · 7 verify · 8 standardize.
**Status:** planned · in progress · met · not met · dropped. A row becomes *met* only with evidence: a test, a ledger entry or a gate summary.
**Viewports used below:** desktop 1280×720, phone 360×740 (CSS px).

| Req | AC | Acceptance criterion | Verification | Built | Verified | Status |
| --- | --- | --- | --- | --- | --- | --- |
| F01 | AC1 | Body text renders at ≥ 16 CSS px at the default view: two-page spread on desktop, one page on phone | e2e: measure rendered line boxes at both viewports | 4 | 7 | planned |
| F01 | AC2 | The default view shows the open book, the closed books and the magnifier, nothing clipped | e2e screenshot, reviewed at the gate | 6 | 7 | planned |
| F02 | AC1 | Next and previous work by corner drag, edge tap or click, ← →, PageUp, PageDown, Home, End and the on-screen buttons | e2e, one test per input | 4 | 5 | planned |
| F02 | AC2 | A drag released before the halfway point returns the page; past it, the turn completes | unit (turn state machine) + e2e | 4 | 5 | planned |
| F03 | AC1 | Page text can be selected, appears in the accessibility tree and is found by the browser's find-in-page | e2e: selection, accessibility snapshot, `window.find` | 4 | 7 | planned |
| F03 | AC2 | At rest, the corners of the DOM page are within 2 CSS px of the projected corners of the 3D page, at three viewport sizes | e2e alignment probe | 4 | 7 | planned |
| F04 | AC1 | No reading content in the source; the build fails when a required CMS field is missing or empty | content validator unit tests + source grep in CI | 3 | 5 | planned |
| F05 | AC1 | A change published in Contentstack is on the public site within 10 minutes, with no commit | manual timed test, 3 runs, median in the ledger | 5 | 7 | planned |
| F06 | AC1 | An unpublished change appears in the book in Live Preview and not on the public site | manual test, recorded in the gate summary | 5 | 7 | planned |
| F07 | AC1 | With fixture content (short, long, image-heavy, a very long word, an empty chapter) no page overflows and no block is lost or repeated | unit tests on the pagination engine | 4 | 5 | planned |
| F07 | AC2 | 3D and 2D modes produce the same page breaks for the same content and viewport class | unit + e2e comparison | 4 | 5 | planned |
| F08 | AC1 | Each spread has a stable URL; reload, back, forward and a pasted link open the same spread | e2e | 3 | 5 | planned |
| F09 | AC1 | Without WebGL the 2D book loads; when the WebGL context is lost, 3D falls back to 2D on the same page | e2e with WebGL disabled and a forced context loss | 5 | 7 | planned |
| F09 | AC2 | The mode switch is always reachable, and switching keeps the current position | e2e | 5 | 7 | planned |
| F09 | AC3 | A frame rate below the Q03 budget for 3 s in a row offers 2D mode (never switches without telling the reader) | unit (quality-tier policy) + e2e with CPU throttling | 5 | 7 | planned |
| F10 | AC1 | With JavaScript disabled the full content reads as one article with a correct heading order | e2e (JS off) + axe | 3 | 7 | planned |
| F10 | AC2 | Print preview shows the content without the 3D interface | manual check | 5 | 7 | planned |
| F11 | AC1 | Every volume opens from the desk and from the table of contents, by pointer and by keyboard | e2e | 5 | 7 | planned |
| F12 | AC1 | The magnifier enlarges the area under it at least 2×, can be turned off, and costs nothing while off | e2e + frame-time trace | 5 | 7 | planned |
| F13 | AC1 | Every page exists in Spanish and English; switching keeps the position and sets the `lang` attribute | content validator + e2e | 3 | 7 | planned |
| F14 | AC1 | Credits list title, author, link and license of every third-party asset; the site and `CREDITS.md` agree | unit test comparing both lists + review | 3 | 7 | planned |
| F15 | AC1 | The title and the first spread's text are in the initial HTML; 3D code starts loading after first paint | build-output check + Lighthouse trace | 3 | 7 | planned |
| F15 | AC2 | The progress indicator only moves forward and is based on bytes | e2e: sample progress values | 5 | 7 | planned |
| Q01 | AC1 | Lighthouse mobile, median of 3: LCP ≤ 2.5 s, CLS ≤ 0.05, TBT ≤ 300 ms | Lighthouse in CI, numbers in the ledger at every gate from Stage 3 | 3 | 7 | planned |
| Q02 | AC1 | Entry JS ≤ 50 KB gzip; 3D-mode JS ≤ 350 KB gzip; ≤ 4 MB before the 3D book is interactive | CI budget check on the build output + request log | 3 | 7 | planned |
| Q03 | AC1 | Frame time p95 during a page turn ≤ 16.7 ms on the reference desktop and ≤ 33.3 ms on the reference phone | performance trace on the real devices | 4 | 7 | planned |
| Q03 | AC2 | No frames rendered per second while idle | e2e frame counter | 4 | 7 | planned |
| Q04 | AC1 | Estimated GPU memory for textures and geometry ≤ 128 MB in the mobile tier | asset report script | 2 | 6 | planned |
| Q05 | AC1 | axe reports 0 serious or critical issues in 3D, 2D and reading modes | e2e with axe | 3 | 7 | planned |
| Q05 | AC2 | Every action works by keyboard with a visible focus; page changes are announced through a polite live region | e2e + manual NVDA pass | 4 | 7 | planned |
| Q05 | AC3 | With reduced motion, pages change without the curl animation and the camera does not move | e2e with emulated media | 4 | 7 | planned |
| Q06 | AC1 | Each spread URL has its own title and description; Lighthouse SEO ≥ 95 | e2e + Lighthouse | 3 | 7 | planned |
| Q07 | AC1 | No blank screen in the failure suite: no WebGL, context lost, CMS unreachable at build, image 404 | e2e failure suite + build test | 5 | 7 | planned |
| Q08 | AC1 | CI runs format, lint, types, unit tests and spec checks on every push, and `main` stays green | CI history | 1 | 7 | in progress |
| Q08 | AC2 | The pure core (pagination, turn state, routing, content mapping, quality tiers) has unit tests | coverage report of the core folder | 3 | 7 | planned |
| Q09 | AC1 | The e2e suite passes in Chromium, Firefox and WebKit | Playwright projects in CI | 3 | 7 | planned |
| C01 | AC1 | Monthly cost is $0 | review of every account at the gate | 1 | 7 | in progress |
| C02 | AC1 | Every shipped dependency and asset has an allowed license or an approving ADR | license check script in CI + `CREDITS.md` review | 3 | 7 | planned |
| C03 | AC1 | ≤ 10 content types, ≤ 1K entries, ≤ 1K assets; API calls per month ≤ 50% of the quota | content-model script + Contentstack usage page | 3 | 7 | planned |
| C04 | AC1 | `package.json` uses exact versions only; the install date of each new dependency is ≥ 14 days after its release | `npm run check:deps` in CI + `npm view <pkg> time` at install | 1 | 7 | in progress |
| C05 | AC1 | No token in the repository or the build output | secret scan in CI on source and build output | 3 | 7 | planned |
| P01 | AC1 | Every gate summary links an updated ledger entry and AI-usage entries | gate review | 1 | 8 | in progress |
