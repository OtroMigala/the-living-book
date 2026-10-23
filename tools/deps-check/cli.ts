// npm run check:deps — fails if package.json has a dependency that is not pinned exactly, or if a
// workflow runs in a Playwright image that is not the installed version pinned by digest.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkPlaywrightImages, findLooseVersions } from './deps.ts';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const loose = findLooseVersions(pkg);
for (const d of loose)
  console.error(`package.json ${d.section}: ${d.name} "${d.range}" is not exact`);
console.log(`deps-check: ${loose.length} loose version(s)`);

const dir = '.github/workflows';
const workflows = readdirSync(dir)
  .filter((name) => /\.ya?ml$/.test(name))
  .map((name) => ({ file: name, text: readFileSync(join(dir, name), 'utf8') }));
const images = checkPlaywrightImages(workflows, pkg.devDependencies?.['@playwright/test']);
for (const p of images) console.error(`${p.file}: playwright:${p.image}: ${p.problem}`);
console.log(`deps-check: ${images.length} problem(s) with the Playwright image`);

process.exitCode = loose.length > 0 || images.length > 0 ? 1 : 0;
