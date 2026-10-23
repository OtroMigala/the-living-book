# AI usage log

What the agent (Claude Code) did, what had to be corrected, and what failed. Raw counts, not impressions: this is the evidence for H7 and H8 in [`workflow-playbook-v0.md`](../workflow-playbook-v0.md), and part of H9.

**Result** is one of: *right first time* · *corrected by tool* (a linter, test or check caught it) · *corrected by owner* · *failed* · *pending review* (the owner has not reviewed it yet; updated at the gate). Work the owner accepted at the gate without changes counts as right first time.
**Type** is one of: research · spec/docs · tooling · code · test · asset · ops.

## Stage 1 — requirements and success metrics

| # | Date | Task | Type | Result | Caught by | What was corrected |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026-10-21 | Find the Stage 1 instructions. The playbook gives one table row; the detailed "Claude Code prompt v2" it mentions is not on disk. Read the previous projects (Su-30 `CLAUDE.md`, portfolio `AI-WORKFLOW.md` and spec 02) for conventions | research | right first time | — | — (logged as risk R14) |
| 2 | 2026-10-21 | Read the model's metadata only (the full analysis is Stage 2): license CC BY-SA 4.0, the open book is a single mesh, the lens uses transmission | research | right first time | — | — |
| 3 | 2026-10-21 | Check the Contentstack Free plan on contentstack.com/pricing: limits found; locales, environments, webhooks and Live Preview not listed | research | right first time | — | — (logged as risk R07) |
| 4 | 2026-10-21 | Choose tool versions (≥ 14 days old, by release date). ESLint rejected: typescript-eslint 8.71.1 supports TypeScript `<6.1.0` only | tooling | right first time | — | — (ADR 0001) |
| 5 | 2026-10-21 | Write `biome.json` | tooling | corrected by tool | Biome deprecation notice | Used `linter.rules.recommended`, deprecated in Biome 2.5; migrated to `preset` with `biome migrate` |
| 6 | 2026-10-21 | First format run of the new TypeScript files | code | corrected by tool | `biome ci` (3 errors) | Lines over the 100-column limit in 3 files; fixed with `biome check --write` |
| 7 | 2026-10-21 | Traceability checker and exact-version checker, with 16 unit tests | code | right first time | — | Also checked against a deliberately broken copy of the specs: all 5 planted problems reported, exit code 1 |
| 8 | 2026-10-21 | Vision spec, traceability table, risk register, ADR 0001, gate summary | spec/docs | corrected by owner | Owner, at the gate | The gate summary had no short summary the owner could assess against, and it did not make clear that the CI only checks and deploys nothing (the owner read it as "CI/CD for deployment"). From now on each gate ends with a plain-language summary in Spanish, in the chat |
| 9 | 2026-10-21 | Check the copyright of the owner's chosen text. Found that each translation has its own rights; compared Burton + Blasco Ibáñez with Lang + Maucci (both from Galland) | research | right first time | — | — (ADR 0002, risks R16 and R17) |
| 10 | 2026-10-21 | Look up the reference phone's hardware (chipset, GPU, screen) | research | right first time | — | — |
| 11 | 2026-10-21 | Create the public GitHub repository and push | ops | failed | GitHub rejected the push | The repository was created empty, but the `gh` token had scopes `repo`, `gist` and `read:org`, not `workflow`, which GitHub requires to push files under `.github/workflows/`. The agent did not check the token's scopes before pushing. The owner ran `gh auth refresh -h github.com -s workflow` |
| 12 | 2026-10-21 | Check in Contentstack's docs what the Free plan stack allows: the master language can never be changed after creation; Live Preview is enabled through support | research | right first time | — | — (R07 updated; Q3 answered before the stack was created) |
| 13 | 2026-10-21 | Add the MIT `LICENSE`, the text editions in `CREDITS.md`, and accept ADR 0002 | spec/docs | right first time | — | — |
| 14 | 2026-10-21 | Push again after the owner granted the `workflow` scope | ops | right first time | — | Pushed. The push started no CI run, so the agent started one by hand; it passed (ledger) |
| 15 | 2026-10-21 | Find out why pushes do not start CI | ops | failed | — | Not solved after 4 pushes and the checks listed in risk R18; time-boxed and carried into Stage 2 |

### Rules set by the owner

| Date | Rule | Reason given | Already broken before the rule? |
| --- | --- | --- | --- |
| 2026-10-21 | Never add Claude as co-author in commits, pull requests or releases | Stated as an absolute rule when asking for the repository | No: 0 of the 6 existing commits had a co-author trailer (`git log --format=%B`) |
| 2026-10-21 | End each gate with a short plain-language summary in Spanish | The owner could not self-assess without one | — |

### Recommendations at the gate

Evidence for H8 and H9: how often the agent's recommendation was taken.

