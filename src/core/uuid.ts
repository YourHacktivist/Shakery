/**
 * UUIDv7 (RFC 9562): 48-bit Unix time in milliseconds, then random bits. Identifiers
 * sort by creation time, which keeps indexes compact and makes a future sync simpler.
 *
 * The generator is monotonic: two ids created in the same millisecond (or while the
 * clock goes backwards) still sort in creation order, thanks to a 12-bit counter in
 * `rand_a` seeded randomly at each new millisecond.
 *
 * Pure module: the clock and the random source are injected (crypto.getRandomValues in
 * the renderer, crypto.randomFillSync in the main process).
 */
export type RandomFill = (bytes: Uint8Array) => Uint8Array
export type Clock = () => number

const HEX: string[] = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, '0'))
const MAX_COUNTER = 0xfff

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

export function createUuidV7Generator(clock: Clock, fill: RandomFill): () => string {
  let lastMs = -1
  let counter = 0

  return () => {
    let ms = Math.max(Math.floor(clock()), lastMs)
    if (ms === lastMs) {
      counter += 1
      if (counter > MAX_COUNTER) {
        // 4096 ids in one millisecond: borrow the next millisecond to stay ordered.
        ms += 1
        counter = seedCounter(fill)
      }
    } else {
      counter = seedCounter(fill)
    }
    lastMs = ms
    return format(ms, counter, fill(new Uint8Array(8)))
  }
}

/** Seeds the counter in the lower half of its range, leaving room to increment. */
function seedCounter(fill: RandomFill): number {
  const bytes = fill(new Uint8Array(2))
  return (((bytes[0] ?? 0) << 8) | (bytes[1] ?? 0)) & 0x7ff
}

function format(ms: number, counter: number, random: Uint8Array): string {
  if (!Number.isSafeInteger(ms) || ms < 0 || ms > 0xffffffffffff) {
    throw new RangeError(`Timestamp out of UUIDv7 range: ${ms}`)
  }
  const bytes = new Uint8Array(16)
  // 48-bit big-endian timestamp. Bit shifts are 32-bit in JavaScript, hence the division.
  const high = Math.floor(ms / 0x100000000)
  const low = ms % 0x100000000
  bytes[0] = (high >>> 8) & 0xff
  bytes[1] = high & 0xff
  bytes[2] = (low >>> 24) & 0xff
  bytes[3] = (low >>> 16) & 0xff
  bytes[4] = (low >>> 8) & 0xff
  bytes[5] = low & 0xff
  bytes[6] = 0x70 | ((counter >>> 8) & 0x0f)
  bytes[7] = counter & 0xff
  bytes[8] = 0x80 | ((random[0] ?? 0) & 0x3f)
  for (let i = 1; i < 8; i += 1) bytes[8 + i] = random[i] ?? 0

  let out = ''
  for (let i = 0; i < 16; i += 1) {
    if (i === 4 || i === 6 || i === 8 || i === 10) out += '-'
    out += HEX[bytes[i] ?? 0] ?? '00'
  }
  return out
}

/** Creation time encoded in a UUIDv7, in epoch milliseconds. */
export function uuidV7Timestamp(id: string): number {
  if (!UUID_PATTERN.test(id)) throw new TypeError(`Not a UUIDv7: ${id}`)
  return Number.parseInt(id.slice(0, 8) + id.slice(9, 13), 16)
}
