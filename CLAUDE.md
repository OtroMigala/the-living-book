# The Living Book — instructions for Claude Code

A 3D book whose pages are managed in Contentstack, and the pilot project for the workflow in `workflow-playbook-v0.md`.

Read first: `workflow-playbook-v0.md` (the process), `specs/01-vision.md` (what we build), the latest file in `docs/gates/` (where we are).

## Working agreement

- Talk to me in Spanish. Everything in the repository (specs, docs, code, comments, commits) is in English.
- I am a telecommunications engineering student and I want to learn: explain the why of each technique, especially the math and the graphics.
- One stage at a time. Before a stage, explain the approach in a few lines; when there are options, compare them and recommend one. End each stage at its gate: ledger entry in `docs/performance.md`, entries in `docs/ai-usage.md`, summary in `docs/gates/stage-N.md`, and in the chat a short plain-language summary in Spanish (what was done, why, what it does *not* do yet) so I can self-assess. Then stop and wait for an explicit "go".
- Small steps inside a stage (rule since the Stage 3 gate, where I lost track of the work). Before each step, tell me in two or three lines what you will do and why; after it, give me something to open or try, and stop after each spike so I can ask.
- Spec first. When reality disagrees with a spec, update the spec in its own commit (`docs(specs): ...`); these commits are counted for H5.
- No invented numbers. Every figure comes from a command recorded next to it, or is marked *pending*.
- Log as you go, not at the end: every task in `docs/ai-usage.md` with its type and result (right first time, corrected by tool, corrected by owner, failed).
- Risky choices: spike, measure against the budget, write an ADR in `docs/adr/`, ask for approval.
- Fidelity first: when two options both fit the budget, choose the one that looks and reads better ("no sacrificaremos fidelidad", 2026-10-22).
- Conventional commits, small and atomic. Run `npm run ci` before every commit.
- **Never add Claude as co-author.** No `Co-Authored-By:` trailer and no "Generated with" line in commits, pull requests or releases. Commits carry only my git identity.
- Dependencies: exact versions, released at least 14 days before installing (check with `npm view <pkg> time`). Licenses MIT, Apache-2.0, BSD, ISC, Zlib, CC0 or CC BY, and the SIL Open Font License for fonts (approved 2026-10-21); anything else needs my approval, recorded in an ADR.
- Secrets never go in the repository. The Contentstack management token never reaches the client.
- Contentstack: stack *The Living Book*, **EU region** (`eu-app.contentstack.com`; delivery `https://eu-cdn.contentstack.com`, management `https://eu-api.contentstack.com`), locales `en-us` (master) and `es-419`, environments `production` and `preview`, branch `main`. Free plan: no Live Preview.
- Hosting: GitHub Pages, base path `/the-living-book/`.
- Pushing to `main` of this repository (which runs CI and deploys to GitHub Pages) is part of the agreed workflow. Ask before anything else external: creating repositories, changing repository settings, writing to the Contentstack stack (seeding, publishing, settings).
