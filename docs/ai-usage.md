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

| 24 | 2026-10-22 | ADR 0008 from the owner's choice; F16 added to spec 01 in its own commit | spec/docs | right first time | — | Accepted by the owner without changes (equivalents confirmed) |
| 25 | 2026-10-22 | Tilt by the mouse wheel, a drag on the desk or ↑ ↓, easing exponentially, instant with reduced motion; browser tests for the easing and for reduced motion | code | right first time | — | One full run of the browser tests had a 30 s timeout that 24 repeats of the wheel tests and a second full run did not show again; recorded, not explained |
| 26 | 2026-10-22 | Read the owner's device numbers | research | self-corrected | Agent | The bench's font check said "fallback" on the PC but could not say whether the HTML or the canvas had missed Literata; the check now answers both. The phone's run was in Chrome's "desktop site" mode (user agent and 980 px viewport), noted with its numbers |

| 27 | 2026-10-22 | Step 4 (spike C): question, method and criteria, committed before the bench | spec/docs | right first time | — | Accepted by the owner with ADR 0009 ("apruebo") |
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
| 51 | 2026-10-22 | The browser install on CI during step 6 | ops | failed | GitHub Actions | Ubuntu's mirror hung in all three tries of the install, while downloading font packages, in 8 jobs between 19:20 and 04:09 UTC: Lighthouse of run 39839102795, both jobs of 39842060991, the deploy of `f1aa596` (docs only), the checks of 39892956010, and Lighthouse of 39894396806 twice (the rerun too), and the deploy of `cecb9a2` (passed on its rerun). Other jobs at the same time installed in one try. The deploys of every code commit passed, so the site has each change; the Playwright container image, which ships the browsers with their packages, is proposed to the owner |
| 52 | 2026-10-22 | Step 6b: the 3D view's start in shorter tasks. Measured first, with a trace at 4× CPU slowdown and temporary marks per phase (not committed): the first render compiled every shader on the main thread (99 ms SwiftShader, 142 ms GPU), and three.js's evaluation and the WebGL context shared a task. Shaders now compiled with `compileAsync` before the reader is shown, the context created in a task of its own; a browser test checks that no turn compiles a shader | code | right first time | — | — |
| 53 | 2026-10-22 | A claim made during step 6b: "every turn compiles the sheet's shader again" | analysis | self-corrected | Agent, checking that the new test failed without the fix | It did not fail: the turning sheet has the still pages' shaders and draws with their program, which lives as long as they do. The "warm" sheet added for it was removed before committing. The test stays, as a guard if the sheet ever gets shaders of its own; its first version also counted the alignment probe's program, and now counts before each turn |
| 54 | 2026-10-22 | Why CI's mobile TBT stayed at 168 ms after step 6b while the PC gave 15 ms | analysis | self-corrected | Agent, by experiment (task 55) | The suspect named first (creating the WebGL context in SwiftShader) was not stated as a finding; measured instead with SwiftShader forced locally and marks per phase: the long task was the first render. Its cause was then given as a shader link that SwiftShader cannot report (no `KHR_parallel_shader_compile`), and told to the owner: that was a guess, and wrong (task 55). `/diagnostics/` now shows the extension, so a device can be checked |
| 55 | 2026-10-22 | Spike 6c: wait for a WebGL fence after compiling, so the first render would not wait for the link on GPUs without parallel shader compile (the Pova 6 has none, from the owner's diagnostics) | analysis | self-corrected | Agent, by experiment | The fence signalled about 6 ms after compiling and changed nothing. Outside Lighthouse the first render took 9 ms with SwiftShader, also with a trace, with screenshots and with Lighthouse's mobile emulation; only inside Lighthouse do the long tasks appear, in the WebGL context or the first render, varying by run. So task 54's cause was wrong: the code comments and the diagnostics page that repeated it were corrected, the fence was not kept, and the owner was told. The cause inside Lighthouse is not identified |
| 56 | 2026-10-22 | Step 6c: `?debug=1` counts the long tasks since the first paint (Long Tasks API: Chromium only), so BL3 can be measured on the phone; a browser test in the four projects | code | right first time | — | — |
| 57 | 2026-10-22 | Reading the owner's screenshot of `?debug=1` | analysis | right first time | — | It showed the home page, where `?debug=1` does nothing (the work-in-progress notice is only there); the published book's page was checked in the phone's profile: the 3D reader appears after 1.4 s with the readout. The book's page is not linked from the site while it is built, which makes it easy to miss |
| 58 | 2026-10-22 | ADR 0010 and its change: CI and Deploy run in Playwright's image (pinned by digest, built 2026-10-08), the retry script removed, and `check:deps` fails when a workflow's image is not the installed Playwright version or not pinned by digest (4 unit tests; a wrong tag was tried and caught) | ops | right first time | — | First runs in the image green in all three jobs; the image starts in 26–38 s, against 40–47 s for a good install |
| 59 | 2026-10-22 | Committing ADR 0010 and the CI change | tooling | self-corrected | Agent, reading `git show --stat` after pushing | The staged deletion of the retry script (`git rm`) went into the ADR commit, so that commit alone still calls a deleted script. Already on `main`, not rewritten; no run used it, as both commits were pushed together. The same mistake as task 41: check `git diff --cached --stat` before every commit |
| 60 | 2026-10-22 | Stage 4 gate: summary, ledger snapshot, risks, these counts | spec/docs | self-corrected | Agent, checking each claim against the files before committing | The counts named tasks 18 and 20 as corrected by the owner (they are 20 and 31), and the gate said six criteria had a gap where ten list something missing |

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
| The browser install hangs on CI (8 jobs on 2026-10-22) | Playwright's container image, pinned by digest (ADR 0010) | "la opción que más acelere el desarrollo": the choice left to the agent by that criterion | Yes |

### Stage 4 counts

| Measure | Value |
| --- | --- |
| Tasks | 60 |
| Right first time | 16 |
| Self-corrected | 26 |
| Corrected by tool | 11 |
| Corrected by owner | 2: task 20 (on the devices: words misplaced in the texture, and the backward turn played forward) and task 31 (an assertion that held on Windows broke the deploy on Linux) |
| Failed | 5, all operations: the browser install on CI's runners |
| Pending review | 0 (tasks 24 and 27 were accepted by the owner without changes) |
| Commits in the stage | 116 (`git rev-list --count ac8ecf4..HEAD`): docs 49, feat 26, test 16, fix 9, ci 9, refactor 3, chore 3, perf 1 |
| Spec revisions after implementation started (H5) | 8 `docs(specs):` commits: 3 change what a spec says (the model's orientation, F16 added, how a page is measured), 5 change only statuses |
| Spikes (H3) | 3 run (A, B, C), each ending in a choice made with numbers (ADRs 0007–0009); 1 small one (6c) rejected its approach, a fence that changed nothing |
| Regressions caught by CI checks (H6) | 2 found by the Lighthouse check on its first runs, both missed by every browser test: CLS 0.079 and LCP 4.65 s on the book (tasks 49, 50) |
| Time blocked waiting on the owner (H7) | Device runs (the three spikes and the reader, on the Pova 6 and the PC) and six ADR approvals; work continued between them except at spike stops, where the working agreement asks to stop |
| Owner's self-assessment (H9) | good, no number: "creo que todo quedó bien en cuanto a mi entendimiento" |

By type (H8):

| Type | Tasks | Right first time | Self-corrected | Corrected by tool | Corrected by owner | Failed |
| --- | --- | --- | --- | --- | --- | --- |
| code | 21 | 9 | 5 | 6 | 1 | 0 |
| ops | 8 | 1 | 2 | 0 | 0 | 5 |
| tooling | 8 | 0 | 7 | 1 | 0 | 0 |
| test | 7 | 0 | 2 | 4 | 1 | 0 |
| research | 7 | 2 | 5 | 0 | 0 | 0 |
| spec/docs | 5 | 3 | 2 | 0 | 0 | 0 |
| analysis | 4 | 1 | 3 | 0 | 0 | 0 |

**Process lessons (H8):** code and documents were mostly right first time or caught by a check; the agent's own tooling was not (7 of 8 self-corrected: commits split wrongly twice, heredocs that lost backslashes, a hunk-splitting mistake). Analyses were corrected by the agent's own experiments, but twice a claim reached the owner before a test that could have refuted it (tasks 31 and 54). Rules kept: report a CI result only once the run has finished; state a cause as a finding only after a test that could have refuted it; check `git diff --cached --stat` before each commit.

### Stage 4 gate

| Question | Recommendation | Owner's decision | Taken? |
| --- | --- | --- | --- |
| D1 The six missing tests | Stage 5's first step | Approved | Yes |
| D2 BL3 in CI | Keep the check failing over 300 ms; the device readout as evidence | Approved | Yes |
| D3 ADR 0010's reading of the license policy | Confirm | Approved | Yes |
| BR1 on the PC, on the real reader | Run it before the go | Deferred: "luego la usamos" | No |

## Stage 5 — feature completion (in progress)

Plan, told to the owner at the start: 5.1 the tests the Stage 4 gate left missing (D1) and the criteria Stage 5 verifies; 5.2 the fallback chain and the mode switch (F09); 5.3 the failure suite (Q07); 5.4 progress by bytes (F15) and printing (F10); 5.5 publishing and preview from Contentstack (F05, F06), which needs research and the owner's permission; F11 and F12 (Could) decided at the end.

| # | Date | Task | Type | Result | Caught by | What was corrected |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026-10-23 | Step 5.1: the reader's missing tests (D1): PageUp and PageDown, back and forward, the same breaks in 3D and 2D (a break signature in the reader's state), every frame within BR4 and BR5 also mid-turn (draw counts in the 3D view's state), tilt by ↑ ↓ and by a real touch drag in the phone's profile, alignment at 10°, 25° and 40° | test | right first time | — | — |
| 2 | 2026-10-23 | The accessibility test of the book's pages (from Stage 4) | test | self-corrected | Agent, reading the test while extending it | Once the reader waited for the article's first paint (Stage 4, task 50), axe analysed the book's pages before the reader appeared: it checked the article, not the reader. It now waits for the reader, and also checks the 2D view in both languages |
| 3 | 2026-10-23 | A coverage report of the pure core (Q08 AC2), with `@vitest/coverage-v8` 5.0.3; two tests for the paginator's guards against looping, the lines the report showed unreached | test | right first time | — | The text reporter hides fully covered files by default; they are listed now |
| 4 | 2026-10-23 | `npm run check:text` (F04 AC1): no paragraph of the content written into `src/` | tooling | corrected by tool | Its own unit test | The test expected a 31-character probe where the probe is 30. A paragraph planted in `src/i18n/ui.ts` was caught |
| 5 | 2026-10-23 | K02 AC1: the content pull's decisions in a function of their own, tested against a fake Delivery API (the EU endpoint and the delivery token, Contentstack unreachable, nothing published, Spanish delivered in English, broken content) | code | right first time | — | — |
| 6 | 2026-10-23 | Writing three files with one shell heredoc | tooling | self-corrected | bash, before running anything | Nested quotes broke the command, and nothing was written; the files went through the editor. The third heredoc failure in this project: files with quotes are written with the editor |
| 7 | 2026-10-23 | Step 5.2a (F09): the reader changes its view while reading (`useView`, same place, after a turn lands); a button between the 3D book and flat pages, the 3D view asleep while flat pages show; a lost GPU context leaves the book flat on the same page, said in a status line; "Read as an article" links to the paragraph on screen; browser tests in the four projects | code | corrected by tool | TypeScript | The view became a variable named `view`, which a local of the same name in `render()` (the spread's page numbers) shadowed; the local is `spread` now. A script edit had also stopped on its own check, before writing anything, when one replacement had already been done by another |
| 8 | 2026-10-23 | The reader's bar redone at the owner's request ("una interfaz más limpia … sin perder armonía con la escena"): the desk's colours in both schemes (new tokens, contrast-tested), arrows for the page turns, the view switch styled as one of the links; two rows on a phone instead of three | code | corrected by tool | The browser tests (F01 AC1) | The first version was 4 px taller (an empty status line took a row of the grid, and the buttons were 44 px): at 1280 × 720 the pages shrank to 0.998 and the body text below 16 px. Buttons are 40 px under a mouse and 44 px under a finger, and the empty status line takes no row |
| 9 | 2026-10-23 | A Book link in the site's navigation; from the reading mode it carries the paragraph on screen (`#at=<id>`), which the reader opens (F09 AC2); the notice says where the book is | code | right first time | — | — |
| 10 | 2026-10-23 | Research for F05 and F06: what Contentstack's webhooks and Automate can send, and what GitHub needs to start a deploy; ADR 0011 proposed | research | right first time | — | The owner's answers (no Automate in the stack, no GitHub token) chose option 3 among the ones it listed |
| 11 | 2026-10-23 | Step 5.5a (F05, ADR 0011): the deploy signs what is published (one Sync call) before pulling it and ships the signature; the Content watch workflow compares every 10 minutes and starts the deploy, with guards against double and repeated deploys; `deployment: false` for the secrets; 14 unit tests; A3 and BC4 updated in the specs | code | right first time | — | First real run: 12 items in one call, the watch took 9 s, decided "no deploy", and created no deployment |
| 12 | 2026-10-23 | The turn test, failing in CI on both jobs of `720e3ba` and in 8 of 15 local repeats | test | self-corrected | CI, then the agent by a style log | The first cause named, the resize observer's first report showing the HTML mid-turn, was a guess: a fix for it left the rate at 7 of 15. A log of every style change showed the reader right; the test checked a 900 ms state through several calls and arrived late on a busy machine. It now reads the state in the page in one go (20 of 20). The guessed case was still real (a resize mid-turn showed the HTML); it is fixed, with a test that fails 5 of 5 without the fix |
| 13 | 2026-10-23 | Scratch scripts and test edits written through bash heredocs and Python strings | tooling | self-corrected | node and Playwright, before running anything | Twice more a backslash was eaten (`split('\')`) or a `\n` became a real line break inside a string. The rule from task 6 is kept: files with quotes or backslashes go through the editor |
| 14 | 2026-10-23 | Step 5.5b (F06, ADR 0011): the preview copy at `/preview/` (the same build under another base and folder), noindex and flagged on every page, `check:preview` (4 unit tests) in CI, the watch looking at the preview twice an hour | code | failed | GitHub Actions, the first deploy with it | The delivery token covers the production environment only: the preview's Sync call answered 422, and the signature step failed the whole deploy, against what the agent had just told the owner ("the public site goes out anyway"). Fixed the same hour: an unreadable environment gives a null signature and a warning, the copy is built only when its environment can be read, and the watch skips it (and does not deploy when production cannot be read). The next deploy published the site without the copy. Reading the preview needs the token's scope widened, which is the owner's call |
| 15 | 2026-10-23 | Edits through Python string replacements, again | tooling | self-corrected | The agent, reading the file before committing | One replacement matched its own new text and turned a function into a call to itself, and an escaped line break became a real one inside a shell command; both were caught before running and rewritten with the editor |
| 16 | 2026-10-23 | Step 5.2b (F09 AC3): animated frames timed against the tier's budget (a constant checked against BR1), a pure policy with 6 unit tests, an offer floating over the desk ("Switch to flat pages" / "Keep 3D"), never a switch by itself; a browser test with the CPU slowed twenty times | code | corrected by tool | Unit and browser tests, then a screenshot | The first policy used the mean frame time, and a unit test showed hiccups while loading taken for a slow device: it uses the median. The browser test ran out of pages in a 7-page spread before 3 s of turns: it turns forward and back. The offer's buttons, made by the script, missed the component's scoped styles (seen in a screenshot): styled with `:global` |
| 17 | 2026-10-23 | The preview's unreadable environment recorded as debt D1 at the owner's word, in a new register (`docs/debt.md`) | spec/docs | right first time | — | — |
| 18 | 2026-10-23 | Step 5.3 (Q07): the failure suite, five ways to break the book in four projects (no WebGL, the 3D code not downloaded, the model missing, the page breaks missing, the fonts missing) | test | right first time | — | It found a bug: with the fonts missing, `document.fonts.load` rejected, uncaught, and the reader never started (the article stayed, so nothing went blank). Fixed: the reader goes on in the fallback face |
| 19 | 2026-10-23 | Step 5.4a (F10 AC2): printed, the book page is the whole article, without the reader or the preview flag; a browser test emulates print | code | right first time | — | — |
| 20 | 2026-10-23 | Step 5.4b (F15 AC2): `npm run bytes` lists the 3D view's files and sizes after the build; a progress line adds their bytes as they arrive (Resource Timing for the code, the loader's progress for the model), capped per file and never going back; 6 unit tests and a browser test of every value | code | corrected by tool | The browser test | The line came back after the view was ready: files arriving later (the page breaks) reported too. Once ready, it stays hidden |

### Stage 5 counts

| Measure | Value |
| --- | --- |
| Tasks | 20 |
| Right first time | 9 |
| Self-corrected | 5 |
| Corrected by tool | 5 |
| Corrected by owner | 0 |
| Failed | 1: the first deploy with the preview copy, stopped by a token without the preview environment (task 14) |
| Commits in the stage | 38 (`git rev-list --count d5d7730..HEAD`): docs 21, feat 8, test 3, fix 3, ci 2, refactor 1 |
| Spec revisions (H5) | 9 `docs(specs):` commits: 3 change what a spec says (A3 and BC4 twice for the content checks, F11 and F12 dropped), 6 statuses only |
| Bugs found by the new checks (H6) | 4: the font failure that left the reader unstarted (failure suite), a size change mid-turn putting the HTML over the sheet, axe checking the article instead of the reader, a 4 px taller bar shrinking the text below 16 px |
| Time blocked waiting on the owner (H7) | The GitHub token and the preview's token scope (left as debt D1), and F11/F12; work went on meanwhile |
| Owner's self-assessment (H9) | not given (asked at the gate) |

By type (H8):

| Type | Tasks | Right first time | Self-corrected | Corrected by tool | Corrected by owner | Failed |
| --- | --- | --- | --- | --- | --- | --- |
| code | 9 | 4 | 0 | 4 | 0 | 1 |
| test | 5 | 3 | 2 | 0 | 0 | 0 |
| tooling | 4 | 0 | 3 | 1 | 0 | 0 |
| research | 1 | 1 | 0 | 0 | 0 | 0 |
| spec/docs | 1 | 1 | 0 | 0 | 0 | 0 |

**Process lessons (H8):** the agent's shell and Python edits stayed the weak spot (escapes eaten or turned into line breaks, a replacement matching its own output); files with quotes now go through the editor. Twice an outside service behaved unlike its documentation or the agent's reading of it (a delivery token scoped to one environment; GitHub's schedule never firing), and the first defence, failing soft, had to be added after the fact.

### Stage 5 gate

| Question | Recommendation | Owner's decision | Taken? |
| --- | --- | --- | --- |
| F11, other volumes from the desk | Leave it out | "Deja fuera esos 2 puntos" | Yes, dropped |
| F12, the magnifier | Move it to Stage 6 | Left out | No: dropped |
| D1 F05 not working (R20) | Carry it into Stage 6 | Approved | Yes |
| D2 CI time with the preview copy | Move its build to the Lighthouse job | Approved | Yes |
| D3 BR1 on the PC | Measure it with the real model | Approved | Yes |


## Stage 6 — the real model (in progress)

Plan, told to the owner at the start: 6.0 move the preview copy's build to the Lighthouse job (D2); 6.1 a spike: optimize the source model for the two tiers with glTF-Transform (the glass without transmission, textures resized and re-encoded, credits in the file), measured against BB4 and BM1, with screenshots for the owner to judge; 6.2 wire each tier to its model; 6.3 BR1 on the PC with the real model (D3); then the gate.

| # | Date | Task | Type | Result | Caught by | What was corrected |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026-10-23 | Step 6.0 (D2): the preview copy built in the Lighthouse job | ci | corrected by tool | The step times of the first run | The gate said the copy had pushed the checks job to 3 min 22–3 min 58 s; the run's step times show it costs 4 s, and the spread comes from the browser tests and starting the container. The move stays (it is harmless), but the gate's reason was a guess, not a measurement |
| 2 | 2026-10-23 | Step 6.1: `npm run model:optimize` with glTF-Transform 4.5.1 and sharp 0.35.5 (exact versions, released more than 14 days before); the magnifier's transmission dropped after reading its textures (the author had already painted the glass about 10% opaque in the alpha); credits in `asset.extras`; `check:model` per tier; 3 unit tests | tooling | corrected by tool | The tool's own output ("prune: Removed … Node (2)") | `prune` removes empty leaf nodes by default, and the page anchors are empty nodes: it keeps leaves now, and a unit test fails without that |
| 3 | 2026-10-23 | `check:model` read the WebP textures as 0 bytes of GPU memory and passed them (a gap since Stage 2: the report knew PNG and JPEG only) | tooling | self-corrected | The agent, reading "0.00 MiB" in the output | It reads the three kinds of WebP header, and an image it cannot read fails the clause instead of counting as 0. The test's own helper first wrote past its buffer (Vitest) |
| 4 | 2026-10-23 | Step 6.2, spec first: the contract's last column now describes the delivered files (anchors, clear page area, credits, budgets met; transmission removed when the files are made, not at runtime) | spec/docs | self-corrected | The agent, after committing | Committed after the spec check and the formatter only; the full `npm run ci`, which the working agreement asks before every commit, ran right after and passed |
| 5 | 2026-10-23 | The site's credits say the model was edited, as CC BY-SA 4.0 asks; found before publishing (the note still said "Not shown yet") and brought to the owner, who chose to write it in Contentstack; the repository's snapshot and seed carry the same text | spec/docs | right first time | — | — |
| 6 | 2026-10-23 | Step 6.2: each tier loads its own model (`MODEL_PATHS`), made in every build and not committed; `check:model` after the build on both files; one byte list per tier for the progress line, the tier read by one shared `readDevice()`; the labs on the real model; a browser test that each tier requests its own file | code | corrected by tool | The browser tests | The turn test failed in Chromium: 2 frames in a turn where it asked for more than 3. Measured before changing anything: the real model makes software rendering about three times slower (PC profile p50 33 → 100–133 ms) and costs nothing on the PC's GPU (54–55 frames per turn either way); the test now asks for one frame before the landing one, with the numbers in a comment. A second preview server was refused by Astro 7 until the first was stopped |
| 7 | 2026-10-23 | Drawing the pages before the model (`renderOrder`), so the depth test skips the book's hidden pixels | code | self-corrected | The agent's paired measurement | The first measurement after the change looked worse, placeholder included: the owner had started a game (CPU at 87%), so runs at different times could not be compared. A paired A/B, alternating in one run, gave 217 vs 250 ms in the PC profile and no change on the phone; kept, since the image is the same |
| 8 | 2026-10-23 | The owner's report on the real model ("se ve horrible": the pages did not sit on the book), diagnosed by measuring: the anchors, set to the fallback values, cover the whole open book, cover included, at the paper's highest point, while the paper is curved; and the model's texture has printed pages, which an opaque cream rectangle hid | research | right first time | — | The root was older: Stage 2 measured the fallback page as the open book's bounding box, cover included |
| 9 | 2026-10-23 | Spike: the pages draw only ink, on the model's paper; `model:optimize` erases the printed text (a grayscale morphological closing, unit-tested); margins follow the spine, over the flat paper | code | self-corrected | The agent's screenshots | sharp's `dilate`/`erode` are binary morphology and turned the colour texture into blocks; the closing is written in TypeScript |
| 10 | 2026-10-23 | The turning sheet made of the model's paper | code | corrected by owner | The owner, three times ("crece sus bordes… el color de los bordes", "se dobla un poco raro en la base", "mira la bisagra") | (a) the sheet was the size of the whole page, cover included: now the flat paper's; (b) flat: now in the paper's shape, draping over the pages under it; (c) an estimated light, 3–7% short in blue (the first colour measurement read the whole screenshot: sharp's `stats()` ignores `extract`): now three.js's MeshStandardMaterial with the model's textures, within 0.3%; (d) a hinge at the pages' height: now at the spine; (e) the paper's profile itself was wrong: a filter on the normals (y > 0.8) dropped the paper's curved vertices near the spine and kept the page block's underside, which made a false wall in the gutter; the model's ten real vertices, their texture coordinates and normals are used now; (f) the sheet's ink was mixed in linear light, greyer than the HTML: in sRGB now |
| 11 | 2026-10-23 | `npm run dev` showed flat pages (the owner's screenshot): Vite bundled three.js late and answered "504 Outdated Optimize Dep"; `optimizeDeps.include` in `astro.config.mjs` | tooling | corrected by owner | The owner's screenshot | — |
| 12 | 2026-10-23 | The model's credit note published in Contentstack, on the owner's request ("Tú publicas la nota"). The management token exists only in the Seed workflow, whose environment admits only `main`, and the seed writes the snapshot of the commit it runs on. The live site's text was first compared with the pushed snapshot (every long string found; only the note differs in the commits), then: push, cancel the push's deploy, seed, deploy by hand | ci | corrected by tool | The run list | The first cancel, sent while the job was starting its container, did not take: the deploy ran on for 2 minutes and pulled the content 15 s after the seed had ended. A second cancel stopped it long before its publishing steps; nothing was published until the checks pass |
| 13 | 2026-10-23 | Steps 6.2 and 6.2b in CI: the local checks had passed (`npm run ci`, the browser tests with 2 workers), but Lighthouse, a CI job of its own, had not been run with the real model, and the gate's state said "all checks pass" | ci | corrected by tool | CI's Lighthouse job and the browser tests | BL3 failed (TBT 1,349 / 586 ms, R22) and 3 browser tests timed out waiting for a turn (R21): CI did not publish. The correction is the next step; until then `main` is red and the site stays on the last version that passed |
| 14 | 2026-10-23 | BR1 on the PC (D3): Edge with a real window on the 200 Hz monitor, the local build, `?debug=1`, 6 turns per run | research | right first time | — | In the first of four runs, the third and fourth → keys reported backward turns and the last ← a forward one; the next three runs, one of them logging the page numbers (1 → 8 and back to 4), turned as pressed. Not reproduced; the first run's screenshots were overwritten by the later runs |
| 15 | 2026-10-23 | F17, at the owner's request before the plan goes on: hold F to look around (the mouse turns the camera where it stands, the arrows by 5° steps, back to reading when F is let go). Spec first; the camera's axes as a pure function, its properties scanned degree by degree before the tests were written (exact at the reading view and at the horizon, at most 3.62° of turn per degree of input, a flip past 62° back, hence the 45° limit); the pages are textures while looking; 5 unit tests, 3 browser tests per desktop engine | code | corrected by tool | The browser tests | The first test moved the mouse outside the window, where the page gets no pointer events, and read the limits as never reached: the test now starts low on the screen. The code was not changed. Seen in Edge on the PC's GPU: the reading camera is close (a page fills the screen), so the book leaves the picture after about 40° to a side, and looking up shows only the background; brought to the owner as a decision |
| 16 | 2026-10-23 | F17 changed to an orbit at the owner's choice ("orbitemos"): the camera on a sphere around the book, the tilt as its polar angle, the sphere's tangent as up (a level horizon all the way round), back by the shorter way; a floor per azimuth from rays against boxes around the closed books and the magnifier, kept from rising more than 1° per degree; 10 unit tests, 3 browser tests per desktop engine | code | corrected by tool | Edge screenshots, the unit tests, `tsc`, the browser tests | (a) the first orbit went to 80° behind the book, into the stack of closed books (a screenshot full of a spine): the floor; (b) the floor read between its 2° samples let the camera behind a box's side (the unit test's sweep, at 149°): each sample keeps the least of itself and its neighbours; (c) a reset still wrote the old field names through `Object.assign`, which the types do not check (found by `tsc` on the browser tests); (d) the first browser test took the frames before the key was up as the way back. 1.7e-6° of rounding in `angleTo` made a 1e-6° threshold 1e-4° |
| 17 | 2026-10-23 | R21, so the site goes live ("Arregla todo para que quede publicado en pages"): read CI's Playwright report (the turn had happened: the page showed pages 2–3, the check came after it), then a watch set in the page before the key, 15 s for animations, a frame minimum the machine cannot break, and the browser tests in three CI jobs split by each project's measured test time | ci | corrected by tool | CI | The first fix kept a 2-frame minimum; CI then timed 1 frame in a turn, a frame longer than the 900 ms turn: the minimum is 1, which still tells the animated turn from reduced motion's jump. Meanwhile the deploy of `fece8da` had passed by chance and published the real model |
| 18 | 2026-10-23 | R22, spike: the Lighthouse tool keeps the book's trace; CI's trace shows the first frame with the canvas waiting 404 ms in its commit for a 429 ms GPU task. Tried a warm-up draw before showing the canvas, waiting on a fence, then on an occlusion query | research | failed | The agent's A/B runs | Both warm-ups made TBT worse locally (1,133–1,211 and 977–1,469 ms against 207–727 ms); reverted before any commit. The first hypothesis (texture uploads) was not checked before coding; the trace then pointed at the GPU work in general, not which part |
