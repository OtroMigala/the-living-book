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
  MeshStandardMaterial,
  ShaderMaterial,
  type Texture,
  Vector2,
  Vector3,
  type WebGLProgramParametersWithUniforms,
} from 'three';
import { FALLBACK_PAGES, PAGE_LIFT, PAGE_PAPER } from './contract.ts';
import { curlPoint, SERIES_LIMIT } from './curl.ts';

/** Radians of bend halfway through the turn (0 for the rigid case). */
export const MAX_BEND = 1.2;

const page = FALLBACK_PAGES.recto;
export const PAGE_WIDTH = page.width;
const Z_MIN = page.centre[2] - page.height / 2;
const Z_MAX = page.centre[2] + page.height / 2;
/** The turning page rides just above the page block (twice the lift, above any static overlay). */
const Y0 = page.centre[1] + 2 * PAGE_LIFT;

/** The part of the page a sheet covers: its width from the spine, and its extent along it. */
export interface SheetExtent {
  width: number;
  zMin: number;
  zMax: number;
}

const WHOLE_PAGE: SheetExtent = { width: PAGE_WIDTH, zMin: Z_MIN, zMax: Z_MAX };

/**
 * A flat grid in page coordinates: widthSegments along s, heightSegments along the spine. Its
 * texture coordinates are the whole page's, so a sheet smaller than the page (the model's flat
 * paper, Stage 6) still prints the text where the page has it.
 */
