// Turns the source model into the file the app loads for one quality tier (spec 03, Stage 6).
// Five changes: the magnifier's glass loses its transmission (F12 dropped; BR6 allows no extra
// pass on mobile), the open book's printed pages lose their printed text (the reader's text goes
// on that paper), the textures are resized for the tier and re-encoded as WebP (BB4, BM1), and
// the credits go into asset.extras (K01); and, given a way to read their sources, the furniture
// around the books joins them (scene.ts). Transforms of a Document; optimize-cli.ts does the I/O.

import type { Document } from '@gltf-transform/core';
import { KHRMaterialsTransmission } from '@gltf-transform/extensions';
import { dedup, prune, textureCompress } from '@gltf-transform/functions';
import type sharp from 'sharp';
import type { Tier } from '../../src/three/tiers.ts';
import { closeRegion } from './close.ts';
import { addFurniture } from './scene.ts';

/** What CC BY-SA 4.0 asks the file to carry: title, author, source, license, and what changed. */
export const CREDITS = {
  title: 'Books with magnifier',
  author: 'shuvalov.di',
  source: 'https://sketchfab.com/3d-models/books-with-magnifier-cc153ce6258b4e538d9fc7da5b5d0fe4',
  license: 'CC BY-SA 4.0',
  changes:
    'Edited by Juan Alejandro (2026-10-22): page anchors added, magnifier and closed books moved. ' +
    'Optimized for the web: printed text erased from the open pages, textures resized and ' +
    're-encoded, glass transmission removed.',
} as const;

/**
 * Longest side of every texture, px. The GPU holds a texture as RGBA8 with mipmaps, 4 × 4/3 bytes
 * a texel whatever the file's encoding, so memory (BM1) depends on this size alone: 15 maps at
 * 512² are 20 MiB, at 1024² 80 MiB.
 */
export const TEXTURE_SIZE: Record<Tier, number> = { mobile: 512, desktop: 1024 };

/**
 * Where the open book's two printed pages lie in its texture atlas, as fractions of its width and
 * height: measured from the paper's texture coordinates (Stage 6). Only the base colour carries
 * the printing; the normal and roughness maps are plain paper there.
 */
export const PRINTED_PAGES = { material: 'Open_book_Mat', u: [0.42, 1], v: [0, 0.395] } as const;

/** The closing's radius in px of a 1024 px atlas: its letters are 1–2 px strokes; 2 left dots. */
const CLOSING_RADIUS_AT_1024 = 3;

/**
 * Erases the printed text from the open book's pages, keeping the old paper: a morphological
 * closing (close.ts) over the pages' rectangle of the base colour texture.
 */
export async function blankPrintedPages(doc: Document, encoder: typeof sharp): Promise<void> {
  const texture = doc
    .getRoot()
    .listMaterials()
    .find((m) => m.getName() === PRINTED_PAGES.material)
    ?.getBaseColorTexture();
  const image = texture?.getImage();
  if (!texture || !image) return;
  const { data, info } = await encoder(image)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const [u0, u1] = PRINTED_PAGES.u;
  const [v0, v1] = PRINTED_PAGES.v;
  const left = Math.round(u0 * info.width);
  const top = Math.round(v0 * info.height);
  const rect = {
    left,
    top,
    width: Math.round(u1 * info.width) - left,
    height: Math.round(v1 * info.height) - top,
  };
  const radius = Math.max(1, Math.round((CLOSING_RADIUS_AT_1024 * info.width) / 1024));
  const closed = closeRegion(new Uint8Array(data), info.width, info.channels, rect, radius);
  const raw = { width: info.width, height: info.height, channels: info.channels };
  const png = await encoder(closed, { raw }).png().toBuffer();
  texture.setImage(new Uint8Array(png)).setMimeType('image/png');
}

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

/**
 * The whole pipeline for one tier. `encoder` is the sharp module (Node only); null skips images.
 * `read` opens the furniture's sources; without it the file holds the books alone.
 */
export async function optimize(
  doc: Document,
  tier: Tier,
  encoder: typeof sharp | null,
  read?: (file: string) => Promise<Document>,
): Promise<void> {
  dropTransmission(doc);
  setCredits(doc);
  if (encoder) await blankPrintedPages(doc, encoder);
  const size = TEXTURE_SIZE[tier];
  await doc.transform(
    dedup(),
    // keepLeaves: the page anchors are empty nodes with no children, which prune would remove.
    prune({ keepLeaves: true }),
    textureCompress({ encoder, targetFormat: 'webp', resize: [size, size] }),
  );
  // After the books' textures are encoded: the furniture's are encoded once, in their own pass,
  // and WebP encoded twice would lose detail twice.
  if (read) {
    await addFurniture(doc, tier, encoder, read);
    await doc.transform(dedup(), prune({ keepLeaves: true }));
  }
}
