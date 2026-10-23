// npm run build:preview — the preview copy of the site (F06, ADR 0011): the same build, with the
// content in content/snapshot/ (the deploy pulls Contentstack's preview environment there first),
// under /the-living-book/preview/ in dist/preview, every page noindex and flagged. Run it after the
// public build: building the public site empties dist.

import { spawnSync } from 'node:child_process';

const result = spawnSync('npm', ['run', 'build'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    SITE_BASE: '/the-living-book/preview',
    OUT_DIR: 'dist/preview',
    PUBLIC_PREVIEW: 'true',
  },
});
process.exitCode = result.status ?? 1;
