import { Document, getBounds } from '@gltf-transform/core';
import { KHRMaterialsPBRSpecularGlossiness, type Transform } from '@gltf-transform/extensions';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  addFurniture,
  FURNITURE,
  type Furniture,
  keepDetail,
  prepare,
  toMetalRoughness,
} from './scene.ts';

/** A source like Sketchfab's: each mesh under wrapper nodes, one material per mesh. */
function source(materials: string[]): Document {
  const doc = new Document();
  const buffer = doc.createBuffer();
  const wrapper = doc.createNode('Sketchfab_model').setScale([100, 100, 100]);
  for (const [i, name] of materials.entries()) {
    const position = doc
      .createAccessor()
      .setType('VEC3')
      .setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]))
      .setBuffer(buffer);
    const mesh = doc.createMesh().addPrimitive(
      doc
        .createPrimitive()
        .setAttribute('POSITION', position)
        // Each its own colour: dedup merges materials that differ only by name.
        .setMaterial(doc.createMaterial(name).setBaseColorFactor([1, 1 / (i + 1), 1, 1])),
    );
    wrapper.addChild(doc.createNode(`Object_${i}`).setMesh(mesh));
  }
  doc.createScene().addChild(wrapper);
  return doc;
}

const credits = {
  title: 'Thing',
  author: 'Someone',
  source: 'https://example.org/thing',
  license: 'CC BY 4.0',
  changes: 'Placed.',
};

describe('prepare', () => {
  it('puts each mesh where its placement says, under one node named for the piece', async () => {
    const doc = source(['wood']);
    const piece: Furniture = {
      node: 'Thing',
      file: 'thing.glb',
      credits,
      // The wrapper's ×100 is gone: the placement is the whole transform, in scene coordinates.
      meshes: { Object_0: { t: [1, 2, 3], q: [0, 0, 0, 1], s: 0.5 } },
      texture: { mobile: 256, desktop: 256 },
    };
    await prepare(doc, piece, 'desktop', null);
    const scene = doc.getRoot().listScenes()[0];
    const holder = scene?.listChildren()[0];
    expect(holder?.getName()).toBe('Thing');
    const box = getBounds(holder as NonNullable<typeof holder>);
    expect(box.min).toEqual([1, 2, 3]);
    expect(box.max).toEqual([1.5, 2.5, 3]);
    expect(
      doc
        .getRoot()
        .listNodes()
        .map((n) => n.getName()),
    ).not.toContain('Sketchfab_model');
  });

  it('leaves out the materials a tier asks to, and only on that tier', async () => {
    const piece: Furniture = {
      node: 'Carpet',
      file: 'carpet.glb',
      credits,
      meshes: {
        Object_0: { t: [0, 0, 0], q: [0, 0, 0, 1], s: 1 },
        Object_1: { t: [0, 0, 0], q: [0, 0, 0, 1], s: 1 },
      },
      leaveOut: { mobile: ['fringe'] },
      texture: { mobile: 256, desktop: 256 },
    };
    const materials = async (tier: 'mobile' | 'desktop') => {
      const doc = source(['carpet', 'fringe']);
      await prepare(doc, piece, tier, null);
      return doc
        .getRoot()
        .listMaterials()
        .map((m) => m.getName())
        .sort();
    };
    expect(await materials('mobile')).toEqual(['carpet']);
    expect(await materials('desktop')).toEqual(['carpet', 'fringe']);
  });
});

describe('toMetalRoughness', () => {
  it('keeps the diffuse map as base colour, and makes roughness 1 − glossiness', async () => {
    const doc = new Document();
    const ext = doc.createExtension(KHRMaterialsPBRSpecularGlossiness);
    const png = (rgba: number[], width: number) =>
      sharp(new Uint8Array(rgba), { raw: { width, height: 1, channels: 4 } })
        .png()
        .toBuffer();
    const diffuse = doc
      .createTexture('diffuse')
      .setImage(new Uint8Array(await png([200, 150, 100, 255], 1)))
      .setMimeType('image/png');
    // Two texels: fully glossy (alpha 255) and fully matte (alpha 0).
    const glossiness = doc
      .createTexture('specularGlossiness')
      .setImage(new Uint8Array(await png([30, 30, 30, 255, 30, 30, 30, 0], 2)))
      .setMimeType('image/png');
    const material = doc
      .createMaterial('wood')
      .setExtension(
        'KHR_materials_pbrSpecularGlossiness',
        ext
          .createPBRSpecularGlossiness()
          .setDiffuseTexture(diffuse)
          .setSpecularGlossinessTexture(glossiness)
          .setGlossinessFactor(1),
      );
    await toMetalRoughness(doc, sharp);

    expect(material.getBaseColorTexture()).toBe(diffuse);
    expect(material.getMetallicFactor()).toBe(0);
    expect(material.getExtension('KHR_materials_pbrSpecularGlossiness')).toBeNull();
    const roughness = material.getMetallicRoughnessTexture()?.getImage();
    if (!roughness) throw new Error('no roughness map');
    const { data } = await sharp(roughness).raw().toBuffer({ resolveWithObject: true });
    // Green is roughness, blue is metalness: glossy → 0 rough, matte → 255 rough; never metal.
    expect([data[1], data[4]]).toEqual([0, 255]);
    expect([data[2], data[5]]).toEqual([0, 0]);
  });
});

