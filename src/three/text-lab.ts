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
  BufferGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  DoubleSide,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  PerspectiveCamera,
  Scene,
  type ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  FALLBACK_PAGES,
  MODEL_PATH,
  PAGE_ANCHORS,
  PAGE_CLASSES,
  PAGE_LIFT,
  type PageClass,
  type PageRect,
} from './contract.ts';
import { type Point, rectToQuad, toMatrix3d, verticalScale } from './homography.ts';
import { flatPage, turningPage } from './page-mesh.ts';
import { paintPageText } from './page-text.ts';
import { pixelRatioFor, tierFor } from './tiers.ts';

export type View = 'flat' | 'tilted';
export type TextMode = 'html' | 'texture';
type Side = 'left' | 'right';
type Quad = [Point, Point, Point, Point];

/** Space kept around the book at rest, CSS px. */
const MARGIN = 8;
/** Below this scale the spread's body text would be under 14.4 px: one compact page instead. */
const MIN_SPREAD_SCALE = 0.9;
const FOV = 35;
const TURN_MS = 900;
/** Two spreads: pages 1 and 2, then 3 and 4. Turning page 2 over shows page 3 on its back. */
const PAGES = 4;
const CORNERS = ['tl', 'tr', 'br', 'bl'] as const;

export interface TextState {
  ready: boolean;
  error?: string;
  device: Record<string, unknown>;
  view: View;
  /** Degrees from straight down, for the tilted view. */
  tilt: number;
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
}

export interface TextLab {
  set(options: { view?: View; tilt?: number; text?: TextMode }): Promise<TextState>;
  turn(): Promise<TextState>;
  blink(times: number): Promise<TextState>;
}

declare global {
  interface Window {
    __text?: TextState;
    __textLab?: TextLab;
  }
}

/** A page of the open book in scene coordinates: where it is and which way it faces. */
interface PageFrame {
  centre: Vector3;
  /** Unit vector from the spine to the outer edge. */
  out: Vector3;
  /** Unit vector towards the page's top edge. */
  top: Vector3;
  normal: Vector3;
  width: number;
  height: number;
}

function pageFrame(anchor: Object3D | undefined, fallback: PageRect, side: Side): PageFrame {
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
function pageCorners(f: PageFrame, side: Side): Vector3[] {
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
    text: 'html',
    spread: 0,
    turning: false,
    layout: null,
    alignment: [],
    textPx: null,
    paint: [],
    turn: null,
    renders: 0,
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
  const gltf = await new GLTFLoader().loadAsync(`${base}${MODEL_PATH}`);
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
  const probeScene = new Scene();
  probeScene.background = new Color(0x000000);
  for (const [side, color] of [
    ['left', 0xff0000],
    ['right', 0x00ff00],
  ] as const) {
    const geometry = new BufferGeometry().setFromPoints(corners[side]);
    geometry.setIndex([3, 2, 1, 3, 1, 0]);
    probeScene.add(new Mesh(geometry, new MeshBasicMaterial({ color, side: DoubleSide })));
  }

  // Page breaks depend on the font's metrics: wait for it before laying out anything.
  await document.fonts.load('16px Literata');
  await document.fonts.ready;

  const camera = new PerspectiveCamera(FOV, 1, 0.01, 10);
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
    const tanHalf = Math.tan((FOV * Math.PI) / 360);
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
  const probe = (): Record<Side, Quad | null> => {
    const size = renderer.getDrawingBufferSize(new Vector2());
    const target = new WebGLRenderTarget(size.x, size.y);
    renderer.setRenderTarget(target);
    renderer.render(probeScene, camera);
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
    const sx = el.canvas.clientWidth / size.x;
    const sy = el.canvas.clientHeight / size.y;
    return { left: found.left.quad(sx, sy), right: found.right.quad(sx, sy) };
  };

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

  const apply = () => {
    const width = el.stage.clientWidth;
    const height = el.stage.clientHeight;
    if (width === 0 || height === 0) return;
    const next = chooseLayout(width, height);
    if (next.cls !== layout?.cls) build(next.cls);
    layout = next;
    renderer.setSize(width, height, false);
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
    measure(next, width, height);
  };

  const set: TextLab['set'] = async (options) => {
    if (state.turning) return state;
    Object.assign(state, options);
    apply();
    return state;
  };

  /** Turns the sheet holding pages 2 and 3: forwards from the first spread, back from the second. */
  const turn: TextLab['turn'] = async () => {
    if (state.turning || !layout) return state;
    const current = layout;
    const forward = state.spread === 0;
    state.turning = true;
    const sheet = turningPage('gpu', 48, 1, {
      front: textures[1] ?? null,
      back: textures[2] ?? null,
    });
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

  // Is the HTML really drawn in Literata? With font-display: optional a late font is skipped for
  // the whole page view, and then the textures (painted with whatever the HTML uses) still match.
  const probeText = document.createElement('span');
  probeText.className = 'font-probe';
  probeText.textContent = 'The Arabian Nights, Sheherazade';
  el.layout.append(probeText);
  const measureCtx = document.createElement('canvas').getContext('2d');
  let fontInHtml = 'unknown';
  if (measureCtx) {
    measureCtx.font = '16px Literata';
    const expected = measureCtx.measureText(probeText.textContent).width;
    fontInHtml =
      Math.abs(probeText.getBoundingClientRect().width - expected) < 0.5 ? 'Literata' : 'fallback';
  }
  probeText.remove();

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