| Question | Recommendation | Owner's decision | Taken? |
| --- | --- | --- | --- |
| Q1 Content | Portfolio + making-of volumes | The *Nights* frame story | No |
| Q6 Repository | Create it, public | Create it | Yes |
| Q10 Text editions | B: Lang + Maucci, Spanish abridged | B, nothing explicit or racist in either language | Yes (the owner made the rule stricter: both languages) |
| Q2 Model license | Accept CC BY-SA 4.0 | Accept | Yes |
| Q7 Code license | MIT | MIT | Yes |
| Q3 Master language | English | English | Yes |

### Stage 1 counts

| Measure | Value |
| --- | --- |
| Tasks | 15 |
| Right first time | 10 |
| Corrected by tool | 2 |
| Corrected by owner | 1 |
| Failed | 2 (both ops) |
| Recommendations taken | 5 of 6 |
| Owner's self-assessment (H9) | 4 of 5 |
| Time blocked waiting on the owner (H7) | 0 for the specs (the agent worked on stated assumptions A1–A6 and moved the questions to the gate). Blocked once: the push waited one chat turn for the `workflow` scope (task 11) |

By type, for the "delegate / don't delegate" guidance (H8):

| Type | Tasks | Right first time | Corrected by tool | Corrected by owner | Failed |
| --- | --- | --- | --- | --- | --- |
| research | 6 | 6 | 0 | 0 | 0 |
| tooling | 2 | 1 | 1 | 0 | 0 |
| code | 2 | 1 | 1 | 0 | 0 |
| spec/docs | 2 | 1 | 0 | 1 | 0 |
| ops | 3 | 1 | 0 | 0 | 2 |

## Stage 2 — inputs and budgets

**Result** gains one value from this stage: *self-corrected* (the agent caught its own mistake before the owner saw it). It is counted apart from *right first time* so the log does not flatter the agent.

| # | Date | Task | Type | Result | Caught by | What was corrected |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026-10-21 | GLB reader and asset report (`tools/asset-report/`), 8 unit tests with GLBs built in memory | code | corrected by tool | `biome check` | All tests passed on the first run; the formatter re-wrapped 3 files |
| 2 | 2026-10-21 | Scene-space analysis of the open book (scratch script) | research | corrected by tool | Node error | The first run imported the module by a Windows path (`C:/...`); Node's ES module loader needs a `file://` URL |
| 3 | 2026-10-21 | Download and measure Lang's frame story; read it in full for the owner's content rule | research | right first time | — | — |
| 4 | 2026-10-21 | Find the Maucci (1902) Spanish frame story on Wikisource | research | failed | Wikimedia rate limit | The agent sent 30 API requests in a row without pauses and was blocked; it should have batched titles in one request. Then found that the edition is only scans, not text (gap G06) |
| 5 | 2026-10-21 | Input report: wrote "19 paragraphs with dialogue" and "only `Open_book` has extra UV sets" before measuring | spec/docs | self-corrected | Agent's own check | Measured afterwards: 19 was right; the UV claim was too narrow (every mesh has 2–3 UV sets). Rule broken: no number without a measurement |
| 6 | 2026-10-21 | Contract: wrote the page geometry as "in the `Open_book` frame" although it was measured in scene coordinates | spec/docs | self-corrected | Agent printed the node matrices | `Open_book`'s local Z points along the scene's +Y (Z-up FBX source). The contract now states every value in scene coordinates |
| 7 | 2026-10-21 | Update the risk register with a one-off Node script doing regex replacements | tooling | self-corrected | Agent read the file back | The script overwrote the title and pasted a duplicate row into R08. Restored with the Edit tool; lesson: exact-match edits, not ad-hoc regex scripts, for Markdown tables |
| 8 | 2026-10-21 | Contentstack research: EU endpoints, master-language rule, Launch limits | research | pending review | — | — |
| 9 | 2026-10-21 | Budget spec, contract spec, gap list, input report | spec/docs | pending review | — | — |

### Stage 2 counts

| Measure | Value |
| --- | --- |
| Tasks | 9 |
| Right first time | 1 |
| Corrected by tool | 2 |
| Self-corrected | 3 |
| Corrected by owner | 0 so far (updated at the gate) |
| Failed | 1 (research etiquette: unpaced API calls) |
| Pending review | 2 |
| Time blocked waiting on the owner (H7) | 0: the owner's stack answers arrived with the Stage 1 go |

### Stage 2 gate

| Question | Recommendation | Owner's decision | Taken? |
| --- | --- | --- | --- |
| D1 Spanish text | (b) translate Lang | (a) transcribe the 1902 scans | No |
| D2 Hosting | Contentstack Launch | GitHub Pages, "to have something today" | No |
| D3 Budgets | Approve | Approved | Yes |
| D4 Contracts | Approve | Approved with the go | Yes |

- **Owner's self-assessment (H9):** 4 of 5.
- **Found by the owner, not the agent:** why pushes did not start CI (R18). The cause was visible only in the repository's Actions tab ("GitHub Actions is not currently enabled"); the REST API the agent used reported Actions as enabled. Lesson for H8: when the API and the UI can disagree, ask the owner to look at the UI early instead of trying more API calls.

