// Single source for the status/caveat colours that were previously duplicated
// across detail-panel.tsx, data-layers.ts and legend.tsx. Small const maps keyed
// by the typed data-point enums, so a colour is always looked up, never inlined.

import type { Caveat, DebrisStatus } from '../data/data-point'

export const DEBRIS_STATUS_COLORS: Record<DebrisStatus, string> = {
  confirmed: '#6faf7d',
  'almost-certain': '#8fae6f',
  'highly-likely': '#c9a35b',
  likely: '#c9865b',
  unidentifiable: '#7b8794',
}

// Ordered legend scale (label wording differs from the raw status vocabulary).
export const DEBRIS_LEGEND: { status: DebrisStatus; label: string; color: string }[] = [
  { status: 'confirmed', label: 'confirmed', color: DEBRIS_STATUS_COLORS.confirmed },
  { status: 'almost-certain', label: 'almost certain', color: DEBRIS_STATUS_COLORS['almost-certain'] },
  { status: 'highly-likely', label: 'highly likely', color: DEBRIS_STATUS_COLORS['highly-likely'] },
  { status: 'likely', label: 'likely', color: DEBRIS_STATUS_COLORS.likely },
  { status: 'unidentifiable', label: 'unidentified', color: DEBRIS_STATUS_COLORS.unidentifiable },
]

export const CAVEAT_COLORS: Record<Caveat, string> = {
  contested: '#c65d5d',
  disputed: '#c65d5d',
  uncorroborated: '#c9865b',
  'model-dependent': '#c9865b',
}

export const CAVEAT_LABELS: Record<Caveat, string> = {
  contested: 'CONTESTED',
  disputed: 'DISPUTED',
  uncorroborated: 'UNCORROBORATED',
  'model-dependent': 'MODEL-DEPENDENT',
}

// Badge accents for the fields that carry their own status vocabulary.
type BadgeAccent =
  | 'proposed'
  | 'searched'
  | 'siteUnsearched'
  | 'siteSearched'
  | 'aux'
  | 'contestedMethod'

export const BADGE_COLORS: Record<BadgeAccent, string> = {
  proposed: '#e0996b',
  searched: '#6fb7cc',
  siteUnsearched: '#e0996b',
  siteSearched: '#6fb7cc',
  aux: '#5fb89a',
  contestedMethod: '#c65d5d',
}
