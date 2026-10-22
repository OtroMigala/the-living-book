// npm run report:model — prints the asset report of a .glb as Markdown.
// Usage: node tools/asset-report/cli.ts <file.glb>

import { readFileSync } from 'node:fs';
import { parseGlb, report } from './glb.ts';
import { toMarkdown } from './markdown.ts';

const file = process.argv[2];
if (!file) {
  console.error('usage: node tools/asset-report/cli.ts <file.glb>');
  process.exit(2);
}
const bytes = readFileSync(file);
process.stdout.write(toMarkdown(report(parseGlb(bytes)), file, bytes.byteLength));
