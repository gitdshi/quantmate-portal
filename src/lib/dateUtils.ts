/**
 * Date helpers shared across pages.
 *
 * The product convention is that every date-range picker defaults to the
 * most recent one year (today minus one year → today). Centralising the
 * logic here keeps the default consistent and avoids hard-coded stale dates
 * such as `2023-01-01`.
 */

/** Returns today's date as `YYYY-MM-DD` (local timezone). */
export function todayStr(): string {
  return toDateStr(new Date())
}

/** Returns the date one year before today as `YYYY-MM-DD` (local timezone). */
export function oneYearAgoStr(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 1)
  return toDateStr(d)
}

/** Default one-year range used by every date-range picker. */
export function defaultOneYearRange(): { startDate: string; endDate: string } {
  return { startDate: oneYearAgoStr(), endDate: todayStr() }
}

/** Formats a Date (or date-like value) as `YYYY-MM-DD` (local timezone). */
export function toDateStr(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
