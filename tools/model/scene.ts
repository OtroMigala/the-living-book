// The scene around the books (Stage 6, spike D): a marquetry table on a Persian carpet, and a
// candle holder beside the open book, from their own sources, placed as the owner composed them,
// at their real sizes, simplified for each tier and credited (spec 03). Transforms of a Document;
// optimize-cli.ts reads the source files.
//
//   Where each piece goes comes from the owner's reference scene (Blender), which holds the same
//   book subtree as bookV3.glb under a root of its own scale and turn. One matrix maps that root
//   onto ours, W = M_ours(root) · M_ref(root)⁻¹, and W · M_ref(mesh) puts each mesh where the owner
//   did. The reference had the table at 0.694 of its real size against the books, so the furniture
//   was then grown about the point of the table top under the open book, by 1 / 0.694: the books
//   and the candle stay where they are, the table stands 0.85 m tall, and the carpet, grown again
//   about its own centre, lies at its real 1.88 × 1.20 m under the table's feet. The table top
//   meets the open book's lowest point, and so does the candle holder's foot. The placements
//   below are those results, in scene coordinates (metres).

import type { Document, Node, Scene } from '@gltf-transform/core';
import type { PBRSpecularGlossiness } from '@gltf-transform/extensions';
import {
  dedup,
  join,
  mergeDocuments,
  prune,
  simplify,
  textureCompress,
  weld,
} from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import type sharp from 'sharp';
import type { Tier } from '../../src/three/tiers.ts';

export interface Placement {
  /** Translation, metres. */
  t: [number, number, number];
  /** Rotation, a quaternion (x, y, z, w). */
  q: [number, number, number, number];
  /** Uniform scale: 1 for a model made in metres. */
  s: number;
}

/** What CC BY 4.0 asks a delivered file to carry: title, author, source, license, what changed. */
export interface Credit {
  title: string;
  author: string;
  source: string;
  license: string;
  changes: string;
}

export interface Furniture {
  /** The node that holds it in the delivered file. */
  node: string;
  /** Its source file, in assets-src/. */
  file: string;
  credits: Credit;
  /** Where each mesh goes, by the name of its node in the source. */
  meshes: Record<string, Placement>;
  /** The share of the source's triangles to keep, and the error allowed (a share of its size). */
  simplify?: Record<Tier, { ratio: number; error: number }>;
  /** Materials left out on a tier, by name. */
  leaveOut?: Partial<Record<Tier, string[]>>;
  /** The longest side of its textures, px; roughness at half that size. */
  texture: Record<Tier, number>;
}

const TABLE: Placement = {
  t: [-0.034067, -0.843854, 0.094731],
  q: [0.857207, 0, 0.514972, 0],
  s: 1,
};
const CARPET_TURN: Placement['q'] = [0, -0.123011, 0, 0.992405];
const CANDLE_TURN: Placement['q'] = [-0.606137, -0.36414, -0.36414, 0.606137];

