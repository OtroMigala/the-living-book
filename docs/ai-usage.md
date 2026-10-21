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
