import { describe, it, expect } from 'vitest'
import { fmtUTC, fmtLocalMYT, fmtDate, fmtDeg } from './format'

describe('fmtUTC', () => {
  it('formats a known timestamp with Z suffix', () => {
    expect(fmtUTC(Date.UTC(2014, 2, 7, 17, 19, 30))).toBe('2014-03-07 17:19:30Z')
  })

  it('zero-pads single-digit fields', () => {
    expect(fmtUTC(Date.UTC(2014, 0, 2, 3, 4, 5))).toBe('2014-01-02 03:04:05Z')
  })

  it('formats midnight', () => {
    expect(fmtUTC(Date.UTC(2014, 2, 8, 0, 0, 0))).toBe('2014-03-08 00:00:00Z')
  })

  it('truncates sub-second precision', () => {
    expect(fmtUTC(Date.UTC(2014, 2, 7, 17, 19, 30) + 999)).toBe('2014-03-07 17:19:30Z')
  })
})

describe('fmtLocalMYT (UTC+8)', () => {
  it('shifts a UTC time by +8 hours', () => {
    expect(fmtLocalMYT(Date.UTC(2014, 2, 7, 8, 30, 15))).toBe('16:30:15 MYT')
  })

  it('rolls over past midnight into the next local day', () => {
    // 17:19:30 UTC on 7 Mar is 01:19:30 MYT on 8 Mar.
    expect(fmtLocalMYT(Date.UTC(2014, 2, 7, 17, 19, 30))).toBe('01:19:30 MYT')
  })

  it('16:00 UTC is exactly local midnight', () => {
    expect(fmtLocalMYT(Date.UTC(2014, 2, 7, 16, 0, 0))).toBe('00:00:00 MYT')
  })

  it('one second before local midnight stays on the same local day', () => {
    expect(fmtLocalMYT(Date.UTC(2014, 2, 7, 15, 59, 59))).toBe('23:59:59 MYT')
  })

  it('handles a rollover across a month boundary', () => {
    // 31 Jan 20:00 UTC -> 1 Feb 04:00 MYT; only the clock is shown.
    expect(fmtLocalMYT(Date.UTC(2014, 0, 31, 20, 0, 0))).toBe('04:00:00 MYT')
  })
})

describe('fmtDate', () => {
  it('formats a known date', () => {
    expect(fmtDate(Date.UTC(2016, 6, 29))).toBe('2016-07-29')
  })

  it('zero-pads month and day', () => {
    expect(fmtDate(Date.UTC(2027, 5, 30))).toBe('2027-06-30')
    expect(fmtDate(Date.UTC(2014, 0, 1))).toBe('2014-01-01')
  })

  it('uses the UTC date, not local, near midnight', () => {
    expect(fmtDate(Date.UTC(2014, 2, 7, 23, 59, 59))).toBe('2014-03-07')
  })
})

describe('fmtDeg', () => {
  it('formats a negative value with a minus sign and zero padding', () => {
    expect(fmtDeg(-35.1042)).toBe('-035.1042')
  })

  it('formats a positive value with an explicit plus sign', () => {
    expect(fmtDeg(35.1042)).toBe('+035.1042')
  })

  it('formats zero as positive', () => {
    expect(fmtDeg(0)).toBe('+000.0000')
  })

  it('pads small magnitudes to three integer digits', () => {
    expect(fmtDeg(5)).toBe('+005.0000')
    expect(fmtDeg(-0.5)).toBe('-000.5000')
  })

  it('does not truncate three-digit magnitudes', () => {
    expect(fmtDeg(179.9999)).toBe('+179.9999')
    expect(fmtDeg(-179.9999)).toBe('-179.9999')
  })

  it('respects a custom decimal width', () => {
    expect(fmtDeg(-35.1, 2)).toBe('-035.10')
    expect(fmtDeg(7, 1)).toBe('+007.0')
    expect(fmtDeg(92.12345, 6)).toBe('+092.123450')
  })

  it('rounds to the requested width', () => {
    expect(fmtDeg(1.23456, 4)).toBe('+001.2346')
  })
})
