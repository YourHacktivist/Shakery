import { defineConfig } from '@playwright/test'

/** End-to-end tests drive the built app (`npm run build` first, done by `npm run test:e2e`). */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env['CI']),
  reporter: process.env['CI'] ? 'github' : 'list',
  use: {
    trace: 'retain-on-failure',
  },
})
