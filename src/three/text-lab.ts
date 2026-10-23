/// <reference lib="dom" />
// Spike B bench (Stage 4, step 3): real HTML text on the 3D page (docs/spikes/B-page-text.md).
//
// Two ways to lay an HTML page on a 3D page:
//   flat    (B) the camera looks straight down; the HTML page is a plain rectangle over the 3D page
//   tilted  (A) the camera looks at an angle; the HTML page gets a matrix3d that maps it onto the
//               four projected corners of the 3D page (homography.ts)
// While a page turns, the 3D pages show textures painted from the same HTML (page-text.ts), and
// the HTML is hidden; at rest the HTML is back.
//
// It measures how well the HTML lines up with the 3D page in the real pixels (the alignment probe),
// the size the text is drawn at, the cost of the textures, and the frame times of a turn. Results
// go to window.__text; window.__textLab lets the browser tests drive the bench.

import {
  CanvasTexture,
  Color,
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  type ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  type PageFrame,
  pageCorners,
  pageFrame,
  pageProbe,
  type Quad,
  type Side,
} from './book-pages.ts';
import {
  FALLBACK_PAGES,
  MODEL_PATHS,
  PAGE_ANCHORS,
  PAGE_CLASSES,
  PAGE_LIFT,
  type PageClass,
} from './contract.ts';
import { type Point, rectToQuad, toMatrix3d, verticalScale } from './homography.ts';
import { flatPage, turningPage } from './page-mesh.ts';
import { paintPageText } from './page-text.ts';
import { pixelRatioFor, tierFor } from './tiers.ts';

export type View = 'flat' | 'tilted';
export type TextMode = 'html' | 'texture';

/** Space kept around the book at rest, CSS px. */
const MARGIN = 8;
/** Below this scale the spread's body text would be under 14.4 px: one compact page instead. */
const MIN_SPREAD_SCALE = 0.9;
/** Vertical field of view, degrees: 35 is a normal lens; smaller is a longer lens, farther away. */
const FOV = 35;
const TURN_MS = 900;
/** Two spreads: pages 1 and 2, then 3 and 4. Turning page 2 over shows page 3 on its back. */
const PAGES = 4;
const CORNERS = ['tl', 'tr', 'br', 'bl'] as const;

// F16 (ADR 0008): tilting the book. The angle eases towards its target: each frame it covers the
// share 1 − e^(−Δt/τ) of what is left, so it starts fast, settles softly, and takes the same time
// at any display rate (90 Hz on the phone, 200 Hz on the PC). After 3τ it is 95% of the way.
const MAX_TILT = 40;
const TILT_EASE_MS = 120;
/** A wheel notch is about 100 px in Chromium: 6.7° per notch, flat to 40° in six notches. */
const DEGREES_PER_WHEEL_PX = 1 / 15;
/** A vertical drag on the desk: 300 px from flat to 40°. */
const DEGREES_PER_DRAG_PX = 2 / 15;
const DEGREES_PER_KEY = 5;

export interface TextState {
  ready: boolean;
  error?: string;
  device: Record<string, unknown>;
  view: View;
  /** Degrees from straight down, for the tilted view. */
  tilt: number;
  /** Vertical field of view of the camera, degrees. */
  fov: number;
  text: TextMode;
  spread: number;
  turning: boolean;
  layout: { pageClass: PageClass; pages: number; scale: number; stage: string } | null;
  /** Per visible page: the largest distance between an HTML corner and the 3D page's corner in
   *  the pixels, CSS px. */
  alignment: { page: number; side: Side; error: number; html: Point[]; pixels: Point[] }[];
  /** Height a 16 px line of body text is drawn at on screen, at the page's top and bottom lines. */
  textPx: { top: number; bottom: number } | null;
  paint: { page: number; words: number; paintMs: number; uploadMs: number; size: string }[];
  turn: { frames: number; p50: number; p95: number; max: number } | null;
  renders: number;
  /** The angle the tilt is easing towards (F16): set by the wheel, a drag on the desk or ↑ ↓. */
  tiltTarget: number;
}

