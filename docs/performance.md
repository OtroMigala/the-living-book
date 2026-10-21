# Metrics ledger

Append-only: one section per gate, newest last. Every number comes with the command that produced it; a number nobody measured is written as *pending*. A value that gets worse than the previous gate needs a reason in its row (invariant 7 in the playbook).

Budgets: the provisional targets are in [`specs/01-vision.md`](../specs/01-vision.md) (Q01–Q04). Stage 2 replaces them with the budget spec.

## Stage 1 — 2026-10-21

No application yet. This snapshot is the starting point of the repository, the CI and the specs.

| Metric | Value | Budget | How it was measured |
| --- | --- | --- | --- |
| Source model size | 26,054,464 B (24.8 MiB) | none: source file, never shipped | `ls -l assets-src/books_with_magnifier.glb` |
| Source model contents | 13 nodes, 5 meshes, 5 materials, 16 textures (PNG and JPEG), 0 animations | Stage 2 | JSON chunk of the GLB read with Node |
| Source model extensions | `KHR_materials_transmission` | — | same |
| Requirements | 30: Must 25, Should 3, Could 2 (F11 lowered at the gate) | — | `npm run check:specs` |
| Acceptance criteria | 42: planned 38, in progress 4, met 0 | — | `npm run check:specs` |
| Traceability issues | 0 | 0 | `npm run check:specs` |
| Risks open / scored ≥ 6 | 17 / 12 | — | `docs/risks.md` |
| Unit tests | 16 passing, 2 files | all passing | `npx vitest run` |
| Local `npm run ci` wall time | 2,201 ms (median of 3: 2,168 / 2,201 / 2,218) | — | three timed runs, Windows 11, Node 24.18.0 |
| CI on GitHub: wall time and result | pending: repository not on GitHub yet | — | Actions run log |
| Direct devDependencies / installed packages | 4 / 41 | — | `package.json`, `npm ls --all --parseable` |
| `node_modules` size | 150 MB | — | `du -sh node_modules` (mostly the native Biome and TypeScript 7 binaries) |
