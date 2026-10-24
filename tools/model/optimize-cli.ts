// npm run model:optimize — writes the model each quality tier loads (MODEL_PATHS, under public/)
// from the edited source model and the furniture around it. Runs in every build; the files are not
// committed (spec 03).

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import sharp from 'sharp';
import { MODEL_PATHS } from '../../src/three/contract.ts';
import type { Tier } from '../../src/three/tiers.ts';
import { optimize } from './optimize.ts';

const SOURCE = 'assets-src/bookV3.glb';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

for (const [tier, path] of Object.entries(MODEL_PATHS) as [Tier, string][]) {
  const doc = await io.read(SOURCE);
  await optimize(doc, tier, sharp, (file) => io.read(file));
  const out = join('public', path);
  const bytes = await io.writeBinary(doc);
  writeFileSync(out, bytes);
  console.log(`model:optimize: ${out}, ${(bytes.byteLength / 1024 / 1024).toFixed(2)} MiB`);
}
