// Astro builds every page to static HTML at build time (ADR 0003). No JavaScript is sent to the
// browser unless a page asks for it, which keeps the entry under budget BB1.
import { defineConfig } from 'astro/config';

// F06 (ADR 0011): the preview copy of the site is the same build with another base and output
// folder, set by the deploy: SITE_BASE=/the-living-book/preview, OUT_DIR=dist/preview.
export default defineConfig({
  // GitHub Pages project site (spec 03, "Hosting"): https://otromigala.github.io/the-living-book/
  site: 'https://otromigala.github.io',
  base: process.env.SITE_BASE ?? '/the-living-book',
  outDir: process.env.OUT_DIR ?? './dist',
  trailingSlash: 'always',
  build: { format: 'directory' },
  // Development only (`npm run dev`): three.js reaches the book through a dynamic import, after
  // the first paint, so Vite found it late, bundled it again mid-session, and answered the 3D
  // view's requests with "504 Outdated Optimize Dep": the book fell back to flat pages. Bundled
  // at start, it has one version from the first request. The build does not use this.
  vite: { optimizeDeps: { include: ['three', 'three/addons/loaders/GLTFLoader.js'] } },
});
