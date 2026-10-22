/// <reference lib="dom" />
// Spike A bench (Stage 4, step 2): turns a page over and over with each variant of page-mesh.ts
// and measures, per frame:
//   frame   time between animation frames (what the reader feels; vsync caps it from below)
//   cpu     main-thread time of our update and of handing the frame to WebGL
//   gpu     time the GPU spent drawing, when the browser exposes timer queries
// Results go to window.__turn and to the page, with a button to copy them.

import {
  Color,
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MODEL_PATH } from './contract.ts';
import { type CurlVariant, PAGE_WIDTH, turningPage } from './page-mesh.ts';
import { pixelRatioFor, tierFor } from './tiers.ts';

/** One page turn lasts this long, as a flicked page does. */
const TURN_MS = 900;
const WARMUP_FRAMES = 10;

export const CASES: { variant: CurlVariant; mesh: [number, number] }[] = [
  { variant: 'gpu', mesh: [48, 1] },
  { variant: 'cpu', mesh: [48, 1] },
  { variant: 'rigid', mesh: [48, 1] },
  // A dense grid, as a page that also bends along the spine (a corner drag) would need.
  { variant: 'gpu', mesh: [96, 64] },
  { variant: 'cpu', mesh: [96, 64] },
];

export interface CaseResult {
  variant: CurlVariant;
  mesh: string;
  vertices: number;
  frames: number;
  frameP50: number;
  frameP95: number;
  frameMax: number;
  dropped: number;
  /** Frames skipped because the page was hidden at the time (another tab or window). */
  paused: number;
  cpuP95: number;
  gpuP95: number | null;
}

export interface TurnState {
  ready: boolean;
  running: boolean;
  done: boolean;
  device: Record<string, unknown>;
  results: CaseResult[];
  /** Fraction of pixels that differ between the GPU and CPU variants at mid-turn (0 to 1). */
  variantsDiffer: number | null;
  error?: string;
}

declare global {
  interface Window {
    __turn?: TurnState;
  }
}

const percentile = (values: number[], q: number) => {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? Number.NaN;
};
const round = (n: number) => Math.round(n * 100) / 100;
const nextFrame = () => new Promise<number>((resolve) => requestAnimationFrame(resolve));

/** GPU timer queries (EXT_disjoint_timer_query_webgl2), when the browser offers them. */
function gpuTimer(gl: WebGL2RenderingContext) {
  const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2') as {
    TIME_ELAPSED_EXT: number;
    GPU_DISJOINT_EXT: number;
  } | null;
  const pending: WebGLQuery[] = [];
  const times: number[] = [];
  return {
    available: ext !== null,
    begin() {
      if (!ext) return;
      const query = gl.createQuery();
      if (!query) return;
      gl.beginQuery(ext.TIME_ELAPSED_EXT, query);
      pending.push(query);
    },
    end() {
      if (ext) gl.endQuery(ext.TIME_ELAPSED_EXT);
    },
    /** Collects finished queries; results arrive a few frames late. */
    poll() {
      if (!ext) return;
      while (pending.length > 0) {
        const query = pending[0] as WebGLQuery;
        if (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) break;
        const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT) as boolean;
        const ns = gl.getQueryParameter(query, gl.QUERY_RESULT) as number;
        if (!disjoint) times.push(ns / 1e6);
        gl.deleteQuery(query);
        pending.shift();
      }
    },
    take() {
      return times.splice(0);
    },
  };
}

