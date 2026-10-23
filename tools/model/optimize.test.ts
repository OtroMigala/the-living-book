import { Document } from '@gltf-transform/core';
import { KHRMaterialsTransmission } from '@gltf-transform/extensions';
import { describe, expect, it } from 'vitest';
import { CREDITS, optimize } from './optimize.ts';

/** A glass material with transmission, on a mesh, beside an empty anchor node with extras. */
function scene(): Document {
  const doc = new Document();
  const transmission = doc.createExtension(KHRMaterialsTransmission);
  const glass = doc
    .createMaterial('Magnifier')
    .setAlphaMode('BLEND')
    .setExtension(
      'KHR_materials_transmission',
      transmission.createTransmission().setTransmissionFactor(1),
    );
  const buffer = doc.createBuffer();
  const position = doc
    .createAccessor()
    .setType('VEC3')
    .setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]))
    .setBuffer(buffer);
  const mesh = doc
    .createMesh()
    .addPrimitive(doc.createPrimitive().setAttribute('POSITION', position).setMaterial(glass));
  const anchor = doc.createNode('page_left').setExtras({ width_m: 0.17, height_m: 0.2 });
  doc
    .createScene()
    .addChild(doc.createNode('Magnifier').setMesh(mesh))
    .addChild(doc.createNode('Open_book').addChild(anchor));
  return doc;
}

describe('optimize', () => {
  it('removes the transmission and keeps the glass blended', async () => {
    const doc = scene();
    await optimize(doc, 'mobile', null);
    const glass = doc.getRoot().listMaterials()[0];
    expect(glass?.getExtension('KHR_materials_transmission')).toBeNull();
    expect(glass?.getAlphaMode()).toBe('BLEND');
    expect(
      doc
        .getRoot()
        .listExtensionsUsed()
        .map((e) => e.extensionName),
    ).not.toContain('KHR_materials_transmission');
  });

  it('keeps the empty page anchors that prune would remove', async () => {
    const doc = scene();
    await optimize(doc, 'mobile', null);
    const names = doc
      .getRoot()
      .listNodes()
      .map((n) => n.getName());
    expect(names).toContain('page_left');
  });

  it('writes the credits CC BY-SA asks for into asset.extras', async () => {
    const doc = scene();
    await optimize(doc, 'desktop', null);
    expect(doc.getRoot().getAsset().extras).toMatchObject(CREDITS);
  });
});
