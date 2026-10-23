# ADR 0010 — Run CI and Deploy in Playwright's container image

- **Status:** accepted, 2026-10-22. The owner asked for the option that speeds development up the most ("la opción que más acelere el desarrollo") and for this record; the choice among the options below is the agent's, by that criterion. The reading of the license policy below was confirmed by the owner at the Stage 4 gate (D3).
- **Stage:** 4, before the gate
- **Evidence:** [AI usage](../ai-usage.md) tasks 38, 42, 45 and 51; the CI and Deploy runs they name

## Context

Every CI and Deploy job installed the browsers with their system packages (`npx playwright install --with-deps`), which downloads fonts and libraries from Ubuntu's mirror. On 2026-10-22 that mirror hung, in all three tries of the retry script (150 s each), in **8 jobs between 19:20 and 04:09 UTC**, after hanging three times earlier that day during a GitHub incident. Each failure cost about 9 minutes and a manual rerun, turned CI red for reasons unrelated to the code, and delayed deploys: the long-task readout reached the phone only on a rerun. The code was never the cause; jobs on other runners at the same time installed in one try.

## Options

| Option | For | Against |
| --- | --- | --- |
| 1. Keep the retry script | Nothing new | Failed 8 times in 9 hours; more tries only make a failure slower |
| **2. Playwright's image**, `mcr.microsoft.com/playwright` | Browsers and their system packages are in the image: no download from the mirror, nothing installed at run time; the same browsers and fonts in every job; the workflows lose the retry script | A 940 MiB pull per job (Microsoft's registry, on Azure like the runners); the image must change with every Playwright upgrade |
| 3. Cache the packages and browsers | Smaller downloads | `apt-get` still reads the mirror's index; cache keys and restore steps in every workflow |
| 4. Point apt at another mirror | One line | Another mirror can hang too; still installs at run time |
| 5. Install without `--with-deps` | No apt | WebKit lacks libraries; fonts differ from what the tests saw |

## Decision

1. **The three jobs (CI checks, CI Lighthouse, Deploy) run in `mcr.microsoft.com/playwright:v1.64.0-noble`**, the image of the installed `@playwright/test` (1.64.0), pinned by digest like the actions (C04):
   `sha256:06a9939e57531807f8d5fd76ce44b53165ffb7d7501d87ab10e285c20b1e971f`. As Playwright's documentation shows for GitHub Actions, the job runs as the runner's user (`--user 1001`), which owns the workspace.
2. **`npm run check:deps` fails** if a workflow's Playwright image is not the version in `package.json` or is not pinned by digest. An upgrade of Playwright changes both in the same commit.
3. `actions/setup-node` still installs the Node version of `.nvmrc` and caches npm's downloads; the image's own Node 24 is not relied on.
4. The retry script is removed.

## Policy checks

- **Age:** the image was built on 2026-10-08, 14 days before this decision; `@playwright/test` 1.64.0 was released on 2026-10-07 (`npm view`). Read from the registry's image configuration.
- **Contents**, from the image's build history: Ubuntu 24.04, Node 24, git, curl, and Playwright's browsers in `/ms-playwright`.
- **Licenses:** Playwright is Apache-2.0. The image's operating system packages include GPL software (bash, coreutils, git), as does the `ubuntu-latest` runner the jobs used before. ADR 0005 governs the packages in `package-lock.json`, what the project installs and may ship; the image is the CI machine's operating system, and nothing from it is shipped or linked into the project's code. This reading is part of this decision.

## Consequences

- No job downloads browsers or system packages; the browser install step and its 40–47 s are replaced by the image pull (measured on the first runs, in the ledger).
- A Playwright upgrade needs the new image's tag and digest in three places, and CI says so if one is missed.
- If Microsoft's registry is unreachable, no job can start; it has the same cloud as the runners.
- Revisit if pulls are slow (BC6), or when the project moves off GitHub-hosted runners.
