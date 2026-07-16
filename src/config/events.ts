// Key timeline events used for scrubber tick marks and step-to-next-event.
// Flight-clock times are UTC. Handshake seconds follow the released SATCOM log
// / Ashton et al. 2015; treat as authoritative-but-roundable for tick display.

import type { TimeScale } from '../state/clock'

export interface TimeEvent {
  id: string
  scale: TimeScale
  t: number // epoch ms (UTC)
  label: string
  kind: 'flight' | 'handshake' | 'debris' | 'search'
}

const U = Date.UTC

export const EVENTS: TimeEvent[] = [
  // --- Flight clock ---
  { id: 'depart', scale: 'flight', t: U(2014, 2, 7, 16, 42, 0), label: 'Departure WMKK', kind: 'flight' },
  { id: 'acars', scale: 'flight', t: U(2014, 2, 7, 17, 7, 0), label: 'Last ACARS', kind: 'flight' },
  { id: 'voice', scale: 'flight', t: U(2014, 2, 7, 17, 19, 30), label: 'Final voice contact', kind: 'flight' },
  { id: 'xpdr', scale: 'flight', t: U(2014, 2, 7, 17, 21, 0), label: 'Transponder loss (IGARI)', kind: 'flight' },
  { id: 'radar', scale: 'flight', t: U(2014, 2, 7, 18, 22, 0), label: 'Last primary radar (past MEKAR)', kind: 'flight' },
  { id: 'hs1', scale: 'flight', t: U(2014, 2, 7, 18, 25, 27), label: 'HS1 · log-on', kind: 'handshake' },
  { id: 'hs2', scale: 'flight', t: U(2014, 2, 7, 19, 41, 3), label: 'HS2', kind: 'handshake' },
  { id: 'hs3', scale: 'flight', t: U(2014, 2, 7, 20, 41, 5), label: 'HS3', kind: 'handshake' },
  { id: 'hs4', scale: 'flight', t: U(2014, 2, 7, 21, 41, 27), label: 'HS4', kind: 'handshake' },
  { id: 'hs5', scale: 'flight', t: U(2014, 2, 7, 22, 41, 22), label: 'HS5', kind: 'handshake' },
  { id: 'hs6', scale: 'flight', t: U(2014, 2, 8, 0, 11, 0), label: 'HS6', kind: 'handshake' },
  { id: 'hs7', scale: 'flight', t: U(2014, 2, 8, 0, 19, 29), label: 'HS7 · final log-on', kind: 'handshake' },

  // --- Calendar ---
  { id: 'flaperon', scale: 'calendar', t: U(2015, 6, 29), label: 'Flaperon, Réunion', kind: 'debris' },
  { id: 'atsb-search', scale: 'calendar', t: U(2014, 9, 6), label: 'ATSB underwater search begins', kind: 'search' },
  { id: 'oi-2018', scale: 'calendar', t: U(2018, 0, 22), label: 'Ocean Infinity 2018 search', kind: 'search' },
  { id: 'oi-2025', scale: 'calendar', t: U(2025, 2, 25), label: 'Ocean Infinity 2025–26 resumes', kind: 'search' },
  { id: 'oi-end', scale: 'calendar', t: U(2026, 2, 8), label: 'OI 2026 pause', kind: 'search' },
]

export const eventsForScale = (scale: TimeScale): TimeEvent[] =>
  EVENTS.filter((e) => e.scale === scale).sort((a, b) => a.t - b.t)
