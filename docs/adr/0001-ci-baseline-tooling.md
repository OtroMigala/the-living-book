# ADR 0001 — CI baseline tooling

- **Status:** proposed (approved at the Stage 1 gate)
- **Date:** 2026-10-21
- **Stage:** 1

## Context

Stage 1 needs a CI baseline before any application code exists, so that every later commit is checked from the first one (Q08) and the playbook can measure how often CI catches a problem before a human does (H6). The choices made now are inherited by every later stage.

Constraints: exact versions at least 14 days old (C04), allowed licenses (C02), Node 24 (already installed, used in the Su-30 project).

## Decision

| Concern | Tool | Version | License |
| --- | --- | --- | --- |
| Runtime | Node.js | 24 (`.nvmrc`) | MIT |
| Types | TypeScript | 7.0.2 | Apache-2.0 |
| Format and lint | Biome | 2.5.15 | MIT or Apache-2.0 |
| Unit tests | Vitest | 5.0.3 | MIT |
| CI | GitHub Actions, actions pinned to exact tags | checkout 7.0.1, setup-node 7.0.0 | MIT |

Repo scripts written in TypeScript (`tools/`) run directly with `node file.ts`: Node 24 strips the types, so no build step or extra runner (tsx, ts-node) is needed. That is why `tsconfig.json` sets `erasableSyntaxOnly` (no enums or other syntax Node cannot strip) and `allowImportingTsExtensions`.

CI runs five steps, each one a separate entry in the log so its duration and failures can be counted: format and lint, types, unit tests, spec traceability, exact versions.

## Alternatives

- **ESLint + typescript-eslint + Prettier.** The most common setup, and the one reviewers expect. Rejected for now: typescript-eslint 8.71.1 supports TypeScript `<6.1.0`, so it would force TypeScript 6 instead of 7. Biome needs no TypeScript integration and replaces two tools with one. Revisit if a lint rule we need only exists in ESLint (for example React hooks rules in Stage 3: Biome has `useExhaustiveDependencies` and `useHookAtTopLevel`).
- **TypeScript 6.0.3.** Would allow typescript-eslint, but TypeScript 7 is the current stable line and much faster.
- **tsx to run scripts.** One more dependency for something Node 24 already does.

## Consequences

- The CI baseline does not check budgets yet: there is no build output. Budget checks are added in Stage 3 (traceability Q01, Q02), once the budget spec from Stage 2 exists.
- CI only runs once the repository is on GitHub (open question Q6). Until then `npm run ci` runs the same steps locally.
