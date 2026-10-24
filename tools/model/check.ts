// The model contract as a check (K01 AC1): `npm run check:model` reads a .glb and says, clause by
// clause, whether the app can use it. Pure functions; cli.ts does the file I/O.

import {
  BOOKS_SIZE,
  FALLBACK_PAGES,
  FURNITURE_HEIGHT,
  PAGE_ANCHORS,
  REQUIRED_NODES,
  SIZE_TOLERANCE,
} from '../../src/three/contract.ts';
import { type Box, type Glb, report } from '../asset-report/glb.ts';

export type ClauseStatus = 'pass' | 'fail' | 'warn';

export interface Clause {
  clause: string;
  status: ClauseStatus;
  detail: string;
}

export interface ModelBudgets {
  /** BB4: the delivered model file. */
  fileBytes: number;
  /** BM1: model textures in GPU memory (estimate). */
  textureGpuBytes: number;
  /** The model's share of BR4 and BR5 (spec 03). */
  drawCalls: number;
  triangles: number;
}

const MIB = 1024 * 1024;
const mib = (n: number) => `${(n / MIB).toFixed(2)} MiB`;

/**
 * Does a box get in the way of a turning page? A page turns about the spine (the line x = 0,
 * y = top of the pages) and sweeps half a cylinder of radius = page width, over the pages' z
 * range. A box is in the way if its nearest point to the spine, above the pages, is closer than
 * that radius while its z range overlaps the pages'.
 */
export function blocksTurningPages(box: Box): boolean {
  const page = FALLBACK_PAGES.verso;
  const spineY = page.centre[1];
  const radius = page.width;
  const zMin = page.centre[2] - page.height / 2;
  const zMax = page.centre[2] + page.height / 2;
  const [minX = 0, minY = 0, minZ = 0] = box.min;
  const [maxX = 0, maxY = 0, maxZ = 0] = box.max;
  if (maxY <= spineY || maxZ <= zMin || minZ >= zMax) return false;
  const dx = Math.max(minX, 0, -maxX);
  const dy = Math.max(minY - spineY, 0);
  return Math.hypot(dx, dy) < radius;
}

/** The box around the meshes whose path passes through one of `names`, or null if none does. */
function boundsOf(meshes: { path: string; bounds: Box }[], names: readonly string[]): Box | null {
  const inside = meshes.filter((m) => m.path.split(' / ').some((part) => names.includes(part)));
  if (inside.length === 0) return null;
  const min = [0, 1, 2].map((a) => Math.min(...inside.map((m) => m.bounds.min[a] ?? Infinity)));
  const max = [0, 1, 2].map((a) => Math.max(...inside.map((m) => m.bounds.max[a] ?? -Infinity)));
  return { min, max } as Box;
}

const CREDIT_FIELDS = ['author', 'license', 'source', 'title'] as const;

