# Workflow Playbook v0 (draft, to be validated by "The Living Book")

Status: **hypothesis**. Nothing here is a standard yet. This project is the experiment; Stage 8 turns evidence into the real playbook (v1).
Rule: do not standardize from a sample of one without marking confidence. Practices proven here are "candidate"; practices that also work on a second project become "standard".

---

## 1. The core loop (domain-agnostic)

```
Spec -> Budget -> Contract -> Spike -> Gate -> Integrate -> Verify -> Retrospect
```

| Generic stage | In "The Living Book" | Output artifacts |
|---|---|---|
| 1. Requirements and success metrics | Stage 1 | vision spec, traceability table, risk register, CI baseline |
| 2. Understand the inputs and constraints | Stage 2 (3D model analysis) | input report, budget spec, contract, gap list |
| 3. Scaffold | Stage 3 (maquetado) | tokens, interfaces/stubs, static layout, content model |
| 4. Risky core, with spikes and approvals | Stage 4 | spike reports, ADRs, metrics vs budget, approval points |
| 5. Feature completion, then freeze | Stage 5 | complete app on placeholders, e2e matrix |
| 6. Integrate external dependencies | Stage 6 (real model) | optimized asset, bindings, before/after numbers |
| 7. Verify and approve | Stage 7 | full test run, manual checklist, final checklist |
| 8. Standardize | Stage 8 (new) | playbook v1, templates, reusable skill |

"Inputs and constraints" is whatever you do not control and must understand first: a 3D model, a datasheet, a third-party API, a dataset, a design file.

## 2. Invariants (the rules I expect to keep)

1. **Budgets before code.** Every resource that can run out gets a number first (VRAM, bundle size, latency, flash, RAM).
2. **Contract at every boundary.** Code is written against a typed contract; the real dependency must satisfy it; placeholders let work continue.
3. **Spike, measure, ADR, approve.** Risky choices are built small, measured against budgets, written down, then approved.
4. **Gates.** Each stage ends with a metrics snapshot, a summary and an explicit "go".
5. **Single source of truth** for state; pure core, thin shell.
6. **Fail soft.** Every enhancement has a tested fallback.
7. **Ledger.** Metrics are appended at every gate; regressions need an explanation.
8. **AI usage log.** What the agent did, what was corrected, what failed.
9. **Spec first, docs as you go.** No end-of-project documentation sprint.

## 3. Hypotheses to validate with this project

Claude Code must collect this evidence while working (append to `docs/ai-usage.md` and `docs/performance.md`; keep raw counts, not impressions).

| ID | Hypothesis | How to measure | Keep / change / drop rule |
|---|---|---|---|
| H1 | Budgets before code prevent late rework | Budget regressions first detected at Stage 7 vs earlier stages | Keep if <= 1 late regression |
| H2 | Contract-first makes the final asset a drop-in | Time and files touched in Stage 6 | Keep if Stage 6 touches only bindings and config |
| H3 | Spikes with numbers reject bad approaches cheaply | Spikes run, spikes rejected, hours saved (estimate) | Keep if at least one rejection or confirmed choice with data |
| H4 | Gates keep review manageable | Review time per gate; defects found after approval | Keep if post-approval defects are rare |
| H5 | Spec-first reduces churn | Commits that revise a spec after implementation started | Change if churn is high: specs too detailed or too vague |
| H6 | CI perf gates catch regressions early | Regressions caught by CI vs by manual testing | Keep if CI catches most |
| H7 | Parallel human work (Blender, Figma, CMS setup) avoids idle time | Time blocked waiting on me | Change if blocking was frequent |
| H8 | Agent works best on well-specified, bounded tasks | Tasks right first time vs corrected, by task type | Use to write "delegate / don't delegate" guidance |
| H9 | Explaining the "why" in ADRs/prompts improves my understanding | My own self-assessment per stage (1 to 5) plus questions I had to ask | Keep if understanding improves |

## 4. Stage 8 prompt (append to the Claude Code prompt, v2, after Stage 7)

```
### Stage 8: Standardize the workflow
Goal: convert evidence from this project into a reusable playbook.

1. Evidence pass (no opinions yet). Read: git history, /docs/adr, /docs/ai-usage.md,
   /docs/performance.md, /specs (including revisions), CI history. Build a table for
   hypotheses H1..H9 in /workflow-playbook-v0.md with raw numbers.
2. Retrospective in Spanish: what worked, what hurt, what was wasted effort, what
   surprised us. Be specific and cite artifacts. Separate project-specific lessons
   (3D, Contentstack) from general lessons.
3. Classify each practice as KEEP / MODIFY / DROP with a confidence level
   (low = seen once, medium = clear evidence, high = measured and repeated).
   Do not mark anything "high" from this single project.
4. Produce /playbook/ with:
   - README.md: the workflow v1 (stages, gates, invariants) in English
   - templates/: vision spec, budget spec, contract, ADR, spike report,
     metrics snapshot, gate summary, traceability table, ai-usage entry
   - CLAUDE.md.template (with placeholders for domain, budgets, constraints)
   - ci/: reusable CI skeleton (lint, types, tests, budget checks)
   - checklists/: per-stage entry/exit criteria, review checklist, a11y and perf checklists
   - domains/: short adaptation notes (web, embedded, bots) with domain-specific
     budgets, contracts and spikes
   - SKILL.md draft: a Claude skill that triggers on "start a new project with
     the standard workflow" and scaffolds the structure
5. Propose a validation project (small, different domain) to run the playbook a
   second time. Only after that do practices become "standard".
6. Update /workflow-playbook-v0.md status to "superseded by /playbook v1".
```

## 5. How the loop adapts to other domains (preview, to be refined)

| Element | Web/3D (this project) | Embedded (STM32) | Node bot |
|---|---|---|---|
| Budgets | LCP, JS KB, VRAM, frame time | Flash, RAM, stack, ISR latency, cycles, current draw | p95 latency, throughput, memory, API rate limits |
| Contract | Model node names/scale, CMS shape | Peripheral/register map, pin map, protocol frames, datasheet limits | Message schema, webhook payloads, idempotency rules |
| Spike | Page-turn mesh, DOM alignment | Bring-up on dev board, DMA/timer timing, driver prototype | Provider API behavior, queueing under load |
| Gate evidence | Lighthouse, frame-time p95, a11y | Map file sizes, logic-analyzer traces, unit tests on host | Load test, replay test, error budget |
| Fallback chain | 3D to 2D to reading mode | Safe mode, watchdog recovery, bootloader | Retry, dead-letter queue, degraded replies |

The shape is the same: numbers first, boundaries typed, risk de-risked early, evidence at each gate.
