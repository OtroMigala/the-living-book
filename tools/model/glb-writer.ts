// Writes a small .glb from a tree of nodes whose meshes are boxes. Enough for a placeholder model
// that satisfies the model contract (K03): same names, same scale, same places as the real one.
// The reader in tools/asset-report/glb.ts reads what this writes; a test checks the round trip.

export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number];
export type Rgba = [number, number, number, number];

export interface Box {
  min: Vec3;
  max: Vec3;
  color: Rgba;
}

export interface WriterNode {
  name: string;
  translation?: Vec3;
  rotation?: Quat;
  box?: Box;
  extras?: Record<string, unknown>;
  children?: WriterNode[];
}

// The 6 faces of a box: outward normal, and the 4 corners in counter-clockwise order seen from
// outside (glTF front faces are counter-clockwise). Corner [i,j,k] picks min (0) or max (1) per axis.
const FACES: { normal: Vec3; corners: [number, number, number][] }[] = [
  {
    normal: [1, 0, 0],
    corners: [
      [1, 0, 1],
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
    ],
  },
  {
    normal: [-1, 0, 0],
    corners: [
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
    ],
  },
  {
    normal: [0, 1, 0],
    corners: [
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [0, 1, 0],
    ],
  },
  {
    normal: [0, -1, 0],
    corners: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
  },
  {
    normal: [0, 0, 1],
    corners: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
  },
  {
    normal: [0, 0, -1],
    corners: [
      [1, 0, 0],
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
  },
];

/** 24 vertices (4 per face, so each face has its own flat normal) and 36 indices. */
export function boxGeometry(box: Box) {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  for (const face of FACES) {
    const base = positions.length / 3;
    for (const c of face.corners) {
      positions.push(...c.map((bit, axis) => (bit ? box.max[axis] : box.min[axis]) ?? 0));
      normals.push(...face.normal);
    }
    indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  return { positions, normals, indices };
}

const pad4 = (n: number) => Math.ceil(n / 4) * 4;

export function writeGlb(roots: WriterNode[], assetExtras: Record<string, unknown>): Uint8Array {
  const json = {
    asset: {
      version: '2.0',
      generator: 'the-living-book tools/model/glb-writer.ts',
      extras: assetExtras,
    },
    scene: 0,
    scenes: [{ nodes: [] as number[] }],
    nodes: [] as Record<string, unknown>[],
    meshes: [] as Record<string, unknown>[],
    materials: [] as Record<string, unknown>[],
    accessors: [] as Record<string, unknown>[],
    bufferViews: [] as Record<string, unknown>[],
    buffers: [{ byteLength: 0 }],
  };
  const chunks: Uint8Array[] = [];
  let byteLength = 0;

  /** Appends data to the binary chunk (4-byte aligned) and returns its buffer view index. */
  const addView = (data: Uint8Array, target: number) => {
    const offset = byteLength;
    const padded = new Uint8Array(pad4(data.byteLength));
    padded.set(data);
    chunks.push(padded);
    byteLength += padded.byteLength;
    json.bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: data.byteLength, target });
    return json.bufferViews.length - 1;
  };

  const addBox = (name: string, box: Box) => {
    const g = boxGeometry(box);
    const ARRAY_BUFFER = 34962;
    const ELEMENT_ARRAY_BUFFER = 34963;
    const pos = addView(new Uint8Array(new Float32Array(g.positions).buffer), ARRAY_BUFFER);
    const nor = addView(new Uint8Array(new Float32Array(g.normals).buffer), ARRAY_BUFFER);
    const idx = addView(new Uint8Array(new Uint16Array(g.indices).buffer), ELEMENT_ARRAY_BUFFER);
    const first = json.accessors.length;
    json.accessors.push(
      { bufferView: pos, componentType: 5126, count: 24, type: 'VEC3', min: box.min, max: box.max },
      { bufferView: nor, componentType: 5126, count: 24, type: 'VEC3' },
      { bufferView: idx, componentType: 5123, count: 36, type: 'SCALAR' },
    );
    const transparent = box.color[3] < 1;
    json.materials.push({
      name: `${name}_material`,
      pbrMetallicRoughness: { baseColorFactor: box.color, metallicFactor: 0, roughnessFactor: 0.9 },
      ...(transparent ? { alphaMode: 'BLEND' } : {}),
    });
    json.meshes.push({
      name,
      primitives: [
        {
          attributes: { POSITION: first, NORMAL: first + 1 },
          indices: first + 2,
          material: json.materials.length - 1,
        },
      ],
    });
    return json.meshes.length - 1;
  };

  const addNode = (node: WriterNode): number => {
    const index = json.nodes.length;
    const entry: Record<string, unknown> = { name: node.name };
    json.nodes.push(entry);
    if (node.translation) entry.translation = node.translation;
    if (node.rotation) entry.rotation = node.rotation;
    if (node.extras) entry.extras = node.extras;
    if (node.box) entry.mesh = addBox(node.name, node.box);
    if (node.children?.length) entry.children = node.children.map(addNode);
    return index;
  };

  json.scenes[0]?.nodes.push(...roots.map(addNode));
  json.buffers[0] = { byteLength };

  const jsonBytes = new TextEncoder().encode(JSON.stringify(json));
  const jsonLength = pad4(jsonBytes.byteLength);
  const total = 12 + 8 + jsonLength + 8 + byteLength;
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x46546c67, true); // "glTF"
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);
  view.setUint32(12, jsonLength, true);
  view.setUint32(16, 0x4e4f534a, true); // "JSON"
  out.set(jsonBytes, 20);
  out.fill(0x20, 20 + jsonBytes.byteLength, 20 + jsonLength); // JSON is padded with spaces
  const binStart = 20 + jsonLength;
  view.setUint32(binStart, byteLength, true);
  view.setUint32(binStart + 4, 0x004e4942, true); // "BIN\0"
  let offset = binStart + 8;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
}
