/**
 * Homemade preparations: best-before date of a batch and days left (section 8, « Préparations »).
 *
 * Dates are counted in calendar days of the local time zone, never in blocks of 24 hours: a
 * syrup made at 23:50 with a shelf life of 3 days is good until the end of the third day after
 * its making day, whatever the hour of making and across a change of summer or winter time.
 */

const DAY_MS = 86_400_000

/** Midnight (local) at the start of the day of this instant. */
export function startOfLocalDay(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

/**
 * Last millisecond (local) of the day `shelfLifeDays` calendar days after the making day.
 * A shelf life of 0 means « to use the same day ».
 */
export function bestBeforeFrom(madeAt: number, shelfLifeDays: number): number {
  if (!Number.isInteger(shelfLifeDays) || shelfLifeDays < 0) {
    throw new RangeError('The shelf life is a whole number of days, zero or more')
  }
  const date = new Date(madeAt)
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + shelfLifeDays)
  date.setHours(23, 59, 59, 999)
  return date.getTime()
}

/**
 * Signed calendar days between today and the best-before day: 0 on the last day, 1 the day
 * before, −1 the day after. Null without a date. A 23 or 25 hour day counts as one day.
 */
export function daysLeft(bestBefore: number | null, now: number): number | null {
  if (bestBefore === null) return null
  return Math.round((startOfLocalDay(bestBefore) - startOfLocalDay(now)) / DAY_MS)
}

/** True once the best-before instant has passed. A batch without a date never expires. */
export function isExpired(bestBefore: number | null, now: number): boolean {
  return bestBefore !== null && now > bestBefore
}
