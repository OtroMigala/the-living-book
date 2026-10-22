// Reads a .glb file and reports what it will cost: triangles, draw calls, textures and an estimate
// of GPU memory. Pure functions over a byte array, no dependencies (gltf-transform would do more,
// but its license, BlueOak-1.0.0, is outside C02's allowlist and we only need to read).
//
// GLB layout (glTF 2.0 spec, "Binary glTF Layout"):
//   12-byte header: magic "glTF", version 2, total length
//   chunk 0: [length u32][type "JSON"][UTF-8 JSON]
//   chunk 1: [length u32][type "BIN\0"][binary buffer]   (optional)
// All integers are little-endian.

export interface Gltf {
  asset?: { generator?: string; extras?: Record<string, unknown> };
  extensionsUsed?: string[];
  scene?: number;
  scenes?: { nodes?: number[] }[];
  nodes?: GltfNode[];
  meshes?: { name?: string; primitives: GltfPrimitive[] }[];
  materials?: GltfMaterial[];
  textures?: { source?: number }[];
  images?: { name?: string; mimeType?: string; bufferView?: number; uri?: string }[];
  accessors?: GltfAccessor[];
  bufferViews?: { buffer: number; byteOffset?: number; byteLength: number }[];
}

export interface GltfNode {
  name?: string;
  mesh?: number;
  children?: number[];
  matrix?: number[];
  translation?: number[];
  rotation?: number[];
  scale?: number[];
}

export interface GltfPrimitive {
  attributes: Record<string, number>;
  indices?: number;
  material?: number;
  mode?: number;
}

export interface GltfAccessor {
  bufferView?: number;
  componentType: number;
  count: number;
  type: string;
  min?: number[];
  max?: number[];
}

interface TextureRef {
  index: number;
}

export interface GltfMaterial {
  name?: string;
  pbrMetallicRoughness?: {
    baseColorTexture?: TextureRef;
    metallicRoughnessTexture?: TextureRef;
  };
  normalTexture?: TextureRef;
  occlusionTexture?: TextureRef;
  emissiveTexture?: TextureRef;
  extensions?: Record<string, Record<string, unknown>>;
}

export interface Glb {
  json: Gltf;
  bin: Uint8Array | null;
}

const MAGIC_GLTF = 0x46546c67; // "glTF" read as a little-endian u32
const CHUNK_JSON = 0x4e4f534a; // "JSON"
const CHUNK_BIN = 0x004e4942; // "BIN\0"

export function parseGlb(bytes: Uint8Array): Glb {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength < 20 || view.getUint32(0, true) !== MAGIC_GLTF) {
    throw new Error('not a GLB file (bad magic)');
  }
  const version = view.getUint32(4, true);
  if (version !== 2) throw new Error(`unsupported GLB version ${version}`);

  let json: Gltf | null = null;
  let bin: Uint8Array | null = null;
  let offset = 12;
  while (offset + 8 <= bytes.byteLength) {
    const length = view.getUint32(offset, true);
    const type = view.getUint32(offset + 4, true);
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === CHUNK_JSON) json = JSON.parse(new TextDecoder().decode(data)) as Gltf;
    else if (type === CHUNK_BIN) bin = data;
    offset += 8 + length; // chunks are padded to 4 bytes, and `length` includes the padding
  }
  if (json === null) throw new Error('GLB has no JSON chunk');
  return { json, bin };
}

/** Bytes per component, from the glTF componentType codes (which are the WebGL enums). */
const COMPONENT_BYTES: Record<number, number> = {
  5120: 1,
  5121: 1,
  5122: 2,
  5123: 2,
  5125: 4,
  5126: 4,
};
const TYPE_COMPONENTS: Record<string, number> = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT2: 4,
  MAT3: 9,
  MAT4: 16,
};

/** Size of an accessor's data once uploaded as a GPU buffer (no interleaving padding). */
export function accessorBytes(a: GltfAccessor): number {
  return a.count * (COMPONENT_BYTES[a.componentType] ?? 0) * (TYPE_COMPONENTS[a.type] ?? 0);
}

/**
 * Width and height from the image header, without decoding the pixels.
 * PNG: the IHDR chunk always comes first; width and height are big-endian u32 at bytes 16 and 20.
 * JPEG: walk the markers until a Start Of Frame (SOFn), which holds height then width (u16, BE).
 */
export function imageSize(bytes: Uint8Array): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const isPng = bytes.byteLength >= 24 && view.getUint32(0) === 0x89504e47;
  if (isPng) return { width: view.getUint32(16), height: view.getUint32(20) };

  const isJpeg = bytes.byteLength >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8;
  if (!isJpeg) return null;
  let i = 2;
  while (i + 9 < bytes.byteLength) {
    if (bytes[i] !== 0xff) return null;
    const marker = bytes[i + 1] ?? 0;
    // SOF0..SOF15, except DHT (C4), JPG (C8) and DAC (CC), which share the range.
    const isSof = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isSof) return { height: view.getUint16(i + 5), width: view.getUint16(i + 7) };
    i += 2 + view.getUint16(i + 2); // the segment length counts itself but not the marker
  }
  return null;
}

