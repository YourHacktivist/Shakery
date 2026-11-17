import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    // Local dates (shelf life, backup rotation) are tested in a fixed time zone with DST.
    env: { TZ: 'Europe/Paris' },
  },
})
