import { defineConfig } from 'drizzle-kit'

/**
 * Migrations are generated with `npm run db:generate`, committed, and shipped in
 * resources/migrations, then applied at startup after an automatic backup (section 7).
 * The FTS5 search table is a hand-written migration (drizzle-kit has no virtual tables).
 */
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/main/db/schema.ts',
  out: process.env['DRIZZLE_OUT'] ?? './resources/migrations',
  strict: true,
  verbose: true,
})
