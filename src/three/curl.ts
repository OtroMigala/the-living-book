// The shape of a turning page (spike A). Pure math, shared by the CPU variant and mirrored line by
// line in the GLSL of page-mesh.ts, so both draw exactly the same page.
//
// A page is a strip of width w hinged on the spine. Seen from its edge, the cross-section is a
// curve; we follow it with the arc length s ∈ [0, w] from the spine. Its direction at s is the
// unit vector (−cos θ(s), sin θ(s)): at θ = 0 the page lies flat towards −X (the recto, before
// the turn) and at θ = π flat towards +X (after it).
//
// The angle changes linearly along the page: θ(s) = θ₀ − k·s. A constant rate of change of the
// direction means constant curvature, so the page bends into an arc of a circle, and because we
// integrate a unit direction, the arc keeps its length w: paper bends, it does not stretch.
//
//   x(s) = ∫₀ˢ −cos(θ₀ − k·u) du = (sin(θ₀ − k·s) − sin θ₀) / k
//   y(s) = ∫₀ˢ  sin(θ₀ − k·u) du = (cos(θ₀ − k·s) − cos θ₀) / k
//
// For a nearly flat page (small k·w) those formulas subtract two almost equal sines and divide by
// a tiny k, which loses precision, badly so in the GPU's 32-bit floats. There we use the Taylor
// series in k instead, to second order:
//
//   x ≈ −s·cos θ₀ − (k·s²/2)·sin θ₀ + (k²·s³/6)·cos θ₀
//   y ≈  s·sin θ₀ − (k·s²/2)·cos θ₀ − (k²·s³/6)·sin θ₀
//
// whose error is of order k³·s⁴/24: below 10⁻⁸ m for a page this size, so the switch is seamless.
//
// θ₀ = π·p for the turn's progress p ∈ [0, 1]. The bend is k·w = maxBend·sin(π·p): zero when the
// page is flat at both ends, largest halfway. The edge lags behind the spine, as a page does when
// it is flicked over.

export interface CurlPoint {
  x: number;
  y: number;
  /** Unit normal of the page surface at this point (x, y); z is 0 for this bend. */
  nx: number;
  ny: number;
}

/** Below this total bend k·w (radians), use the Taylor series instead of the exact formula. */
export const SERIES_LIMIT = 1e-2;

export function curlAngles(progress: number, maxBend: number, width: number) {
  const theta0 = Math.PI * progress;
  const k = (maxBend * Math.sin(Math.PI * progress)) / width;
  return { theta0, k };
}

/** Position and normal of the point at arc length s from the spine. */
export function curlPoint(s: number, progress: number, maxBend: number, width: number): CurlPoint {
  const { theta0, k } = curlAngles(progress, maxBend, width);
  const theta = theta0 - k * s;
  const c = Math.cos(theta0);
  const sn = Math.sin(theta0);
  let x: number;
  let y: number;
  if (Math.abs(k * width) < SERIES_LIMIT) {
    const a = (k * s * s) / 2;
    const b = (k * k * s * s * s) / 6;
    x = -s * c - a * sn + b * c;
    y = s * sn - a * c - b * sn;
  } else {
    x = (Math.sin(theta) - sn) / k;
    y = (Math.cos(theta) - c) / k;
  }
  // The direction is (−cos θ, sin θ); turning it a quarter turn gives the normal (sin θ, cos θ),
  // which points up (+Y) while the page lies flat at θ = 0.
  return { x, y, nx: Math.sin(theta), ny: Math.cos(theta) };
}
