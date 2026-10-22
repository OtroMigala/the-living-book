// Browser tests (Stage 4, step 0): real browsers open the built site and check what a person would.
// Run with `npm run e2e` after `npm run build`. Files are named *.e2e.ts so Vitest never picks them up.
import { defineConfig, devices } from '@playwright/test';

const PORT = 4322;

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    // The trailing slash matters: page.goto('es/') resolves against it.
    baseURL: `http://localhost:${PORT}/the-living-book/`,
  },
  // Serves the already-built dist/ exactly as GitHub Pages will (same base path).
  webServer: {
    command: `npx astro preview --port ${PORT}`,
    url: `http://localhost:${PORT}/the-living-book/`,
    reuseExistingServer: !process.env.CI,
  },
  // Q09: the latest Chromium, Firefox and WebKit (Safari's engine), plus the reference phone.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    {
      // Measured on the owner's Tecno Pova 6 with /diagnostics/ (input report §4).
      name: 'pova6',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 360, height: 688 },
        deviceScaleFactor: 3,
      },
    },
  ],
});