export const FURNITURE: Furniture[] = [
  {
    node: 'Table',
    file: 'assets-src/marquetry_table.glb',
    credits: {
      title: 'Marquetry table',
      author: 'Virtual Museums of Małopolska',
      source: 'https://sketchfab.com/3d-models/marquetry-table-689d68be94b24799b588fd0936b5ddc0',
      license: 'CC BY 4.0',
      changes:
        'Placed under the book at its real size; geometry simplified, textures reduced and ' +
        're-encoded, and the specular-glossiness material converted to metal-roughness, for the web.',
    },
    meshes: { Object_2: TABLE, Object_3: TABLE, Object_4: TABLE },
    // Simplifying stops at the scan's texture seams before the share asked: 17,364 and 39,356
    // triangles are kept (spike D).
    simplify: { mobile: { ratio: 0.035, error: 0.02 }, desktop: { ratio: 0.15, error: 0.01 } },
    texture: { mobile: 512, desktop: 1024 },
  },
  {
    node: 'Carpet',
    file: 'assets-src/persian_malayer_carpet.glb',
    credits: {
      title: 'Persian Malayer Carpet',
      author: 'mfb64',
      source:
        'https://sketchfab.com/3d-models/persian-malayer-carpet-1120ca810d0c46289d3b7071103067ac',
      license: 'CC BY 4.0',
      changes:
        'Placed under the table at its real size; the geometry of its fringes simplified, and the ' +
        'fringes left out of the file for phones.',
    },
    meshes: {
      Object_4: { t: [-0.034067, -0.847249, 0.094731], q: CARPET_TURN, s: 1 },
      Object_6: { t: [-0.741021, -0.846169, -0.088465], q: CARPET_TURN, s: 1 },
      Object_7: { t: [-0.741021, -0.846169, -0.088465], q: CARPET_TURN, s: 1 },
      Object_8: { t: [-0.741021, -0.846169, -0.088465], q: CARPET_TURN, s: 1 },
      Object_10: { t: [0.679887, -0.846547, 0.27556], q: CARPET_TURN, s: 1 },
      Object_11: { t: [0.679887, -0.846547, 0.27556], q: CARPET_TURN, s: 1 },
      Object_12: { t: [0.679887, -0.846547, 0.27556], q: CARPET_TURN, s: 1 },
    },
    // The fringes are hundreds of separate threads: no simplifying closes them below 25,456
    // triangles, more than a phone's share (BR5), so the phone's file leaves them out.
    simplify: { mobile: { ratio: 1, error: 0 }, desktop: { ratio: 0.025, error: 0.08 } },
    leaveOut: { mobile: ['VELVET-GREEN__Budapest'] },
    texture: { mobile: 512, desktop: 1024 },
  },
  {
    node: 'Candle_holder',
    file: 'assets-src/candle_holder.glb',
    credits: {
      title: 'Candle Holder',
      author: 'Vanya Mazalevich',
      source: 'https://sketchfab.com/3d-models/candle-holder-38c0f8b4df1b41e092e8cdc623b3b6ff',
      license: 'CC BY 4.0',
      changes:
        'Placed beside the book, its candle made larger against the holder (as the owner composed ' +
        'it), and its textures reduced and re-encoded, for the web.',
    },
    // In the reference the candle is larger than the holder it stands in: each part keeps its own.
    meshes: {
      'Cylinder001_Material #33_0': {
        t: [-0.261043, -0.000693, 0.059758],
        q: CANDLE_TURN,
        s: 0.001211279,
      },
      'Cylinder002_Material #33_0': {
        t: [-0.239694, 0.060443, 0.099908],
        q: CANDLE_TURN,
        s: 0.001389412,
      },
      'Cylinder003_Material #31_0': {
        t: [-0.263728, 0.105559, 0.059745],
        q: CANDLE_TURN,
        s: 0.001557589,
      },
      'Cylinder005_Material #33_0': {
        t: [-0.264117, 0.214061, 0.059704],
        q: CANDLE_TURN,
        s: 0.001557589,
      },
      'Plane001_Material #35_0': {
        t: [-0.263845, 0.241874, 0.059733],
        q: [0, -0.514972, 0, 0.857207],
        s: 0.001557589,
      },
      'Plane002_Material #35_0': {
        t: [-0.263845, 0.241874, 0.059733],
        q: [0, 0.970277, 0, -0.241997],
        s: 0.001557589,
      },
    },
    texture: { mobile: 256, desktop: 256 },
  },
];

const SPECULAR_GLOSSINESS = 'KHR_materials_pbrSpecularGlossiness';

/**
 * Specular-glossiness into metal-roughness, which three.js draws (its loader dropped the old
 * extension): the diffuse map becomes the base colour, the material is not a metal, and roughness
 * is 1 − glossiness, glossiness being the alpha of the specular-glossiness map. The new
 * roughness map is PNG here; the tier's pass re-encodes it.
 */
export async function toMetalRoughness(doc: Document, encoder: typeof sharp): Promise<void> {
  for (const material of doc.getRoot().listMaterials()) {
    const old = material.getExtension<PBRSpecularGlossiness>(SPECULAR_GLOSSINESS);
    if (!old) continue;
    const diffuse = old.getDiffuseTexture();
    if (diffuse) material.setBaseColorTexture(diffuse);
    material.setMetallicFactor(0);
    const map = old.getSpecularGlossinessTexture()?.getImage();
    if (map) {
      const { data, info } = await encoder(map)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const pixels = info.width * info.height;
      const out = new Uint8Array(pixels * 3);
      const glossiness = old.getGlossinessFactor();
      for (let i = 0; i < pixels; i++) {
        out[i * 3] = 255; // no occlusion
        out[i * 3 + 1] = Math.round(255 - (data[i * 4 + 3] ?? 255) * glossiness);
        out[i * 3 + 2] = 0; // not a metal
      }
      const raw = { width: info.width, height: info.height, channels: 3 as const };
      const png = await encoder(out, { raw }).png().toBuffer();
      const roughness = doc
        .createTexture('roughness')
        .setImage(new Uint8Array(png))
        .setMimeType('image/png');
      material.setMetallicRoughnessTexture(roughness).setRoughnessFactor(1);
    } else {
      material.setRoughnessFactor(1 - old.getGlossinessFactor());
    }
    material.setExtension(SPECULAR_GLOSSINESS, null);
  }
  for (const ext of doc.getRoot().listExtensionsUsed()) {
    if (ext.extensionName === SPECULAR_GLOSSINESS) ext.dispose();
  }
}

