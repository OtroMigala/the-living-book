// The placeholder scene: boxes with the names, scale and places of the real model's objects
// (measured in Stage 2), laid out the way the contract wants the real model to end up:
//   - the anchors page_left and page_right exist (gap G03);
//   - nothing rests on the open pages or stands in their way when they turn (gap G13): the
//     magnifier lies on the closed books, and the closed books stand 2 cm further back.
// In Stage 6 the optimized real model replaces this file, and the app must not notice (H2).

import type { Vec3, WriterNode } from './glb-writer.ts';

const PAPER: [number, number, number, number] = [0.93, 0.89, 0.8, 1];
const SPINE: [number, number, number, number] = [0.35, 0.22, 0.16, 1];
/** The closed books move back this far (+Z) from where they are in the source model. */
export const BOOKS_BACK = 0.02;

const shift = ([x, y, z]: Vec3): Vec3 => [x, y, z + BOOKS_BACK];

export function placeholderScene(): WriterNode[] {
  return [
    {
      name: 'Open_book',
      children: [
        // Two page blocks either side of the spine (x = 0), top surface at y = 0.0228.
        {
          name: 'Open_book_verso',
          box: { min: [0.002, -0.0007, -0.1352], max: [0.1756, 0.0228, 0.074], color: PAPER },
        },
        {
          name: 'Open_book_recto',
          box: { min: [-0.1756, -0.0007, -0.1352], max: [-0.002, 0.0228, 0.074], color: PAPER },
        },
        {
          name: 'Open_book_spine',
          box: { min: [-0.002, -0.0007, -0.1352], max: [0.002, 0.018, 0.074], color: SPINE },
        },
        // Anchors at the centre of each page. +Y out of the page; +X from the spine to the outer
        // edge, so the recto (at −X) is turned half a turn about Y: quaternion (0, 1, 0, 0).
        {
          name: 'page_left',
          translation: [0.0878, 0.0228, -0.0306],
          extras: { width_m: 0.1756, height_m: 0.2092 },
        },
        {
          name: 'page_right',
          translation: [-0.0878, 0.0228, -0.0306],
          rotation: [0, 1, 0, 0],
          extras: { width_m: 0.1756, height_m: 0.2092 },
        },
      ],
    },
    {
      name: 'Book_1',
      box: {
        min: shift([-0.0994, 0, 0.0831]),
        max: shift([0.1243, 0.0485, 0.275]),
        color: [0.45, 0.13, 0.12, 1],
      },
    },
    {
      name: 'Book_2',
      box: {
        min: shift([0.1244, 0, 0.0558]),
        max: shift([0.2335, 0.1921, 0.2117]),
        color: [0.16, 0.3, 0.2, 1],
      },
    },
    {
      name: 'Book_3',
      box: {
        min: shift([-0.1108, 0.0485, 0.0615]),
        max: shift([0.1265, 0.0908, 0.2789]),
        color: [0.15, 0.2, 0.38, 1],
      },
    },
    // About the size of the real magnifier's bounding box (0.20 × 0.03 × 0.24 m), 0.20 m deep
    // here so it fits on top of Book_3.
    {
      name: 'Magnifier',
      box: {
        min: shift([-0.09, 0.0908, 0.07]),
        max: shift([0.11, 0.1208, 0.27]),
        color: [0.6, 0.7, 0.75, 0.5],
      },
    },
  ];
}

export const PLACEHOLDER_EXTRAS = {
  title: 'Placeholder for "Books with magnifier"',
  author: 'The Living Book',
  license: 'MIT',
  source: 'https://github.com/OtroMigala/the-living-book',
};
