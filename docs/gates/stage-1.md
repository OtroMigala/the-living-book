# Gate — Stage 1: requirements and success metrics

- **Date:** 2026-10-21
- **Decision:** **go** (owner, 2026-10-21). Open item carried into Stage 2: pushes do not start CI yet (risk R18).

## Scope as understood

The playbook describes Stage 1 in one row: *requirements and success metrics → vision spec, traceability table, risk register, CI baseline*. The detailed stage prompt ("Claude Code prompt v2") is not in the repository, so this is the agent's reading of that row (risk R14). Correct it here if it is wrong.

- **In scope:** what the book is, why and for whom; requirements with priorities and measurable success criteria; how each criterion will be verified and in which stage; risks scored and assigned to the stage that retires them; a CI that checks the repository from the first commit.
- **Not in scope:** the model analysis (Stage 2; only its metadata was read), final budgets (Stage 2), the framework and the content model (Stage 3), any application code.

## What was produced

| Artifact | File |
| --- | --- |
| Vision spec: idea, audiences, assumptions, 30 requirements, success metrics | [`specs/01-vision.md`](../../specs/01-vision.md) |
| Traceability: 42 acceptance criteria, each with verification method and stages | [`specs/traceability.md`](../../specs/traceability.md) |
| Risk register: 17 risks, 3 retired at the gate; 14 open, 10 of them with score ≥ 6 | [`docs/risks.md`](../risks.md) |
| CI baseline: format, lint, types, unit tests, spec traceability, exact versions | [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml), [`tools/`](../../tools/) |
| Decision record for the tooling | [`docs/adr/0001-ci-baseline-tooling.md`](../adr/0001-ci-baseline-tooling.md) |
| Decision record for the book's text (accepted) | [`docs/adr/0002-book-content.md`](../adr/0002-book-content.md) |
| Code license (MIT) | [`LICENSE`](../../LICENSE) |
| Metrics ledger, first entry | [`docs/performance.md`](../performance.md) |
| AI usage log, first entries | [`docs/ai-usage.md`](../ai-usage.md) |
| Instructions for future Claude Code sessions | [`CLAUDE.md`](../../CLAUDE.md) |
| Credits for the model (CC BY-SA 4.0 requires attribution) | [`CREDITS.md`](../../CREDITS.md) |

## Metrics snapshot

From the [ledger](../performance.md#stage-1--2026-10-21): 30 requirements (Must 25, Should 3, Could 2), 42 acceptance criteria, 0 traceability issues, 16 unit tests passing, local `npm run ci` 2.2 s (median of 3). CI on GitHub: see the ledger.

## Decisions for the owner

### Answered on 2026-10-21

| # | Question | Answer | Effect |
| --- | --- | --- | --- |
| Q1 | What is the book about? | The introduction (frame story) of *One Thousand and One Nights* | A1 confirmed with this content; F11 lowered to Could; F14 extended. Editions: new question Q10 |
| Q5 | Reference devices | Phone Tecno Pova 6 (Helio G99 Ultimate, Mali-G57 MC2); desktop GPU AMD Radeon RX 9060 XT | A6 confirmed; R06 raised (entry-level phone GPU) |
| Q6 | Create the GitHub repository | Yes, with the rule that Claude is never added as co-author | Rule added to `CLAUDE.md`. Repository: https://github.com/OtroMigala/the-living-book. The first push was rejected until the owner granted the `workflow` scope (AI usage log, task 11) |
| Q10 | Which translations, and abridged or not? | B (Lang + Maucci, from Galland). Nothing explicit or racist, in either language; length does not matter | [ADR 0002](../adr/0002-book-content.md) accepted; R16 and R17 retired |
| Q2 | Accept the model's CC BY-SA 4.0 license | Yes | R04 retired; attribution in `CREDITS.md` |
| Q7 | Code license | MIT ("I want it to be free") | `LICENSE` added; assets keep their own licenses |
| Q3 | Master language | English, chosen when creating the stack; Spanish added as a second language | A4 confirmed; F13 possible on the Free plan |
| Q8 | Contentstack stack (parallel work, H7) | Stack *The Living Book* created on the Free plan, EU region (`eu-app.contentstack.com`), branch `main`. Spanish added; two environments created; Webhooks page present (nothing created); Live Preview not found in Settings; delivery and management tokens available; Assets in the top bar; Launch dashboard open, with GitHub, Bitbucket or zip upload | R07 mostly retired; Live Preview (F06) remains unknown; EU region goes into the Stage 2 contract |
| Q9 | Time available | About 4 hours per week | Used to size stages and to watch R12 |

### Carried into Stage 2

| # | Question | Recommendation |
| --- | --- | --- |
| Q4 | Hosting: GitHub Pages or Contentstack Launch | Launch is available on the Free plan. Decide at the Stage 2 gate, after reading its limits |

## Exit criteria

- [x] Vision spec with requirement IDs, priorities and success metrics
- [x] Every requirement has at least one acceptance criterion, checked by `npm run check:specs`
- [x] Risk register scored, each risk with a stage that retires it
- [x] CI baseline green locally, 3 of 3 runs
- [x] CI green on GitHub (run 39693926015, started by hand; see the ledger)
- [x] Ledger and AI usage entries for this stage
- [x] Owner review of the spec, and answers to Q1–Q3 and Q5–Q10 (Q4 carried into Stage 2)
- [x] Self-assessment below (H9)
- [x] Explicit go

## Self-assessment (H9)

- **Understanding, 1 to 5:** 4 (owner, 2026-10-21).
- **In the owner's words:** "we created the repo, the CI/CD flow for deployment, defined the scope and the implementation strategy, the content, the licenses, the test hardware, and created the stack in Contentstack."
- **What was missing:** the owner could not find a short summary of the stage to assess against. From now on each gate ends with a plain-language summary in the chat, in Spanish.
- **One misunderstanding to correct:** the CI only *checks* the repository (format, lint, types, tests, specs, versions). Nothing is deployed yet; deployment arrives with the first page that can be published (F05, Stage 3 onward).
- **Questions the owner had to ask:** what Contentstack's dashboard is for and what to do in it; why the time available matters.

## How to check this stage yourself

```sh
npm ci
npm run ci
```

Then break it on purpose: delete one row from `specs/traceability.md` and run `npm run check:specs`. It names the requirement that lost its criterion and exits with code 1.
