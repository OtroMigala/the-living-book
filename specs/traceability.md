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
| F01 | AC1 | Body text renders at ≥ 16 CSS px at the default view: two-page spread on desktop, one page on phone | e2e: measure rendered line boxes at both viewports | 4 | 7 | in progress |
| F01 | AC2 | The default view shows the open book, the closed books and the magnifier, nothing clipped | e2e screenshot, reviewed at the gate | 6 | 7 | planned |
| F02 | AC1 | Next and previous work by corner drag, edge tap or click, ← →, PageUp, PageDown, Home, End and the on-screen buttons | e2e, one test per input | 4 | 5 | met |
| F02 | AC2 | A drag released before the halfway point returns the page; past it, the turn completes | unit (turn state machine) + e2e | 4 | 5 | met |
| F03 | AC1 | Page text can be selected, appears in the accessibility tree and is found by the browser's find-in-page | e2e: selection, accessibility snapshot, `window.find` | 4 | 7 | in progress |
| F03 | AC2 | At rest, the corners of the DOM page are within 2 CSS px of the projected corners of the 3D page, at three viewport sizes | e2e alignment probe | 4 | 7 | in progress |
| F04 | AC1 | No reading content in the source; the build fails when a required CMS field is missing or empty | content validator unit tests + source grep in CI | 3 | 5 | met |
| F05 | AC1 | A change published in Contentstack is on the public site within 10 minutes, with no commit | manual timed test, 3 runs, median in the ledger | 5 | 7 | in progress |
| F06 | AC1 | A change published only to the `preview` environment appears in the preview build and not on the public site | manual test, recorded in the gate summary | 5 | 7 | in progress |
| F07 | AC1 | With fixture content (short, long, image-heavy, a very long word, an empty chapter) no page overflows and no block is lost or repeated | unit tests on the pagination engine | 4 | 5 | in progress |
| F07 | AC2 | 3D and 2D modes produce the same page breaks for the same content and viewport class | unit + e2e comparison | 4 | 5 | met |
| F08 | AC1 | Each spread has a stable URL; reload, back, forward and a pasted link open the same spread | e2e | 4 | 5 | met |
| F09 | AC1 | Without WebGL the 2D book loads; when the WebGL context is lost, 3D falls back to 2D on the same page | e2e with WebGL disabled and a forced context loss | 5 | 7 | in progress |
| F09 | AC2 | The mode switch is always reachable, and switching keeps the current position | e2e | 5 | 7 | in progress |
| F09 | AC3 | A frame rate below the Q03 budget for 3 s in a row offers 2D mode (never switches without telling the reader) | unit (quality-tier policy) + e2e with CPU throttling | 5 | 7 | in progress |
| F10 | AC1 | With JavaScript disabled the full content reads as one article with a correct heading order | e2e (JS off) + axe | 3 | 7 | in progress |
| F10 | AC2 | Print preview shows the content without the 3D interface | manual check | 5 | 7 | in progress |
| F11 | AC1 | Every volume opens from the desk and from the table of contents, by pointer and by keyboard | e2e | 5 | 7 | dropped |
| F12 | AC1 | The magnifier enlarges the area under it at least 2×, can be turned off, and costs nothing while off | e2e + frame-time trace | 5 | 7 | dropped |
| F13 | AC1 | Every page exists in Spanish and English; switching keeps the position and sets the `lang` attribute | content validator + e2e | 3 | 7 | in progress |
| F14 | AC1 | Credits list title, author, link and license of every third-party asset, and the edition and translator of the text; the site and `CREDITS.md` agree | unit test comparing both lists + review | 3 | 7 | in progress |
| F15 | AC1 | The title and the first spread's text are in the initial HTML; 3D code starts loading after first paint | build-output check + Lighthouse trace | 3 | 7 | in progress |
| F15 | AC2 | The progress indicator only moves forward and is based on bytes | e2e: sample progress values | 5 | 7 | in progress |
| F16 | AC1 | The book opens flat; the mouse wheel tilts it up to 40° and back to flat, easing to each new angle; with reduced motion the angle changes at once | e2e: wheel events and emulated reduced motion | 4 | 5 | met |
| F16 | AC2 | The same tilt works by touch (a vertical drag on the desk, outside the pages) and by keyboard (↑ ↓ while the book has focus) | e2e, one test per input | 5 | 7 | in progress |
| F16 | AC3 | While tilted, the HTML pages stay within 2 CSS px of the 3D pages (as F03 AC2); a browser that draws `matrix3d` without perspective shows the page's texture instead | e2e alignment probe at several angles | 5 | 7 | in progress |
| F17 | AC1 | Holding F, moving the mouse circles the camera around the open book, which stays in the middle of the picture, the camera following the mouse: sideways all the way round, and down toward the desk as the tilt goes (F16), from straight above to 80° from it, but never into or behind what stands on the desk: there it rises over it. Letting F go eases the view back to reading by the shorter way round; with reduced motion it goes back at once | e2e: key held, mouse moved, emulated reduced motion | 6 | 7 | in progress |
| F17 | AC2 | Holding F, the arrows turn the camera instead of the pages and the tilt; F with Ctrl, Alt or Meta, or typed in a field, does nothing; the view also goes back when the window loses focus | e2e, one test per input | 6 | 7 | in progress |
| F17 | AC3 | While the camera looks around, the pages show their text as textures, and the HTML stays in the page for screen readers; back in the reading view, the HTML lies within 2 CSS px of the 3D pages (as F03 AC2) | e2e alignment probe after a look | 6 | 7 | in progress |
| Q01 | AC1 | Lighthouse, median of 3, within the load budgets BL1–BL3 for each tier ([spec 02](02-budget.md)) | Lighthouse in CI, numbers in the ledger at every gate from Stage 3 | 4 | 7 | in progress |
| Q02 | AC1 | Build output within BB1–BB4 and BB6; request log within BB5 | CI budget check on the build output + request log | 3 | 7 | in progress |
| Q03 | AC1 | Frame time p95 during a page turn within BR1 on the Tecno Pova 6 and on the RX 9060 XT PC | performance trace on the real devices | 4 | 7 | in progress |
| Q03 | AC2 | No frames rendered per second while idle (BR2) | e2e frame counter | 4 | 7 | in progress |
| Q03 | AC3 | Tier settings and renderer counters within BR3–BR6 | unit tests of the tier settings + `renderer.info` in e2e | 4 | 7 | in progress |
| Q04 | AC1 | Estimated GPU memory within BM1–BM3 | asset report script (`npm run report:model`, built in Stage 2) + page texture sizes from code | 2 | 6 | in progress |
| K01 | AC1 | `npm run check:model` checks a GLB against the model contract (format, scale, required nodes, anchors or fallback, credits, budgets) and names the clause that failed | unit tests on fixture GLBs | 4 | 6 | in progress |
| K01 | AC2 | The GLB shipped in Stage 6 passes `check:model` in CI | CI | 6 | 6 | planned |
| K02 | AC1 | The build reads content only from the EU delivery endpoint with a delivery token, writes a snapshot, and uses the last snapshot when Contentstack is unreachable | unit tests with a mocked API + one live build | 3 | 5 | met |
| K02 | AC2 | The build fails when a chapter's blocks differ in number or order between locales | content validator unit tests | 3 | 5 | met |
| K03 | AC1 | The placeholder scene passes `check:model`; Stage 6 changes only bindings and configuration (files touched recorded for H2) | CI + review of the Stage 6 diff at its gate | 4 | 6 | in progress |
| Q05 | AC1 | axe reports 0 serious or critical issues in 3D, 2D and reading modes | e2e with axe | 4 | 7 | in progress |
| Q05 | AC2 | Every action works by keyboard with a visible focus; page changes are announced through a polite live region | e2e + manual NVDA pass | 4 | 7 | in progress |
| Q05 | AC3 | With reduced motion, pages change without the curl animation and the camera does not move | e2e with emulated media | 4 | 7 | in progress |
| Q06 | AC1 | Each spread URL has its own title and description; Lighthouse SEO ≥ 95 | e2e + Lighthouse | 3 | 7 | in progress |
| Q07 | AC1 | No blank screen in the failure suite: no WebGL, context lost, CMS unreachable at build, image 404 | e2e failure suite + build test | 5 | 7 | in progress |
| Q08 | AC1 | CI runs format, lint, types, unit tests and spec checks on every push, and `main` stays green | CI history | 1 | 7 | in progress |
| Q08 | AC2 | The pure core (pagination, turn state, routing, content mapping, quality tiers) has unit tests | coverage report of the core folder | 4 | 7 | in progress |
| Q09 | AC1 | The e2e suite passes in Chromium, Firefox and WebKit | Playwright projects in CI | 4 | 7 | in progress |
| C01 | AC1 | Monthly cost is $0 | review of every account at the gate | 1 | 7 | in progress |
| C02 | AC1 | Every shipped dependency and asset has an allowed license or an approving ADR | license check script in CI + `CREDITS.md` review | 3 | 7 | in progress |
| C03 | AC1 | ≤ 10 content types, ≤ 1K entries, ≤ 1K assets; API calls per month ≤ 50% of the quota | content-model script + Contentstack usage page | 3 | 7 | in progress |
| C04 | AC1 | `package.json` uses exact versions only; the install date of each new dependency is ≥ 14 days after its release | `npm run check:deps` in CI + `npm view <pkg> time` at install | 1 | 7 | in progress |
| C05 | AC1 | No token in the repository or the build output | secret scan in CI on source and build output | 4 | 7 | in progress |
| P01 | AC1 | Every gate summary links an updated ledger entry and AI-usage entries | gate review | 1 | 8 | in progress |
