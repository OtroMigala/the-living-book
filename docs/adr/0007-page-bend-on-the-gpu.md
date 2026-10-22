# ADR 0007 — Bend the turning page on the GPU

- **Status:** proposed after spike A (waiting for the owner's approval)
- **Date:** 2026-10-22
- **Stage:** 4, step 2
- **Evidence:** [spike A report](../spikes/A-page-turn.md), measured by the owner on both reference devices

## Context

A turning page must bend like paper (F02) without missing the frame budget BR1 (p95 ≤ 33.3 ms on the phone, ≤ 16.7 ms on the desktop) on an entry-level phone GPU (risk R01). Spike A measured three ways of turning a page with the same shape (an arc that does not stretch): bent in the vertex shader, bent in JavaScript, and rigid. The decision criteria were written in the spike report before the numbers came in.

## Measurements (owner's devices, 2026-10-22)

| Case | Pova 6: frame p95 | Pova 6: main thread p95 | PC: frame p95 | PC: main thread p95 | PC: GPU p95 |
| --- | --- | --- | --- | --- | --- |
| GPU bend, 48 × 1 | 11.2 ms | 1.3 ms | 5.1 ms | 0.2 ms | 0.09 ms |
| CPU bend, 48 × 1 | 11.2 ms | 1.5 ms | 5.1 ms | 0.2 ms | 0.10 ms |
| Rigid, 48 × 1 | 11.2 ms | 1.4 ms | 5.1 ms | 0.2 ms | 0.09 ms |
| GPU bend, 96 × 64 | 11.2 ms | 1.2 ms | 5.1 ms | 0.2 ms | 0.10 ms |
| CPU bend, 96 × 64 | 11.2 ms | **4.6 ms** | 5.2 ms | 1.1 ms | 0.12 ms |

The phone ran at its display's 90 Hz (11.1 ms per frame) with no dropped frame in 328 per case; the PC at 200 Hz. Both GPU and CPU variants drew identical pixels at mid-turn (0% different). Android Chrome does not expose GPU timer queries, so the phone's GPU time is only known to fit in the 11.1 ms frame.

## Decision

**The vertex shader bends the page** (`page-mesh.ts`, variant `gpu`). The grid starts at 48 × 1 cells, enough for this bend.

Against the criteria set beforehand:

1. Every variant qualifies on both devices, far inside BR1: 11.2 ms p95 against 33.3 ms on the phone.
2. The GPU bend uses the least main-thread time on the phone (1.2–1.3 ms), and its cost does not grow with the grid: a 96 × 64 page costs the same as a 48 × 1 one. On the CPU the dense page costs 4.6 ms per frame, 3.8 times more, time that spike B needs for keeping the HTML text aligned with the page.
3. Rigid turning is not needed as a performance fallback. Reduced motion is a different case: pages change without animation (Q05 AC3).

**Rejected:** bending on the CPU. It qualifies today, but it spends the phone's main thread in proportion to the mesh and uploads every vertex each frame.

## Consequences

- R01 (bending too slow on a mid-range phone) is retired with this evidence.
- A corner drag that bends the page along the spine too (a denser grid) is affordable on the GPU, as the 96 × 64 case shows.
- The measurements used the placeholder scene, without page textures or the real model's textures. Stage 6 and 7 measure again with the real content (Q03 AC1).
- The phone held 90 frames per second with a large margin. This suggests BR1's 33.3 ms for the phone could be tightened; that is a budget change for the owner to decide at the Stage 4 gate, not here.