/**
 * One piece of furniture, ready to merge: its meshes under one node named for it, each where its
 * placement says, the rest of its source's tree gone; the materials it leaves out on this tier
 * removed; then joined by material, simplified and its textures resized for the tier.
 */
export async function prepare(
  src: Document,
  piece: Furniture,
  tier: Tier,
  encoder: typeof sharp | null,
): Promise<void> {
  if (encoder) await toMetalRoughness(src, encoder);
  const root = src.getRoot();
  const holder = src.createNode(piece.node);
  for (const node of root.listNodes()) {
    const place = node.getMesh() ? piece.meshes[node.getName()] : undefined;
    if (!place) continue;
    for (const parent of node.listParents()) {
      if (parent !== holder && 'removeChild' in parent) (parent as Node | Scene).removeChild(node);
    }
    const [x, y, z, w] = place.q;
    const length = Math.hypot(x, y, z, w);
    node
      .setTranslation(place.t)
      .setRotation([x / length, y / length, z / length, w / length])
      .setScale([place.s, place.s, place.s]);
    holder.addChild(node);
  }
  const leftOut = new Set(piece.leaveOut?.[tier] ?? []);
  for (const mesh of root.listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      if (leftOut.has(primitive.getMaterial()?.getName() ?? '')) primitive.dispose();
    }
  }
  const scene = root.listScenes()[0] ?? src.createScene();
  for (const child of scene.listChildren()) scene.removeChild(child);
  scene.addChild(holder);
  const cut = piece.simplify?.[tier];
  await src.transform(
    prune(),
    weld(),
    join({ keepNamed: false }),
    ...(cut && cut.ratio < 1
      ? [simplify({ simplifier: MeshoptSimplifier, ratio: cut.ratio, error: cut.error })]
      : []),
    dedup(),
    prune(),
    ...(encoder
      ? [
          // Roughness at half the colour's size: a varnish's gloss varies slowly (BM1).
          textureCompress({
            encoder,
            targetFormat: 'webp',
            slots: /metallicRoughness/,
            resize: [piece.texture[tier] / 2, piece.texture[tier] / 2],
          }),
          textureCompress({
            encoder,
            targetFormat: 'webp',
            resize: [piece.texture[tier], piece.texture[tier]],
          }),
        ]
      : []),
  );
}

/**
 * The furniture merged into the books' document, beside the books, and credited in
 * asset.extras.furniture. `read` opens a source file.
 */
export async function addFurniture(
  doc: Document,
  tier: Tier,
  encoder: typeof sharp | null,
  read: (file: string) => Promise<Document>,
  pieces: Furniture[] = FURNITURE,
): Promise<void> {
  const scene = doc.getRoot().listScenes()[0] ?? doc.createScene();
  for (const piece of pieces) {
    const src = await read(piece.file);
    await prepare(src, piece, tier, encoder);
    const merged = mergeDocuments(doc, src);
    for (const from of src.getRoot().listScenes()) {
      const to = merged.get(from) as Scene | undefined;
      if (!to) continue;
      for (const child of to.listChildren()) {
        to.removeChild(child);
        scene.addChild(child);
      }
      to.dispose();
    }
  }
  // A GLB holds one buffer: every accessor into the first, the others dropped.
  const [buffer, ...others] = doc.getRoot().listBuffers();
  for (const accessor of doc.getRoot().listAccessors()) accessor.setBuffer(buffer ?? null);
  for (const other of others) other.dispose();
  const asset = doc.getRoot().getAsset();
  asset.extras = {
    ...((asset.extras ?? {}) as Record<string, unknown>),
    furniture: pieces.map((piece) => piece.credits),
  };
}
