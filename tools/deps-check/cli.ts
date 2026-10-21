// npm run check:deps — fails if package.json has a dependency that is not pinned exactly.

import { readFileSync } from 'node:fs';
import { findLooseVersions } from './deps.ts';

const loose = findLooseVersions(JSON.parse(readFileSync('package.json', 'utf8')));
for (const d of loose)
  console.error(`package.json ${d.section}: ${d.name} "${d.range}" is not exact`);
console.log(`deps-check: ${loose.length} loose version(s)`);
process.exitCode = loose.length > 0 ? 1 : 0;
