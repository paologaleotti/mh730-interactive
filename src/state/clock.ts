// P3: One master clock. A single UTC time drives animation, audio, captions,
// and camera choreography. Two switchable scales share one store so every
// consumer reads the same authoritative time.

import { create } from 'zustand'

export type TimeScale = 'flight' | 'calendar'

// Flight clock: 2014-03-07 16:00 UTC → 2014-03-08 01:30 UTC.
export const FLIGHT_START = Date.UTC(2014, 2, 7, 16, 0, 0)
export const FLIGHT_END = Date.UTC(2014, 2, 8, 1, 30, 0)
// Calendar: 2014 → agreement extension end (30 Jun 2027).
export const CAL_START = Date.UTC(2014, 0, 1)
export const CAL_END = Date.UTC(2027, 5, 30)

export const RANGES: Record<TimeScale, readonly [number, number]> = {
  flight: [FLIGHT_START, FLIGHT_END],
  calendar: [CAL_START, CAL_END],
}

// Speed = simulated ms advanced per real ms.
export interface SpeedPreset {
  label: string
  value: number
}
export const SPEEDS: Record<TimeScale, SpeedPreset[]> = {
  flight: [
    { label: '1×', value: 1 },
    { label: '60×', value: 60 },
    { label: '600×', value: 600 },
  ],
  calendar: [
    { label: '1 d/s', value: 86_400 },
    { label: '7 d/s', value: 604_800 },
    { label: '30 d/s', value: 2_592_000 },
  ],
}

const DEFAULT_SPEED: Record<TimeScale, number> = {
  flight: 60,
  calendar: 604_800,
}

const clamp = (t: number, scale: TimeScale) => {
  const [a, b] = RANGES[scale]
  return t < a ? a : t > b ? b : t
}

interface ClockState {
  scale: TimeScale
  /** Independent playhead per scale, preserved when switching. */
  times: Record<TimeScale, number>
  playing: boolean
  speed: number

  setScale: (s: TimeScale) => void
  setTime: (t: number) => void
  setSpeed: (v: number) => void
  play: () => void
  pause: () => void
  toggle: () => void
  /** Advance by real elapsed ms; called by the rAF driver. */
  tick: (dtMs: number) => void
}

// The calendar scale stays in the store for future layers (search sweep,
// drift playback) but only the flight scale is surfaced in the UI today.
export const useClock = create<ClockState>((set, get) => ({
  scale: 'flight',
  times: { flight: FLIGHT_START, calendar: CAL_START },
  playing: false,
  speed: DEFAULT_SPEED.flight,

  setScale: (scale) =>
    set((st) =>
      scale === st.scale
        ? {}
        : { scale, playing: false, speed: DEFAULT_SPEED[scale] },
    ),

  setTime: (t) =>
    set((st) => ({
      times: { ...st.times, [st.scale]: clamp(t, st.scale) },
    })),

  setSpeed: (value) => set({ speed: value }),
  play: () => set({ playing: true }),
  pause: () => set({ playing: false }),
  toggle: () => set((st) => ({ playing: !st.playing })),

  tick: (dtMs) => {
    const st = get()
    if (!st.playing) return
    const [, end] = RANGES[st.scale]
    const next = st.times[st.scale] + dtMs * st.speed
    if (next >= end) {
      set({ times: { ...st.times, [st.scale]: end }, playing: false })
    } else {
      set({ times: { ...st.times, [st.scale]: next } })
    }
  },
}))

/** Current playhead of the active scale. */
export const useCurrentTime = (): number =>
  useClock((s) => s.times[s.scale])

/** Fractional progress [0,1] of the active scale. */
export const useProgress = (): number =>
  useClock((s) => {
    const [a, b] = RANGES[s.scale]
    return (s.times[s.scale] - a) / (b - a)
  })