describe('addFurniture', () => {
  it('merges every piece beside the books, and credits each with what changed', async () => {
    const books = source(['paper']);
    const piece = (node: string): Furniture => ({
      node,
      file: `${node}.glb`,
      credits: { ...credits, title: node },
      meshes: { Object_0: { t: [0, 0, 0], q: [0, 0, 0, 1], s: 1 } },
      texture: { mobile: 256, desktop: 256 },
    });
    await addFurniture(books, 'mobile', null, async () => source(['wood']), [
      piece('Table'),
      piece('Lamp'),
    ]);
    const names = books
      .getRoot()
      .listScenes()[0]
      ?.listChildren()
      .map((n) => n.getName());
    expect(names).toEqual(['Sketchfab_model', 'Table', 'Lamp']);
    expect(books.getRoot().listBuffers()).toHaveLength(1);
    const extras = books.getRoot().getAsset().extras as { furniture: { title: string }[] };
    expect(extras.furniture.map((c) => c.title)).toEqual(['Table', 'Lamp']);
  });
});

describe('FURNITURE', () => {
  it('stands the table and the carpet at their real size, and credits every piece', () => {
    for (const name of ['Table', 'Carpet']) {
      const piece = FURNITURE.find((p) => p.node === name);
      const scales = Object.values(piece?.meshes ?? {}).map((m) => m.s);
      expect(scales.length, name).toBeGreaterThan(0);
      expect(scales.every((s) => s === 1)).toBe(true);
    }
    for (const piece of FURNITURE) {
      expect(Object.values(piece.credits).every((v) => v.length > 0)).toBe(true);
    }
  });
});

describe('keepDetail', () => {
  it('moves the faces inside the region to a material of their own, its colour cut at full size', async () => {
    const doc = new Document();
    const buffer = doc.createBuffer();
    // Two triangles: one with its UVs in the top-left quarter, one across the rest. Eighths, which
    // float32 holds exactly, so the cut's pixels are exact too.
    const position = doc
      .createAccessor()
      .setType('VEC3')
      .setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 2, 0, 0, 2, 1, 0]))
      .setBuffer(buffer);
    const uv = doc
      .createAccessor()
      .setType('VEC2')
      .setArray(
        new Float32Array([
          0.125, 0.125, 0.25, 0.125, 0.125, 0.375, 0.625, 0.625, 0.875, 0.25, 0.875, 0.875,
        ]),
      )
      .setBuffer(buffer);
    const indices = doc
      .createAccessor()
      .setType('SCALAR')
      .setArray(new Uint16Array([0, 1, 2, 3, 4, 5]))
      .setBuffer(buffer);
    const wood = doc.createMaterial('wood');
    const mesh = doc
      .createMesh()
      .addPrimitive(
        doc
          .createPrimitive()
          .setAttribute('POSITION', position)
          .setAttribute('TEXCOORD_0', uv)
          .setIndices(indices)
          .setMaterial(wood),
      );
    const image = await sharp({
      create: { width: 200, height: 100, channels: 3, background: { r: 200, g: 150, b: 100 } },
    })
      .png()
      .toBuffer();
    await keepDetail(
      doc,
      wood,
      new Uint8Array(image),
      { tier: 'desktop', name: 'Top', region: [0, 0, 0.5, 0.5] },
      sharp,
    );
    const [rest, top] = mesh.listPrimitives();
    expect(Array.from(rest?.getIndices()?.getArray() ?? [])).toEqual([3, 4, 5]);
    expect(Array.from(top?.getIndices()?.getArray() ?? [])).toEqual([0, 1, 2]);
    expect(top?.getAttribute('TEXCOORD_0')).toBe(uv);
    const own = top?.getMaterial();
    expect(own?.getName()).toBe('Top');
    // The faces span u 0.125–0.25, v 0.125–0.375 of 200 × 100 px: x 25–50, y 12.5–37.5 (whole
    // pixels 12–38), and 8 px around.
    const cut = await sharp(Buffer.from(own?.getBaseColorTexture()?.getImage() ?? [])).metadata();
    expect([cut.width, cut.height]).toEqual([41, 42]);
    const transform = own
      ?.getBaseColorTextureInfo()
      ?.getExtension<Transform>('KHR_texture_transform');
    expect(transform?.getScale()).toEqual([200 / 41, 100 / 42]);
    expect(transform?.getOffset()).toEqual([-17 / 41, -4 / 42]);
    // A corner of the faces lands on the cut where it was on the whole: u 0.125 is x 25, 8 px in.
    expect((transform?.getOffset()[0] ?? 0) + (transform?.getScale()[0] ?? 0) * 0.125).toBeCloseTo(
      8 / 41,
    );
  });
});
