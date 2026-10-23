// The model contract as a check (K01 AC1): `npm run check:model` reads a .glb and says, clause by
// clause, whether the app can use it. Pure functions; cli.ts does the file I/O.

import {
  FALLBACK_PAGES,
  MODEL_BUDGET,
  PAGE_ANCHORS,
  REQUIRED_NODES,
  SCENE_SIZE,
  SCENE_SIZE_TOLERANCE,
} from '../../src/three/contract.ts';
import { type Box, type Glb, report } from '../asset-report/glb.ts';

export type ClauseStatus = 'pass' | 'fail' | 'warn';

export interface Clause {
  clause: string;
  status: ClauseStatus;
  detail: string;
}

export interface ByteBudgets {
  /** BB4, mobile tier: the delivered model file. */
  fileBytes: number;
  /** BM1, mobile tier: model textures in GPU memory (estimate). */
  textureGpuBytes: number;
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

export function checkModel(glb: Glb, fileBytes: number, budgets: ByteBudgets): Clause[] {
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

  const size = [0, 1, 2].map((a) => (r.sceneBounds.max[a] ?? 0) - (r.sceneBounds.min[a] ?? 0));
  const scaleOk = size.every(
    (s, a) => Math.abs(s / (SCENE_SIZE[a] ?? 1) - 1) <= SCENE_SIZE_TOLERANCE,
  );
  add(
    'Axes and units',
    scaleOk,
    `scene ${size.map((s) => s.toFixed(3)).join(' × ')} m; expected ${SCENE_SIZE.join(' × ')} ±${SCENE_SIZE_TOLERANCE * 100}%`,
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
  const credits = ['author', 'license', 'source', 'title'].filter(
    (k) => typeof extras[k] !== 'string',
  );
  add(
    'Credits',
    credits.length === 0,
    credits.length ? `asset.extras lacks: ${credits.join(', ')}` : 'author, license, source, title',
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
    r.drawCalls <= MODEL_BUDGET.drawCalls,
    `${r.drawCalls}; budget ${MODEL_BUDGET.drawCalls}`,
  );
  add(
    'Triangles',
    r.triangles <= MODEL_BUDGET.triangles,
    `${r.triangles}; budget ${MODEL_BUDGET.triangles}`,
  );
  return clauses;
}
