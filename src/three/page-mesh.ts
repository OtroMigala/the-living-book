// The turning page for spike A, in two variants that draw the same shape (curl.ts):
//   GPU   the vertex shader bends a flat grid; the CPU only changes one number per frame
//   CPU   JavaScript recomputes every vertex and normal and uploads them each frame
// A third case, rigid, is the GPU variant with no bend: the cheapest possible turn.
//
// The grid is laid out in "page coordinates": x is the arc length s from the spine (0 to width)
// and z runs along the spine. The shader (or the CPU) turns that into scene coordinates.
//
// Spike B adds a second fragment shader that prints a page's text on the paper (front and back
// of the sheet), and flat pages that lie still with the same shader.

import {
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Mesh,
  ShaderMaterial,
  type Texture,
  Vector3,
} from 'three';
import { FALLBACK_PAGES, PAGE_LIFT } from './contract.ts';
import { curlPoint, SERIES_LIMIT } from './curl.ts';

/** Radians of bend halfway through the turn (0 for the rigid case). */
export const MAX_BEND = 1.2;

const page = FALLBACK_PAGES.recto;
export const PAGE_WIDTH = page.width;
const Z_MIN = page.centre[2] - page.height / 2;
const Z_MAX = page.centre[2] + page.height / 2;
/** The turning page rides just above the page block (twice the lift, above any static overlay). */
const Y0 = page.centre[1] + 2 * PAGE_LIFT;

