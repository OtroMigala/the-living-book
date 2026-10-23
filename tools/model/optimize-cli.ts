// npm run model:optimize — writes public/models/book-<tier>.glb, one per quality tier, from the
// edited source model. Check each with `npm run check:model -- <file> <tier>`.

import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import sharp from 'sharp';
import type { Tier } from '../../src/three/tiers.ts';
import { optimize } from './optimize.ts';

const SOURCE = 'assets-src/bookV3.glb';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

for (const tier of ['mobile', 'desktop'] satisfies Tier[]) {
  const doc = await io.read(SOURCE);
  await optimize(doc, tier, sharp);
  const out = `public/models/book-${tier}.glb`;
  const bytes = await io.writeBinary(doc);
  await io.write(out, doc);
  console.log(`model:optimize: ${out}, ${(bytes.byteLength / 1024 / 1024).toFixed(2)} MiB`);
}
