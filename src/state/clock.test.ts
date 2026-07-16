import { describe, it, expect, beforeEach } from 'vitest'
import {
  useClock,
  RANGES,
  SPEEDS,
  FLIGHT_START,
  FLIGHT_END,
  CAL_START,
  CAL_END,
} from './clock'

const initialState = useClock.getState()

beforeEach(() => {
  useClock.setState(initialState, true)
})

describe('initial state', () => {
  it('starts on the flight scale, paused, at the flight range start', () => {
    const st = useClock.getState()
    expect(st.scale).toBe('flight')
    expect(st.playing).toBe(false)
    expect(st.times.flight).toBe(FLIGHT_START)
    expect(st.times.calendar).toBe(CAL_START)
  })

  it('starts at the flight default speed (60x)', () => {
    expect(useClock.getState().speed).toBe(60)
  })
})

describe('tick', () => {
  it('advances the active playhead by dt * speed', () => {
    useClock.getState().setSpeed(60)
    useClock.getState().play()
    useClock.getState().tick(1000)
    expect(useClock.getState().times.flight).toBe(FLIGHT_START + 60_000)
  })

  it('does nothing while paused', () => {
    useClock.getState().tick(5000)
    expect(useClock.getState().times.flight).toBe(FLIGHT_START)
  })

  it('accumulates across multiple ticks', () => {
    useClock.getState().setSpeed(1)
    useClock.getState().play()
    useClock.getState().tick(100)
    useClock.getState().tick(250)
    expect(useClock.getState().times.flight).toBe(FLIGHT_START + 350)
  })

  it('does not advance the inactive scale playhead', () => {
    useClock.getState().play()
    useClock.getState().tick(1000)
    expect(useClock.getState().times.calendar).toBe(CAL_START)
  })

  it('clamps at the range end and stops playing', () => {
    useClock.getState().setTime(FLIGHT_END - 1)
    useClock.getState().setSpeed(600)
    useClock.getState().play()
    useClock.getState().tick(10_000)
    const st = useClock.getState()
    expect(st.times.flight).toBe(FLIGHT_END)
    expect(st.playing).toBe(false)
  })

  it('clamps and stops when the tick lands exactly on the end', () => {
    useClock.getState().setTime(FLIGHT_END - 60_000)
    useClock.getState().setSpeed(60)
    useClock.getState().play()
    useClock.getState().tick(1000)
    const st = useClock.getState()
    expect(st.times.flight).toBe(FLIGHT_END)
    expect(st.playing).toBe(false)
  })

  it('keeps playing when the tick stays inside the range', () => {
    useClock.getState().setSpeed(1)
    useClock.getState().play()
    useClock.getState().tick(1)
    expect(useClock.getState().playing).toBe(true)
  })

  it('a zero-dt tick leaves time untouched', () => {
    useClock.getState().play()
    useClock.getState().tick(0)
    expect(useClock.getState().times.flight).toBe(FLIGHT_START)
  })
})

describe('setTime', () => {
  it('sets the playhead of the active scale', () => {
    const t = FLIGHT_START + 3_600_000
    useClock.getState().setTime(t)
    expect(useClock.getState().times.flight).toBe(t)
  })

  it('clamps below the range start', () => {
    useClock.getState().setTime(FLIGHT_START - 1)
    expect(useClock.getState().times.flight).toBe(FLIGHT_START)
  })

  it('clamps above the range end', () => {
    useClock.getState().setTime(FLIGHT_END + 999_999)
    expect(useClock.getState().times.flight).toBe(FLIGHT_END)
  })

  it('accepts exact range boundaries', () => {
    useClock.getState().setTime(FLIGHT_END)
    expect(useClock.getState().times.flight).toBe(FLIGHT_END)
    useClock.getState().setTime(FLIGHT_START)
    expect(useClock.getState().times.flight).toBe(FLIGHT_START)
  })

  it('clamps against the calendar range when that scale is active', () => {
    useClock.getState().setScale('calendar')
    useClock.getState().setTime(CAL_END + 1)
    expect(useClock.getState().times.calendar).toBe(CAL_END)
    useClock.getState().setTime(CAL_START - 1)
    expect(useClock.getState().times.calendar).toBe(CAL_START)
  })
})

describe('setScale', () => {
  it('preserves per-scale playheads across switches', () => {
    const flightT = FLIGHT_START + 1_000_000
    useClock.getState().setTime(flightT)
    useClock.getState().setScale('calendar')
    const calT = CAL_START + 86_400_000
    useClock.getState().setTime(calT)
    useClock.getState().setScale('flight')
    const st = useClock.getState()
    expect(st.times.flight).toBe(flightT)
    expect(st.times.calendar).toBe(calT)
  })

  it('resets speed to the new scale default and pauses', () => {
    useClock.getState().setSpeed(600)
    useClock.getState().play()
    useClock.getState().setScale('calendar')
    const st = useClock.getState()
    expect(st.scale).toBe('calendar')
    expect(st.playing).toBe(false)
    expect(st.speed).toBe(604_800)
  })

  it('switching back to flight restores the flight default speed', () => {
    useClock.getState().setScale('calendar')
    useClock.getState().setScale('flight')
    expect(useClock.getState().speed).toBe(60)
  })

  it('is a no-op when the scale is unchanged (keeps playing and speed)', () => {
    useClock.getState().setSpeed(600)
    useClock.getState().play()
    useClock.getState().setScale('flight')
    const st = useClock.getState()
    expect(st.playing).toBe(true)
    expect(st.speed).toBe(600)
  })
})

describe('play / pause / toggle', () => {
  it('play sets playing, pause clears it', () => {
    useClock.getState().play()
    expect(useClock.getState().playing).toBe(true)
    useClock.getState().pause()
    expect(useClock.getState().playing).toBe(false)
  })

  it('toggle flips playing both ways', () => {
    useClock.getState().toggle()
    expect(useClock.getState().playing).toBe(true)
    useClock.getState().toggle()
    expect(useClock.getState().playing).toBe(false)
  })
})

describe('constants', () => {
  it('ranges are ordered start < end', () => {
    expect(FLIGHT_START).toBeLessThan(FLIGHT_END)
    expect(CAL_START).toBeLessThan(CAL_END)
    expect(RANGES.flight).toEqual([FLIGHT_START, FLIGHT_END])
    expect(RANGES.calendar).toEqual([CAL_START, CAL_END])
  })

  it('every scale has speed presets that include its default', () => {
    expect(SPEEDS.flight.map((s) => s.value)).toContain(60)
    expect(SPEEDS.calendar.map((s) => s.value)).toContain(604_800)
  })
})