## Stage 3 — scaffold

| # | Date | Task | Type | Result | Caught by | What was corrected |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026-10-21 | Choose the framework: Astro, static output, 3D as a later island (ADR 0003) | spec/docs | right first time | — | Approved at the Stage 3 gate |
| 2 | 2026-10-21 | Design tokens: wrote contrast ratios in the CSS comments without computing them | code | self-corrected | Agent computed them before committing | 4 of 6 ratios were wrong (e.g. 14.3 written, 13.98 real); all still pass AA. Added `tools/contrast/`, whose test reads `tokens.css` and fails CI if a pair drops below 4.5:1 |
| 3 | 2026-10-21 | Content model types, snapshot loader, validator and parity check (K02), 11 tests | code | right first time | — | — |
| 4 | 2026-10-21 | Credits page: section ids built from the role ("3D model") contained a space | code | self-corrected | Agent's review of the page | HTML ids cannot contain spaces; now numbered |
| 5 | 2026-10-21 | First lint of `.astro` files | tooling | corrected by tool | Biome | 13 false "unused" warnings (Biome does not read Astro templates): rules turned off for `.astro` only. Import sorting moved two header comments between imports: comments moved below the imports |
| 6 | 2026-10-21 | Byte-budget check on the build output, reading its limits from spec 02; 7 tests | code | right first time | — | — |
| 7 | 2026-10-21 | Deploy workflow, enable GitHub Pages (source: GitHub Actions) | ops | right first time | — | First push after the owner enabled Actions started both CI and Deploy; the site answered 200 on all three pages |
| 8 | 2026-10-21 | Split the scaffold into 4 commits | ops | self-corrected | Agent, after pushing | The first commit adds `check:budgets` to `npm run ci` but the script arrives in the third, so that commit alone would fail CI. Only the pushed head was checked. Rule kept: each commit must pass `npm run ci` on its own |
| 9 | 2026-10-21 | Literata typeface, self-hosted from the npm package, preloaded (ADR 0004) | code | right first time | — | 40.6 KB measured against BB6's 100 KB |
| 10 | 2026-10-21 | Diagnostics page: the owner could not tell what "Copy" meant | code | corrected by owner | Owner | The button now says "Copy the result" and confirms ("Copied. Paste it in the chat.") or selects the text when the clipboard is blocked; the page says a screenshot works too |
| 11 | 2026-10-21 | Looked for the Contentstack secrets at repository level and found none | ops | self-corrected | Agent | They were in the `github-pages` environment. The deploy is now one job inside that environment, so it can read them |
| 12 | 2026-10-21 | Content types (book, chapter, credit), mapping, seed and pull scripts; 5 tests, including a lossless round trip snapshot → entries → snapshot | code | right first time | — | The seed workflow (run 39710078564) created the 3 content types and 5 entries and published them on its first run; the next deploy (run 39710132783) built the site from Contentstack. Before the token existed, only the Delivery side could be tried: the first deploy got HTTP 422, code 118 ("content type 'book' was not found"), which proves the API key, delivery token and EU host are right. The seed waits for a management token |
| 13 | 2026-10-21 | Run the seed workflow after the owner added the management token and said so | ops | right first time | — | 3 content types and 5 entries created and published; the next deploy built the site from Contentstack |
| 14 | 2026-10-21 | Find the frame story in the 1902 scan (9 page images at 1280 px, fetched with pauses and an identifying user agent) and transcribe it faithfully | research | right first time | Accepted by the owner | Printed pp. 5–13. Page 5 is cropped on the right margin: 13 word endings reconstructed and marked in brackets (first written as 16 from memory; counted with grep and corrected). The owner proofreads against the scans |
| 15 | 2026-10-21 | Adapt the Spanish to Lang's 28 paragraphs, with every edit listed in `assets-src/text/README.md` | spec/docs | right first time | Accepted by the owner, who chose today's names | 1 bridging sentence written; 4 kinds of cuts (brother's story, a religious stereotype, an orientalist judgement, the fables). Parity test passes on the real snapshots |
| 16 | 2026-10-22 | Today's names in the adapted Spanish (owner's choice); record the phone's measured diagnostics | spec/docs | right first time | — | 15 name replacements; the measured pixel ratio (3) replaced the Stage 2 estimate (2.6) in the budget reason |
| 17 | 2026-10-22 | Spanish pages (`/es/`, `/es/creditos/`), interface text per locale, hreflang, a language switch that lands on the same paragraph; seed and pull in both locales, refusing English fallback as Spanish | code | right first time | Owner: "lo veo bien" | 59 tests; the switch script adds 0.2 KB to the home page (BB1) |
| 18 | 2026-10-22 | Seed both locales into Contentstack (owner approved) | code | corrected by tool | The pull's fallback check (`untranslatedEntries`) and the parity test | The first two-locale seed localized every entry but published only the master's content: Contentstack does not publish an already-localized entry's own translation unless the publish names that locale as its source. The deploy refused to publish English as Spanish and stopped on the parity test, keeping the previous site online. Fixed by publishing once per locale (seed run 39713538587); the next deploy pulled both locales |
| 19 | 2026-10-22 | Find out why CI went from 20 s to about 5 minutes | ops | right first time | — | Step timings of 14 runs put it all in `npm ci`, starting between two commits with no dependency change; npm's status page had an open incident ("Degraded Package Install and Publishing") |
| 20 | 2026-10-22 | Write the Stage 3 gate records with a one-off shell command | tooling | self-corrected | Agent | The command mixed a `python3` heredoc with a `node` script; on Windows `python3` is the Microsoft Store stub, which hung until the tool's timeout. Stopped; the edits were made with the Edit tool instead |

