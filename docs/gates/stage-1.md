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
| Risk register: 15 risks, 10 with score ≥ 6 | [`docs/risks.md`](../risks.md) |
| CI baseline: format, lint, types, unit tests, spec traceability, exact versions | [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml), [`tools/`](../../tools/) |
| Decision record for the tooling | [`docs/adr/0001-ci-baseline-tooling.md`](../adr/0001-ci-baseline-tooling.md) |
| Metrics ledger, first entry | [`docs/performance.md`](../performance.md) |
| AI usage log, first entries | [`docs/ai-usage.md`](../ai-usage.md) |
| Instructions for future Claude Code sessions | [`CLAUDE.md`](../../CLAUDE.md) |
| Credits for the model (CC BY-SA 4.0 requires attribution) | [`CREDITS.md`](../../CREDITS.md) |

## Metrics snapshot

From the [ledger](../performance.md#stage-1--2026-10-21): 30 requirements (Must 25, Should 4, Could 1), 42 acceptance criteria, 0 traceability issues, 16 unit tests passing, local `npm run ci` 2.2 s (median of 3). CI on GitHub: pending (Q6).

## Decisions for the owner

| # | Question | Options | Recommendation |
| --- | --- | --- | --- |
| Q1 | What is the book about? | (a) your portfolio, one project per chapter; (b) the story of how this book was made (stages, decisions, numbers); (c) both, as separate volumes | **(c)**. The three closed books in the model become volumes: *Projects*, *How this book was made*, *About and credits*. The second volume shows the Contentstack work and the playbook from inside the product |
| Q2 | Accept the model's CC BY-SA 4.0 license? It is not in your usual list. ShareAlike means the edited GLB must also be published under CC BY-SA 4.0; the code is not affected | accept / replace the model | **Accept**, with attribution on the site and in `CREDITS.md` (already started) |
| Q3 | Languages and default | Spanish default / English default / one language only | **English default, Spanish second**: the main audience reviews in English, and it shows locale fallback in Contentstack. Only if the Free plan has two locales (R07) |
| Q4 | Hosting | GitHub Pages / Contentstack Launch (included in the Free plan) | **Decide in Stage 2**, after checking Launch's free limits. Launch completes the Contentstack story and may make publish-to-live (F05) simpler |
| Q5 | Reference devices for frame time (Q03) | — | Tell me which phone and which desktop GPU you have |
| Q6 | Create the GitHub repository so CI runs? | public / private, name `the-living-book` | **Public**: the reviewers need to see it. I have not created or pushed anything |
| Q7 | Code license | MIT / other | **MIT**, as in your other projects |
| Q8 | Parallel work for you (H7) | — | Create the Contentstack Free stack and note what it includes: locales, environments, webhooks, Live Preview. Nothing in Blender yet: wait for the Stage 2 contract |
| Q9 | Time available | hours per week, target date | Needed to size the stages and to measure R12 |

## Exit criteria

- [x] Vision spec with requirement IDs, priorities and success metrics
- [x] Every requirement has at least one acceptance criterion, checked by `npm run check:specs`
- [x] Risk register scored, each risk with a stage that retires it
- [x] CI baseline green locally, 3 of 3 runs
- [ ] CI green on GitHub (needs Q6)
- [x] Ledger and AI usage entries for this stage
- [ ] Owner review of the spec, and answers to Q1–Q9
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
