// npm run check:model [file.glb] [tier] — checks a model against the contract (spec 03, K01) and
// the byte budgets of a tier (mobile by default). Without a file it checks the model the app loads
// (MODEL_PATH, under public/). Exit code 1 on a failed clause; a warning (for example missing
// anchors, which have a fallback) does not fail.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MODEL_PATH } from '../../src/three/contract.ts';
import type { Tier } from '../../src/three/tiers.ts';
import { parseGlb } from '../asset-report/glb.ts';
import { readBudgets } from '../budget-check/budgets.ts';
import { checkModel } from './check.ts';

const file = process.argv[2] ?? join('public', MODEL_PATH);
const tier = (process.argv[3] ?? 'mobile') as Tier;
const bytes = readFileSync(file);
const budgets = readBudgets(readFileSync('specs/02-budget.md', 'utf8'));
const clauses = checkModel(parseGlb(bytes), bytes.byteLength, {
  fileBytes: budgets.get('BB4')?.[tier] ?? 0,
  textureGpuBytes: budgets.get('BM1')?.[tier] ?? 0,
});

const mark = { pass: 'ok  ', fail: 'FAIL', warn: 'warn' } as const;
for (const c of clauses) console.log(`${mark[c.status]} ${c.clause}: ${c.detail}`);
const failed = clauses.filter((c) => c.status === 'fail').length;
console.log(`check:model: ${file} (${tier}), ${failed} failed clause(s)`);
process.exitCode = failed > 0 ? 1 : 0;
