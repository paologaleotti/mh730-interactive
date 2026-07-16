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
  { id: 'xpdr', scale: 'flight', t: U(2014, 2, 7, 17, 21, 13), label: 'Transponder loss (IGARI)', kind: 'flight' },
  { id: 'radar', scale: 'flight', t: U(2014, 2, 7, 18, 22, 12), label: 'Last primary radar (past MEKAR)', kind: 'flight' },
  { id: 'hs1', scale: 'flight', t: U(2014, 2, 7, 18, 25, 27), label: 'HS1 · log-on', kind: 'handshake' },
  { id: 'call1', scale: 'flight', t: U(2014, 2, 7, 18, 39, 52), label: 'Unanswered sat phone call (BFO 88 Hz)', kind: 'handshake' },
  { id: 'hs2', scale: 'flight', t: U(2014, 2, 7, 19, 41, 3), label: 'HS2', kind: 'handshake' },
  { id: 'hs3', scale: 'flight', t: U(2014, 2, 7, 20, 41, 5), label: 'HS3', kind: 'handshake' },
  { id: 'hs4', scale: 'flight', t: U(2014, 2, 7, 21, 41, 27), label: 'HS4', kind: 'handshake' },
  { id: 'hs5', scale: 'flight', t: U(2014, 2, 7, 22, 41, 22), label: 'HS5', kind: 'handshake' },
  { id: 'call2', scale: 'flight', t: U(2014, 2, 7, 23, 13, 58), label: 'Unanswered sat phone call (BFO 217 Hz)', kind: 'handshake' },
  { id: 'hs6', scale: 'flight', t: U(2014, 2, 8, 0, 11, 0), label: 'HS6', kind: 'handshake' },
  { id: 'hs7', scale: 'flight', t: U(2014, 2, 8, 0, 19, 29), label: 'HS7 · final log-on', kind: 'handshake' },

  // --- Calendar ---
  { id: 'flaperon', scale: 'calendar', t: U(2015, 6, 29), label: 'Flaperon, Réunion', kind: 'debris' },
  { id: 'atsb-search', scale: 'calendar', t: U(2014, 9, 6), label: 'ATSB underwater search begins', kind: 'search' },
  { id: 'najib', scale: 'calendar', t: U(2014, 2, 24), label: '"Flight ended in the southern Indian Ocean"', kind: 'search' },
  { id: 'accident', scale: 'calendar', t: U(2015, 0, 29), label: 'Malaysia declares accident, all presumed lost', kind: 'search' },
  { id: 'suspension', scale: 'calendar', t: U(2017, 0, 17), label: 'Underwater search suspended', kind: 'search' },
  { id: 'oi-2018', scale: 'calendar', t: U(2018, 0, 22), label: 'Ocean Infinity 2018 search', kind: 'search' },
  { id: 'sir', scale: 'calendar', t: U(2018, 6, 30), label: 'Safety Investigation Report released', kind: 'search' },
  { id: 'oi-2025', scale: 'calendar', t: U(2025, 1, 23), label: 'Ocean Infinity 2025–26 search begins', kind: 'search' },
  { id: 'oi-end', scale: 'calendar', t: U(2026, 0, 23), label: 'OI departs search area (concluded, no find)', kind: 'search' },
  { id: 'oi-extension', scale: 'calendar', t: U(2026, 6, 1), label: 'Agreement extended to Jun 2027', kind: 'search' },
]

export const eventsForScale = (scale: TimeScale): TimeEvent[] =>
  EVENTS.filter((e) => e.scale === scale).sort((a, b) => a.t - b.t)
