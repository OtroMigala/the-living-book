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
//   While F is held, the mouse or the arrows circle the camera around the book (F17,
//   free-look.ts); the pages are textures meanwhile, and letting F go eases the view back.
//   The book opens on the whole scene, then comes down to the reading view (F01 AC2, opening.ts).
//
// It renders only when something changes (BR2), at the tier's pixel ratio (BR3). A page turns as
// a sheet that bends on the GPU (ADR 0007), its text painted from the HTML while it moves.

import {
  Box3,
  CanvasTexture,
  Color,
  DirectionalLight,
  HemisphereLight,
  type Material,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  Texture,
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
import { dustMotes } from '../three/dust.ts';
import {
  clampPolar,
  floorAt,
  ORBIT_LOWEST,
  orbit,
  orbitFloor,
  shorterTurn,
} from '../three/free-look.ts';
import { type Point, rectToQuad, toMatrix3d } from '../three/homography.ts';
import { type Framing, wholeView } from '../three/opening.ts';
import { flatPage, type SheetPaper, sheetPaper, turningPage } from '../three/page-mesh.ts';
import { paintPageText } from '../three/page-text.ts';
import { ANISOTROPY, FRAME_BUDGET_MS, pixelRatioFor, tierFor } from '../three/tiers.ts';
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
/** Free look (F17): a 1280 px screen's width of mouse circles the book about once (384°). */
const DEGREES_PER_LOOK_PX = 0.3;
/**
 * The opening view (F01 AC2): the whole scene from 30° off straight above, 8% of each half of the
 * picture left empty around it; held 1 s, then 1.6 s down to the reading view.
 */
const OPENING_POLAR = 30;
const OPENING_MARGIN = 0.08;
const OPENING_HOLD_MS = 1000;
const OPENING_MS = 1600;
/** With F held, each arrow moves the camera by DEGREES_PER_KEY: [around to the right, down]. */
const LOOK_KEYS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
};
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
  /**
   * Free look (F17): F held; the camera off the reading view and the pages shown as textures
   * (on); how far it has gone around the book and down from the tilt, in degrees, and where those
   * ease to; the lowest polar angle where the camera is (the floor, free-look.ts).
   */
  look: {
    held: boolean;
    on: boolean;
    azimuth: number;
    polar: number;
    azimuthTarget: number;
    polarTarget: number;
    lowest: number;
  };
  /**
   * The opening view (F01 AC2): 1 while the whole scene is in the picture, down to 0 as the camera
   * comes to the reading view, where it stays. 0 from the start with reduced motion.
   */
  opening: number;
  /** Ends the opening at once, at the reading view: for the tests that are about something else. */
  endOpening(): void;
  /**
   * How far from the picture's centre the farthest corner of the model lands now, as a share of
   * half the picture: 1 or less, nothing is cut off (F01 AC2).
   */
  sceneExtent(): number;
  /** How much of the dust shows in the last frame, 0 to 1: none while reading (spike D). */
  dust: number;
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
  const sky = new HemisphereLight(0xfff4e0, 0x2a2018, 1.4);
  scene.add(sky);
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
  // Sharp at a slant: the table seen across, the pages while looking around (tiers.ts). Set before
  // the first frame uploads the textures, so it costs no second upload.
  const anisotropy = Math.min(
    ANISOTROPY[tierFor(device)],
    renderer.capabilities.getMaxAnisotropy(),
  );
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    for (const material of [object.material].flat()) {
      for (const value of Object.values(material)) {
        if (value instanceof Texture) value.anisotropy = anisotropy;
      }
    }
  });
  // F17: what stands on the desk, which the orbiting camera stays out of and in front of: every
  // part of the model but the open book, in boxes 2 cm larger than it, twice the near plane. What
  // the book rests on (the table, the carpet) lies below the book's top and cannot come between
  // it and a camera above it: left out, or its box would hold the very point the camera circles.
  const openBook = model.getObjectByName('Open_book');
  const bookBox = new Box3().setFromObject(openBook ?? model);
  const bookTop = bookBox.max.y;
  const obstacles: Box3[] = [];
  model.traverse((object) => {
    let inBook = false;
    object.traverseAncestors((above) => {
      inBook ||= above === openBook;
    });
    if (!(object instanceof Mesh) || object === openBook || inBook) return;
    const box = new Box3().setFromObject(object);
    if (box.max.y > bookTop) obstacles.push(box.expandByScalar(0.02));
  });
  // An old room's air (spike D): motes over the table, from the book up to 60 cm above it, where a
  // candle's light would catch them. They show only away from the reading view (awayFromReading).
  const under = new Box3().setFromObject(model.getObjectByName('Table') ?? model);
  const dust = dustMotes(
    new Box3(
      new Vector3(under.min.x - 0.2, bookBox.min.y, under.min.z - 0.2),
      new Vector3(under.max.x + 0.2, bookBox.min.y + 0.6, under.max.z + 0.2),
    ),
    tierFor(device) === 'desktop' ? 500 : 250,
    0.004,
  );
  const dustOpacity = dust.material.opacity;
  scene.add(dust);
  // F01 AC2: the corners of every part of the model, which the opening view keeps in the picture.
  const sceneCorners: Vector3[] = [];
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const { min, max } = new Box3().setFromObject(object);
    for (let i = 0; i < 8; i++) {
      sceneCorners.push(
        new Vector3(i & 1 ? max.x : min.x, i & 2 ? max.y : min.y, i & 4 ? max.z : min.z),
      );
    }
  });

  // The turning sheet is made of the model's own paper (Stage 6): its base colour and its
  // occlusion-roughness-metalness textures, lit by three.js as the model is. A model without them
  // (the placeholder) turns plain paper.
  let bookMaterial: MeshStandardMaterial | null = null;
  model.getObjectByName('Open_book')?.traverse((object) => {
    if (object instanceof Mesh && object.material instanceof MeshStandardMaterial) {
      bookMaterial ??= object.material;
    }
  });
  const { map: paperMap = null, roughnessMap: ormMap = null } = bookMaterial ?? {};
  const paper: SheetPaper | undefined =
    paperMap && ormMap ? sheetPaper(paperMap, ormMap) : undefined;

  const frames = {
    left: pageFrame(model.getObjectByName(PAGE_ANCHORS.verso), FALLBACK_PAGES.verso, 'left'),
    right: pageFrame(model.getObjectByName(PAGE_ANCHORS.recto), FALLBACK_PAGES.recto, 'right'),
  };
  const corners: Record<Side, Vector3[]> = {
    left: pageCorners(frames.left, 'left'),
    right: pageCorners(frames.right, 'right'),
  };
  // The ink of the two pages, on the model's own paper: it prints a texture only when the HTML
  // cannot be shown, and draws nothing otherwise.
  const still = {
    left: flatPage(corners.left, null, false),
    right: flatPage(corners.right, null, false),
  };
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
    look: {
      held: false,
      on: false,
      azimuth: 0,
      polar: 0,
      azimuthTarget: 0,
      polarTarget: 0,
      lowest: ORBIT_LOWEST,
    },
    opening: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1,
    endOpening: () => {},
    dust: 0,
    sceneExtent: () =>
      Math.max(
        ...sceneCorners.map((corner) => {
          const p = corner.clone().project(camera);
          return Math.max(Math.abs(p.x), Math.abs(p.y));
        }),
      ),
    lastTurn: null,
  };
  window.__view3d = debug;
  const look = debug.look;

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

  /**
   * Puts the camera where the pages measure their class size × scale on screen (ADR 0008), and
   * says what it looks at and from how far.
   */
  const frame = (current: ReaderLayout): { target: Vector3; distance: number } => {
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
      return { target, distance };
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
    return { target, distance };
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
   * The 3D pages print their text, and the HTML stays in place for screen readers but is not
   * drawn; or the other way round. A turn prints its pages until it lands, whatever else changes.
   */
  const showTextures = (on: boolean) => {
    if (!debug.turning) {
      for (const s of ['left', 'right'] as const) still[s].uniforms.uShowText.value = on ? 1 : 0;
    }
    el.pages.style.opacity = on ? '0' : '';
  };

  /**
   * ADR 0008, point 4: does this browser draw a tilted page where the 3D page is? One corner of the
   * first page, read back, must be within 2 px. If not, the pages are painted into textures and
   * shown by the 3D pages.
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
      showTextures(textures);
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
    const texture = new CanvasTexture(canvas);
    texture.anisotropy = anisotropy;
    return texture;
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

  /**
   * How far the camera is from the reading view, 0 to 1: the opening's way down, eased as the
   * camera moves, or how far the free look has turned it, all of it at 15°. While reading, the
   * motes would cross the text: they show by this much.
   */
  const awayFromReading = () => {
    const opening = 0.5 - 0.5 * Math.cos(Math.PI * debug.opening);
    const turned = look.on
      ? Math.min(1, (Math.abs(shorterTurn(look.azimuth)) + Math.abs(look.polar)) / 15)
      : 0;
    return Math.max(opening, turned);
  };

  const render = () => {
    const away = awayFromReading();
    debug.dust = away;
    dust.visible = away > 0;
    dust.material.opacity = dustOpacity * away;
    // The dust drifts slowly, and only in frames drawn for something else (BR2).
    dust.rotation.y = performance.now() * 0.00002;
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

  let floor: number[] = [];
  let floorKey = '';
  /**
   * Circles the camera around what the reading view looks at, at the same distance, by the look's
   * angles (F17, free-look.ts). The polar angle is the tilt's plus the look's, down to the floor:
   * over a book, the camera rises, and comes down again past it.
   */
  const aimOrbit = (reading: { target: Vector3; distance: number }) => {
    // The floor moves with what the camera circles and how far: measured again when those change.
    const key = `${reading.target.toArray().join()} ${reading.distance}`;
    if (key !== floorKey) {
      floor = orbitFloor(reading.target, reading.distance, obstacles);
      floorKey = key;
    }
    look.lowest = floorAt(floor, look.azimuth);
    let polar = Math.min(clampPolar(debug.tilt + look.polar), look.lowest);
    let { target, distance } = reading;
    // F01 AC2: on the way from the opening view, the camera's target, distance and angle each go
    // from the whole scene's to the reading view's, eased in and out.
    if (debug.opening > 0) {
      const whole = openingView();
      const s = 0.5 - 0.5 * Math.cos(Math.PI * debug.opening);
      target = target.clone().lerp(whole.target, s);
      distance += (whole.distance - distance) * s;
      polar += (OPENING_POLAR - polar) * s;
    }
    const { position, up } = orbit(target, distance, polar, look.azimuth);
    camera.position.copy(position);
    camera.up.copy(up);
    camera.lookAt(target);
    camera.updateMatrixWorld();
  };

  let opening: Framing | null = null;
  let openingKey = '';
  /** The whole scene in the picture, for the stage's current proportions (opening.ts). */
  const openingView = () => {
    const key = `${size.width}×${size.height}`;
    if (!opening || key !== openingKey) {
      opening = wholeView(
        sceneCorners,
        OPENING_POLAR,
        FOV,
        size.width / size.height,
        OPENING_MARGIN,
      );
      openingKey = key;
    }
    return opening;
  };

  /** Frames, places and draws the current pages for the current size, tilt and look. */
  // Off while another view shows the book: no input, no drawing.
  let active = true;
  const update = () => {
    if (!layout || !active) return;
    const next = stageSize();
    if (next.width !== size.width || next.height !== size.height) {
      size = next;
      renderer.setSize(size.width, size.height, true);
    }
    const reading = frame(layout);
    // Looking around or opening, the pages are textures: the HTML waits, unplaced, for reading.
    if (look.on || debug.opening > 0) {
      aimOrbit(reading);
      render();
      return;
    }
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
  // The tilt and the look (F17) ease together, each to its own target.
  const ease = async () => {
    easing = true;
    let last = await nextFrame();
    for (;;) {
      const now = await nextFrame();
      timeFrame(now - last);
      const tiltGap = debug.tiltTarget - debug.tilt;
      const azimuthGap = look.azimuthTarget - look.azimuth;
      const polarGap = look.polarTarget - look.polar;
      if (Math.max(Math.abs(tiltGap), Math.abs(azimuthGap), Math.abs(polarGap)) < 0.05) break;
      const share = 1 - Math.exp(-(now - last) / TILT_EASE_MS);
      debug.tilt += tiltGap * share;
      look.azimuth += azimuthGap * share;
      look.polar += polarGap * share;
      last = now;
      update();
    }
    debug.tilt = debug.tiltTarget;
    look.azimuth = look.azimuthTarget;
    look.polar = look.polarTarget;
    easing = false;
    if (!endLook()) update();
  };
  const tiltTo = (degrees: number) => {
    debug.tiltTarget = Math.min(MAX_TILT, Math.max(0, degrees));
    if (reducedMotion.matches) {
      debug.tilt = debug.tiltTarget;
      update();
    } else if (!easing) void ease();
  };
  // F01 AC2: the book opens on the whole scene, held a moment, then the camera comes down to the
  // reading view, timed as the tilt is (F09 AC3). The pages are textures until it lands.
  let openingStarted = false;
  let openingLanded = debug.opening === 0;
  const landOpening = () => {
    if (openingLanded) return;
    openingLanded = true;
    debug.opening = 0;
    showTextures(debug.textures || look.on);
    update();
  };
  debug.endOpening = landOpening;
  const playOpening = async () => {
    if (layout) paintShown(layout);
    showTextures(true);
    update();
    await new Promise((resolve) => setTimeout(resolve, OPENING_HOLD_MS));
    let last = await nextFrame();
    const start = last;
    while (!openingLanded) {
      const now = await nextFrame();
      // Landed meanwhile (endOpening): the camera is the reading view's now, and stays.
      if (openingLanded) break;
      timeFrame(now - last);
      last = now;
      debug.opening = Math.max(0, 1 - (now - start) / OPENING_MS);
      if (debug.opening === 0) break;
      update();
    }
    landOpening();
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

  /** The camera leaves the reading view: the pages become textures (F17 AC3). */
  const startLook = () => {
    if (look.on) return;
    look.on = true;
    // A turn has painted its own pages, and repaints the shown ones when it lands (show()).
    if (layout && !debug.turning) paintShown(layout);
    showTextures(true);
  };
  /** Back at the reading view with F let go, the look ends and the HTML comes back. */
  const endLook = () => {
    if (!look.on || look.held || look.azimuth !== 0 || look.polar !== 0) return false;
    look.on = false;
    showTextures(debug.textures || debug.opening > 0);
    update();
    return true;
  };
  /** Moves the camera toward (azimuth, polar): at once for the mouse, eased for a key. */
  const lookTo = (azimuth: number, polar: number, eased: boolean) => {
    // Down from straight above to the orbit's lowest, whatever the tilt adds; going down stops at
    // the floor, while a height the floor lifted the camera from is kept, to come back to.
    let down = clampPolar(debug.tiltTarget + polar) - debug.tiltTarget;
    if (down > look.polarTarget) {
      const floorDown = floorAt(floor, azimuth) - debug.tiltTarget;
      down = Math.min(down, Math.max(look.polarTarget, floorDown));
    }
    if (azimuth === look.azimuthTarget && down === look.polarTarget) return;
    look.azimuthTarget = azimuth;
    look.polarTarget = down;
    startLook();
    if (!eased || reducedMotion.matches) {
      look.azimuth = azimuth;
      look.polar = down;
      update();
    } else if (!easing) void ease();
  };
  /**
   * F let go, or the window left: the view eases back to reading by the shorter way round, at
   * once with reduced motion.
   */
  const releaseLook = () => {
    look.held = false;
    look.azimuth = shorterTurn(look.azimuth);
    look.azimuthTarget = 0;
    look.polarTarget = 0;
    if (!look.on) return;
    if (reducedMotion.matches) {
      look.azimuth = 0;
      look.polar = 0;
      endLook();
    } else if (!easing) void ease();
  };

  document.addEventListener('keydown', (event) => {
    if (!active || event.altKey || event.ctrlKey || event.metaKey) return;
    if ((event.target as HTMLElement).closest('input, select, textarea')) return;
    // F17: F held unlocks the camera, and the arrows then move it. A key used here is
    // default-prevented, and the reader, listening after this view, leaves it (reader.ts).
    if (event.key === 'f' || event.key === 'F') {
      event.preventDefault();
      look.held = true;
      return;
    }
    const step = LOOK_KEYS[event.key];
    if (look.held && step) {
      event.preventDefault();
      lookTo(
        look.azimuthTarget + step[0] * DEGREES_PER_KEY,
        look.polarTarget + step[1] * DEGREES_PER_KEY,
        true,
      );
      return;
    }
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    tiltTo(debug.tiltTarget + (event.key === 'ArrowDown' ? DEGREES_PER_KEY : -DEGREES_PER_KEY));
  });
  document.addEventListener('keyup', (event) => {
    if (event.key === 'f' || event.key === 'F') releaseLook();
  });
  // F let go in another window never comes back here as a keyup.
  window.addEventListener('blur', releaseLook);
  // With F held, the camera follows the mouse, by how far it moved since its last event: around
  // the book to the right as it goes right, lower as it goes down (as the tilt's drag, F16).
  let pointer: { x: number; y: number } | null = null;
  window.addEventListener('pointermove', (event) => {
    const last = pointer;
    pointer = { x: event.clientX, y: event.clientY };
    if (!active || !look.held || !last || event.pointerType === 'touch') return;
    lookTo(
      look.azimuthTarget + (event.clientX - last.x) * DEGREES_PER_LOOK_PX,
      look.polarTarget + (event.clientY - last.y) * DEGREES_PER_LOOK_PX,
      false,
    );
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

    const sheet = turningPage(
      'gpu',
      48,
      1,
      { front, back },
      forward ? 'forward' : 'backward',
      paper,
    );
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
      (sheet.mesh.material as Material).dispose();
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
  // with SwiftShader then took about 9 ms (spike 6c). A sheet of plain paper has the still pages'
  // shaders, so it draws with their program, kept while they are. A sheet of the model's paper
  // (Stage 6) has a program of its own: a sheet that is never drawn is compiled with the scene and
  // kept, never disposed, so every turn's sheet finds that program ready.
  const warmSheet = paper
    ? turningPage('gpu', 48, 1, { front: blank, back: blank }, 'forward', paper)
    : null;
  if (warmSheet) scene.add(warmSheet.mesh);
  await renderer.compileAsync(scene, camera);
  if (warmSheet) scene.remove(warmSheet.mesh);

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
      // After a turn the pages were textures: the HTML takes over again, in the same frame, unless
      // they stay textures (tilted without matrix3d's perspective, looking around, opening).
      el.pages.style.visibility = '';
      const textures = debug.textures || look.on || debug.opening > 0;
      if (textures) paintShown(current);
      for (const side of ['left', 'right'] as const) {
        still[side].uniforms.uShowText.value = textures ? 1 : 0;
      }
      if (debug.opening > 0 && !openingStarted) {
        openingStarted = true;
        void playOpening();
        return;
      }
      update();
    },

    beginTurn: (from, to, step, current) => beginTurn(from, to, step, current),

    setActive(on) {
      active = on;
      // Another view shows the book: a look ends where it is, without drawing.
      if (!on) {
        const looking = look.on;
        Object.assign(look, {
          held: false,
          on: false,
          azimuth: 0,
          polar: 0,
          azimuthTarget: 0,
          polarTarget: 0,
        });
        if (looking) showTextures(debug.textures);
      }
    },

    /** A turn from the buttons or the keys: the whole way, easing in and out. */
    async turn(from, to, step, current) {
      if (reducedMotion.matches) return;
      await beginTurn(from, to, step, current).finish(true, true);
    },
  };
}
