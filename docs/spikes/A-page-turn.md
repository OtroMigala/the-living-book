# Spike A — Bending a page as it turns

- **Stage:** 4, step 2. **Risk:** R01 (deforming a page is too slow on a mid-range phone). **Requirements:** F02, Q03 (BR1, BR2).
- **Status:** bench built and verified; **waiting for the measurements on the reference devices**.
- **Bench:** `/lab/turn/` (code: `src/three/curl.ts`, `src/three/page-mesh.ts`, `src/three/turn-lab.ts`).

## Question

Can the reference phone (Tecno Pova 6, Mali-G57 MC2) turn a page that bends like paper within the runtime budget (BR1: frame time p95 ≤ 33.3 ms on the phone, ≤ 16.7 ms on the desktop), and which way of bending costs least?

## The shape

One formula for every variant (`curl.ts`, 6 unit tests). The page's cross-section is an arc whose angle changes linearly from the spine, θ(s) = θ₀ − k·s, so it bends without stretching: its length stays the page width (tested to 10⁻⁴). θ₀ = π·progress turns it over; the bend k·w = 1.2·sin(π·progress) is zero at both ends and largest halfway, with the edge lagging behind as when a page is flicked. Near k = 0 a second-order Taylor series replaces the exact formula, which would divide by a tiny number and lose precision in the GPU's 32-bit floats (error below 10⁻⁸ m, tested).

## Variants

| Variant | Who bends the page | Per-frame work |
| --- | --- | --- |
| GPU | The vertex shader, from one number (the progress) | One uniform |
| CPU | JavaScript recomputes every vertex and normal | All vertices, uploaded to the GPU each frame |
| Rigid | Nobody: the page rotates flat on its spine | One uniform; the fallback for the lowest tier |

Each is measured with a light grid (48 × 1 cells: enough for this bend, which only curves across the page) and the GPU and CPU variants also with a dense grid (96 × 64), as a page that bends along the spine too (a corner drag) would need.

A browser test renders the GPU and CPU variants at mid-turn and compares their pixels: under 1% may differ, which proves the GLSL and the TypeScript copies of the formula agree.

## Method

The bench turns the page 4 times per case (0.9 s per turn, after 10 warm-up frames) on a canvas filling the screen, at the tier's pixel ratio, with the placeholder desk behind. Per frame it records the time between animation frames (what the reader feels), the main-thread time of our update plus handing the frame to WebGL, and, when the browser offers timer queries, the GPU time. It reports p50, p95, max and dropped frames (longer than 1.5 × the median).

## Results

### In the test browser (not a measurement of the reference devices)

Playwright's Chromium renders with **SwiftShader, a software renderer**, both locally and in CI, so its frame times say nothing about the RX 9060 XT or the Mali-G57. Recorded only to show the bench works and how the CPU cost scales (`npm run e2e`, 1 turn per case, 2026-10-22, on the owner's PC):

| Case | CPU time p95, desktop profile | CPU time p95, phone profile |
| --- | --- | --- |
| GPU 48 × 1 | 0.5 ms | 0.5 ms |
| CPU 48 × 1 | 0.3 ms | 0.4 ms |
| Rigid 48 × 1 | 0.8 ms | 0.4 ms |
| GPU 96 × 64 | 0.4 ms | 0.4 ms |
| CPU 96 × 64 | 2.6 ms | 2.5 ms |

Already visible: bending on the CPU costs main-thread time in proportion to the vertices (6,305 in the dense grid), time the page will also need to keep the HTML text aligned (spike B). On the GPU the cost does not depend on the grid.

### On the reference devices

Pending: the owner opens `/lab/turn/` on the Tecno Pova 6 (Chrome) and on the PC (Chrome, RX 9060 XT), presses *Run the test*, and pastes the result.

## Decision criteria (set before the numbers, so they cannot be bent to fit)

1. A variant qualifies only if its frame time p95 is within BR1 on the reference device: ≤ 33.3 ms on the phone, ≤ 16.7 ms on the desktop.
2. Among the qualifying ones, prefer the lowest main-thread time, because spike B will need that time to keep the DOM text aligned with the page.
3. Rigid is the fallback for the lowest tier only if the bent variants fail on the phone.

The decision goes into an ADR once the numbers are in.
