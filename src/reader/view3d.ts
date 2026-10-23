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
// It renders only when something changes (BR2), at the tier's pixel ratio (BR3). A page turns as
// a sheet that bends on the GPU (ADR 0007), its text painted from the HTML while it moves.

import {
  CanvasTexture,
  Color,
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  type ShaderMaterial,
  Vector3,
  WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { pageCorners, pageFrame, pageProbe, type Quad, type Side } from '../three/book-pages.ts';
import {
  FALLBACK_PAGES,
  MODEL_PATHS,
  PAGE_ANCHORS,
  PAGE_CLASSES,
  PAGE_LIFT,
} from '../three/contract.ts';
import { readDevice } from '../three/device.ts';
import { type Point, rectToQuad, toMatrix3d } from '../three/homography.ts';
import { flatPage, turningPage } from '../three/page-mesh.ts';
import { paintPageText } from '../three/page-text.ts';
import { FRAME_BUDGET_MS, pixelRatioFor, tierFor } from '../three/tiers.ts';
import { chooseLayout, type ReaderLayout } from './book.ts';
import { remainingMs } from './gesture.ts';
import type { ReaderView } from './reader.ts';
import { SlowFrames } from './slow-frames.ts';

const FOV = 35;
const MAX_TILT = 40;
/** The tilt covers the share 1 − e^(−Δt/τ) of what is left each frame: fast first, then soft. */
const TILT_EASE_MS = 120;
/** A wheel notch is about 100 px in Chromium: 6.7° per notch, flat to 40° in six notches. */
const DEGREES_PER_WHEEL_PX = 1 / 15;
/** A vertical drag on the desk: 300 px from flat to 40°. */
const DEGREES_PER_DRAG_PX = 2 / 15;
const DEGREES_PER_KEY = 5;
/** A page turn lasts this long, as a flicked page does (spike A). */
const TURN_MS = 900;
const CORNERS = ['tl', 'tr', 'br', 'bl'] as const;

/** Ends the current task, so the browser can paint and handle input before what follows. */
const nextTask = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

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
  /** Shader programs three.js holds: all compiled at the start, none added by a turn. */
  programs(): number;
  /** Draw calls and triangles of the last frame, and the most of any frame so far (BR4, BR5). */
  frame: { calls: number; triangles: number; maxCalls: number; maxTriangles: number };
  /** A page is turning: the HTML is hidden and the pages are textures. */
  turning: boolean;
  /** The last turn: frames, frame time percentiles (BR1) and the time to paint its textures, ms. */
  lastTurn: {
    direction: 'forward' | 'backward';
    /** False when a drag was let go before halfway and the page fell back. */
    completed: boolean;
    frames: number;
    p50: number;
    p95: number;
    max: number;
    paintMs: number;
  } | null;
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

export interface View3dOptions {
  /** Called once if the browser takes the GPU context away (F09 AC1): the page goes on in 2D. */
  onContextLost?(): void;
  /** Called once if the turns and tilts run slower than the tier's frame budget (F09 AC3). */
  onSlow?(): void;
  /** The model's bytes as they arrive, with the path it is loaded from (F15 AC2). */
  onModelProgress?(path: string, loaded: number): void;
}

/** The 3D view, or null when this browser cannot draw it (no WebGL 2, the model would not load). */
export async function createView3d(
  el: View3dElements,
  base: string,
  options: View3dOptions = {},
): Promise<ReaderView | null> {
  // Called as soon as this module and three.js are evaluated, in the same task: creating the
  // WebGL context goes into a task of its own, so neither makes a long one (BL3).
  await nextTask();
  const device = readDevice();
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
  const modelPath = `${base}${MODEL_PATHS[tierFor(device)]}`;
  const model = await new GLTFLoader()
    .loadAsync(modelPath, (event) => options.onModelProgress?.(modelPath, event.loaded))
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
    programs: () => renderer.info.programs?.length ?? 0,
    frame: { calls: 0, triangles: 0, maxCalls: 0, maxTriangles: 0 },
    turning: false,
    lastTurn: null,
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

  // No ink: what a blank page, or the back of a single page, prints.
  const blankCanvas = document.createElement('canvas');
  blankCanvas.width = 1;
  blankCanvas.height = 1;
  const blank = new CanvasTexture(blankCanvas);

  /** A page's text as a texture, painted from an untransformed copy of its HTML (page-text.ts). */
  const paint = (page: HTMLElement | null, current: ReaderLayout) => {
    if (!page || page.classList.contains('blank')) return blank;
    const { width, height } = PAGE_CLASSES[current.pageClass];
    const copy = page.cloneNode(true) as HTMLElement;
    copy.removeAttribute('style');
    el.layout.replaceChildren(copy);
    const canvas = document.createElement('canvas');
    paintPageText(copy, canvas, width, height, renderer.getPixelRatio());
    el.layout.replaceChildren();
    return new CanvasTexture(canvas);
  };
  const setStill = (side: Side, texture: CanvasTexture) => {
    const old = still[side].uniforms.uFront.value;
    if (old && old !== blank && old !== texture) old.dispose();
    still[side].uniforms.uFront.value = texture;
  };

  /** Paints the shown pages onto the 3D pages under them. */
  const paintShown = (current: ReaderLayout) => {
    sidesOf(current).forEach((side, i) => {
      setStill(side, paint(shown[i] ?? null, current));
    });
  };

  const render = () => {
    renderer.render(scene, camera);
    debug.renders++;
    const { calls, triangles } = renderer.info.render;
    debug.frame = {
      calls,
      triangles,
      maxCalls: Math.max(debug.frame.maxCalls, calls),
      maxTriangles: Math.max(debug.frame.maxTriangles, triangles),
    };
  };

  /** Frames, places and draws the current pages for the current size and tilt. */
  // Off while another view shows the book: no input, no drawing.
  let active = true;
  const update = () => {
    if (!layout || !active) return;
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
  // F09 AC3: every animated frame is timed; if they run slower than the tier's budget, the page
  // offers flat pages, once.
  const slowFrames = new SlowFrames(FRAME_BUDGET_MS[tierFor(device)]);
  let slowSaid = false;
  const timeFrame = (ms: number) => {
    if (slowSaid || !slowFrames.add(ms)) return;
    slowSaid = true;
    options.onSlow?.();
  };
  const ease = async () => {
    easing = true;
    let last = await nextFrame();
    for (;;) {
      const now = await nextFrame();
      timeFrame(now - last);
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
      if (!active || event.ctrlKey) return; // Ctrl + wheel is the browser's zoom
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? size.height : 1;
      tiltTo(debug.tiltTarget + event.deltaY * unit * DEGREES_PER_WHEEL_PX);
    },
    { passive: false },
  );
  let dragY: number | null = null;
  el.canvas.addEventListener('pointerdown', (event) => {
    if (!active) return;
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
    if (!active || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
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

  /**
   * Starts a turn (ADR 0007): the HTML is hidden, and in the same frame every face that shows
   * during the turn is a texture painted from the HTML: the page left behind, both sides of the
   * sheet, and the page it uncovers. Forward, the sheet is the right page and lands on the left;
   * back, it is the left page and lands on the right, bent the other way so its edge trails. A
   * drag moves the sheet with set(); end() finishes from where it was let go, or brings it back.
   * With reduced motion the finish is not animated (Q05 AC3).
   */
  const beginTurn = (
    from: HTMLElement[],
    to: HTMLElement[],
    step: 1 | -1,
    current: ReaderLayout,
  ) => {
    const spread = current.pagesPerView === 2;
    const forward = step > 0;
    const rightOf = (pages: HTMLElement[]) => pages[spread ? 1 : 0] ?? null;
    const leftOf = (pages: HTMLElement[]) => (spread ? (pages[0] ?? null) : null);
    const started = performance.now();
    const front = paint(forward ? rightOf(from) : rightOf(to), current);
    const back = spread ? paint(forward ? leftOf(to) : leftOf(from), current) : blank;
    setStill('left', paint(forward ? leftOf(from) : leftOf(to), current));
    setStill('right', paint(forward ? rightOf(to) : rightOf(from), current));
    const paintMs = performance.now() - started;

    const sheet = turningPage('gpu', 48, 1, { front, back }, forward ? 'forward' : 'backward');
    scene.add(sheet.mesh);
    for (const side of ['left', 'right'] as const) still[side].uniforms.uShowText.value = 1;
    el.pages.style.visibility = 'hidden';
    debug.turning = true;

    let progress = 0;
    const times: number[] = [];
    /** Puts the sheet at a turn's progress (0 to 1, in the turn's direction) and draws it. */
    const set = (p: number) => {
      progress = p;
      sheet.setProgress(forward ? p : 1 - p);
      render();
    };
    set(0);
    const animate = async (target: number, ms: number, easing: (t: number) => number) => {
      const origin = progress;
      let last = await nextFrame();
      const start = last;
      for (let t = 0; t < 1; ) {
        const now = await nextFrame();
        times.push(now - last);
        timeFrame(now - last);
        last = now;
        t = ms > 0 ? Math.min(1, (now - start) / ms) : 1;
        set(origin + (target - origin) * easing(t));
      }
    };
    /** Lands the sheet (complete) or brings it back, then removes it. `whole`: a full turn. */
    const finish = async (complete: boolean, whole = false) => {
      const target = complete ? 1 : 0;
      if (reducedMotion.matches) set(target);
      else if (whole) await animate(target, TURN_MS, (t) => 0.5 - 0.5 * Math.cos(Math.PI * t));
      else await animate(target, remainingMs(progress, complete, TURN_MS), (t) => 1 - (1 - t) ** 2);
      // Landed, the page under the sheet now shows what the sheet showed.
      if (complete && forward && spread) setStill('left', back);
      if (complete && !forward) setStill('right', front);
      scene.remove(sheet.mesh);
      sheet.mesh.geometry.dispose();
      (sheet.mesh.material as ShaderMaterial).dispose();
      const kept = complete ? (forward ? back : front) : null;
      for (const texture of [front, back]) {
        if (texture !== blank && texture !== kept) texture.dispose();
      }
      debug.turning = false;
      const sorted = [...times].sort((a, b) => a - b);
      const at = (q: number) =>
        Math.round(
          (sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0) * 100,
        ) / 100;
      debug.lastTurn = {
        direction: forward ? 'forward' : 'backward',
        completed: complete,
        frames: times.length,
        p50: at(0.5),
        p95: at(0.95),
        max: times.length > 0 ? Math.round(Math.max(...times) * 100) / 100 : 0,
        paintMs: Math.round(paintMs * 10) / 10,
      };
    };
    return { set, end: (complete: boolean) => finish(complete), finish };
  };

  // Every shader the reader draws with, compiled before it is shown, and off the main thread
  // where the browser can (KHR_parallel_shader_compile). Left to the first render, compiling held
  // the main thread for 99–142 ms at Lighthouse's 4× slowdown. Without that extension, as with
  // SwiftShader on the CI runner and on the Pova 6 (/diagnostics/), three.js cannot tell when a
  // program is linked and does not wait; the GPU process links it meanwhile, and the first render
  // with SwiftShader then took about 9 ms (spike 6c). The turning sheet has the still pages'
  // shaders, so it draws with their program, kept while they are.
  await renderer.compileAsync(scene, camera);

  // F09 AC1: the browser can take the GPU context away (memory pressure, a driver reset). Nothing
  // more can be drawn, so the 3D view stops and the page goes on with flat pages, at the same
  // place. The 3D view stays off until the page is loaded again.
  el.canvas.addEventListener(
    'webglcontextlost',
    () => {
      active = false;
      options.onContextLost?.();
    },
    { once: true },
  );

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
      // After a turn the pages were textures: the HTML takes over again, in the same frame.
      el.pages.style.visibility = '';
      if (debug.textures) paintShown(current);
      for (const side of ['left', 'right'] as const) {
        still[side].uniforms.uShowText.value = debug.textures ? 1 : 0;
      }
      update();
    },

    beginTurn: (from, to, step, current) => beginTurn(from, to, step, current),

    setActive(on) {
      active = on;
    },

    /** A turn from the buttons or the keys: the whole way, easing in and out. */
    async turn(from, to, step, current) {
      if (reducedMotion.matches) return;
      await beginTurn(from, to, step, current).finish(true, true);
    },
  };
}
