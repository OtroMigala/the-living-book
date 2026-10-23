// npm run check:model [file.glb] [tier] — checks a model against the contract (spec 03, K01) and
// the byte budgets of a tier (mobile by default). Without a file it checks the model each tier
// loads (MODEL_PATHS, under public/), which `npm run model:optimize` makes in every build. Exit
// code 1 on a failed clause; a warning (for example missing anchors, which have a fallback) does
// not fail.

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MODEL_PATHS } from '../../src/three/contract.ts';
import type { Tier } from '../../src/three/tiers.ts';
import { parseGlb } from '../asset-report/glb.ts';
import { readBudgets } from '../budget-check/budgets.ts';
import { checkModel } from './check.ts';

const budgets = readBudgets(readFileSync('specs/02-budget.md', 'utf8'));
const [fileArg, tierArg = 'mobile'] = process.argv.slice(2);
const runs: [string, Tier][] = fileArg
  ? [[fileArg, tierArg as Tier]]
  : (Object.entries(MODEL_PATHS) as [Tier, string][]).map(([tier, path]) => [
      join('public', path),
      tier,
    ]);

const mark = { pass: 'ok  ', fail: 'FAIL', warn: 'warn' } as const;
let failed = 0;
for (const [file, tier] of runs) {
  if (!existsSync(file)) {
    console.log(`FAIL ${file} is missing: npm run model:optimize makes it`);
    failed++;
    continue;
  }
  const bytes = readFileSync(file);
  const clauses = checkModel(parseGlb(bytes), bytes.byteLength, {
    fileBytes: budgets.get('BB4')?.[tier] ?? 0,
    textureGpuBytes: budgets.get('BM1')?.[tier] ?? 0,
  });
  for (const c of clauses) console.log(`${mark[c.status]} ${c.clause}: ${c.detail}`);
  const n = clauses.filter((c) => c.status === 'fail').length;
  console.log(`check:model: ${file} (${tier}), ${n} failed clause(s)`);
  failed += n;
}
process.exitCode = failed > 0 ? 1 : 0;
