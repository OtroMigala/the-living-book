// npm run check:specs — reads every spec in specs/ and fails (exit code 1) if the traceability
// table and the requirement tables disagree. See spec.ts for the rules.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  checkTraceability,
  extractCriteria,
  extractRequirements,
  type Requirement,
  summarize,
} from './spec.ts';

const SPECS_DIR = 'specs';
const TRACE_FILE = join(SPECS_DIR, 'traceability.md');

const requirements: Requirement[] = [];
for (const name of readdirSync(SPECS_DIR).sort()) {
  const file = join(SPECS_DIR, name);
  if (!name.endsWith('.md') || file === TRACE_FILE) continue;
  requirements.push(...extractRequirements(readFileSync(file, 'utf8'), file));
}
const criteria = extractCriteria(readFileSync(TRACE_FILE, 'utf8'));
const issues = checkTraceability(requirements, criteria, TRACE_FILE);

for (const issue of issues) console.error(`${issue.file}:${issue.line}  ${issue.message}`);

const s = summarize(requirements, criteria ?? []);
const fmt = (counts: Record<string, number>) =>
  Object.entries(counts)
    .map(([k, v]) => `${k} ${v}`)
    .join(', ');
console.log(`spec-check: ${s.requirements} requirements (${fmt(s.byPriority)})`);
console.log(`spec-check: ${s.criteria} acceptance criteria (${fmt(s.byStatus)})`);
console.log(`spec-check: ${issues.length} issue(s)`);

process.exitCode = issues.length > 0 ? 1 : 0;
