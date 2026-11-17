import { randomFillSync } from 'node:crypto'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { createUuidV7Generator } from '../../core/uuid'
import type { Sqlite } from './connection'
import * as schema from './schema'

/** Drizzle database; `$client` is the raw better-sqlite3 connection underneath. */
export type Db = BetterSQLite3Database<typeof schema> & { $client: Sqlite }

export function createDb(sqlite: Sqlite): Db {
  return drizzle(sqlite, { schema })
}

export type Clock = () => number

/** Identifier and time sources, injected so repositories stay deterministic under test. */
export type Ids = {
  readonly newId: () => string
  readonly now: Clock
}

export function systemIds(now: Clock = Date.now): Ids {
  return { newId: createUuidV7Generator(now, (bytes) => randomFillSync(bytes)), now }
}
