/// <reference lib="dom" />
// The open book's two pages in the scene, shared by the reader's 3D view and the spike B bench:
// where each page is (from its anchor, spec 03), its corners in the reader's order, and the pixel
// probe that finds those corners in what WebGL actually drew (F03 AC2).

import {
  BufferGeometry,
  type Camera,
  Color,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  Scene,
  Vector2,
  Vector3,
  type WebGLRenderer,
  WebGLRenderTarget,
} from 'three';
import { PAGE_LIFT, type PageRect } from './contract.ts';
import type { Point } from './homography.ts';

export type Side = 'left' | 'right';
export type Quad = [Point, Point, Point, Point];

/** A page of the open book in scene coordinates: where it is and which way it faces. */
export interface PageFrame {
  centre: Vector3;
  /** Unit vector from the spine to the outer edge. */
  out: Vector3;
  /** Unit vector towards the page's top edge. */
  top: Vector3;
  normal: Vector3;
  width: number;
  height: number;
}

export function pageFrame(anchor: Object3D | undefined, fallback: PageRect, side: Side): PageFrame {
  const { width_m: width, height_m: height } = anchor?.userData ?? {};
  if (anchor && typeof width === 'number' && typeof height === 'number') {
    const z = new Vector3().setFromMatrixColumn(anchor.matrixWorld, 2).normalize();
    return {
      centre: new Vector3().setFromMatrixPosition(anchor.matrixWorld),
      out: new Vector3().setFromMatrixColumn(anchor.matrixWorld, 0).normalize(),
      // Spec 03: every page's top edge is towards scene +Z; the anchor's own Z may point either way.
      top: z.z >= 0 ? z : z.negate(),
      normal: new Vector3().setFromMatrixColumn(anchor.matrixWorld, 1).normalize(),
      width,
      height,
    };
  }
  return {
    centre: new Vector3(...fallback.centre),
    out: new Vector3(side === 'left' ? 1 : -1, 0, 0),
    top: new Vector3(0, 0, 1),
    normal: new Vector3(0, 1, 0),
    width: fallback.width,
    height: fallback.height,
  };
}

/** The page's corners as the reader sees them (top-left, top-right, bottom-right, bottom-left),
 *  on the plane our pages are drawn in, just above the model's page surface. */
export function pageCorners(f: PageFrame, side: Side): Vector3[] {
  const at = (out: number, top: number) =>
    f.centre
      .clone()
      .addScaledVector(f.out, (out * f.width) / 2)
      .addScaledVector(f.top, (top * f.height) / 2)
      .addScaledVector(f.normal, PAGE_LIFT);
  // On the left page the outer edge is on the reader's left; on the right page, the spine is.
  return side === 'left'
    ? [at(1, 1), at(-1, 1), at(-1, -1), at(1, -1)]
    : [at(-1, 1), at(1, 1), at(1, -1), at(-1, -1)];
}

/** Corners of each coloured page in the probe image, from the extremes of x + y and x − y. */
function extremes() {
  let minSum: Point | null = null;
  let maxSum: Point | null = null;
  let minDiff: Point | null = null;
  let maxDiff: Point | null = null;
  return {
    add(x: number, y: number) {
      if (!minSum || x + y < minSum[0] + minSum[1]) minSum = [x, y];
      if (!maxSum || x + y > maxSum[0] + maxSum[1]) maxSum = [x, y];
      if (!minDiff || x - y < minDiff[0] - minDiff[1]) minDiff = [x, y];
      if (!maxDiff || x - y > maxDiff[0] - maxDiff[1]) maxDiff = [x, y];
    },
    /** Pixel (x, y) covers [x, x + 1) × [y, y + 1): the outer corner of each extreme pixel. */
    quad(sx: number, sy: number): Quad | null {
      const [tl, tr, br, bl] = [minSum, maxDiff, maxSum, minDiff];
      if (!tl || !tr || !br || !bl) return null;
      return [
        [tl[0] * sx, tl[1] * sy],
        [(tr[0] + 1) * sx, tr[1] * sy],
        [(br[0] + 1) * sx, (br[1] + 1) * sy],
        [bl[0] * sx, (bl[1] + 1) * sy],
      ];
    },
  };
}

/**
 * The pixel probe: draws only the two pages, in flat colours, off screen at the canvas's own
 * resolution, and finds their corners in the pixels, in CSS px of the canvas. It checks the whole
 * chain (projection, canvas size, pixel ratio) against what the reader really sees.
 */
export function pageProbe(corners: Record<Side, Vector3[]>) {
  const scene = new Scene();
  scene.background = new Color(0x000000);
  for (const [side, color] of [
    ['left', 0xff0000],
    ['right', 0x00ff00],
  ] as const) {
    const geometry = new BufferGeometry().setFromPoints(corners[side]);
    geometry.setIndex([3, 2, 1, 3, 1, 0]);
    scene.add(new Mesh(geometry, new MeshBasicMaterial({ color, side: DoubleSide })));
  }
  return (renderer: WebGLRenderer, camera: Camera, canvas: HTMLCanvasElement) => {
    const size = renderer.getDrawingBufferSize(new Vector2());
    const target = new WebGLRenderTarget(size.x, size.y);
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    const pixels = new Uint8Array(size.x * size.y * 4);
    renderer.readRenderTargetPixels(target, 0, 0, size.x, size.y, pixels);
    renderer.setRenderTarget(null);
    target.dispose();
    const found = { left: extremes(), right: extremes() };
    for (let row = 0; row < size.y; row++) {
      const y = size.y - 1 - row; // WebGL rows run bottom-up
      for (let x = 0; x < size.x; x++) {
        const i = (row * size.x + x) * 4;
        if ((pixels[i] ?? 0) > 127) found.left.add(x, y);
        else if ((pixels[i + 1] ?? 0) > 127) found.right.add(x, y);
      }
    }
    // The browser stretches the drawing buffer over the canvas's CSS box: use that ratio.
    const box = canvas.getBoundingClientRect(); // clientWidth would round to whole CSS px
    const sx = box.width / size.x;
    const sy = box.height / size.y;
    return { left: found.left.quad(sx, sy), right: found.right.quad(sx, sy) };
  };
}
