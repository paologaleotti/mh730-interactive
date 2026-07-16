import { describe, it, expect } from 'vitest'
import { EVENTS, eventsForScale } from './events'
import { RANGES } from '../state/clock'

describe('EVENTS invariants', () => {
  it('event ids are unique', () => {
    const ids = EVENTS.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every event has a non-empty label and a valid epoch time', () => {
    const ok = EVENTS.every((e) => e.label.length > 0 && Number.isFinite(e.t))
    expect(ok).toBe(true)
  })

  it('every event lies within its scale range', () => {
    for (const e of EVENTS) {
      const [start, end] = RANGES[e.scale]
      expect(e.t).toBeGreaterThanOrEqual(start)
      expect(e.t).toBeLessThanOrEqual(end)
    }
  })
})

describe('eventsForScale', () => {
  it('returns only events of the requested scale', () => {
    expect(eventsForScale('flight').every((e) => e.scale === 'flight')).toBe(true)
    expect(eventsForScale('calendar').every((e) => e.scale === 'calendar')).toBe(true)
  })

  it('returns events sorted ascending by time', () => {
    const flight = eventsForScale('flight')
    const calendar = eventsForScale('calendar')
    const isAscending = (ts: number[]) => ts.every((t, i) => i === 0 || ts[i - 1] <= t)
    expect(isAscending(flight.map((e) => e.t))).toBe(true)
    expect(isAscending(calendar.map((e) => e.t))).toBe(true)
  })

  it('sorts even when the source order is unsorted (calendar list is out of order)', () => {
    const calendar = eventsForScale('calendar')
    expect(calendar[0].id).toBe('atsb-search')
    expect(calendar[1].id).toBe('flaperon')
  })

  it('the two scales partition the full event list', () => {
    expect(eventsForScale('flight').length + eventsForScale('calendar').length).toBe(
      EVENTS.length,
    )
  })

  it('does not mutate the module-level EVENTS array', () => {
    const before = EVENTS.map((e) => e.id)
    eventsForScale('flight')
    eventsForScale('calendar')
    expect(EVENTS.map((e) => e.id)).toEqual(before)
  })
})