### Rules set by the owner in Stage 3

| Date | Rule |
| --- | --- |
| 2026-10-21 | Fonts under the SIL Open Font License are allowed |
| 2026-10-22 | Today's names for the characters in the Spanish text |

### Stage 3 counts

| Measure | Value |
| --- | --- |
| Tasks | 22 |
| Right first time | 12 |
| Self-corrected | 7 |
| Corrected by tool | 2 |
| Corrected by owner | 1 |
| Failed | 0 |
| Pending review | 0 |
| Owner's self-assessment (H9) | low, no number: "casi no sé qué hiciste, la verdad" |
| Time blocked waiting on the owner (H7) | Three waits of one chat turn each: the Contentstack secrets, the management token, and the permission for the two-locale seed. The work in between continued |

By type (H8):

| Type | Tasks | Right first time | Self-corrected | Corrected by tool | Corrected by owner | Pending |
| --- | --- | --- | --- | --- | --- | --- |
| research | 1 | 1 | 0 | 0 | 0 | 0 |
| spec/docs | 5 | 3 | 2 | 0 | 0 | 0 |
| code | 9 | 5 | 2 | 1 | 1 | 0 |
| tooling | 2 | 0 | 1 | 1 | 0 | 0 |
| ops | 5 | 3 | 2 | 0 | 0 | 0 |

Two more tasks found while closing the gate (counted above):

| # | Date | Task | Type | Result | Caught by | What was corrected |
| --- | --- | --- | --- | --- | --- | --- |
| 21 | 2026-10-22 | Spec changes during Stage 3 | spec/docs | self-corrected | Agent, counting revisions for H5 | Three spec changes went into `feat:`, `ci:` and `docs:` commits instead of their own `docs(specs):` commit, against the working agreement; counted by hand in `specs/01-vision.md` |
| 22 | 2026-10-22 | Stage 3 gate summary: wrote "31 commits" before counting | spec/docs | self-corrected | `git rev-list --count` | 22 commits |

### Stage 3 gate

| Question | Recommendation | Owner's decision | Taken? |
| --- | --- | --- | --- |
| D1 Framework | Astro (ADR 0003) | Approved | Yes |
| D2 Unbuilt criteria | (a) go with changes | (a) | Yes |
| OFL fonts | Literata under the OFL | Approved | Yes |
| Character names | (two options, no recommendation) | Today's names | — |

**Process lesson (H8, H9):** the agent delivered a lot in one stage and explained it only at the end; the owner lost track ("casi no sé qué hiciste"). Rule for Stage 4 on: small steps, each announced in two or three lines and followed by something the owner can try.

## Stage 4 — the 3D core (in progress)

Working rule from the Stage 3 gate: small steps, each announced and followed by something the owner can try.