/**
 * GPU memory of an uncompressed RGBA8 texture with a full mipmap chain.
 * Each mip level is a quarter of the previous one, so the chain adds 1/4 + 1/16 + ... ≈ 1/3.
 * PNG or JPEG bytes on disk say nothing about this: the GPU stores decoded pixels.
 */
export function textureGpuBytes(width: number, height: number, mipmaps = true): number {
  const base = width * height * 4;
  return mipmaps ? Math.round((base * 4) / 3) : base;
}

// --- Transforms -----------------------------------------------------------------------------
// Column-major 4×4 matrices, as glTF stores them.

type Mat4 = number[];

const IDENTITY: Mat4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

export function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Array<number>(16).fill(0);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += (a[k * 4 + row] ?? 0) * (b[col * 4 + k] ?? 0);
      out[col * 4 + row] = sum;
    }
  }
  return out;
}

/** Local matrix of a node: its `matrix`, or T · R · S built from translation, rotation, scale. */
export function localMatrix(node: GltfNode): Mat4 {
  if (node.matrix) return node.matrix;
  const [tx = 0, ty = 0, tz = 0] = node.translation ?? [];
  const [x = 0, y = 0, z = 0, w = 1] = node.rotation ?? [];
  const [sx = 1, sy = 1, sz = 1] = node.scale ?? [];
  // Rotation matrix of the unit quaternion (x, y, z, w), each column scaled by S.
  return [
    (1 - 2 * (y * y + z * z)) * sx,
    2 * (x * y + z * w) * sx,
    2 * (x * z - y * w) * sx,
    0,
    2 * (x * y - z * w) * sy,
    (1 - 2 * (x * x + z * z)) * sy,
    2 * (y * z + x * w) * sy,
    0,
    2 * (x * z + y * w) * sz,
    2 * (y * z - x * w) * sz,
    (1 - 2 * (x * x + y * y)) * sz,
    0,
    tx,
    ty,
    tz,
    1,
  ];
}

export function transformPoint(m: Mat4, p: number[]): number[] {
  const [x = 0, y = 0, z = 0] = p;
  return [0, 1, 2].map(
    (r) => (m[r] ?? 0) * x + (m[4 + r] ?? 0) * y + (m[8 + r] ?? 0) * z + (m[12 + r] ?? 0),
  );
}

export interface Box {
  min: number[];
  max: number[];
}

/** Axis-aligned box of a local box after a transform: transform its 8 corners and re-bound them. */
export function transformBox(m: Mat4, box: Box): Box {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let corner = 0; corner < 8; corner++) {
    const p = [0, 1, 2].map((axis) =>
      corner & (1 << axis) ? (box.max[axis] ?? 0) : (box.min[axis] ?? 0),
    );
    const q = transformPoint(m, p);
    for (let axis = 0; axis < 3; axis++) {
      min[axis] = Math.min(min[axis] ?? Infinity, q[axis] ?? 0);
      max[axis] = Math.max(max[axis] ?? -Infinity, q[axis] ?? 0);
    }
  }
  return { min, max };
}

// --- Report -----------------------------------------------------------------------------------

export interface MeshNodeReport {
  node: string;
  path: string;
  mesh: string;
  primitives: number;
  vertices: number;
  triangles: number;
  materials: string[];
  bounds: Box;
}

export interface ImageReport {
  index: number;
  name: string;
  mimeType: string;
  fileBytes: number;
  width: number;
  height: number;
  gpuBytes: number;
  usedAs: string[];
}

export interface Report {
  generator: string;
  extensionsUsed: string[];
  nodes: number;
  meshNodes: MeshNodeReport[];
  drawCalls: number;
  triangles: number;
  vertices: number;
  geometryGpuBytes: number;
  images: ImageReport[];
  textureGpuBytes: number;
  sceneBounds: Box;
}

const TRIANGLES = 4;

/** Which texture slots each image fills, e.g. "Open_book_Mat.baseColor". */
function textureUses(json: Gltf): Map<number, string[]> {
  const uses = new Map<number, string[]>();
  const add = (ref: TextureRef | undefined, label: string) => {
    if (!ref) return;
    const image = json.textures?.[ref.index]?.source;
    if (image === undefined) return;
    uses.set(image, [...(uses.get(image) ?? []), label]);
  };
  (json.materials ?? []).forEach((m, i) => {
    const name = m.name ?? `material ${i}`;
    add(m.pbrMetallicRoughness?.baseColorTexture, `${name}.baseColor`);
    add(m.pbrMetallicRoughness?.metallicRoughnessTexture, `${name}.metallicRoughness`);
    add(m.normalTexture, `${name}.normal`);
    add(m.occlusionTexture, `${name}.occlusion`);
    add(m.emissiveTexture, `${name}.emissive`);
    for (const [ext, props] of Object.entries(m.extensions ?? {})) {
      for (const [key, value] of Object.entries(props)) {
        if (key.endsWith('Texture')) add(value as TextureRef, `${name}.${ext}.${key}`);
      }
    }
  });
  return uses;
}

