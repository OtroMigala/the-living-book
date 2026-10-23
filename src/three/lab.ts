/// <reference lib="dom" />
// The 3D lab (Stage 4, step 1): loads the model the app uses on this tier, draws it,
// and outlines each page where the anchors say it is. It renders only when something changes:
// after loading and on resize (BR2), with the tier's pixel ratio (BR3). The numbers the browser
// tests check are exposed on window.__lab.

import {
  Box3,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  HemisphereLight,
  LineBasicMaterial,
  LineLoop,
  Mesh,
  MeshBasicMaterial,
  type Object3D,
  PerspectiveCamera,
  Scene,
  Sphere,
  Vector3,
  WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FALLBACK_PAGES, MODEL_PATHS, PAGE_ANCHORS, PAGE_LIFT } from './contract.ts';
import { pixelRatioFor, tierFor } from './tiers.ts';

export interface LabState {
  ready: boolean;
  renders: number;
  drawCalls: number;
  triangles: number;
  pixelRatio: number;
  tier: string;
  anchors: 'model' | 'fallback';
  error?: string;
}

declare global {
  interface Window {
    __lab?: LabState;
  }
}

/** The four corners of a page, in scene coordinates, lifted just above the page surface. */
function pageCorners(anchor: Object3D | undefined, fallback: (typeof FALLBACK_PAGES)['verso']) {
  const local = (w: number, h: number) =>
    [
      [-w / 2, PAGE_LIFT, -h / 2],
      [w / 2, PAGE_LIFT, -h / 2],
      [w / 2, PAGE_LIFT, h / 2],
      [-w / 2, PAGE_LIFT, h / 2],
    ].map(([x, y, z]) => new Vector3(x, y, z));
  if (anchor && typeof anchor.userData.width_m === 'number') {
    // glTF node extras arrive as userData; the anchor's own frame places and orients the page.
    return local(anchor.userData.width_m, anchor.userData.height_m).map((p) =>
      p.applyMatrix4(anchor.matrixWorld),
    );
  }
  const [cx, cy, cz] = fallback.centre;
  return local(fallback.width, fallback.height).map((p) => p.add(new Vector3(cx, cy, cz)));
}

export async function startLab(canvas: HTMLCanvasElement, status: HTMLElement, base: string) {
  const device = {
    devicePixelRatio: window.devicePixelRatio,
    coarsePointer: matchMedia('(pointer: coarse)').matches,
    narrow: window.innerWidth < 600,
    saveData: Boolean(
      (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData,
    ),
  };
  const tier = tierFor(device);
  const state: LabState = {
    ready: false,
    renders: 0,
    drawCalls: 0,
    triangles: 0,
    pixelRatio: pixelRatioFor(device),
    tier,
    anchors: 'fallback',
  };
  window.__lab = state;

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: tier === 'desktop' });
  } catch (error) {
    state.error = String(error);
    status.textContent =
      'This device could not start WebGL. The 2D book will cover this case (F09).';
    return;
  }
  renderer.setPixelRatio(state.pixelRatio);

  const scene = new Scene();
  scene.background = new Color('#3b2f2a');
  scene.add(new HemisphereLight(0xfff4e0, 0x2a2018, 1.4));
  const light = new DirectionalLight(0xffffff, 1.6);
  light.position.set(-0.3, 0.8, -0.5); // above and in front, from the reader's side (−Z)
  scene.add(light);

  const gltf = await new GLTFLoader().loadAsync(`${base}${MODEL_PATHS[tier]}`);
  scene.add(gltf.scene);
  gltf.scene.updateMatrixWorld(true);

  const verso = gltf.scene.getObjectByName(PAGE_ANCHORS.verso);
  const recto = gltf.scene.getObjectByName(PAGE_ANCHORS.recto);
  state.anchors = verso && recto ? 'model' : 'fallback';
  for (const [anchor, fallback, color] of [
    [verso, FALLBACK_PAGES.verso, 0x2f6fde],
    [recto, FALLBACK_PAGES.recto, 0xe0782d],
  ] as const) {
    const corners = pageCorners(anchor, fallback);
    scene.add(
      new LineLoop(new BufferGeometry().setFromPoints(corners), new LineBasicMaterial({ color })),
    );
    // A translucent fill as well: a one-pixel line on the edge of a box is easy to miss.
    const fill = new BufferGeometry().setFromPoints(corners);
    fill.setIndex([0, 1, 2, 0, 2, 3]);
    scene.add(
      new Mesh(
        fill,
        new MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.3,
          side: DoubleSide,
          // three.js draws transparent double-sided materials twice (back faces, then front) to
          // sort them better; a flat fill does not need it, so one draw call instead of two.
          forceSinglePass: true,
          depthWrite: false,
        }),
      ),
    );
  }

  // Frame the whole scene from the reader's side: behind −Z, 60° above the desk.
  const camera = new PerspectiveCamera(35, 1, 0.01, 10);
  const bounds = new Box3().setFromObject(gltf.scene).getBoundingSphere(new Sphere());
  const elevation = (60 * Math.PI) / 180;
  const direction = new Vector3(0, Math.sin(elevation), -Math.cos(elevation));

  const render = () => {
    renderer.render(scene, camera);
    state.renders++;
    state.drawCalls = renderer.info.render.calls;
    state.triangles = renderer.info.render.triangles;
  };

  const resize = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Distance at which the bounding sphere fits the narrower of the two fields of view.
    const vertical = (camera.fov * Math.PI) / 180;
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * camera.aspect);
    const distance = bounds.radius / Math.sin(Math.min(vertical, horizontal) / 2);
    camera.position.copy(bounds.center).addScaledVector(direction, distance);
    camera.lookAt(bounds.center);
    camera.updateProjectionMatrix();
    render();
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  state.ready = true;
  status.textContent =
    `${MODEL_PATHS[tier]}: ${state.drawCalls} draw calls, ${state.triangles} triangles, ` +
    `${state.tier} tier at pixel ratio ${state.pixelRatio}, pages from the ${state.anchors === 'model' ? 'model’s anchors' : 'fallback values'}.`;
}
