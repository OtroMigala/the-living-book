/// <reference lib="dom" />
// The 3D view of the book (Stage 4, step 5c): the desk drawn with three.js, and the reader's HTML
// pages laid exactly over the open book's pages (ADR 0008).
//
//   At rest the camera looks straight down, so a page projects to a rectangle: each HTML page is a
//   plain rectangle over its 3D page. The camera moves by a fraction of a pixel so the pages start
//   on the canvas's pixel grid, and the canvas is a whole number of its own pixels.
//   The mouse wheel, a vertical drag on the desk, or ↑ ↓ tilt the book, easing to each new angle
//   (F16). Tilted, each HTML page carries the homography that maps it onto its 3D page as a CSS
//   matrix3d. A browser that draws matrix3d without its perspective is caught by reading back a
//   corner; its pages are then shown as textures painted from the HTML while tilted.
//
// It renders only when something changes (BR2), at the tier's pixel ratio (BR3). Turning pages is
// instant for now; the bending turn comes next (ADR 0007).

import {
  CanvasTexture,
  Color,
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { pageCorners, pageFrame, pageProbe, type Quad, type Side } from '../three/book-pages.ts';
import {
  FALLBACK_PAGES,
  MODEL_PATH,
  PAGE_ANCHORS,
  PAGE_CLASSES,
  PAGE_LIFT,
} from '../three/contract.ts';
import { type Point, rectToQuad, toMatrix3d } from '../three/homography.ts';
import { flatPage } from '../three/page-mesh.ts';
import { paintPageText } from '../three/page-text.ts';
import { pixelRatioFor, tierFor } from '../three/tiers.ts';
import { chooseLayout, type ReaderLayout } from './book.ts';
import type { ReaderView } from './reader.ts';

const FOV = 35;
const MAX_TILT = 40;
/** The tilt covers the share 1 − e^(−Δt/τ) of what is left each frame: fast first, then soft. */
const TILT_EASE_MS = 120;
/** A wheel notch is about 100 px in Chromium: 6.7° per notch, flat to 40° in six notches. */
const DEGREES_PER_WHEEL_PX = 1 / 15;
/** A vertical drag on the desk: 300 px from flat to 40°. */
const DEGREES_PER_DRAG_PX = 2 / 15;
const DEGREES_PER_KEY = 5;
const CORNERS = ['tl', 'tr', 'br', 'bl'] as const;

/** What the browser tests read and drive. */
export interface View3dDebug {
  renders: number;
  tilt: number;
  tiltTarget: number;
  /** Pages shown as textures while tilted, because the browser drew matrix3d without perspective. */
  textures: boolean;
  /** Each visible page's largest distance between an HTML corner and the drawn page's, CSS px. */
  probe(): { side: Side; error: number }[];
  /** Sets the tilt at once, without easing. */
  setTilt(degrees: number): void;
}

declare global {
  interface Window {
    __view3d?: View3dDebug;
  }
}

export interface View3dElements {
  /** The space the book has: the canvas fills it and the HTML pages are placed in it. */
  stage: HTMLElement;
  canvas: HTMLCanvasElement;
  /** Where the HTML pages go, over the canvas. */
  pages: HTMLElement;
  /** Invisible and untransformed: copies of the pages are painted from here. */
  layout: HTMLElement;
}

/** The 3D view, or null when this browser cannot draw it (no WebGL 2, the model would not load). */
export async function createView3d(el: View3dElements, base: string): Promise<ReaderView | null> {
  const device = {
    devicePixelRatio: window.devicePixelRatio,
    coarsePointer: matchMedia('(pointer: coarse)').matches,
    narrow: window.innerWidth < 600,
    saveData: Boolean(
      (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData,
    ),
  };
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas: el.canvas, antialias: tierFor(device) === 'desktop' });
  } catch {
    return null;
  }
  renderer.setPixelRatio(pixelRatioFor(device));

  const scene = new Scene();
  scene.background = new Color('#3b2f2a');
  scene.add(new HemisphereLight(0xfff4e0, 0x2a2018, 1.4));
  const light = new DirectionalLight(0xffffff, 1.6);
  light.position.set(-0.3, 0.8, -0.5);
  scene.add(light);
  const model = await new GLTFLoader()
    .loadAsync(`${base}${MODEL_PATH}`)
    .then((gltf) => gltf.scene)
    .catch(() => null);
  if (!model) {
    renderer.dispose();
    return null;
  }
  scene.add(model);
  model.updateMatrixWorld(true);

  const frames = {
    left: pageFrame(model.getObjectByName(PAGE_ANCHORS.verso), FALLBACK_PAGES.verso, 'left'),
    right: pageFrame(model.getObjectByName(PAGE_ANCHORS.recto), FALLBACK_PAGES.recto, 'right'),
  };
  const corners: Record<Side, Vector3[]> = {
    left: pageCorners(frames.left, 'left'),
    right: pageCorners(frames.right, 'right'),
  };
  // The paper of the two pages; it prints a texture only when the HTML cannot be shown.
  const still = { left: flatPage(corners.left, null), right: flatPage(corners.right, null) };
  for (const side of ['left', 'right'] as const) {
    still[side].uniforms.uShowText.value = 0;
    scene.add(still[side].mesh);
  }
  const probePages = pageProbe(corners);
  const camera = new PerspectiveCamera(FOV, 1, 0.01, 10);

  const debug: View3dDebug = {
    renders: 0,
    tilt: 0,
    tiltTarget: 0,
    textures: false,
    probe: () => [],
    setTilt: () => {},
  };
  window.__view3d = debug;

  let layout: ReaderLayout | null = null;
  let shown: HTMLElement[] = [];
  let size = { width: 0, height: 0 };

  /** The stage's size, rounded down to whole pixels of the canvas (spike B). */
  const stageSize = () => {
    const box = el.stage.getBoundingClientRect();
    const ratio = renderer.getPixelRatio();
    return {
      width: Math.floor(box.width * ratio) / ratio,
      height: Math.floor(box.height * ratio) / ratio,
    };
  };
  const sidesOf = (current: ReaderLayout): Side[] =>
    current.pagesPerView === 2 ? ['left', 'right'] : ['right'];

  const toScreen = (v: Vector3): Point => {
    const p = v.clone().project(camera);
    return [((p.x + 1) / 2) * size.width, ((1 - p.y) / 2) * size.height];
  };

  /** Puts the camera where the pages measure their class size × scale on screen (ADR 0008). */
  const frame = (current: ReaderLayout) => {
    const tanHalf = Math.tan((FOV * Math.PI) / 360);
    const pxPerMetre =
      (PAGE_CLASSES[current.pageClass].height * current.scale) / frames.right.height;
    let distance = size.height / (2 * tanHalf * pxPerMetre);
    const sides = sidesOf(current);
    const centre =
      sides.length === 2
        ? frames.left.centre.clone().add(frames.right.centre).multiplyScalar(0.5)
        : frames.right.centre.clone();
    const target = centre.addScaledVector(frames.right.normal, PAGE_LIFT);
    const tilt = (debug.tilt * Math.PI) / 180;
    const direction = new Vector3(0, Math.cos(tilt), -Math.sin(tilt));
    camera.aspect = size.width / size.height;
    camera.up.set(0, 0, 1); // the top of the page at the top of the screen
    const aim = () => {
      camera.position.copy(target).addScaledVector(direction, distance);
      camera.lookAt(target);
      camera.updateProjectionMatrix();
      // project() reads the world matrices, which three.js refreshes only when it renders.
      camera.updateMatrixWorld();
    };
    aim();
    const right = new Vector3();
    const up = new Vector3();
    /** Moves the camera so the picture moves by (−dx, −dy) CSS px. */
    const shift = (dx: number, dy: number) => {
      const metresPerPx = (2 * distance * tanHalf) / size.height;
      right.setFromMatrixColumn(camera.matrixWorld, 0);
      up.setFromMatrixColumn(camera.matrixWorld, 1);
      target.addScaledVector(right, dx * metresPerPx).addScaledVector(up, -dy * metresPerPx);
      aim();
    };
    if (tilt === 0) {
      // Flat, the first page starts on a pixel of the canvas: the HTML needs no rounding.
      const ratio = renderer.getPixelRatio();
      const [x, y] = toScreen(corners[sides[0] ?? 'right'][0] as Vector3);
      shift(x - Math.round(x * ratio) / ratio, y - Math.round(y * ratio) / ratio);
      return;
    }
    // Tilted, the near edge is larger than the far one: step back and re-centre until every
    // corner is inside the margins (perspective is not linear, hence a few rounds).
    for (let step = 0; step < 6; step++) {
      const points = sides.flatMap((side) => corners[side].map(toScreen));
      const xs = points.map((p) => p[0]);
      const ys = points.map((p) => p[1]);
      const grow = Math.max(
        1,
        (Math.max(...xs) - Math.min(...xs)) / (size.width - 16),
        (Math.max(...ys) - Math.min(...ys)) / (size.height - 16),
      );
      const dx = (Math.min(...xs) + Math.max(...xs) - size.width) / 2;
      const dy = (Math.min(...ys) + Math.max(...ys) - size.height) / 2;
      if (grow < 1.0001 && Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) break;
      shift(dx, dy);
      distance *= grow;
      aim();
    }
  };

  /** Lays each HTML page over its 3D page: a rectangle flat, a projective map tilted. */
  const place = (current: ReaderLayout) => {
    const { width: w, height: h } = PAGE_CLASSES[current.pageClass];
    const dpr = window.devicePixelRatio;
    const snap = (v: number) => Math.round(v * dpr) / dpr;
    sidesOf(current).forEach((side, i) => {
      const page = shown[i];
      if (!page) return;
      const quad = corners[side].map(toScreen) as Quad;
      if (debug.tilt === 0) {
        const cx = (quad[0][0] + quad[2][0]) / 2;
        const cy = (quad[0][1] + quad[2][1]) / 2;
        page.style.left = `${snap(cx - (w * current.scale) / 2)}px`;
        page.style.top = `${snap(cy - (h * current.scale) / 2)}px`;
        page.style.transform = current.scale === 1 ? '' : `scale(${current.scale})`;
      } else {
        page.style.left = '0px';
        page.style.top = '0px';
        page.style.transform = toMatrix3d(rectToQuad(w, h, quad));
      }
    });
  };

  /**
   * ADR 0008, point 4: does this browser draw a tilted page where the 3D page is? One corner of the
   * first page, read back, must be within 2 px. If not, the pages are painted into textures, shown
   * by the 3D pages, and the HTML stays in place for screen readers but is not drawn.
   */
  const checkTilted = (current: ReaderLayout) => {
    const page = shown[0];
    const side = sidesOf(current)[0] ?? 'right';
    const marker = page?.querySelector('[data-corner="br"]')?.getBoundingClientRect();
    const stage = el.stage.getBoundingClientRect();
    const expected = toScreen(corners[side][2] as Vector3);
    const off =
      marker === undefined
        ? 0
        : Math.hypot(marker.left - stage.left - expected[0], marker.top - stage.top - expected[1]);
    const textures = debug.tilt > 0 && off > 2;
    if (textures !== debug.textures) {
      debug.textures = textures;
      if (textures) paintShown(current);
      for (const s of ['left', 'right'] as const)
        still[s].uniforms.uShowText.value = textures ? 1 : 0;
      el.pages.style.opacity = textures ? '0' : '';
    }
  };

  /** Paints the shown pages from untransformed copies, onto the 3D pages under them. */
  const paintShown = (current: ReaderLayout) => {
    const { width, height } = PAGE_CLASSES[current.pageClass];
    sidesOf(current).forEach((side, i) => {
      const page = shown[i];
      if (!page) return;
      const copy = page.cloneNode(true) as HTMLElement;
      copy.removeAttribute('style');
      el.layout.replaceChildren(copy);
      const canvas = document.createElement('canvas');
      paintPageText(copy, canvas, width, height, renderer.getPixelRatio());
      still[side].uniforms.uFront.value?.dispose();
      still[side].uniforms.uFront.value = new CanvasTexture(canvas);
    });
    el.layout.replaceChildren();
  };

  const render = () => {
    renderer.render(scene, camera);
    debug.renders++;
  };

  /** Frames, places and draws the current pages for the current size and tilt. */
  const update = () => {
    if (!layout) return;
    const next = stageSize();
    if (next.width !== size.width || next.height !== size.height) {
      size = next;
      renderer.setSize(size.width, size.height, true);
    }
    frame(layout);
    place(layout);
    render();
    checkTilted(layout);
    if (debug.textures) render();
  };

  // F16: the tilt eases to its target; with reduced motion it changes at once (Q05 AC3).
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let easing = false;
  const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));
  const ease = async () => {
    easing = true;
    let last = await nextFrame();
    for (;;) {
      const now = await nextFrame();
      const gap = debug.tiltTarget - debug.tilt;
      if (Math.abs(gap) < 0.05) break;
      debug.tilt += gap * (1 - Math.exp(-(now - last) / TILT_EASE_MS));
      last = now;
      update();
    }
    debug.tilt = debug.tiltTarget;
    update();
    easing = false;
  };
  const tiltTo = (degrees: number) => {
    debug.tiltTarget = Math.min(MAX_TILT, Math.max(0, degrees));
    if (reducedMotion.matches) {
      debug.tilt = debug.tiltTarget;
      update();
    } else if (!easing) void ease();
  };
  debug.setTilt = (degrees) => {
    debug.tiltTarget = Math.min(MAX_TILT, Math.max(0, degrees));
    debug.tilt = debug.tiltTarget;
    update();
  };
  el.stage.addEventListener(
    'wheel',
    (event) => {
      if (event.ctrlKey) return; // Ctrl + wheel is the browser's zoom
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? size.height : 1;
      tiltTo(debug.tiltTarget + event.deltaY * unit * DEGREES_PER_WHEEL_PX);
    },
    { passive: false },
  );
  let dragY: number | null = null;
  el.canvas.addEventListener('pointerdown', (event) => {
    dragY = event.clientY;
    el.canvas.setPointerCapture(event.pointerId);
  });
  el.canvas.addEventListener('pointermove', (event) => {
    if (dragY === null) return;
    tiltTo(debug.tiltTarget + (event.clientY - dragY) * DEGREES_PER_DRAG_PX);
    dragY = event.clientY;
  });
  for (const type of ['pointerup', 'pointercancel'] as const) {
    el.canvas.addEventListener(type, () => {
      dragY = null;
    });
  }
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if ((event.target as HTMLElement).closest('input, select, textarea')) return;
    event.preventDefault();
    tiltTo(debug.tiltTarget + (event.key === 'ArrowDown' ? DEGREES_PER_KEY : -DEGREES_PER_KEY));
  });

  debug.probe = () => {
    if (!layout) return [];
    const drawn = probePages(renderer, camera, el.canvas);
    const stage = el.stage.getBoundingClientRect();
    return sidesOf(layout).flatMap((side, i) => {
      const page = shown[i];
      const quad = drawn[side];
      if (!page || !quad) return [];
      const errors = CORNERS.map((corner, k) => {
        const r = page.querySelector(`[data-corner="${corner}"]`)?.getBoundingClientRect();
        const q = quad[k];
        return r && q
          ? Math.hypot(r.left - stage.left - q[0], r.top - stage.top - q[1])
          : Number.NaN;
      });
      return [{ side, error: Math.round(Math.max(...errors) * 100) / 100 }];
    });
  };

  return {
    mode: '3d',
    element: el.stage,
    chooseLayout() {
      const { width, height } = stageSize();
      return chooseLayout(width, height);
    },
    show(pages, current) {
      for (const page of pages) {
        if (page.querySelector('[data-corner]')) continue;
        for (const corner of CORNERS) {
          const marker = document.createElement('i');
          marker.className = 'corner';
          marker.dataset.corner = corner;
          page.append(marker);
        }
      }
      shown = pages;
      layout = current;
      el.pages.replaceChildren(...pages);
      if (debug.textures) paintShown(current);
      update();
    },
  };
}
