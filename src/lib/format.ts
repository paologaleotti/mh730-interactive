// Time and coordinate formatting. Times are shown in the flight's local zone -
// Kuala Lumpur, MYT = UTC+8 (Malaysia has no daylight saving) - always with
// the "(UTC+8)" signature, and UTC is kept as a secondary reference.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const pad = (n: number, w = 2) => String(Math.floor(n)).padStart(w, '0')

/** 2014-03-07 17:19:30Z */
export const fmtUTC = (ms: number): string => {
  const d = new Date(ms)
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}Z`
  )
}

/** 01:19:30 (UTC+8) - Kuala Lumpur local time. */
export const fmtLocalMYT = (ms: number): string => {
  const d = new Date(ms + 8 * 3600_000)
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} (UTC+8)`
}

/** 8 Mar 01:19:30 (UTC+8) - local time with date (the flight crosses midnight MYT). */
export const fmtLocalMYTFull = (ms: number): string => {
  const d = new Date(ms + 8 * 3600_000)
  return (
    `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} (UTC+8)`
  )
}

/** 2016-07-29 */
export const fmtDate = (ms: number): string => {
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

/** Signed, fixed-width decimal degrees, e.g. -35.1042. */
export const fmtDeg = (n: number, w = 4): string => {
  const s = n < 0 ? '-' : '+'
  return s + Math.abs(n).toFixed(w).padStart(3 + 1 + w, '0')
}
