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