/** A flat grid in page coordinates: widthSegments along s, heightSegments along the spine. */
export function pageGeometry(widthSegments: number, heightSegments: number): BufferGeometry {
  const columns = widthSegments + 1;
  const rows = heightSegments + 1;
  const positions = new Float32Array(columns * rows * 3);
  const normals = new Float32Array(columns * rows * 3);
  const uvs = new Float32Array(columns * rows * 2);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      const v = j * columns + i;
      const s = (PAGE_WIDTH * i) / widthSegments;
      const z = Z_MIN + ((Z_MAX - Z_MIN) * j) / heightSegments;
      positions.set([s, 0, z], v * 3);
      normals.set([0, 1, 0], v * 3);
      uvs.set([i / widthSegments, j / heightSegments], v * 2);
    }
  }
  // Two triangles per cell, counter-clockwise seen from above while the page lies flat towards −X,
  // so the front face is the page the reader sees before the turn.
  const indices: number[] = [];
  for (let j = 0; j < heightSegments; j++) {
    for (let i = 0; i < widthSegments; i++) {
      const a = j * columns + i;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  // Arc length and spine coordinate of every vertex, kept for the CPU variant.
  geometry.userData.rest = Float32Array.from(
    { length: columns * rows * 2 },
    (_, k) => positions[Math.floor(k / 2) * 3 + (k % 2 === 0 ? 0 : 2)] ?? 0,
  );
  return geometry;
}

// The same formulas as curl.ts, in GLSL. Kept side by side on purpose: a change to one must be
// made to the other. The browser test renders the GPU and CPU variants at the same progress and
// compares their pixels, so a mismatch between the two copies fails CI.
const vertexShader = /* glsl */ `
  uniform float uProgress;
  uniform float uMaxBend;
  uniform float uWidth;
  uniform float uY0;
  uniform float uCurlOnGpu;
  varying vec3 vNormal;
  varying vec2 vUv;
  const float PI = 3.141592653589793;
  const float SERIES_LIMIT = ${SERIES_LIMIT.toFixed(6)};

  void main() {
    vec3 p = position;
    vec3 n = normal;
    if (uCurlOnGpu > 0.5) {
      float s = position.x;
      float theta0 = PI * uProgress;
      float k = uMaxBend * sin(PI * uProgress) / uWidth;
      float theta = theta0 - k * s;
      float c = cos(theta0);
      float sn = sin(theta0);
      float x;
      float y;
      if (abs(k * uWidth) < SERIES_LIMIT) {
        float a = k * s * s / 2.0;
        float b = k * k * s * s * s / 6.0;
        x = -s * c - a * sn + b * c;
        y = s * sn - a * c - b * sn;
      } else {
        x = (sin(theta) - sn) / k;
        y = (cos(theta) - c) / k;
      }
      p = vec3(x, uY0 + y, position.z);
      n = vec3(sin(theta), cos(theta), 0.0);
    }
    vNormal = n;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

// Paper with a faint checker, so the bend is easy to see; a different tint on the back.
const fragmentShader = /* glsl */ `
  uniform vec3 uLight;
  varying vec3 vNormal;
  varying vec2 vUv;

  void main() {
    vec3 n = normalize(vNormal);
    if (!gl_FrontFacing) n = -n;
    float light = 0.6 + 0.4 * max(dot(n, uLight), 0.0);
    float checker = mod(floor(vUv.x * 8.0) + floor(vUv.y * 10.0), 2.0);
    vec3 front = mix(vec3(0.95, 0.91, 0.82), vec3(0.88, 0.83, 0.72), checker);
    vec3 back = mix(vec3(0.82, 0.88, 0.95), vec3(0.72, 0.80, 0.90), checker);
    gl_FragColor = vec4((gl_FrontFacing ? front : back) * light, 1.0);
  }
`;

// Spike B: paper with the page's text. The text arrives as a texture whose alpha is the ink's
// coverage, painted from the HTML page (page-text.ts). The light is divided by its value for a page
// lying flat, so a page at rest has exactly the paper and ink colours of the HTML page it replaces.
const textFragmentShader = /* glsl */ `
  uniform vec3 uLight;
  uniform float uRestLight;
  uniform vec3 uPaper;
  uniform vec3 uInk;
  uniform sampler2D uFront;
  uniform sampler2D uBack;
  uniform float uShowText;
  varying vec3 vNormal;
  varying vec2 vUv;

  void main() {
    vec3 n = normalize(vNormal);
    if (!gl_FrontFacing) n = -n;
    float light = (0.6 + 0.4 * max(dot(n, uLight), 0.0)) / uRestLight;
    // The back of the sheet is read from the other side, so its text is mirrored across the page.
    float ink = gl_FrontFacing
      ? texture2D(uFront, vUv).a
      : texture2D(uBack, vec2(1.0 - vUv.x, vUv.y)).a;
    gl_FragColor = vec4(mix(uPaper, uInk, ink * uShowText) * light, 1.0);
  }
`;

/** The light theme's --paper and --ink (tokens.css), in sRGB: a page is paper in any colour scheme. */
export const PAPER = new Vector3(0xf7, 0xf1, 0xe3).divideScalar(255);
export const INK = new Vector3(0x2b, 0x21, 0x18).divideScalar(255);
const LIGHT = new Vector3(-0.3, 0.8, -0.5).normalize();
const REST_LIGHT = 0.6 + 0.4 * Math.max(LIGHT.y, 0);

/** The text printed on each side of a sheet: front is seen before the turn, back after it. */
export interface PageText {
  front: Texture | null;
  back: Texture | null;
}

function pageUniforms(variant: CurlVariant, text: PageText | undefined) {
  return {
    uProgress: { value: 0 },
    uMaxBend: { value: variant === 'rigid' ? 0 : MAX_BEND },
    uWidth: { value: PAGE_WIDTH },
    uY0: { value: Y0 },
    uCurlOnGpu: { value: variant === 'cpu' ? 0 : 1 },
    uLight: { value: LIGHT },
    uRestLight: { value: REST_LIGHT },
    uPaper: { value: PAPER },
    uInk: { value: INK },
    uFront: { value: text?.front ?? null },
    uBack: { value: text?.back ?? null },
    uShowText: { value: 1 },
  };
}

export type CurlVariant = 'gpu' | 'cpu' | 'rigid';

/**
 * A flat page that lies still, with the text shader: four corners in scene coordinates, in the
 * reader's order (top-left, top-right, bottom-right, bottom-left). Its texture is read the way the
 * reader sees the page: u from left to right, v from bottom to top.
 */
export function flatPage(corners: Vector3[], text: Texture | null) {
  const geometry = new BufferGeometry().setFromPoints(corners);
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array([0, 1, 1, 1, 1, 0, 0, 0]), 2));
  const up = new Float32Array(12).map((_, i) => (i % 3 === 1 ? 1 : 0));
  geometry.setAttribute('normal', new BufferAttribute(up, 3));
  // Counter-clockwise seen from above, as the reader sees it: the front face is the printed side.
  geometry.setIndex([3, 2, 1, 3, 1, 0]);
  const uniforms = pageUniforms('rigid', { front: text, back: text });
  uniforms.uCurlOnGpu.value = 0; // the vertices are already in scene coordinates
  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader: textFragmentShader,
    side: DoubleSide,
    uniforms,
  });
  return { mesh: new Mesh(geometry, material), uniforms };
}

export function turningPage(
  variant: CurlVariant,
  widthSegments: number,
  heightSegments: number,
  text?: PageText,
  direction: 'forward' | 'backward' = 'forward',
) {
  const geometry = pageGeometry(widthSegments, heightSegments);
  // Kept in a typed object, so setProgress can change uProgress without a lookup by name.
  const uniforms = pageUniforms(variant, text);
  // Turning back, the edge must still trail the spine: the bend changes sign (see curl.ts).
  if (direction === 'backward') uniforms.uMaxBend.value = -uniforms.uMaxBend.value;
  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader: text ? textFragmentShader : fragmentShader,
    side: DoubleSide,
    uniforms,
  });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false; // the shader moves the vertices, so the CPU-side bounds are wrong

  /** Sets the turn's progress (0 to 1). The CPU variant recomputes and uploads every vertex. */
  const setProgress = (progress: number) => {
    uniforms.uProgress.value = progress;
    if (variant !== 'cpu') return;
    const rest = geometry.userData.rest as Float32Array;
    const position = geometry.getAttribute('position') as BufferAttribute;
    const normal = geometry.getAttribute('normal') as BufferAttribute;
    for (let v = 0; v < position.count; v++) {
      const p = curlPoint(rest[v * 2] ?? 0, progress, uniforms.uMaxBend.value, PAGE_WIDTH);
      position.setXYZ(v, p.x, Y0 + p.y, rest[v * 2 + 1] ?? 0);
      normal.setXYZ(v, p.nx, p.ny, 0);
    }
    position.needsUpdate = true;
    normal.needsUpdate = true;
  };
  setProgress(0);
  return { mesh, setProgress, vertices: geometry.getAttribute('position').count };
}
