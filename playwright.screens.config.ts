import { defineConfig } from '@playwright/test'

/**
 * Screenshots of the main screens, to compare with the mock-ups (not a test suite).
 * Run `npm run build` first; images go to SHOTS_DIR, or test-results/screens.
 */
export default defineConfig({
  testDir: 'tests/screens',
  timeout: 120_000,
  workers: 1,
  reporter: 'list',
})
