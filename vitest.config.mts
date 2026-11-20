import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@renderer': resolve('src/renderer/src'),
      '@shared': resolve('src/shared'),
      '@core': resolve('src/core'),
    },
  },
  test: {
    // Local dates (shelf life, backup rotation) are tested in a fixed time zone with DST.
    env: { TZ: 'Europe/Paris' },
    coverage: {
      provider: 'v8',
      include: ['src/core/**'],
      exclude: ['src/core/**/*.test.ts', 'src/core/testing.ts'],
      // Section 13.1 asks 95 %; branches stop at 90 because of the unreachable `?? 0`
      // fallbacks that noUncheckedIndexedAccess imposes (decision D-027).
      thresholds: { lines: 95, statements: 95, functions: 95, branches: 90 },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
          exclude: ['src/renderer/**'],
          environment: 'node',
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          include: ['src/renderer/**/*.test.tsx'],
          environment: 'jsdom',
          setupFiles: ['src/renderer/src/test/setup.ts'],
        },
      },
    ],
  },
})
