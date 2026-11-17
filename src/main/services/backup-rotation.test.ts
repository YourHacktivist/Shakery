import { describe, expect, it } from 'vitest'
import {
  localDayKey,
  localIsoWeekKey,
  selectBackupsToKeep,
  type BackupReason,
  type RotationEntry,
} from './backup-rotation'

// Tests run with TZ=Europe/Paris (vitest.config.mts).
const local = (y: number, m: number, d: number, h = 12, min = 0): number =>
  new Date(y, m - 1, d, h, min).getTime()

function entry(id: string, createdAt: number, reason: BackupReason = 'daily'): RotationEntry {
  return { id, createdAt, reason }
}

describe('localDayKey', () => {
  it('uses the local day, not the UTC day', () => {
    // 23:30 in Paris on 17 November is 22:30 UTC the same day; 00:30 on the 18th is 23:30 UTC on the 17th.
    expect(localDayKey(local(2026, 11, 17, 23, 30))).toBe('2026-11-17')
    expect(localDayKey(local(2026, 11, 18, 0, 30))).toBe('2026-11-18')
  })

  it('handles the DST change days', () => {
    expect(localDayKey(local(2026, 3, 29, 1, 30))).toBe('2026-03-29')
    expect(localDayKey(local(2026, 3, 29, 3, 30))).toBe('2026-03-29')
    expect(localDayKey(local(2026, 10, 25, 2, 30))).toBe('2026-10-25')
  })
})

describe('localIsoWeekKey', () => {
  it.each([
    [local(2026, 11, 16), '2026-W47'], // Monday
    [local(2026, 11, 22, 23, 59), '2026-W47'], // Sunday night
    [local(2026, 11, 23, 0, 1), '2026-W48'],
    [local(2026, 1, 1), '2026-W01'], // Thursday 1 January 2026
    [local(2027, 1, 1), '2026-W53'], // Friday 1 January 2027 belongs to 2026's last week
    [local(2024, 12, 30), '2025-W01'], // Monday 30 December 2024 belongs to 2025
    [local(2026, 3, 29, 3, 30), '2026-W13'], // DST start
  ])('%s is in %s', (epoch, expected) => {
    expect(localIsoWeekKey(epoch)).toBe(expected)
  })
})

describe('selectBackupsToKeep', () => {
  it('keeps everything when there are few backups', () => {
    const entries = [
      entry('a', local(2026, 11, 15)),
      entry('b', local(2026, 11, 16)),
      entry('c', local(2026, 11, 17)),
    ]
    expect(selectBackupsToKeep(entries)).toEqual(new Set(['a', 'b', 'c']))
  })

  it('keeps only the newest backup of each day', () => {
    const entries = [
      entry('morning', local(2026, 11, 17, 8)),
      entry('noon', local(2026, 11, 17, 12), 'shutdown'),
      entry('evening', local(2026, 11, 17, 22), 'shutdown'),
    ]
    expect(selectBackupsToKeep(entries)).toEqual(new Set(['evening']))
  })

  it('keeps 14 daily and 8 weekly backups over three months of daily use', () => {
    const entries: RotationEntry[] = []
    for (let day = 0; day < 90; day += 1) {
      entries.push(entry(`d${day}`, local(2026, 8, 20 + day)))
    }
    const kept = selectBackupsToKeep(entries)
    const last14 = entries.slice(-14).map((e) => e.id)
    for (const id of last14) expect(kept.has(id)).toBe(true)
    const weeks = new Set(
      [...kept].map((id) => localIsoWeekKey(entries.find((e) => e.id === id)?.createdAt ?? 0)),
    )
    // 14 daily backups span 2 to 3 weeks; with the 8 weekly ones, 8 distinct weeks are covered.
    expect(weeks.size).toBe(8)
    expect(kept.size).toBeLessThanOrEqual(14 + 8)
    expect(kept.size).toBeGreaterThanOrEqual(14 + 5)
  })

  it('always keeps the latest safety backups, even on a busy day', () => {
    const entries = [
      entry('pm1', local(2026, 11, 17, 9), 'pre-migration'),
      entry('daily', local(2026, 11, 17, 10)),
      entry('pr1', local(2026, 11, 17, 11), 'pre-restore'),
      entry('close', local(2026, 11, 17, 23), 'shutdown'),
    ]
    expect(selectBackupsToKeep(entries)).toEqual(new Set(['close', 'pm1', 'pr1']))
  })

  it('keeps recent manual backups, even several on the same day', () => {
    const entries = [
      entry('m1', local(2026, 11, 17, 9), 'manual'),
      entry('m2', local(2026, 11, 17, 10), 'manual'),
      entry('close', local(2026, 11, 17, 23), 'shutdown'),
    ]
    expect(selectBackupsToKeep(entries)).toEqual(new Set(['m1', 'm2', 'close']))
  })

  it('limits safety backups to the policy', () => {
    const entries = Array.from({ length: 6 }, (_, i) =>
      entry(`pm${i}`, local(2026, 1, 1 + i * 30), 'pre-migration'),
    )
    const kept = selectBackupsToKeep(entries, { daily: 0, weekly: 0, safety: 3, manual: 0 })
    expect(kept).toEqual(new Set(['pm5', 'pm4', 'pm3']))
  })

  it('returns an empty set for no backups', () => {
    expect(selectBackupsToKeep([]).size).toBe(0)
  })
})
