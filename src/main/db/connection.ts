import Database from 'better-sqlite3'

export type Sqlite = Database.Database

/**
 * Opens (or creates) the notebook database with the pragmas of section 6: foreign keys
 * enforced, WAL journal, busy timeout. Only the main process ever opens it.
 */
export function openDatabase(file: string, options: { readonly?: boolean } = {}): Sqlite {
  const sqlite = new Database(file, {
    readonly: options.readonly ?? false,
    fileMustExist: options.readonly ?? false,
  })
  try {
    if (!options.readonly) {
      sqlite.pragma('journal_mode = WAL')
      sqlite.pragma('synchronous = NORMAL')
    }
    sqlite.pragma('foreign_keys = ON')
    sqlite.pragma('busy_timeout = 5000')
    return sqlite
  } catch (error) {
    // A damaged file fails here. Close the handle, or Windows keeps the file locked and a
    // restore could not replace it.
    sqlite.close()
    throw error
  }
}

export type IntegrityResult = { readonly ok: true } | { readonly ok: false; readonly messages: string[] }

/** `PRAGMA quick_check`, run at startup and on every backup copy. Never throws. */
export function quickCheck(sqlite: Sqlite): IntegrityResult {
  try {
    const rows = sqlite.pragma('quick_check') as Array<{ quick_check: string }>
    const messages = rows.map((row) => row.quick_check)
    return messages.length === 1 && messages[0] === 'ok'
      ? { ok: true }
      : { ok: false, messages: messages.slice(0, 20) }
  } catch (error) {
    return { ok: false, messages: [error instanceof Error ? error.message : String(error)] }
  }
}

export function tableExists(sqlite: Sqlite, name: string): boolean {
  return (
    sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name) !== undefined
  )
}

/** Live rows of a business table, or null when the table does not exist (yet). */
export function countLiveRows(
  sqlite: Sqlite,
  table: 'recipes' | 'tasting_notes' | 'ingredients',
): number | null {
  if (!tableExists(sqlite, table)) return null
  const row = sqlite.prepare(`SELECT count(*) AS n FROM ${table} WHERE deleted_at IS NULL`).get() as {
    n: number
  }
  return row.n
}
