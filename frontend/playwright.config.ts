import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright is installed in Phase 1.
 * End-to-end specs for public flows are added in later phases.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    // Must match backend CORS_ORIGIN (default http://localhost:5173).
    // Using 127.0.0.1 here breaks browser API calls to localhost:5000.
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host localhost --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