| # | Date | Task | Type | Result | Caught by | What was corrected |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026-10-22 | Step 0a: browser tests with Playwright 1.64.0 (Chromium, Firefox, WebKit and a 360 × 688, ×3 phone): reading without JavaScript, heading order, titles, the language switch | test | corrected by tool | The new tests | They found a real bug in a feature the agent had already described to the owner as working ("scroll to the middle and press English"): the switch was in a header that scrolled away, so a reader could only press it after going back to the top, which loses the place. Fixed with a sticky header and `scroll-margin-top`; the rule that picks the paragraph was made precise (the first one that starts below the header). Also a type error (`window` needs the DOM library in test files) |
| 2 | 2026-10-22 | Step 0b: accessibility tests with axe (owner approved MPL-2.0 for testing), with a control page broken on purpose | test | corrected by tool | `tsc` | The documented default import of `@axe-core/playwright` is not constructable under NodeNext typing (its types are CommonJS); the named import works. Result: 0 issues of any impact on 5 pages × 2 colour schemes × 2 sizes; the control page fails as it must |
| 3 | 2026-10-22 | Step 0b: license check over the whole lockfile | code | right first time | — | The check itself is new; what it found is task 4 |
| 4 | 2026-10-22 | Stage 3: installed Astro, Vite and their tools without checking transitive licenses | ops | self-corrected | The new license check | 30 packages under MPL-2.0, LGPL-3.0, BlueOak-1.0.0 and 0BSD had come in unnoticed, against C02. All are build tools; ADR 0005 proposes the policy for them. `package.json` reorganized: `dependencies` now holds only what ships (the font) |
| 5 | 2026-10-22 | ADR 0003 said `sharp` was not installed | spec/docs | self-corrected | The license check | Read from `npm ls sharp --depth=0`, which lists only direct dependencies; `sharp` 0.35.5 and its LGPL binary are installed. ADR 0003 corrected |
| 6 | 2026-10-22 | Step 0b: secret scan of the repository and the build output, by token shape and, in the deploy, by the real values; control test with a planted value | code | right first time | — | 92 files, 0 findings; the planted value was found and only its name printed |
| 7 | 2026-10-22 | First push of the secret scan | code | corrected by tool | CI (the scan itself) | The scanner's own test held a literal private-key header as sample input, and CI flagged it; the local run had passed only because the new files were not yet tracked and the scan read `git ls-files`. The deploy failed and published nothing. Fixed twice: the sample is built at run time, and the scan now also reads untracked, non-ignored files, proved with a probe file |
| 8 | 2026-10-22 | Step 1: placeholder model (GLB writer, 7 boxes, 2 anchors), `check:model` with 10 clauses, the 3D lab page with three.js, BB2 in the budget check, browser tests for the lab | code | self-corrected | Agent's screenshots | The page outlines were invisible on desktop (1-pixel lines on box edges): translucent fills added. Draw calls were 13, not the expected 11: three.js draws transparent double-sided materials twice; `forceSinglePass` set |
| 9 | 2026-10-22 | Analysis of which way the book faces, from the texture coordinates | research | self-corrected | Agent | Corrected the Stage 2 contract, which had assumed the left page at −X; the verso is at +X. Also found gap G13 (objects in the way of a turning page) |
| 10 | 2026-10-22 | Shell one-liners that edit TypeScript through `node -e '…'` | tooling | self-corrected | Shell syntax error | An apostrophe in a comment ("page's") closed the shell string; the file was rewritten with the Edit/Write tools. Third time a one-off script edit failed in this project; rule: use the editor tools for code |
| 11 | 2026-10-22 | Step 2 (spike A): curl formula with unit tests, GPU and CPU page variants, the bench page and its browser test | code | self-corrected | Unit tests | The first version switched to the rigid formula below a small bend, leaving a 1.5 µm jump; replaced by a second-order Taylor series (error under 10⁻⁸ m). Two of the agent's own tests were wrong on the way: one compared two different bends and called the difference a jump; another demanded more precision than the series' documented bound |
| 12 | 2026-10-22 | Measure frame times in Playwright's Chromium | research | self-corrected | The bench's renderer string | It renders with SwiftShader (software), locally and in CI, so its frame times are not the reference desktop's. The spike report says so; the reference numbers come from the owner's own browsers |
| 13 | 2026-10-22 | Read the owner's spike A results | research | self-corrected | Agent | Fixed the bench to skip frames after the page is hidden (two PC maxima of 27 s and 57 s); first wrote as fact that the owner had switched windows, then reworded it as an unconfirmed inference |
| 14 | 2026-10-22 | Check the owner's model edits | research | right first time | — | `bookV2.glb` still had Blender's default cube and the magnifier 4.4 cm into the page sweep; the owner fixed both in `bookV3.glb` (the first check read the unchanged V2 file: the export had a new name) |

