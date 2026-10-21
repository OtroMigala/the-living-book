# AI usage log

What the agent (Claude Code) did, what had to be corrected, and what failed. Raw counts, not impressions: this is the evidence for H7 and H8 in [`workflow-playbook-v0.md`](../workflow-playbook-v0.md), and part of H9.

**Result** is one of: *right first time* · *corrected by tool* (a linter, test or check caught it) · *corrected by owner* · *failed* · *pending review* (the owner has not reviewed it yet; updated at the gate).
**Type** is one of: research · spec/docs · tooling · code · test · asset · ops.

## Stage 1 — requirements and success metrics

| # | Date | Task | Type | Result | Caught by | What was corrected |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026-10-21 | Find the Stage 1 instructions. The playbook gives one table row; the detailed "Claude Code prompt v2" it mentions is not on disk. Read the previous projects (Su-30 `CLAUDE.md`, portfolio `AI-WORKFLOW.md` and spec 02) for conventions | research | right first time | — | — (logged as risk R14) |
| 2 | 2026-10-21 | Read the model's metadata only (the full analysis is Stage 2): license CC BY-SA 4.0, the open book is a single mesh, the lens uses transmission | research | pending review | — | — |
| 3 | 2026-10-21 | Check the Contentstack Free plan on contentstack.com/pricing: limits found; locales, environments, webhooks and Live Preview not listed | research | pending review | — | — (logged as risk R07) |
| 4 | 2026-10-21 | Choose tool versions (≥ 14 days old, by release date). ESLint rejected: typescript-eslint 8.71.1 supports TypeScript `<6.1.0` only | tooling | right first time | — | — (ADR 0001) |
| 5 | 2026-10-21 | Write `biome.json` | tooling | corrected by tool | Biome deprecation notice | Used `linter.rules.recommended`, deprecated in Biome 2.5; migrated to `preset` with `biome migrate` |
| 6 | 2026-10-21 | First format run of the new TypeScript files | code | corrected by tool | `biome ci` (3 errors) | Lines over the 100-column limit in 3 files; fixed with `biome check --write` |
| 7 | 2026-10-21 | Traceability checker and exact-version checker, with 16 unit tests | code | right first time | — | Also checked against a deliberately broken copy of the specs: all 5 planted problems reported, exit code 1 |
| 8 | 2026-10-21 | Vision spec, traceability table, risk register, ADR 0001, gate summary | spec/docs | pending review | — | — |

| 9 | 2026-10-21 | Check the copyright of the owner's chosen text. Found that each translation has its own rights; compared Burton + Blasco Ibáñez with Lang + Maucci (both from Galland) | research | pending review | — | — (ADR 0002, risks R16 and R17) |
| 10 | 2026-10-21 | Look up the reference phone's hardware (chipset, GPU, screen) | research | pending review | — | — |
| 11 | 2026-10-21 | Create the public GitHub repository and push | ops | failed | GitHub rejected the push | The repository was created empty, but the `gh` token has scopes `repo`, `gist` and `read:org`, not `workflow`, which GitHub requires to push files under `.github/workflows/`. The agent did not check the token's scopes before pushing. Needs the owner to run `gh auth refresh -h github.com -s workflow` (interactive) |

| 12 | 2026-10-21 | Check in Contentstack's docs what the Free plan stack allows: the master language can never be changed after creation; Live Preview is enabled through support | research | pending review | — | — (R07 updated; Q3 marked as blocking the stack) |
| 13 | 2026-10-21 | Add the MIT `LICENSE`, the text editions in `CREDITS.md`, and accept ADR 0002 | spec/docs | pending review | — | — |
| 14 | 2026-10-21 | Push again after the owner granted the `workflow` scope | ops | right first time | — | Pushed. The push started no CI run, so the agent started one by hand; it passed (ledger) |

### Rules set by the owner

| Date | Rule | Reason given | Already broken before the rule? |
| --- | --- | --- | --- |
| 2026-10-21 | Never add Claude as co-author in commits, pull requests or releases | Stated as an absolute rule when asking for the repository | No: 0 of the 6 existing commits had a co-author trailer (`git log --format=%B`) |

### Recommendations at the gate

Evidence for H8 and H9: how often the agent's recommendation was taken.

| Question | Recommendation | Owner's decision | Taken? |
| --- | --- | --- | --- |
| Q1 Content | Portfolio + making-of volumes | The *Nights* frame story | No |
| Q6 Repository | Create it, public | Create it | Yes |
| Q10 Text editions | B: Lang + Maucci, Spanish abridged | B, nothing explicit or racist in either language | Yes (the owner made the rule stricter: both languages) |
| Q2 Model license | Accept CC BY-SA 4.0 | Accept | Yes |
| Q7 Code license | MIT | MIT | Yes |

### Stage 1 counts

| Measure | Value |
| --- | --- |
| Tasks | 14 |
| Right first time | 4 (research 1, tooling 1, code 1, ops 1) |
| Corrected by tool | 2 (tooling 1, code 1) |
| Corrected by owner | 0 so far (updated at the gate) |
| Failed | 1 (ops: push rejected, task 11) |
| Pending review | 7 |
| Time blocked waiting on the owner (H7) | 0 min for the specs (the agent worked on stated assumptions A1–A6 and moved the questions to the gate). The first CI run on GitHub is blocked on the owner granting the `workflow` scope (task 11) |
