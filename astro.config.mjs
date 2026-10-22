// Astro builds every page to static HTML at build time (ADR 0003). No JavaScript is sent to the
// browser unless a page asks for it, which keeps the entry under budget BB1.
import { defineConfig } from 'astro/config';

export default defineConfig({
  // GitHub Pages project site (spec 03, "Hosting"): https://otromigala.github.io/the-living-book/
  site: 'https://otromigala.github.io',
  base: '/the-living-book',
  trailingSlash: 'always',
  build: { format: 'directory' },
});
