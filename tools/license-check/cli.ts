// npm run check:licenses — fails if any package in the lockfile breaks the license policy (ADR 0005).

import { readFileSync } from 'node:fs';
import { checkLicenses, countByLicense, readLockfile } from './licenses.ts';

const packages = readLockfile(JSON.parse(readFileSync('package-lock.json', 'utf8')));
const problems = checkLicenses(packages);

const counts = Object.entries(countByLicense(packages)).sort(
  (a, b) => b[1].shipped + b[1].tools - (a[1].shipped + a[1].tools),
);
for (const [license, n] of counts) {
  console.log(`  ${license}: ${n.shipped} shipped, ${n.tools} tools`);
}
for (const p of problems) console.error(`${p.path}: ${p.license} (${p.reason})`);
console.log(`license-check: ${packages.length} packages, ${problems.length} problem(s)`);
process.exitCode = problems.length > 0 ? 1 : 0;