export interface TextLab {
  set(options: { view?: View; tilt?: number; fov?: number; text?: TextMode }): Promise<TextState>;
  turn(): Promise<TextState>;
  blink(times: number): Promise<TextState>;
}

declare global {
  interface Window {
    __text?: TextState;
    __textLab?: TextLab;
  }
}

interface Layout {
  cls: PageClass;
  sides: Side[];
  /** Scale of the page on screen against its class size: 1 means text at its CSS size. */
  scale: number;
}

/** The spread at the regular class where it fits at (nearly) full size; else one compact page. */
function chooseLayout(width: number, height: number): Layout {
  const r = PAGE_CLASSES.regular;
  const spread = Math.min(
    1,
    (width - 2 * MARGIN) / (2 * r.width),
    (height - 2 * MARGIN) / r.height,
  );
  if (spread >= MIN_SPREAD_SCALE)
    return { cls: 'regular', sides: ['left', 'right'], scale: spread };
  const c = PAGE_CLASSES.compact;
  const single = Math.min(1, (width - 2 * MARGIN) / c.width, (height - 2 * MARGIN) / c.height);
  return { cls: 'compact', sides: ['right'], scale: single };
}

const round = (n: number) => Math.round(n * 100) / 100;
const percentile = (values: number[], q: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? Number.NaN;
};
const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface TextLabElements {
  stage: HTMLElement;
  canvas: HTMLCanvasElement;
  /** Where the visible HTML pages go. */
  pages: HTMLElement;
  /** Invisible, untransformed copies of the pages: laid out for pagination and painting. */
  layout: HTMLElement;
  source: HTMLTemplateElement;
}

