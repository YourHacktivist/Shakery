import { randomFillSync } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { createUuidV7Generator, UUID_PATTERN, uuidV7Timestamp } from './uuid'

const fill = (bytes: Uint8Array): Uint8Array => randomFillSync(bytes)

describe('createUuidV7Generator', () => {
  it('produces RFC 9562 version 7 identifiers carrying the timestamp', () => {
    const now = Date.UTC(2026, 10, 17, 9, 30)
    const id = createUuidV7Generator(() => now, fill)()
    expect(id).toMatch(UUID_PATTERN)
    expect(uuidV7Timestamp(id)).toBe(now)
  })

  it('stays strictly ordered within the same millisecond', () => {
    const next = createUuidV7Generator(() => 1_700_000_000_000, fill)
    const ids = Array.from({ length: 10_000 }, next)
    expect(new Set(ids).size).toBe(ids.length)
    expect([...ids].sort()).toEqual(ids)
  })

  it('stays ordered when the clock goes backwards', () => {
    const times = [2_000, 1_000, 1_500, 2_000, 3_000]
    let i = 0
    const next = createUuidV7Generator(() => times[i++] ?? 3_000, fill)
    const ids = times.map(() => next())
    expect([...ids].sort()).toEqual(ids)
    expect(uuidV7Timestamp(ids[1] ?? '')).toBe(2_000)
  })

  it('borrows the next millisecond after 4096 ids in one millisecond', () => {
    const next = createUuidV7Generator(
      () => 5_000,
      () => new Uint8Array(16),
    )
    const ids = Array.from({ length: 4_200 }, next)
    expect([...ids].sort()).toEqual(ids)
    expect(uuidV7Timestamp(ids.at(-1) ?? '')).toBe(5_001)
  })

  it('sorts by creation time across milliseconds', () => {
    let t = 1_000
    const next = createUuidV7Generator(() => (t += 7), fill)
    const ids = Array.from({ length: 500 }, next)
    expect([...ids].sort()).toEqual(ids)
  })

  it('refuses timestamps outside the 48-bit range', () => {
    expect(() => createUuidV7Generator(() => -1, fill)()).toThrow(RangeError)
    expect(() => createUuidV7Generator(() => 2 ** 48, fill)()).toThrow(RangeError)
  })

  it('rejects malformed ids when reading the timestamp', () => {
    expect(() => uuidV7Timestamp('not-a-uuid')).toThrow(TypeError)
    expect(() => uuidV7Timestamp('0193a1b2-c3d4-4e5f-8a6b-7c8d9e0f1a2b')).toThrow(TypeError)
  })
})
