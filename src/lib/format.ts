// Time and coordinate formatting. Flight clock shows UTC with a Malaysia local
// (UTC+8) secondary; calendar shows a date.

const pad = (n: number, w = 2) => String(Math.floor(n)).padStart(w, '0')

/** 2014-03-07 17:19:30Z */
export const fmtUTC = (ms: number): string => {
  const d = new Date(ms)
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ` +
    `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}Z`
  )
}

/** 01:19:30 MYT (UTC+8) */
export const fmtLocalMYT = (ms: number): string => {
  const d = new Date(ms + 8 * 3600_000)
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} MYT`
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