export function report(glb: Glb): Report {
  const { json, bin } = glb;
  const accessors = json.accessors ?? [];
  const nodes = json.nodes ?? [];
  const meshNodes: MeshNodeReport[] = [];
  const countedAccessors = new Set<number>();
  let geometryGpuBytes = 0;
  const sceneBounds: Box = {
    min: [Infinity, Infinity, Infinity],
    max: [-Infinity, -Infinity, -Infinity],
  };

  const visit = (index: number, parent: Mat4, path: string) => {
    const node = nodes[index];
    if (!node) return;
    const name = node.name ?? `node ${index}`;
    const world = multiply(parent, localMatrix(node));
    const here = path ? `${path} / ${name}` : name;
    const mesh = node.mesh === undefined ? undefined : json.meshes?.[node.mesh];
    if (mesh) {
      let vertices = 0;
      let triangles = 0;
      const materials: string[] = [];
      const bounds: Box = {
        min: [Infinity, Infinity, Infinity],
        max: [-Infinity, -Infinity, -Infinity],
      };
      for (const p of mesh.primitives) {
        const position = accessors[p.attributes.POSITION ?? -1];
        vertices += position?.count ?? 0;
        if ((p.mode ?? TRIANGLES) === TRIANGLES) {
          const indexed = p.indices === undefined ? undefined : accessors[p.indices];
          triangles += Math.floor((indexed?.count ?? position?.count ?? 0) / 3);
        }
        const material = p.material === undefined ? undefined : json.materials?.[p.material];
        materials.push(material?.name ?? 'default');
        for (const a of [
          ...Object.values(p.attributes),
          ...(p.indices === undefined ? [] : [p.indices]),
        ]) {
          if (countedAccessors.has(a)) continue;
          countedAccessors.add(a);
          const accessor = accessors[a];
          if (accessor) geometryGpuBytes += accessorBytes(accessor);
        }
        if (position?.min && position.max) {
          const box = transformBox(world, { min: position.min, max: position.max });
          for (let axis = 0; axis < 3; axis++) {
            bounds.min[axis] = Math.min(bounds.min[axis] ?? Infinity, box.min[axis] ?? Infinity);
            bounds.max[axis] = Math.max(bounds.max[axis] ?? -Infinity, box.max[axis] ?? -Infinity);
            sceneBounds.min[axis] = Math.min(
              sceneBounds.min[axis] ?? Infinity,
              box.min[axis] ?? Infinity,
            );
            sceneBounds.max[axis] = Math.max(
              sceneBounds.max[axis] ?? -Infinity,
              box.max[axis] ?? -Infinity,
            );
          }
        }
      }
      meshNodes.push({
        node: name,
        path: here,
        mesh: mesh.name ?? `mesh ${node.mesh}`,
        primitives: mesh.primitives.length,
        vertices,
        triangles,
        materials,
        bounds,
      });
    }
    for (const child of node.children ?? []) visit(child, world, here);
  };

  const scene = json.scenes?.[json.scene ?? 0];
  const roots = scene?.nodes ?? nodes.map((_, i) => i);
  for (const root of roots) visit(root, IDENTITY, '');

  const uses = textureUses(json);
  const images: ImageReport[] = (json.images ?? []).map((img, index) => {
    const view = img.bufferView === undefined ? undefined : json.bufferViews?.[img.bufferView];
    const data =
      view && bin
        ? bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength)
        : null;
    const size = data ? imageSize(data) : null;
    const width = size?.width ?? 0;
    const height = size?.height ?? 0;
    return {
      index,
      name: img.name ?? img.uri ?? `image ${index}`,
      mimeType: img.mimeType ?? 'unknown',
      fileBytes: view?.byteLength ?? 0,
      width,
      height,
      gpuBytes: textureGpuBytes(width, height),
      usedAs: uses.get(index) ?? [],
    };
  });

  return {
    generator: json.asset?.generator ?? 'unknown',
    extensionsUsed: json.extensionsUsed ?? [],
    nodes: nodes.length,
    meshNodes,
    drawCalls: meshNodes.reduce((n, m) => n + m.primitives, 0),
    triangles: meshNodes.reduce((n, m) => n + m.triangles, 0),
    vertices: meshNodes.reduce((n, m) => n + m.vertices, 0),
    geometryGpuBytes,
    images,
    textureGpuBytes: images.reduce((n, i) => n + i.gpuBytes, 0),
    sceneBounds,
  };
}
