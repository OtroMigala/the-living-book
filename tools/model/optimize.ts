// Turns the source model into the file the app loads for one quality tier (spec 03, Stage 6).
// Three changes: the magnifier's glass loses its transmission (F12 dropped; BR6 allows no extra
// pass on mobile), the textures are resized for the tier and re-encoded as WebP (BB4, BM1), and
// the credits go into asset.extras (K01). Transforms of a Document; optimize-cli.ts does the I/O.

import type { Document } from '@gltf-transform/core';
import { KHRMaterialsTransmission } from '@gltf-transform/extensions';
import { dedup, prune, textureCompress } from '@gltf-transform/functions';
import type { Tier } from '../../src/three/tiers.ts';

/** What CC BY-SA 4.0 asks the file to carry: title, author, source, license, and what changed. */
export const CREDITS = {
  title: 'Books with magnifier',
  author: 'shuvalov.di',
  source: 'https://sketchfab.com/3d-models/books-with-magnifier-cc153ce6258b4e538d9fc7da5b5d0fe4',
  license: 'CC BY-SA 4.0',
  changes:
    'Edited by Juan Alejandro (2026-10-22): page anchors added, magnifier and closed books moved. ' +
    'Optimized for the web: textures resized and re-encoded, glass transmission removed.',
} as const;

/**
 * Longest side of every texture, px. The GPU holds a texture as RGBA8 with mipmaps, 4 × 4/3 bytes
 * a texel whatever the file's encoding, so memory (BM1) depends on this size alone: 15 maps at
 * 512² are 20 MiB, at 1024² 80 MiB.
 */
export const TEXTURE_SIZE: Record<Tier, number> = { mobile: 512, desktop: 1024 };

/**
 * Removes KHR_materials_transmission from every material. Transmission renders the scene behind
 * the glass into a texture every frame (R06). The author also painted the glass nearly transparent
 * in the base colour's alpha (about 10% opaque where it transmits), which is what a glTF viewer
 * without transmission shows: the glass keeps that, as plain alpha blending.
 */
export function dropTransmission(doc: Document): void {
  for (const ext of doc.getRoot().listExtensionsUsed()) {
    if (ext.extensionName === KHRMaterialsTransmission.EXTENSION_NAME) ext.dispose();
  }
}

export function setCredits(doc: Document): void {
  const asset = doc.getRoot().getAsset();
  const extras = (asset.extras ?? {}) as Record<string, unknown>;
  asset.extras = { ...extras, ...CREDITS };
}

/** The whole pipeline for one tier. `encoder` is the sharp module (Node only). */
export async function optimize(doc: Document, tier: Tier, encoder: unknown): Promise<void> {
  dropTransmission(doc);
  setCredits(doc);
  const size = TEXTURE_SIZE[tier];
  await doc.transform(
    dedup(),
    // keepLeaves: the page anchors are empty nodes with no children, which prune would remove.
    prune({ keepLeaves: true }),
    textureCompress({ encoder, targetFormat: 'webp', resize: [size, size] }),
  );
}
