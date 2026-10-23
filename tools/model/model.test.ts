import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseGlb, report } from '../asset-report/glb.ts';
import { blocksTurningPages, checkModel } from './check.ts';
import { writeGlb } from './glb-writer.ts';
import { PLACEHOLDER_EXTRAS, placeholderScene } from './placeholder.ts';

const BUDGETS = { fileBytes: 2 * 1024 * 1024, textureGpuBytes: 32 * 1024 * 1024 };
const write = (scene = placeholderScene()) => writeGlb(scene, PLACEHOLDER_EXTRAS);
const statuses = (bytes: Uint8Array) =>
  Object.fromEntries(
    checkModel(parseGlb(bytes), bytes.byteLength, BUDGETS).map((c) => [c.clause, c.status]),
  );

describe('glb-writer', () => {
  it('writes a file the reader reads back: names, boxes and bounds', () => {
    const r = report(parseGlb(write()));
    expect(r.meshNodes.map((m) => m.node)).toEqual([
      'Open_book_verso',
      'Open_book_recto',
      'Open_book_spine',
      'Book_1',
      'Book_2',
      'Book_3',
      'Magnifier',
    ]);
    expect(r.triangles).toBe(7 * 12); // a box is 6 faces × 2 triangles
    expect(r.sceneBounds.min[0]).toBeCloseTo(-0.1756);
    expect(r.sceneBounds.max[0]).toBeCloseTo(0.2335);
  });

  it('matches the committed placeholder byte for byte (run npm run model:placeholder after changes)', () => {
    expect(write()).toEqual(new Uint8Array(readFileSync('public/models/placeholder.glb')));
  });
});

describe('blocksTurningPages', () => {
  it('flags a box lying on the pages and passes one behind them', () => {
    expect(blocksTurningPages({ min: [-0.05, 0.02, -0.05], max: [0.05, 0.05, 0.05] })).toBe(true);
    expect(blocksTurningPages({ min: [-0.05, 0.02, 0.08], max: [0.05, 0.05, 0.2] })).toBe(false);
  });

  it('passes a box beside the book, beyond the reach of a page', () => {
    expect(blocksTurningPages({ min: [0.2, 0, -0.1], max: [0.3, 0.05, 0.05] })).toBe(false);
  });
});

describe('checkModel', () => {
  it('passes the placeholder on every clause', () => {
    expect(Object.values(statuses(write())).every((s) => s === 'pass')).toBe(true);
  });

  it('fails a model without a required node, and warns when the anchors are missing', () => {
    const scene = placeholderScene().filter((n) => n.name !== 'Book_1');
    const open = scene[0];
    if (open?.children) open.children = open.children.filter((c) => !c.name.startsWith('page_'));
    const s = statuses(write(scene));
    expect(s['Required nodes']).toBe('fail');
    expect(s['Page anchors']).toBe('warn');
  });

  it('fails a model exported 100 times too big (centimetres read as metres)', () => {
    const scale = (v: [number, number, number]) =>
      v.map((x) => x * 100) as [number, number, number];
    const scene = placeholderScene().map((n) =>
      n.box ? { ...n, box: { ...n.box, min: scale(n.box.min), max: scale(n.box.max) } } : n,
    );
    expect(statuses(write(scene))['Axes and units']).toBe('fail');
  });

  it('fails the GPU memory clause when an image size cannot be read, rather than counting it as 0', () => {
    const bytes = write();
    const glb = parseGlb(bytes);
    glb.json.images = [{ uri: 'pages.ktx2' }];
    const clause = checkModel(glb, bytes.byteLength, BUDGETS).find((c) =>
      c.clause.startsWith('Textures in GPU memory'),
    );
    expect(clause?.status).toBe('fail');
    expect(clause?.detail).toContain('pages.ktx2');
  });
});
