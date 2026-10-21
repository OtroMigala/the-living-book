# Gate — Stage 1: requirements and success metrics

- **Date:** 2026-10-21
- **Decision:** pending. The owner writes *go*, *go with changes* or *no-go* here, with the date.

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

### Still open

| # | Question | Options | Recommendation |
| --- | --- | --- | --- |
| Q3 | Master language of the Contentstack stack (and default of the site). **Must be answered before the stack is created: Contentstack never lets you change it** | English / Spanish | **English (United States)**: the English text (Lang) is the source the Spanish follows, and the main audience reviews in English. Spanish is added as a second language if the Free plan allows it (R07) |
| Q4 | Hosting | GitHub Pages / Contentstack Launch (included in the Free plan) | **Decide in Stage 2**, after checking Launch's free limits. Launch completes the Contentstack story and may make publish-to-live (F05) simpler |
| Q8 | Parallel work for you (H7) | — | In progress: Contentstack account created on the Free plan. Next: create the stack and record what it includes (checklist given in chat). Nothing in Blender yet: wait for the Stage 2 contract |
| Q9 | Time available | hours per week, target date | Needed to size the stages and to measure R12 |

## Exit criteria

- [x] Vision spec with requirement IDs, priorities and success metrics
- [x] Every requirement has at least one acceptance criterion, checked by `npm run check:specs`
- [x] Risk register scored, each risk with a stage that retires it
- [x] CI baseline green locally, 3 of 3 runs
- [x] CI green on GitHub (run 39693926015, started by hand; see the ledger)
- [x] Ledger and AI usage entries for this stage
- [ ] Owner review of the spec, and answers to Q3, Q4 and Q9 (Q1, Q2, Q5–Q7 and Q10 answered; Q8 in progress)
- [ ] Self-assessment below (H9)
- [ ] Explicit go

## Self-assessment (H9, the owner fills it in)

- Understanding of what was done in this stage and why, 1 to 5:
- Questions you had to ask to understand it:

## How to check this stage yourself

```sh
npm ci
npm run ci
```

Then break it on purpose: delete one row from `specs/traceability.md` and run `npm run check:specs`. It names the requirement that lost its criterion and exits with code 1.
