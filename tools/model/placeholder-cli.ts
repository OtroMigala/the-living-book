// npm run model:placeholder — writes public/models/placeholder.glb from tools/model/placeholder.ts.

import { writeFileSync } from 'node:fs';
import { writeGlb } from './glb-writer.ts';
import { PLACEHOLDER_EXTRAS, placeholderScene } from './placeholder.ts';

const out = 'public/models/placeholder.glb';
const bytes = writeGlb(placeholderScene(), PLACEHOLDER_EXTRAS);
writeFileSync(out, bytes);
console.log(`model:placeholder: ${out}, ${bytes.byteLength} bytes`);
