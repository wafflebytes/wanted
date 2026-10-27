import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  outputDir: '.data/playwright-results',
  use: {
    baseURL: process.env.WANTED_TEST_ORIGIN ?? 'http://localhost:8082',
    channel: 'chrome',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'iPhone 16 dimensions', use: { ...devices['iPhone 16'], defaultBrowserType: 'chromium' } }],
});