export async function startTurnLab(canvas: HTMLCanvasElement, base: string) {
  const device = {
    devicePixelRatio: window.devicePixelRatio,
    coarsePointer: matchMedia('(pointer: coarse)').matches,
    narrow: window.innerWidth < 600,
    saveData: false,
  };
  const tier = tierFor(device);
  const state: TurnState = {
    ready: false,
    running: false,
    done: false,
    device: {},
    results: [],
    variantsDiffer: null,
  };
  window.__turn = state;

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: tier === 'desktop' });
  } catch (error) {
    state.error = String(error);
    return { run: async () => state };
  }
  renderer.setPixelRatio(pixelRatioFor(device));
  const gl = renderer.getContext() as WebGL2RenderingContext;
  const debug = gl.getExtension('WEBGL_debug_renderer_info');
  const timer = gpuTimer(gl);

  const scene = new Scene();
  scene.background = new Color('#3b2f2a');
  scene.add(new HemisphereLight(0xfff4e0, 0x2a2018, 1.4));
  const light = new DirectionalLight(0xffffff, 1.6);
  light.position.set(-0.3, 0.8, -0.5);
  scene.add(light);
  const gltf = await new GLTFLoader().loadAsync(`${base}${MODEL_PATH}`);
  scene.add(gltf.scene);

  // Frame the open book from the reader's side (−Z), 50° above the desk, the spread filling the
  // narrower field of view with a little margin.
  const camera = new PerspectiveCamera(35, 1, 0.01, 10);
  const target = new Vector3(0, 0.03, -0.03);
  const elevation = (50 * Math.PI) / 180;
  const resize = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const vertical = (camera.fov * Math.PI) / 180;
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * camera.aspect);
    const distance = (PAGE_WIDTH * 1.25) / Math.tan(Math.min(vertical, horizontal) / 2);
    camera.position
      .copy(target)
      .add(new Vector3(0, Math.sin(elevation), -Math.cos(elevation)).multiplyScalar(distance));
    camera.lookAt(target);
    camera.updateProjectionMatrix();
  };
  resize();
  renderer.render(scene, camera);

  const size = renderer.getDrawingBufferSize(new Vector2());
  state.device = {
    renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : 'unknown',
    tier,
    pixelRatio: renderer.getPixelRatio(),
    drawingBuffer: `${size.x} × ${size.y} px`,
    gpuTimer: timer.available,
    userAgent: navigator.userAgent,
  };
  state.ready = true;

  /** Renders the GPU and CPU variants at mid-turn into the same small target; compares pixels. */
  const compareVariants = () => {
    const rt = new WebGLRenderTarget(256, 256);
    const pixels = (variant: CurlVariant) => {
      const turn = turningPage(variant, 48, 1);
      turn.setProgress(0.5);
      scene.add(turn.mesh);
      renderer.setRenderTarget(rt);
      renderer.render(scene, camera);
      const buffer = new Uint8Array(256 * 256 * 4);
      renderer.readRenderTargetPixels(rt, 0, 0, 256, 256, buffer);
      renderer.setRenderTarget(null);
      scene.remove(turn.mesh);
      return buffer;
    };
    const a = pixels('gpu');
    const b = pixels('cpu');
    let differing = 0;
    for (let i = 0; i < a.length; i += 4) {
      const delta =
        Math.abs((a[i] ?? 0) - (b[i] ?? 0)) +
        Math.abs((a[i + 1] ?? 0) - (b[i + 1] ?? 0)) +
        Math.abs((a[i + 2] ?? 0) - (b[i + 2] ?? 0));
      if (delta > 24) differing++;
    }
    rt.dispose();
    return differing / (256 * 256);
  };

  const runCase = async (variant: CurlVariant, mesh: [number, number], turns: number) => {
    const turn = turningPage(variant, mesh[0], mesh[1]);
    scene.add(turn.mesh);
    renderer.compile(scene, camera);
    for (let i = 0; i < WARMUP_FRAMES; i++) {
      await nextFrame();
      renderer.render(scene, camera);
    }
    timer.poll();
    timer.take();
    const frameTimes: number[] = [];
    const cpuTimes: number[] = [];
    // While the page is hidden (another tab or window), the browser stops animation frames; the
    // first frame after it comes back would count the whole absence as one frame. Skip it.
    let skipNext = false;
    let paused = 0;
    const onVisibility = () => {
      if (document.hidden) skipNext = true;
    };
    document.addEventListener('visibilitychange', onVisibility);
    let last = await nextFrame();
    for (let t = 0; t < turns; t++) {
      const start = last;
      let progress = 0;
      while (progress < 1) {
        const now = await nextFrame();
        if (skipNext) {
          skipNext = false;
          paused++;
        } else {
          frameTimes.push(now - last);
        }
        last = now;
        progress = Math.min(1, (now - start) / TURN_MS);
        const cpuStart = performance.now();
        turn.setProgress(progress);
        timer.begin();
        renderer.render(scene, camera);
        timer.end();
        cpuTimes.push(performance.now() - cpuStart);
        timer.poll();
      }
    }
    for (let i = 0; i < 5; i++) {
      await nextFrame();
      timer.poll();
    }
    document.removeEventListener('visibilitychange', onVisibility);
    scene.remove(turn.mesh);
    const gpuTimes = timer.take();
    const median = percentile(frameTimes, 0.5);
    const result: CaseResult = {
      variant,
      mesh: `${mesh[0]}×${mesh[1]}`,
      vertices: turn.vertices,
      frames: frameTimes.length,
      frameP50: round(median),
      frameP95: round(percentile(frameTimes, 0.95)),
      frameMax: round(Math.max(...frameTimes)),
      dropped: frameTimes.filter((f) => f > median * 1.5).length,
      paused,
      cpuP95: round(percentile(cpuTimes, 0.95)),
      gpuP95: gpuTimes.length > 0 ? round(percentile(gpuTimes, 0.95)) : null,
    };
    return result;
  };

  const run = async (turns: number) => {
    if (state.running) return state;
    state.running = true;
    state.done = false;
    state.results = [];
    state.variantsDiffer = compareVariants();
    for (const c of CASES) state.results.push(await runCase(c.variant, c.mesh, turns));
    renderer.render(scene, camera);
    state.running = false;
    state.done = true;
    return state;
  };
  return { run };
}
