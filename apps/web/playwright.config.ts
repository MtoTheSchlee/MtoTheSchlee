import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke-level E2E config.
 *
 * The tests run against an already-running stack (API on :4000, web on
 * :3000) so that CI can spin the services up once and reuse them. We
 * deliberately don't auto-launch web here because that duplicates CI
 * orchestration; instead, the CI job starts the servers before invoking
 * playwright.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    colorScheme: 'dark',
    extraHTTPHeaders: {
      'x-tenant-id':
        process.env.NEXT_PUBLIC_TENANT_ID ?? '00000000-0000-0000-0000-000000000001',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          executablePath: process.env.CHROMIUM_BIN,
        },
      },
    },
  ],
});
