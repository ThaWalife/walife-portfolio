import { defineConfig } from '@playwright/test';

// Edge è già installato su Windows: nessun download del browser di Playwright.
export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  retries: 0,
  workers: 2,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4321/walife-portfolio/',
    channel: 'msedge',
    launchOptions: { args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
  },
  webServer: {
    command: 'npm run build && npx astro preview --port 4321',
    url: 'http://localhost:4321/walife-portfolio/',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
