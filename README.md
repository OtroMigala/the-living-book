# The Living Book

A 3D book you read in the browser. Its pages are real HTML, its content lives in Contentstack, and when 3D cannot run it becomes a 2D flip book or a plain article. See the [vision spec](specs/01-vision.md).

It is also the pilot project for a development workflow ([`workflow-playbook-v0.md`](workflow-playbook-v0.md)): every stage ends at a gate with measured evidence.

**Status:** Stage 1 of 8 (requirements and success metrics), waiting for its [gate](docs/gates/stage-1.md). There is no application yet.

## Run the checks

Node 24 or later.

```sh
npm ci
npm run ci
```

`npm run ci` runs format and lint (Biome), types (TypeScript), unit tests (Vitest), the spec traceability check and the exact-version check, the same steps as [CI](.github/workflows/ci.yml).

## Where things are

| Path | Contents |
| --- | --- |
| `specs/` | What we build: vision and requirements, traceability |
| `docs/gates/` | One summary per stage gate |
| `docs/adr/` | Architecture decision records |
| `docs/risks.md` | Risk register |
| `docs/performance.md` | Metrics ledger, one entry per gate |
| `docs/ai-usage.md` | What the AI assistant did and what was corrected |
| `tools/` | Repository checks (spec traceability, exact versions) |
| `assets-src/` | Source assets, not shipped as they are |

Credits: [`CREDITS.md`](CREDITS.md).
