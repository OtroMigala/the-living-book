// The model contract (spec 03, K01 and K03) as the 3D code uses it. Every position is in scene
// coordinates: metres, +Y up, after all parent transforms. A test checks these numbers against the
// tables in specs/03-contract.md, so the spec and the code cannot drift apart.

import type { Tier } from './tiers.ts';

/** Nodes the app reads by exact name, at any depth of the hierarchy. */
export const REQUIRED_NODES = ['Open_book', 'Book_1', 'Book_2', 'Book_3', 'Magnifier'] as const;

/** Optional anchor empties marking each page (gap G03); the fallback below is used without them. */
export const PAGE_ANCHORS = { verso: 'page_left', recto: 'page_right' } as const;

export type Vec3 = [number, number, number];

export interface PageRect {
  /** Centre of the page rectangle, on the page surface. */
  centre: Vec3;
  /** Spine to outer edge, metres. */
  width: number;
  /** Bottom to top of the page, metres. */
  height: number;
}

/**
 * Where the reader is. Measured from the model's texture coordinates (input report §1): both pages
 * have their top edge towards +Z, so the reader sits at −Z looking towards +Z. Seen from there,
 * the left page (verso, even page numbers) is at +X and the right page (recto) at −X.
 */
export const READER = { position: 'negative Z', pageTop: '+Z', versoSide: '+X' } as const;

/** Page rectangles measured from the Open_book mesh, used while the anchors are missing. */
export const FALLBACK_PAGES: { verso: PageRect; recto: PageRect } = {
  verso: { centre: [0.0878, 0.0228, -0.0306], width: 0.1756, height: 0.2092 },
  recto: { centre: [-0.0878, 0.0228, -0.0306], width: 0.1756, height: 0.2092 },
};

/** Our pages are drawn this far above the model's page surface, so they never z-fight with it. */
export const PAGE_LIFT = 0.0005;

/**
 * The open book's paper (spec 03, "Page paper"), so a turning sheet can be made of the same paper
 * in the same shape. The model's own vertices on the paper's top surface (Stage 6), each
 * [metres off the spine, metres above the desk, u on the verso, u on the recto]: the paper rises
 * from the spine in a curve, tops a hump 1.8 cm out and settles, flat, until 13.63 cm, where the
 * page block curves down to the cover. Its texture coordinates follow the paper's length, not the
 * distance off the spine: near the spine the curve takes more texture. `v`: per page, v at the
 * paper's bottom and top, which lie at `z` (metres, the reader's side first).
 */
export const PAGE_PAPER = {
  profile: [
    [0, 0.0029, 0.42, 0.713],
    [0.0012, 0.0093, 0.432, 0.725],
    [0.0036, 0.0144, 0.443, 0.736],
    [0.0067, 0.0188, 0.453, 0.746],
    [0.0117, 0.0219, 0.464, 0.757],
    [0.0184, 0.0228, 0.477, 0.77],
    [0.0419, 0.0207, 0.522, 0.815],
    [0.0641, 0.0196, 0.565, 0.858],
    [0.0892, 0.0191, 0.612, 0.906],
    [0.1363, 0.0191, 0.702, 0.995],
  ],
  v: { verso: [0.388, 0.007], recto: [0.007, 0.388] },
  z: [-0.131, 0.069],
} as const;

/**
 * Page classes (spec 03): the logical page size in CSS px that text is laid out at. At the default
 * view a page measures exactly this on screen, so body text is drawn at its CSS size.
 */
export const PAGE_CLASSES = {
  compact: { width: 331, height: 395 },
  regular: { width: 544, height: 648 },
} as const;
export type PageClass = keyof typeof PAGE_CLASSES;

/** The whole scene's size (x, y, z); a delivered model must be within ±10% (catches unit errors). */
export const SCENE_SIZE: Vec3 = [0.409, 0.193, 0.446];
export const SCENE_SIZE_TOLERANCE = 0.1;

/** The model's share of the runtime budgets (spec 03, "Budgets of the delivered file"). */
export const MODEL_BUDGET = { drawCalls: 10, triangles: 20_000 } as const;

/**
 * The file the app loads on each quality tier: the real model, made in every build by
 * `npm run model:optimize` (spec 03, "Delivered files"). Until Stage 6 both were the placeholder.
 */
export const MODEL_PATHS: Record<Tier, string> = {
  mobile: 'models/book-mobile.glb',
  desktop: 'models/book-desktop.glb',
};