export function pageGeometry(
  widthSegments: number,
  heightSegments: number,
  extent: SheetExtent = WHOLE_PAGE,
  breaks: readonly number[] = [],
): BufferGeometry {
  // Columns evenly spaced, plus one at each break (the corners of the paper's profile, Stage 6):
  // between two columns the sheet is straight, and a straight line between columns that miss a
  // corner of the paper's hump runs under it, where the model's paper hid the sheet.
  const even = Array.from(
    { length: widthSegments + 1 },
    (_, i) => (extent.width * i) / widthSegments,
  );
  const xs = [...new Set([...even, ...breaks.filter((s) => s > 0 && s < extent.width)])].sort(
    (a, b) => a - b,
  );
  const columns = xs.length;
  const rows = heightSegments + 1;
  const positions = new Float32Array(columns * rows * 3);
  const normals = new Float32Array(columns * rows * 3);
  const uvs = new Float32Array(columns * rows * 2);
  const v0 = (extent.zMin - Z_MIN) / (Z_MAX - Z_MIN);
  const dv = (extent.zMax - extent.zMin) / (Z_MAX - Z_MIN);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      const v = j * columns + i;
      const s = xs[i] ?? 0;
      const z = extent.zMin + ((extent.zMax - extent.zMin) * j) / heightSegments;
      positions.set([s, 0, z], v * 3);
      normals.set([0, 1, 0], v * 3);
      uvs.set([s / PAGE_WIDTH, v0 + (j / heightSegments) * dv], v * 2);
    }
  }
  // Two triangles per cell, counter-clockwise seen from above while the page lies flat towards −X,
  // so the front face is the page the reader sees before the turn.
  const indices: number[] = [];
  for (let j = 0; j < heightSegments; j++) {
    for (let i = 0; i < columns - 1; i++) {
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
//
// Stage 6, GPU only: a sheet of the model's paper turns about the spine where the paper meets it,
// and drapes over the paper of the pages under it (the uProfile arrays, from PAGE_PAPER): it lies
// on that paper wherever its bend would take it lower, so at rest it has the paper's shape, and
// its normal there is the model's, so it is lit and shaded as the paper is.
// The bend is a chunk of its own, shared by the text shader below and by the sheet made of the
// model's paper (paperSheetMaterial), which is three.js's MeshStandardMaterial: its shaders
// already define PI.
const PROFILE_POINTS = PAGE_PAPER.profile.length;
const curlChunk = /* glsl */ `
  uniform float uProgress;
  uniform float uMaxBend;
  uniform float uWidth;
  uniform float uY0;
  uniform float uCurlOnGpu;
  // The model's paper, at its vertices across the page (PAGE_PAPER): distance off the spine,
  // height relative to the pivot, lean (radians, the mean of the two faces meeting there, as the
  // model's smooth normals have it), and u on the front's page and the back's.
  uniform float uProfileS[${PROFILE_POINTS}];
  uniform float uProfileH[${PROFILE_POINTS}];
  uniform float uProfileLean[${PROFILE_POINTS}];
  uniform float uProfileFrontU[${PROFILE_POINTS}];
  uniform float uProfileBackU[${PROFILE_POINTS}];
  uniform float uProfileOn;
  #ifndef PI
  #define PI 3.141592653589793
  #endif
  const float SERIES_LIMIT = ${SERIES_LIMIT.toFixed(6)};

  // A value along the profile: linear between its vertices, like the model's mesh; constant past
  // its ends.
  float along(float s, float values[${PROFILE_POINTS}]) {
    float value = values[0];
    for (int i = 1; i < ${PROFILE_POINTS}; i++) {
      if (s >= uProfileS[i - 1]) {
        float t = clamp((s - uProfileS[i - 1]) / (uProfileS[i] - uProfileS[i - 1]), 0.0, 1.0);
        value = mix(values[i - 1], values[i], t);
      }
    }
    return value;
  }

  void sheetCurl(out vec3 p, out vec3 n) {
    p = position;
    n = normal;
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
      if (uProfileOn > 0.5) {
        // The leaf drapes over the pages under it: where its bend would take it below their
        // paper, it lies on the paper. At rest that is the paper's whole shape; lifted by its
        // edge, the outer part comes free first and the base stays on the hump, as with a book.
        // A smooth maximum, 3 mm wide, so the leaf bends where it leaves the paper instead of
        // creasing; its normal blends the paper's and the free leaf's the same way. (Scaling the
        // paper's shape down as the sheet rose sank it into the hump, and it creased there.)
        float paper = along(abs(x), uProfileH);
        float blend = clamp(0.5 + 0.5 * (y - paper) / 0.003, 0.0, 1.0);
        p.y = uY0 + mix(paper, y, blend) + 0.003 * blend * (1.0 - blend);
        float lean = along(abs(x), uProfileLean);
        vec3 paperNormal = vec3(x < 0.0 ? sin(lean) : -sin(lean), cos(lean), 0.0);
        // The front faces up lying on the right, down lying on the left: the paper's normal too.
        if (dot(paperNormal, n) < 0.0) paperNormal = -paperNormal;
        n = normalize(mix(paperNormal, n, blend));
      }
    }
  }
`;

const vertexShader = /* glsl */ `
  ${curlChunk}
  varying vec3 vNormal;
  varying vec2 vUv;

  void main() {
    vec3 p;
    vec3 n;
    sheetCurl(p, n);
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
// Stage 6: a page lying on the book is ink only (uPaperAlpha 0), on the model's own paper; a sheet
// turning over is paper and ink (uPaperAlpha 1). Both are drawn as transparent, so they share one
// shader program: three.js keys a program on being opaque or not, and a turn must not compile one.
const textFragmentShader = /* glsl */ `
  uniform vec3 uLight;
  uniform float uRestLight;
  uniform vec3 uPaper;
  uniform vec3 uInk;
  uniform sampler2D uFront;
  uniform sampler2D uBack;
  uniform float uShowText;
  uniform float uPaperAlpha;
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
    float a = ink * uShowText;
    vec3 paper = mix(uInk, uPaper, uPaperAlpha);
    gl_FragColor = vec4(mix(paper, uInk, a) * light, mix(a, 1.0, uPaperAlpha));
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

/**
 * The model's own paper on a turning sheet (Stage 6), so the sheet that lifts is the page it
 * lifts from. As large as the model's flat paper: a sheet the size of the whole page covered the
 * curve of its edge and the cover, and seemed to grow when it lifted. At rest it takes the
 * paper's shape (`profile`). Its paper is the model's textures, base colour and
 * occlusion-roughness-metalness, mapped per face (the front lies on the right page, the back on
 * the left: PAGE_PAPER in the contract), and three.js lights it as it lights the model.
 */
export interface SheetPaper {
  extent: SheetExtent;
  /** The paper's vertices across the page: metres off the spine. */
  s: number[];
  /** Their heights, relative to the sheet's pivot. */
  height: number[];
  /** Their lean, radians (profileLean). */
  lean: number[];
  /** Their u on the front's page (the recto, where the sheet lies before a turn forward) and the back's. */
  frontU: number[];
  backU: number[];
  /**
   * The height the sheet turns about at the spine: where the paper meets the spine, as a real
   * leaf is bound there. A pivot at the pages' height left the sheet's base hanging up there
   * mid-turn: it rose out of the gutter as a wall of its own.
   */
  pivot: number;
  map: Texture;
  /** The model's occlusion (red), roughness (green) and metalness (blue) texture. */
  orm: Texture;
  /** v at the paper's bottom and top, on the front's page and the back's. */
  frontV: Vector2;
  backV: Vector2;
  /** The paper's bottom and top, as fractions of the page's height. */
  z: Vector2;
}

/**
 * The lean of a profile at each of its points, as a mesh's smooth normals have it: the mean of the
 * angles of the two segments that meet there (one at the ends), radians.
 */
export function profileLean(profile: readonly (readonly [number, number])[]): number[] {
  const segment = profile.slice(1).map(([s, h], i) => {
    const [s0, h0] = profile[i] ?? [0, 0];
    return Math.atan2(h - h0, s - s0);
  });
  return profile.map((_, i) => {
    const sides = [segment[i - 1], segment[i]].filter((a) => a !== undefined);
    return sides.reduce((sum, a) => sum + a, 0) / Math.max(sides.length, 1);
  });
}

/** The sheet's paper from the model's open book textures (see SheetPaper). */
export function sheetPaper(map: Texture, orm: Texture): SheetPaper {
  const { profile, v, z } = PAGE_PAPER;
  const [zMin, zMax] = z;
  const height = (at: number) => (at - Z_MIN) / (Z_MAX - Z_MIN);
  const spine = profile[0][1];
  return {
    extent: { width: profile[profile.length - 1]?.[0] ?? PAGE_WIDTH, zMin, zMax },
    s: profile.map(([s]) => s),
    height: profile.map(([, h]) => h - spine),
    lean: profileLean(profile.map(([s, h]) => [s, h] as const)),
    frontU: profile.map(([, , , recto]) => recto),
    backU: profile.map(([, , verso]) => verso),
    // A lift above the paper, as the pages lie a lift above it: no fight for the same depth.
    pivot: spine + PAGE_LIFT,
    map,
    orm,
    frontV: new Vector2(v.recto[0], v.recto[1]),
    backV: new Vector2(v.verso[0], v.verso[1]),
    z: new Vector2(height(zMin), height(zMax)),
  };
}

// The paper sheet's fragment: the model's textures where this point of the sheet lies on the
// model's page (u as the model has it at the same distance from the spine, from the vertex
// shader; v with the height), the page's ink on top, and the occlusion, roughness and metalness
// of the same place.
const paperChunk = /* glsl */ `
  uniform sampler2D uPaperMap;
  uniform sampler2D uOrmMap;
  uniform vec2 uPaperFrontV;
  uniform vec2 uPaperBackV;
  uniform vec2 uPaperZ;
  uniform sampler2D uFront;
  uniform sampler2D uBack;
  uniform float uShowText;
  uniform vec3 uInkSrgb;
  varying vec2 vSheetUv;
  varying vec2 vSheetU;
`;
const paperMapFragment = /* glsl */ `
  vec2 sheetV = gl_FrontFacing ? uPaperFrontV : uPaperBackV;
  vec2 sheetAtlasUv = vec2(
    gl_FrontFacing ? vSheetU.x : vSheetU.y,
    mix(sheetV.x, sheetV.y, clamp((vSheetUv.y - uPaperZ.x) / (uPaperZ.y - uPaperZ.x), 0.0, 1.0))
  );
  // The back is read from the other side, so its text is mirrored across the page.
  float sheetInk = uShowText * (gl_FrontFacing
    ? texture2D(uFront, vSheetUv).a
    : texture2D(uBack, vec2(1.0 - vSheetUv.x, vSheetUv.y)).a);
  diffuseColor.rgb *= texture2D(uPaperMap, sheetAtlasUv).rgb;
  vec3 sheetOrm = texture2D(uOrmMap, sheetAtlasUv).rgb;
`;
// The ink goes on after the light, in the HTML page's colour: lit like the paper, its specular
// sheen greyed it, and the text changed tone the moment a page began to turn. It is mixed with
// the paper in sRGB, as browsers blend text: mixed in linear light, the letters' soft edges came
// out lighter, and the text thinner and greyer than the HTML it replaces.
const paperInkFragment = /* glsl */ `
  vec3 sheetSrgb = mix(outgoingLight * 12.92, 1.055 * pow(outgoingLight, vec3(1.0 / 2.4)) - 0.055,
    step(0.0031308, outgoingLight));
  sheetSrgb = mix(sheetSrgb, uInkSrgb, sheetInk);
  outgoingLight = mix(sheetSrgb / 12.92, pow((sheetSrgb + 0.055) / 1.055, vec3(2.4)),
    step(0.04045, sheetSrgb));
  #include <opaque_fragment>
`;

/**
 * Turns three.js's MeshStandardMaterial into the paper sheet: the bend in the vertex shader, the
 * model's paper and the ink in the fragment shader. Every sheet gets this same function, so
 * three.js gives them all one shader program, compiled once at the start (view3d.ts).
 */
function paperSheetShaders(this: MeshStandardMaterial, shader: WebGLProgramParametersWithUniforms) {
  Object.assign(shader.uniforms, this.userData.sheet);
  shader.vertexShader = shader.vertexShader
    .replace(
      '#include <common>',
      `#include <common>\n${curlChunk}\nvarying vec2 vSheetUv;\nvarying vec2 vSheetU;`,
    )
    .replace(
      '#include <beginnormal_vertex>',
      `vec3 sheetPosition;
      vec3 objectNormal;
      sheetCurl(sheetPosition, objectNormal);
      vSheetUv = uv;
      vSheetU = vec2(along(position.x, uProfileFrontU), along(position.x, uProfileBackU));`,
    )
    .replace('#include <begin_vertex>', 'vec3 transformed = sheetPosition;');
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\n${paperChunk}`)
    .replace('#include <map_fragment>', paperMapFragment)
    .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness * sheetOrm.g;')
    .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = metalness * sheetOrm.b;')
    .replace('#include <aomap_fragment>', 'reflectedLight.indirectDiffuse *= sheetOrm.r;')
    .replace('#include <opaque_fragment>', paperInkFragment);
}

function paperSheetMaterial(uniforms: ReturnType<typeof pageUniforms>, paper: SheetPaper) {
  const material = new MeshStandardMaterial({
    side: DoubleSide,
    // The model's factors: its texture's green and blue channels are the roughness and metalness.
    roughness: 1,
    metalness: 1,
    // Drawn after the ink-only pages under it, which write no depth (see turningPage).
    transparent: true,
    forceSinglePass: true,
  });
  material.userData.sheet = {
    ...uniforms,
    uPaperMap: { value: paper.map },
    uOrmMap: { value: paper.orm },
    uPaperFrontV: { value: paper.frontV },
    uPaperBackV: { value: paper.backV },
    uPaperZ: { value: paper.z },
    uInkSrgb: { value: INK },
  };
  material.onBeforeCompile = paperSheetShaders;
  return material;
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
    uPaperAlpha: { value: 1 },
    // Filled for a sheet of the model's paper (turningPage); a profile of increasing distances
    // all the same, so the shader's interpolation never divides by zero.
    uProfileS: { value: PAGE_PAPER.profile.map(([s]) => s as number) },
    uProfileH: { value: PAGE_PAPER.profile.map(() => 0) },
    uProfileLean: { value: PAGE_PAPER.profile.map(() => 0) },
    uProfileFrontU: { value: PAGE_PAPER.profile.map(() => 0) },
    uProfileBackU: { value: PAGE_PAPER.profile.map(() => 0) },
    uProfileOn: { value: 0 },
  };
}

export type CurlVariant = 'gpu' | 'cpu' | 'rigid';

/**
 * A flat page that lies still, with the text shader: four corners in scene coordinates, in the
 * reader's order (top-left, top-right, bottom-right, bottom-left). Its texture is read the way the
 * reader sees the page: u from left to right, v from bottom to top. `paper: false` draws the ink
 * alone, for a page lying on the model's own paper; it writes no depth, so the sheet that lifts
 * from it is never hidden by it.
 */
export function flatPage(corners: Vector3[], text: Texture | null, paper = true) {
  const geometry = new BufferGeometry().setFromPoints(corners);
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array([0, 1, 1, 1, 1, 0, 0, 0]), 2));
  const up = new Float32Array(12).map((_, i) => (i % 3 === 1 ? 1 : 0));
  geometry.setAttribute('normal', new BufferAttribute(up, 3));
  // Counter-clockwise seen from above, as the reader sees it: the front face is the printed side.
  geometry.setIndex([3, 2, 1, 3, 1, 0]);
  const uniforms = pageUniforms('rigid', { front: text, back: text });
  uniforms.uCurlOnGpu.value = 0; // the vertices are already in scene coordinates
  uniforms.uPaperAlpha.value = paper ? 1 : 0;
  const material = new ShaderMaterial({
    vertexShader,
    fragmentShader: textFragmentShader,
    side: DoubleSide,
    transparent: true,
    depthWrite: paper,
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
  paper?: SheetPaper,
) {
  const extent = paper?.extent ?? WHOLE_PAGE;
  const geometry = pageGeometry(widthSegments, heightSegments, extent, paper?.s);
  // Kept in a typed object, so setProgress can change uProgress without a lookup by name.
  const uniforms = pageUniforms(variant, text);
  uniforms.uWidth.value = extent.width;
  // Turning back, the edge must still trail the spine: the bend changes sign (see curl.ts).
  if (direction === 'backward') uniforms.uMaxBend.value = -uniforms.uMaxBend.value;
  if (paper) {
    uniforms.uProfileS.value = paper.s;
    uniforms.uProfileH.value = paper.height;
    uniforms.uProfileLean.value = paper.lean;
    uniforms.uProfileFrontU.value = paper.frontU;
    uniforms.uProfileBackU.value = paper.backU;
    uniforms.uY0.value = paper.pivot;
    uniforms.uProfileOn.value = 1;
  }
  const material = paper
    ? paperSheetMaterial(uniforms, paper)
    : new ShaderMaterial({
        vertexShader,
        fragmentShader: text ? textFragmentShader : fragmentShader,
        side: DoubleSide,
        // Opaque to the eye (uPaperAlpha 1), transparent to three.js: the same program as the pages.
        transparent: Boolean(text),
        uniforms,
      });
  const mesh = new Mesh(geometry, material);
  // Lying on the paper's shape, the sheet is below the plane of the ink-only pages under it, which
  // write no depth: drawn after them, it covers them wherever it lies.
  if (paper) mesh.renderOrder = 1;
  mesh.frustumCulled = false; // the shader moves the vertices, so the CPU-side bounds are wrong

  /** Sets the turn's progress (0 to 1). The CPU variant recomputes and uploads every vertex. */
  const setProgress = (progress: number) => {
    uniforms.uProgress.value = progress;
    if (variant !== 'cpu') return;
    const rest = geometry.userData.rest as Float32Array;
    const position = geometry.getAttribute('position') as BufferAttribute;
    const normal = geometry.getAttribute('normal') as BufferAttribute;
    for (let v = 0; v < position.count; v++) {
      const p = curlPoint(rest[v * 2] ?? 0, progress, uniforms.uMaxBend.value, extent.width);
      position.setXYZ(v, p.x, Y0 + p.y, rest[v * 2 + 1] ?? 0);
      normal.setXYZ(v, p.nx, p.ny, 0);
    }
    position.needsUpdate = true;
    normal.needsUpdate = true;
  };
  setProgress(0);
  return { mesh, setProgress, vertices: geometry.getAttribute('position').count };
}