export async function startTextLab(el: TextLabElements, base: string): Promise<TextLab | null> {
  const params = new URLSearchParams(location.search);
  const device = {
    devicePixelRatio: window.devicePixelRatio,
    coarsePointer: matchMedia('(pointer: coarse)').matches,
    narrow: window.innerWidth < 600,
    saveData: false,
  };
  const tier = tierFor(device);
  const state: TextState = {
    ready: false,
    device: {},
    view: 'flat',
    tilt: 20,
    fov: FOV,
    text: 'html',
    spread: 0,
    turning: false,
    layout: null,
    alignment: [],
    textPx: null,
    paint: [],
    turn: null,
    renders: 0,
    tiltTarget: 0,
  };
  window.__text = state;

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas: el.canvas, antialias: tier === 'desktop' });
  } catch (error) {
    state.error = `WebGL: ${String(error)}`;
    return null;
  }
  const pixelRatio = pixelRatioFor(device);
  renderer.setPixelRatio(pixelRatio);
  // Textures are painted at the canvas's own resolution unless ?texscale= says otherwise.
  const textureScale = Number(params.get('texscale') ?? pixelRatio);
  const gl = renderer.getContext();
  const debug = gl.getExtension('WEBGL_debug_renderer_info');

  const scene = new Scene();
  scene.background = new Color('#3b2f2a');
  scene.add(new HemisphereLight(0xfff4e0, 0x2a2018, 1.4));
  const light = new DirectionalLight(0xffffff, 1.6);
  light.position.set(-0.3, 0.8, -0.5);
  scene.add(light);
  const gltf = await new GLTFLoader().loadAsync(`${base}${MODEL_PATHS[tier]}`);
  scene.add(gltf.scene);
  gltf.scene.updateMatrixWorld(true);

  const frames: Record<Side, PageFrame> = {
    left: pageFrame(gltf.scene.getObjectByName(PAGE_ANCHORS.verso), FALLBACK_PAGES.verso, 'left'),
    right: pageFrame(gltf.scene.getObjectByName(PAGE_ANCHORS.recto), FALLBACK_PAGES.recto, 'right'),
  };
  const corners: Record<Side, Vector3[]> = {
    left: pageCorners(frames.left, 'left'),
    right: pageCorners(frames.right, 'right'),
  };

  // The pages at rest: paper, and the text texture when the HTML is not shown.
  const still = { left: flatPage(corners.left, null), right: flatPage(corners.right, null) };
  scene.add(still.left.mesh, still.right.mesh);

  // The probe draws only the two pages, in flat colours, to find their corners in the pixels.
  const probePages = pageProbe(corners);

  // Page breaks depend on the font's metrics: wait for it before laying out anything.
  await document.fonts.load('16px Literata');
  await document.fonts.ready;

  const camera = new PerspectiveCamera(FOV, 1, 0.01, 20);
  const canvases = Array.from({ length: PAGES }, () => document.createElement('canvas'));
  let textures: CanvasTexture[] = [];
  let layout: Layout | null = null;
  let display: HTMLElement[] = [];

  const render = () => {
    renderer.render(scene, camera);
    state.renders++;
  };

  /** Fills the pages with the chapter, block by block; a paragraph that does not fit is split
   *  between two pages at a word. A stand-in for spike C's pagination, good enough for a bench. */
  const paginate = (cls: PageClass): HTMLElement[] => {
    el.layout.replaceChildren();
    const queue = [...(el.source.content.cloneNode(true) as DocumentFragment).children].filter(
      (b): b is HTMLElement => b instanceof HTMLElement,
    );
    const pages: HTMLElement[] = [];
    while (pages.length < PAGES) {
      const page = document.createElement('section');
      page.className = 'page';
      page.dataset.class = cls;
      page.setAttribute('aria-label', `Page ${pages.length + 1}`);
      const box = document.createElement('div');
      box.className = 'page-text';
      page.append(box);
      el.layout.append(page);
      pages.push(page);
      const fits = () => box.scrollHeight <= box.clientHeight;
      for (let block = queue.shift(); block; block = queue.shift()) {
        box.append(block);
        if (fits()) continue;
        if (block.tagName === 'P') {
          const full = block.textContent ?? '';
          const words = full.split(' ');
          let lo = 0;
          let hi = words.length;
          while (hi - lo > 1) {
            const mid = Math.floor((lo + hi) / 2);
            block.textContent = words.slice(0, mid).join(' ');
            if (fits()) lo = mid;
            else hi = mid;
          }
          if (lo > 0) {
            block.textContent = words.slice(0, lo).join(' ');
            const rest = block.cloneNode(false) as HTMLElement;
            rest.classList.add('cont');
            rest.textContent = words.slice(lo).join(' ');
            queue.unshift(rest);
            break;
          }
          block.textContent = full;
        }
        // None of it fits: it starts the next page. On an empty page it stays, cut off, or the
        // loop would never end (a heading taller than a page; there is none in this text).
        if (box.childElementCount === 1) continue;
        block.remove();
        queue.unshift(block);
        break;
      }
    }
    return pages;
  };

  /** Lays the chapter out at a page class, makes the visible copies and paints the textures. */
  const build = (cls: PageClass) => {
    const sources = paginate(cls);
    display = sources.map((source, i) => {
      const page = source.cloneNode(true) as HTMLElement;
      page.dataset.side = i % 2 === 0 ? 'left' : 'right';
      page.dataset.spread = String(Math.floor(i / 2));
      for (const corner of CORNERS) {
        const marker = document.createElement('i');
        marker.className = 'corner';
        marker.dataset.corner = corner;
        page.append(marker);
      }
      return page;
    });
    el.pages.replaceChildren(...display);

    for (const texture of textures) texture.dispose();
    const { width, height } = PAGE_CLASSES[cls];
    const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    state.paint = [];
    textures = sources.map((source, i) => {
      const canvas = canvases[i] as HTMLCanvasElement;
      const painted = paintPageText(source, canvas, width, height, textureScale);
      const texture = new CanvasTexture(canvas);
      texture.anisotropy = anisotropy;
      const start = performance.now();
      renderer.initTexture(texture); // uploads now, so the time can be measured
      state.paint.push({
        page: i + 1,
        words: painted.words,
        paintMs: round(painted.ms),
        uploadMs: round(performance.now() - start),
        size: `${canvas.width} × ${canvas.height}`,
      });
      return texture;
    });
  };

  const toScreen = (v: Vector3, width: number, height: number): Point => {
    const p = v.clone().project(camera);
    return [((p.x + 1) / 2) * width, ((1 - p.y) / 2) * height];
  };

  /** Puts the camera where the page measures exactly its class size × scale on screen. */
  const frame = (current: Layout, width: number, height: number) => {
    // A longer lens (smaller field of view) stands farther back for the same page size: the far
    // and near edges of a tilted page are then at nearly the same distance, and shrink alike.
    camera.fov = state.fov;
    const tanHalf = Math.tan((state.fov * Math.PI) / 360);
    const pxPerMetre = (PAGE_CLASSES[current.cls].height * current.scale) / frames.right.height;
    let distance = height / (2 * tanHalf * pxPerMetre);
    const centre =
      current.sides.length === 2
        ? frames.left.centre.clone().add(frames.right.centre).multiplyScalar(0.5)
        : frames.right.centre.clone();
    const target = centre.addScaledVector(frames.right.normal, PAGE_LIFT);
    const tilt = state.view === 'tilted' ? (state.tilt * Math.PI) / 180 : 0;
    const direction = new Vector3(0, Math.cos(tilt), -Math.sin(tilt));
    camera.aspect = width / height;
    camera.up.set(0, 0, 1); // the top of the page at the top of the screen
    const aim = () => {
      camera.position.copy(target).addScaledVector(direction, distance);
      camera.lookAt(target);
      camera.updateProjectionMatrix();
      // project() reads the camera's world matrices, which three.js only refreshes when it
      // renders; the HTML pages are placed before that render, so refresh them now.
      camera.updateMatrixWorld();
    };
    aim();
    const right = new Vector3();
    const up = new Vector3();
    /** Moves the camera so the picture moves by (−dx, −dy) CSS px. */
    const shift = (dx: number, dy: number) => {
      const metresPerPx = (2 * distance * tanHalf) / height;
      right.setFromMatrixColumn(camera.matrixWorld, 0);
      up.setFromMatrixColumn(camera.matrixWorld, 1);
      target.addScaledVector(right, dx * metresPerPx).addScaledVector(up, -dy * metresPerPx);
      aim();
    };
    if (tilt === 0) {
      // Seen from straight above, the page can start exactly on a pixel of the canvas: then the
      // HTML needs no rounding, and each texel of a page texture falls on one pixel (no blur).
      const ratio = renderer.getPixelRatio();
      const [x, y] = toScreen(corners[current.sides[0] ?? 'right'][0] as Vector3, width, height);
      shift(x - Math.round(x * ratio) / ratio, y - Math.round(y * ratio) / ratio);
      return;
    }
    // Tilted, the near edge of the page is larger than the far one, and the distance that gives
    // the flat page its class size pushes the near edge off screen. Step back and re-centre until
    // every corner is inside the margins (perspective is not linear, hence a few rounds).
    for (let step = 0; step < 6; step++) {
      const points = current.sides.flatMap((side) =>
        corners[side].map((v) => toScreen(v, width, height)),
      );
      const xs = points.map((p) => p[0]);
      const ys = points.map((p) => p[1]);
      const [minX, maxX, minY, maxY] = [
        Math.min(...xs),
        Math.max(...xs),
        Math.min(...ys),
        Math.max(...ys),
      ];
      const grow = Math.max(
        1,
        (maxX - minX) / (width - 2 * MARGIN),
        (maxY - minY) / (height - 2 * MARGIN),
      );
      const dx = (minX + maxX - width) / 2;
      const dy = (minY + maxY - height) / 2;
      if (grow < 1.0001 && Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) break;
      shift(dx, dy);
      distance *= grow;
      aim();
    }
  };

  /** Lays each HTML page over its 3D page: a plain rectangle (B) or a projective map (A). */
  const place = (current: Layout, width: number, height: number) => {
    const { width: w, height: h } = PAGE_CLASSES[current.cls];
    const dpr = window.devicePixelRatio;
    const snap = (v: number) => Math.round(v * dpr) / dpr; // whole device pixels: crisp text
    for (const page of display) {
      const quad = corners[page.dataset.side as Side].map((v) =>
        toScreen(v, width, height),
      ) as Quad;
      if (state.view === 'flat') {
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
    }
  };

  /** Which HTML pages are shown, and what the 3D pages print. */
  const show = (current: Layout) => {
    for (const page of display) {
      const onScreen =
        Number(page.dataset.spread) === state.spread &&
        current.sides.includes(page.dataset.side as Side);
      page.hidden = !onScreen;
      page.style.visibility = state.text === 'html' && !state.turning ? '' : 'hidden';
    }
    if (state.turning) return;
    still.left.uniforms.uFront.value = textures[2 * state.spread] ?? null;
    still.right.uniforms.uFront.value = textures[2 * state.spread + 1] ?? null;
    const printed = state.text === 'texture' ? 1 : 0;
    still.left.uniforms.uShowText.value = printed;
    still.right.uniforms.uShowText.value = printed;
  };

  /** Renders the probe and returns each page's corners in CSS px of the stage. */
  const probe = (): Record<Side, Quad | null> => probePages(renderer, camera, el.canvas);

  const measure = (current: Layout, width: number, height: number) => {
    const gpu = probe();
    const stage = el.stage.getBoundingClientRect();
    state.alignment = display
      .filter((page) => !page.hidden)
      .map((page) => {
        const side = page.dataset.side as Side;
        const quad = gpu[side];
        const html = CORNERS.map((corner): Point => {
          const r = page.querySelector(`[data-corner="${corner}"]`)?.getBoundingClientRect();
          return r ? [round(r.left - stage.left), round(r.top - stage.top)] : [Number.NaN, 0];
        });
        const errors = html.map((p, i) => {
          const q = quad?.[i];
          return q ? Math.hypot(p[0] - q[0], p[1] - q[1]) : Number.NaN;
        });
        return {
          page: display.indexOf(page) + 1,
          side,
          error: round(Math.max(...errors)),
          html,
          pixels: quad?.map(([x, y]): Point => [round(x), round(y)]) ?? [],
        };
      });

    const { width: w, height: h } = PAGE_CLASSES[current.cls];
    const sample = display.find((page) => !page.hidden)?.querySelector('.page-text');
    const style = sample ? getComputedStyle(sample) : null;
    const fontPx = Number.parseFloat(
      getComputedStyle(sample?.querySelector('p') ?? el.stage).fontSize,
    );
    if (state.view === 'flat' || !style) {
      state.textPx = { top: round(fontPx * current.scale), bottom: round(fontPx * current.scale) };
    } else {
      const quad = corners.right.map((v) => toScreen(v, width, height)) as Quad;
      const m = rectToQuad(w, h, quad);
      const lineHeight = Number.parseFloat(style.lineHeight);
      const topLine = Number.parseFloat(style.paddingTop) + lineHeight / 2;
      const bottomLine = h - Number.parseFloat(style.paddingBottom) - lineHeight / 2;
      state.textPx = {
        top: round(fontPx * verticalScale(m, [w / 2, topLine])),
        bottom: round(fontPx * verticalScale(m, [w / 2, bottomLine])),
      };
    }
  };

  /** Lays out, frames, places the HTML and renders; then measures, unless the view is moving. */
  const apply = (measureNow = true) => {
    const stageBox = el.stage.getBoundingClientRect();
    if (stageBox.width === 0 || stageBox.height === 0) return;
    // A canvas has whole pixels. At ratio 1.5 a 521 px tall stage would need 781.5 of them; the
    // browser makes 781 and stretches them over the box, and the page's texels no longer fall on
    // pixels. So the canvas is made a whole number of its own pixels, up to one pixel short.
    const ratio = renderer.getPixelRatio();
    const width = Math.floor(stageBox.width * ratio) / ratio;
    const height = Math.floor(stageBox.height * ratio) / ratio;
    const next = chooseLayout(width, height);
    if (next.cls !== layout?.cls) build(next.cls);
    layout = next;
    // Setting a canvas's size clears and reallocates its drawing buffer: only when it changes.
    const current = renderer.getSize(new Vector2());
    if (current.x !== width || current.y !== height) renderer.setSize(width, height, true);
    frame(next, width, height);
    place(next, width, height);
    show(next);
    render();
    state.layout = {
      pageClass: next.cls,
      pages: next.sides.length,
      scale: round(next.scale),
      stage: `${width} × ${height}`,
    };
    if (!measureNow) return;
    measure(next, width, height);
    el.stage.dispatchEvent(new CustomEvent('textlab:change'));
  };

  /** The angle the camera is at now: the tilt counts only in the tilted view. */
  const angle = () => (state.view === 'tilted' ? state.tilt : 0);

  const set: TextLab['set'] = async (options) => {
    if (state.turning) return state;
    Object.assign(state, options);
    state.tiltTarget = angle();
    apply();
    return state;
  };

  // F16: the tilt follows the wheel, a drag on the desk, or ↑ ↓, easing to each new angle. At 0°
  // the view is flat again and the HTML pages go back to plain rectangles (ADR 0008).
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let easing = false;
  const showAngle = (degrees: number) => {
    state.tilt = degrees;
    state.view = degrees > 0 ? 'tilted' : 'flat';
  };
  const ease = async () => {
    easing = true;
    let last = await nextFrame();
    for (;;) {
      const now = await nextFrame();
      const gap = state.tiltTarget - angle();
      if (Math.abs(gap) < 0.05 || state.turning) break;
      showAngle(angle() + gap * (1 - Math.exp(-(now - last) / TILT_EASE_MS)));
      last = now;
      apply(false); // no pixel probe while the view moves: it reads the whole canvas back
    }
    easing = false;
    if (state.turning) return;
    showAngle(state.tiltTarget);
    apply();
  };
  const tiltTo = (degrees: number) => {
    if (state.turning) return;
    state.tiltTarget = Math.min(MAX_TILT, Math.max(0, degrees));
    if (reducedMotion.matches) {
      // Q05 AC3: with reduced motion the angle changes at once, without easing.
      showAngle(state.tiltTarget);
      apply();
    } else if (!easing) void ease();
  };
  el.stage.addEventListener(
    'wheel',
    (event) => {
      if (event.ctrlKey) return; // Ctrl + wheel is the browser's zoom, not ours
      event.preventDefault();
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? el.stage.clientHeight : 1;
      tiltTo(state.tiltTarget + event.deltaY * unit * DEGREES_PER_WHEEL_PX);
    },
    { passive: false },
  );
  // A drag on the desk, which is the canvas wherever no HTML page covers it.
  let dragY: number | null = null;
  el.canvas.addEventListener('pointerdown', (event) => {
    dragY = event.clientY;
    el.canvas.setPointerCapture(event.pointerId);
  });
  el.canvas.addEventListener('pointermove', (event) => {
    if (dragY === null) return;
    tiltTo(state.tiltTarget + (event.clientY - dragY) * DEGREES_PER_DRAG_PX);
    dragY = event.clientY;
  });
  for (const type of ['pointerup', 'pointercancel'] as const) {
    el.canvas.addEventListener(type, () => {
      dragY = null;
    });
  }
  el.stage.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    tiltTo(state.tiltTarget + (event.key === 'ArrowDown' ? DEGREES_PER_KEY : -DEGREES_PER_KEY));
  });

  /** Turns the sheet holding pages 2 and 3: forwards from the first spread, back from the second. */
  const turn: TextLab['turn'] = async () => {
    if (state.turning || !layout) return state;
    const current = layout;
    const forward = state.spread === 0;
    state.turning = true;
    const sheet = turningPage(
      'gpu',
      48,
      1,
      { front: textures[1] ?? null, back: textures[2] ?? null },
      forward ? 'forward' : 'backward',
    );
    // During the turn the HTML is hidden and every visible face is a texture: the page left
    // behind (1 or 4), the sheet (2 and 3), and the page the sheet uncovers.
    still.left.uniforms.uFront.value = textures[0] ?? null;
    still.right.uniforms.uFront.value = textures[3] ?? null;
    still.left.uniforms.uShowText.value = 1;
    still.right.uniforms.uShowText.value = 1;
    sheet.setProgress(forward ? 0 : 1);
    scene.add(sheet.mesh);
    show(current);
    render(); // the same frame that hides the HTML shows the textures
    const times: number[] = [];
    let last = await nextFrame();
    const start = last;
    for (let t = 0; t < 1; ) {
      const now = await nextFrame();
      times.push(now - last);
      last = now;
      t = Math.min(1, (now - start) / TURN_MS);
      const eased = 0.5 - 0.5 * Math.cos(Math.PI * t);
      sheet.setProgress(forward ? eased : 1 - eased);
      render();
    }
    scene.remove(sheet.mesh);
    sheet.mesh.geometry.dispose();
    (sheet.mesh.material as ShaderMaterial).dispose();
    state.spread = forward ? 1 : 0;
    state.turning = false;
    state.turn = {
      frames: times.length,
      p50: round(percentile(times, 0.5)),
      p95: round(percentile(times, 0.95)),
      max: round(Math.max(...times)),
    };
    apply();
    return state;
  };

  /** Swaps HTML and texture every half second, to see whether the hand-off shows. */
  const blink: TextLab['blink'] = async (times) => {
    for (let i = 0; i < times; i++) {
      await set({ text: state.text === 'html' ? 'texture' : 'html' });
      await sleep(500);
    }
    return state;
  };

  // Which font does the HTML really use, and does the canvas draw the same one? With
  // font-display: optional a font that arrives late is skipped for the whole page view. If the
  // canvas could still use it, the textures would not match the HTML (risk R03, spike C).
  const sample = 'The Arabian Nights, Sheherazade';
  const widthIn = (family: string) => {
    const span = document.createElement('span');
    span.className = 'font-probe';
    span.style.fontFamily = family;
    span.textContent = sample;
    el.layout.append(span);
    const width = span.getBoundingClientRect().width;
    span.remove();
    return width;
  };
  const body = getComputedStyle(el.stage).getPropertyValue('--font-body').trim();
  const inHtml = widthIn(body);
  const fontInHtml =
    Math.abs(inHtml - widthIn(body.slice(body.indexOf(',') + 1))) < 0.5 ? 'fallback' : 'Literata';
  const measureCtx = document.createElement('canvas').getContext('2d');
  let textureFont = 'unknown';
  if (measureCtx) {
    measureCtx.font = `16px ${body}`;
    textureFont =
      Math.abs(measureCtx.measureText(sample).width - inHtml) < 0.5
        ? 'same as the HTML'
        : 'different';
  }

  const lab: TextLab = { set, turn, blink };
  window.__textLab = lab;
  const size = new Vector2();
  apply();
  renderer.getDrawingBufferSize(size);
  state.device = {
    renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : 'unknown',
    tier,
    pixelRatio,
    devicePixelRatio: window.devicePixelRatio,
    textureScale,
    drawingBuffer: `${size.x} × ${size.y} px`,
    fontInHtml,
    textureFont,
    userAgent: navigator.userAgent,
  };
  let pending = false;
  new ResizeObserver(() => {
    if (pending || state.turning) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      apply();
    });
  }).observe(el.stage);
  state.ready = true;
  return lab;
}