export function checkModel(glb: Glb, fileBytes: number, budgets: ModelBudgets): Clause[] {
  const r = report(glb);
  const names = new Set((glb.json.nodes ?? []).map((n) => n.name ?? ''));
  const clauses: Clause[] = [];
  const add = (clause: string, ok: boolean, detail: string, failAs: ClauseStatus = 'fail') =>
    clauses.push({ clause, status: ok ? 'pass' : failAs, detail });

  add(
    'Format',
    (glb.json.scenes?.length ?? 0) >= 1,
    `glTF 2.0 binary, ${glb.json.scenes?.length ?? 0} scene(s)`,
  );

  // The books alone: the scene around them, when the file holds it, has its own clause.
  const books = boundsOf(r.meshNodes, REQUIRED_NODES) ?? r.sceneBounds;
  const size = [0, 1, 2].map((a) => (books.max[a] ?? 0) - (books.min[a] ?? 0));
  const scaleOk = size.every((s, a) => Math.abs(s / (BOOKS_SIZE[a] ?? 1) - 1) <= SIZE_TOLERANCE);
  add(
    'Axes and units',
    scaleOk,
    `books ${size.map((s) => s.toFixed(3)).join(' × ')} m; expected ${BOOKS_SIZE.join(' × ')} ±${SIZE_TOLERANCE * 100}%`,
  );

  const furniture = Object.entries(FURNITURE_HEIGHT).flatMap(([name, height]) => {
    const box = boundsOf(r.meshNodes, [name]);
    return box ? [{ name, height, measured: (box.max[1] ?? 0) - (box.min[1] ?? 0) }] : [];
  });
  const wrong = furniture.filter((f) => Math.abs(f.measured / f.height - 1) > SIZE_TOLERANCE);
  add(
    'Furniture at real size',
    wrong.length === 0,
    furniture.length === 0
      ? 'no furniture in this file'
      : furniture
          .map(
            (f) =>
              `${f.name} ${f.measured.toFixed(3)} m tall, expected ${f.height} ±${SIZE_TOLERANCE * 100}%`,
          )
          .join('; '),
  );

  const missing = REQUIRED_NODES.filter((n) => !names.has(n));
  add(
    'Required nodes',
    missing.length === 0,
    missing.length ? `missing: ${missing.join(', ')}` : REQUIRED_NODES.join(', '),
  );

  const anchors = Object.values(PAGE_ANCHORS);
  const anchorNodes = (glb.json.nodes ?? []).filter((n) =>
    anchors.includes((n.name ?? '') as never),
  );
  const anchorsOk =
    anchorNodes.length === anchors.length &&
    anchorNodes.every((n) => {
      const extras = (n as { extras?: Record<string, unknown> }).extras;
      return typeof extras?.width_m === 'number' && typeof extras?.height_m === 'number';
    });
  add(
    'Page anchors',
    anchorsOk,
    anchorsOk
      ? anchors.join(', ')
      : 'missing or without extras.width_m/height_m: the app uses the fallback page geometry',
    'warn',
  );

  const extras = glb.json.asset?.extras ?? {};
  const credits = CREDIT_FIELDS.filter((k) => typeof extras[k] !== 'string');
  // The furniture's own credits, each saying what changed (CC BY 4.0 asks for it).
  const pieces = Array.isArray(extras.furniture)
    ? (extras.furniture as Record<string, unknown>[])
    : [];
  const unnamed = pieces.filter((p) =>
    [...CREDIT_FIELDS, 'changes'].some((k) => typeof p[k] !== 'string'),
  );
  add(
    'Credits',
    credits.length === 0 && unnamed.length === 0,
    credits.length
      ? `asset.extras lacks: ${credits.join(', ')}`
      : unnamed.length
        ? `${unnamed.length} piece(s) of furniture without author, license, source, title and changes`
        : `author, license, source, title; ${pieces.length} piece(s) of furniture credited`,
  );

  const blocking = r.meshNodes.filter(
    (m) => !m.path.split(' / ').includes('Open_book') && blocksTurningPages(m.bounds),
  );
  add(
    'Clear page area',
    blocking.length === 0,
    blocking.length
      ? `in the way of a turning page: ${blocking.map((m) => m.path.split(' / ').at(-1)).join(', ')}`
      : 'nothing rests on or near the pages',
  );

  add(
    'File size (BB4)',
    fileBytes <= budgets.fileBytes,
    `${mib(fileBytes)}; budget ${mib(budgets.fileBytes)}`,
  );
  // An image whose header the report cannot read would count as 0 bytes and pass unnoticed.
  const unread = r.images.filter((i) => i.width === 0 || i.height === 0).map((i) => i.name);
  add(
    'Textures in GPU memory (BM1)',
    unread.length === 0 && r.textureGpuBytes <= budgets.textureGpuBytes,
    unread.length
      ? `size unknown (format not read): ${unread.join(', ')}`
      : `${mib(r.textureGpuBytes)}; budget ${mib(budgets.textureGpuBytes)}`,
  );
  add(
    'Draw calls',
    r.drawCalls <= budgets.drawCalls,
    `${r.drawCalls}; budget ${budgets.drawCalls}`,
  );
  add('Triangles', r.triangles <= budgets.triangles, `${r.triangles}; budget ${budgets.triangles}`);
  return clauses;
}
