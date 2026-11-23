/**
 * Backup rotation (section 12.3), as a pure function.
 *
 * Kept: the newest backup of each of the `daily` most recent days that have one, the
 * newest of each of the `weekly` most recent ISO weeks that have one, and the
 * `manual` most recent backups made on request, and the `safety` most recent
 * backups taken before a migration, a restore, an emptying of the trash or a reset (they
 * protect against a bad update or a wrong gesture, whatever the day). Days and weeks are local
 * to the user's time zone.
 */
export type BackupReason =
  'daily' | 'shutdown' | 'manual' | 'pre-migration' | 'pre-restore' | 'pre-purge' | 'pre-reset' | 'pre-update'

export type RotationEntry = {
  readonly id: string
  readonly createdAt: number
  readonly reason: BackupReason
}

export type RotationPolicy = {
  readonly daily: number
  readonly weekly: number
  readonly safety: number
  readonly manual: number
}

export const DEFAULT_ROTATION: RotationPolicy = { daily: 14, weekly: 8, safety: 3, manual: 5 }

/** Local calendar day, e.g. "2026-11-17". */
export function localDayKey(epochMs: number): string {
  const d = new Date(epochMs)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** ISO 8601 week of the local calendar day, e.g. "2026-W47". */
export function localIsoWeekKey(epochMs: number): string {
  const local = new Date(epochMs)
  // Work on the local calendar date expressed in UTC, so DST never shifts the day.
  const date = new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()))
  const weekday = (date.getUTCDay() + 6) % 7 // Monday = 0
  date.setUTCDate(date.getUTCDate() - weekday + 3) // Thursday of the same week
  const isoYear = date.getUTCFullYear()
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4))
  const firstWeekday = (firstThursday.getUTCDay() + 6) % 7
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstWeekday + 3)
  const week = 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 86_400_000))
  return `${isoYear}-W${pad(week)}`
}

function pad(value: number): string {
  return value.toString().padStart(2, '0')
}

function newestPerKey(
  entries: readonly RotationEntry[],
  keyOf: (entry: RotationEntry) => string,
  limit: number,
): string[] {
  const kept: string[] = []
  const seen = new Set<string>()
  for (const entry of entries) {
    if (seen.size >= limit) break
    const key = keyOf(entry)
    if (seen.has(key)) continue
    seen.add(key)
    kept.push(entry.id)
  }
  return kept
}

export function selectBackupsToKeep(
  entries: readonly RotationEntry[],
  policy: RotationPolicy = DEFAULT_ROTATION,
): Set<string> {
  const newestFirst = [...entries].sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id))
  const keep = new Set<string>([
    ...newestPerKey(newestFirst, (e) => localDayKey(e.createdAt), policy.daily),
    ...newestPerKey(newestFirst, (e) => localIsoWeekKey(e.createdAt), policy.weekly),
  ])
  for (const [reason, limit] of [
    ['pre-migration', policy.safety],
    ['pre-restore', policy.safety],
    ['pre-purge', policy.safety],
    ['pre-reset', policy.safety],
    ['pre-update', policy.safety],
    ['manual', policy.manual],
  ] as const) {
    newestFirst
      .filter((e) => e.reason === reason)
      .slice(0, limit)
      .forEach((e) => keep.add(e.id))
  }
  return keep
}
