# The Living Book — instructions for Claude Code

A 3D book whose pages are managed in Contentstack, and the pilot project for the workflow in `workflow-playbook-v0.md`.

Read first: `workflow-playbook-v0.md` (the process), `specs/01-vision.md` (what we build), the latest file in `docs/gates/` (where we are).

## Working agreement

- Talk to me in Spanish. Everything in the repository (specs, docs, code, comments, commits) is in English.
- I am a telecommunications engineering student and I want to learn: explain the why of each technique, especially the math and the graphics.
- One stage at a time. Before a stage, explain the approach in a few lines; when there are options, compare them and recommend one. End each stage at its gate: ledger entry in `docs/performance.md`, entries in `docs/ai-usage.md`, summary in `docs/gates/stage-N.md`, and in the chat a short plain-language summary in Spanish (what was done, why, what it does *not* do yet) so I can self-assess. Then stop and wait for an explicit "go".
- Spec first. When reality disagrees with a spec, update the spec in its own commit (`docs(specs): ...`); these commits are counted for H5.
- No invented numbers. Every figure comes from a command recorded next to it, or is marked *pending*.
- Log as you go, not at the end: every task in `docs/ai-usage.md` with its type and result (right first time, corrected by tool, corrected by owner, failed).
- Risky choices: spike, measure against the budget, write an ADR in `docs/adr/`, ask for approval.
- Conventional commits, small and atomic. Run `npm run ci` before every commit.
- **Never add Claude as co-author.** No `Co-Authored-By:` trailer and no "Generated with" line in commits, pull requests or releases. Commits carry only my git identity.
- Dependencies: exact versions, released at least 14 days before installing (check with `npm view <pkg> time`). Licenses MIT, Apache-2.0, BSD, ISC, Zlib, CC0 or CC BY; anything else needs my approval, recorded in an ADR.
- Secrets never go in the repository. The Contentstack management token never reaches the client.
- Contentstack: stack *The Living Book*, **EU region** (`eu-app.contentstack.com`; SDKs and APIs must use the EU endpoints), master language English, Spanish added, environments `production` and `preview`, branch `main`.
- Do not push, create repositories or touch external services (Contentstack, GitHub) without asking.