| 15 | 2026-10-22 | Step 3 (spike B): homography from a rectangle to any four points, with 6 unit tests | code | corrected by tool | Vitest | One expectation used `toBe(0)` on a value that was −0 (`Object.is` tells them apart); the math was right |
| 16 | 2026-10-22 | Page classes in the code contract, with a test against spec 03 and the CSS tokens | tooling | self-corrected | The new test (it read `NaN`) | Part of the test was appended through a shell heredoc, which dropped the backslashes of a regular expression. Against the rule from task 10 (use the editor tools for code), broken a fourth time; rewritten with the Edit tool and `String.raw` |
| 17 | 2026-10-22 | Spike B bench: HTML over the 3D page (flat and tilted), texture painter, alignment probe, page turn with text | code | self-corrected | The bench's pixel probe and the agent's screenshots | Three bugs before the first useful number: the tilted HTML was placed with the camera's previous matrices (three.js refreshes them only when it renders), 465 px off; the stand-in paginator left a 186-word paragraph on a page for 80; tilted pages ran off the canvas, so the probe measured a clipped edge |
| 18 | 2026-10-22 | Why the texture sat 0.5 px below the HTML | research | self-corrected | Agent | The first guess (the painter's baseline rounding) changed nothing, and the agent checked that the build had the change before guessing again. The cause was the HTML rounded to whole pixels while the 3D page was not; the camera now puts the page on the pixel grid (differing pixels 6.7% → 0.03%) |
| 19 | 2026-10-22 | Browser tests for spike B in four projects | test | corrected by tool | `tsc`, the WebKit run | The screenshots' tuple lost its types inside `page.evaluate`; `OffscreenCanvas` does not exist in Playwright's WebKit on Windows. The WebKit run also found that it draws `matrix3d` without perspective: a finding about approach A, recorded, not a bug to fix |

| 20 | 2026-10-22 | Spike B bench as handed to the owner | code | corrected by owner | Owner, on the devices | Two bugs the browser tests had passed: words drawn in the wrong place in the texture (a compound word like *grand-vizir* wraps after its hyphen, and the painter drew it whole on the first line; its own comment claimed no word could be split without hyphenation), and turning back played the forward turn in reverse, the free edge leading the spine. The hand-off test had compared only page 2; the broken words were on pages 3 and 4 |
| 21 | 2026-10-22 | Which measure catches a misplaced word | test | self-corrected | Agent, calibrating with the old painter | With the bug the share of differing pixels only went from 0.03% to 0.12%; the ink centroid moved 1.76–2 px. The test asserts the centroid (criterion 3, ≤ 0.5 px) and was shown to fail with the old painter |
| 22 | 2026-10-22 | Lens control and the table of text size by tilt and lens | code | corrected by tool | The phone-profile hand-off test | The control made the phone's toolbar taller and the stage 521 px tall: 781.5 canvas pixels at ratio 1.5, so the browser made 781 and stretched them, and the texture slid 0.51 px from the HTML. The canvas is now a whole number of its own pixels (0.05 px) |
| 23 | 2026-10-22 | Split the fixes into four commits | tooling | self-corrected | `tsc` on each commit, in a temporary worktree | Hunks picked without context lines (`git diff -U0`) were placed by line number and scrambled a test: three commits did not compile. Caught before pushing and redone with context, the way `git add -p` does it. Removing the worktree's linked `node_modules` with PowerShell failed; it was removed with `rmdir`, which deletes the link and not the folder it points to |

| 24 | 2026-10-22 | ADR 0008 from the owner's choice; F16 added to spec 01 in its own commit | spec/docs | pending review | — | — |
| 25 | 2026-10-22 | Tilt by the mouse wheel, a drag on the desk or ↑ ↓, easing exponentially, instant with reduced motion; browser tests for the easing and for reduced motion | code | right first time | — | One full run of the browser tests had a 30 s timeout that 24 repeats of the wheel tests and a second full run did not show again; recorded, not explained |
| 26 | 2026-10-22 | Read the owner's device numbers | research | self-corrected | Agent | The bench's font check said "fallback" on the PC but could not say whether the HTML or the canvas had missed Literata; the check now answers both. The phone's run was in Chrome's "desktop site" mode (user agent and 980 px viewport), noted with its numbers |

| 27 | 2026-10-22 | Step 4 (spike C): question, method and criteria, committed before the bench | spec/docs | pending review | — | — |
| 28 | 2026-10-22 | Pure greedy paginator with 22 unit tests (fixtures: four page sizes, a short text, a very long word, an empty chapter, a heading at a page's end, the number of layouts) | code | right first time | — | — |
| 29 | 2026-10-22 | DOM measurer, the pages' font face and typography, the bench, browser tests | code | self-corrected | Agent, reading the page before running it | The bench put its page shelf after the layout component, which would have rendered it after `</html>`; moved inside before the first run |
| 30 | 2026-10-22 | Why Firefox overflowed one page of Chromium's breaks | research | right first time | — | A line measured 287.00 px in a 287 px measure in Chromium and wrapped in Firefox. Proposed 1 px of measuring slack, which made the three engines break identically |

| 31 | 2026-10-22 | Assert that 1 px of measuring slack makes Chromium's breaks fit in every engine | test | corrected by owner | Owner: the deploy failed and the bench was a 404 | It held on Windows and failed on Linux, where Chromium measures text narrower than on Windows and than Firefox and WebKit (which break the same on both systems). The agent had told the owner that the three engines break identically, from runs on one platform, and had made the spike's open question a gate on the deploy. Now a printed matrix per platform |
| 32 | 2026-10-22 | Report the CI re-run started during GitHub's incident | ops | failed | Agent, a turn later | The agent told the owner nothing was left to verify while that run was still queued; it then failed (the wheel test in WebKit on Linux asked for three frames of easing and got two). Rule kept from here: report a run only after it has finished, and a cross-platform claim only after both platforms ran |

| 33 | 2026-10-22 | Turn the assertion into a cross-engine matrix | test | corrected by tool | CI on Linux, then a local full run | First version: WebKit, launched from the chromium project, inherited a Chromium-only flag and did not start on Linux (Windows ignored the flag); then three extra browsers beside the other tests slowed Firefox's WebGL benches into timeouts (2 of 3 local runs). Now its own Playwright project, without flags, after all the others |

| 34 | 2026-10-22 | ADR 0009 accepted; spec 03 gains how a page is measured, in its own commit | spec/docs | right first time | — | — |
| 35 | 2026-10-22 | Step 5a: the build's pagination pass in Firefox (a static server for dist/, an internal page deleted after the pass, `pages/breaks.json`), the workflows installing browsers before the build, and a browser test of the build's breaks | code | right first time | — | Deployed on Linux: the breaks fit in Firefox and WebKit, and overflow one Spanish page in Chromium on Linux, as spike C predicted |
| 36 | 2026-10-22 | CI run of step 5a | ops | failed | GitHub Actions | Cancelled by the 10-minute limit: installing the browsers' system packages hung for 598 s (usually 43–47 s), the second time today. The re-run passed in 2 min 3 s |

| 37 | 2026-10-22 | Step 5b: the 2D reader at `/book/` and `/es/libro/` (pages from the build, a page per address, keys and buttons, a live region, the language switch by position, re-pagination when a page does not fit), the paginator in steps, the reading article as a component, 7 browser tests and axe on the new pages | code | self-corrected | Agent, rereading before the first run | Two bugs caught before running: the build's breaks were checked by treating chapter ids as indexes, and the address was read before the reader was shown (a 0 px view would have chosen the wrong page class) |

| 38 | 2026-10-22 | First push of step 5b | ops | failed | GitHub Actions | CI and deploy cancelled: the browser install hung on Ubuntu's mirror for ten minutes, the third time that day, during a GitHub incident; the agent first described the reader as about to be published. Mitigation in the workflows: three tries of 150 s and a 15-minute ceiling. The next runs passed with the install on the first try (43–45 s) |

| 39 | 2026-10-22 | Step 5c-1: the reader split into a core and two views; the 3D view (pages on the pixel grid, tilt by wheel, drag and ↑ ↓, textures where matrix3d loses its perspective); the open book's pages and the pixel probe shared with the bench; 7 browser tests | code | corrected by tool | Biome | A `var` declared inside a `try` and an unused import; nothing at run time. In Playwright's WebKit on Windows the textures replaced the tilted HTML as ADR 0008 planned |
| 40 | 2026-10-22 | Measure BB2 on the book's page | tooling | self-corrected | Agent, against its own measurement | The budget check missed the lazy 3D chunk, which Vite imports with backquotes, and would have reported 5.3 KB instead of 159.3 KB; fixed with a unit test |

| 41 | 2026-10-22 | Commit step 5c-1 in order | tooling | self-corrected | Agent, reading `git status` between commits | The `git mv` of the reader stayed staged and went into the first commit, a refactor of the 3D bench, which then renamed a file its importers still named: that commit would not have built. Caught before pushing; the commits were redone and each one type-checked, linted and, where it touched the book's page, built, in a temporary worktree |

| 42 | 2026-10-22 | The three-try browser install (task 38) | ops | failed | GitHub Actions | On its first real hang the second and third tries failed at once with apt's exit code 100: the stopped install had left apt running or dpkg half done, a risk noted when the retry was written and not handled. Each retry now stops apt and lets dpkg finish first. A docs-only deploy failed; the site kept the previous version |

| 43 | 2026-10-22 | Step 5c-2: the 3D view turns pages as a bending sheet, with the four faces as textures painted from the HTML, backward as the mirror of forward, none with reduced motion; `?debug=1` shows the last turn's frame times; browser tests for both directions and for reduced motion | code | right first time | — | The reader's navigation tests now run with reduced motion, since they test where the reader goes, not the animation |

| 44 | 2026-10-22 | Commit order of step 5c-2 | tooling | self-corrected | Agent, after pushing | The animated turn was committed before the commit that set the navigation tests to reduced motion, so that one commit alone fails the browser tests (not `npm run ci`). Already on `main`, not rewritten. Rule kept from here: a test that a change of behaviour breaks is adapted in the same commit or before |
| 45 | 2026-10-22 | Runs started late during GitHub's incident | ops | self-corrected | Agent, reading the run list | The push of step 5c-2 started no runs for 20 minutes, while a run for an older commit started an hour late; had it passed, it would have published an older site over a newer one. The deploy now publishes only the newest commit on main, and the install retries wait 20 s |

| 46 | 2026-10-22 | Step 5d: turning by hand: a pure gesture module with 7 unit tests (progress, the halfway rule, taps), grips on the pages' outer edges, a drag that carries the sheet in 3D, a tap that turns, and in 2D a drag decided on release; browser tests in 3D and 2D | code | right first time | — | — |
| 47 | 2026-10-22 | Full local browser runs after step 5d | test | self-corrected | Repeated runs, read with the JSON reporter | The spike B bench timed out in Firefox in 1 of 3 runs once the reader's 3D tests also used WebGL there. Its wheel tests, now covered by the reader's, were removed; it has 90 s and one retry, written down as unexplained. CI's Firefox has no WebGL and skips it |
| 48 | 2026-10-22 | Step 6: the Lighthouse check (Q01 AC1): three runs per page and tier in Playwright's Chromium with WebGL, medians judged against BL1–BL3 read from spec 02 (a pure module with 8 unit tests), a CI job of its own with the reports as an artifact and the medians on the run's page; the static server and the browser install shared | tooling | corrected by tool | Biome | Import order and line breaks in the new files |
| 49 | 2026-10-22 | Hiding the site's header and footer under the reader (from step 5b, task 37) | code | corrected by tool | The new Lighthouse check, on its first run | Removing the header moved `<main>` up under the reader, and Chromium counts that as a layout shift although nobody can see it: CLS 0.079 on `/book/` with the mobile profile, over BL2 (0.05). Hidden with `visibility` instead: CLS 0.000 on mobile and desktop |
| 50 | 2026-10-22 | Loading the 3D view "after the article is on screen" (from step 5c-1) | code | corrected by tool | The Lighthouse check, on its first CI run | The comment said so, the code did not: the import ran before the first paint. Lighthouse's simulation then counted the three.js download in the LCP in 2 of 3 CI runs (4.65 s on mobile, over BL1), and only by a few milliseconds' luck in local runs. A first fix with two animation frames still left the download 0–6 ms after the paint; the reader now waits for the browser's own paint report, about 10 ms after it |
| 51 | 2026-10-22 | The Lighthouse job's first CI runs | ops | failed | GitHub Actions | Ubuntu's mirror hung in all three tries of the browser install, while downloading font packages: on the Lighthouse job of the first run, and on both jobs of the run after the LCP fix; other runners at the same time (the deploys) installed in time. A rerun of the failed jobs passed both times, the install in one try |
| 52 | 2026-10-22 | Step 6b: the 3D view's start in shorter tasks. Measured first, with a trace at 4× CPU slowdown and temporary marks per phase (not committed): the first render compiled every shader on the main thread (99 ms SwiftShader, 142 ms GPU), and three.js's evaluation and the WebGL context shared a task. Shaders now compiled with `compileAsync` before the reader is shown, the context created in a task of its own; a browser test checks that no turn compiles a shader | code | right first time | — | — |
| 53 | 2026-10-22 | A claim made during step 6b: "every turn compiles the sheet's shader again" | analysis | self-corrected | Agent, checking that the new test failed without the fix | It did not fail: the turning sheet has the still pages' shaders and draws with their program, which lives as long as they do. The "warm" sheet added for it was removed before committing. The test stays, as a guard if the sheet ever gets shaders of its own; its first version also counted the alignment probe's program, and now counts before each turn |
| 54 | 2026-10-22 | Why CI's mobile TBT stayed at 168 ms after step 6b while the PC gave 15 ms | analysis | right first time | — | The suspect named first (creating the WebGL context in SwiftShader) was not stated as a finding; measured instead with SwiftShader forced locally and marks per phase: it was the first render, waiting for a shader link that SwiftShader cannot report (no `KHR_parallel_shader_compile`). `/diagnostics/` now shows the extension, so a device can be checked |

### Rules set by the owner in Stage 4

| Date | Rule |
| --- | --- |
| 2026-10-22 | Fidelity first: when two options both fit the budget, choose the one that looks and reads better ("no sacrificaremos fidelidad") |
| 2026-10-22 | Source models stay out of the repository until Stage 6: the `.blend` file and `bookV2.glb` are kept on the owner's machine and ignored by git. `bookV3.glb` had already been pushed before this rule |

### Recommendations in Stage 4

| Question | Recommendation | Owner's decision | Taken? |
| --- | --- | --- | --- |
| axe-core (MPL-2.0) for accessibility tests | Approve for testing only | Approved | Yes |
| License policy for tools (ADR 0005) | Accept | Approved | Yes |
| three.js with or without a framework (ADR 0006) | three.js directly | Approved | Yes |
| How to bend the turning page (ADR 0007) | On the GPU | Approved | Yes |
| Version the 26 MB `.blend` source | Git LFS now | Not before Stage 6 | No |
| Delete the obsolete `bookV2.glb` | Delete it | Keep it locally | No |
| Spike B: how HTML text sits on the 3D page | Option 2: flat for reading, tilted on request | Option 2, tilted by the mouse wheel with a smooth movement instead of a control (ADR 0008) | Yes, changed by the owner |
| Touch and keyboard equivalents of the tilt (drag on the desk, ↑ ↓) | Add them (Q05 AC2) | Confirmed | Yes |
| See the detailed model before Stage 6 | Keep the plan (H2); a local preview only if the owner wants it | Keep the plan ("tienes razón, sigamos con el plan") | Yes |
| Spike C: where to paginate (ADR 0009) | Build time, measured by Firefox with 1 px of slack, checked in the browser | Approved ("apruebo") | Yes |
