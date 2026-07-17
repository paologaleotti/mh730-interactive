// Feature selection (drives the Detail Panel, §9) and hover state (drives the
// instant tooltip). Selection carries the typed DataPoint plus a representative
// position; identity is (point.kind, point.id) so it round-trips through the URL
// and re-resolves from the static data on load.

import { create } from 'zustand'
import type { Feature } from 'geojson'
import { useHighlight } from './highlight'
import { dataPointByKind, featureByKind } from '../data/collections'
import type { DataPoint, FeatureKind } from '../data/data-point'

export type { FeatureKind } from '../data/data-point'
export { featureByKind } from '../data/collections'

export interface Selected {
  /** The typed feature. `point.kind` / `point.id` identify it. */
  point: DataPoint
  /** Representative position (feature point, or click point for lines/fills). */
  lngLat: [number, number]
}

export interface Hover {
  name: string
  sub: string
  x: number
  y: number
}

/** A representative point for camera actions and URL restore. */
const representativePoint = (f: Feature): [number, number] => {
  const g = f.geometry
  if (g.type === 'Point') return [g.coordinates[0], g.coordinates[1]]
  if (g.type === 'LineString') {
    const mid = g.coordinates[Math.floor(g.coordinates.length / 2)]
    return [mid[0], mid[1]]
  }
  if (g.type === 'Polygon') {
    const ring = g.coordinates[0]
    const [sx, sy] = ring.reduce<[number, number]>(
      ([ax, ay], [x, y]) => [ax + x, ay + y],
      [0, 0],
    )
    return [sx / ring.length, sy / ring.length]
  }
  return [0, 0]
}

/** Resolve a (kind, id) pair against the static data; null if unknown. An
    explicit lngLat (e.g. the click point) overrides the representative point. */
export const resolveFeature = (
  kind: FeatureKind,
  id: string,
  lngLat?: [number, number],
): Selected | null => {
  const point = dataPointByKind(kind, id)
  if (!point) return null
  const feature = featureByKind(kind, id)
  return { point, lngLat: lngLat ?? (feature ? representativePoint(feature) : [0, 0]) }
}

interface SelectionState {
  selected: Selected | null
  hover: Hover | null
  select: (s: Selected | null) => void
  selectById: (kind: FeatureKind, id: string) => void
  setHover: (h: Hover | null) => void
}

// Selecting a feature also highlights it on the map; the highlight store is
// separate so other drivers (flight-clock replay) can highlight without a
// selection. Clearing the selection clears the click-driven highlight.
const syncHighlight = (selected: Selected | null) =>
  useHighlight.getState().set(
    selected ? { kind: selected.point.kind, id: selected.point.id } : null,
  )

export const useSelection = create<SelectionState>((set) => ({
  selected: null,
  hover: null,
  select: (selected) => {
    syncHighlight(selected)
    set({ selected })
  },
  selectById: (kind, id) => {
    const selected = resolveFeature(kind, id)
    syncHighlight(selected)
    set({ selected })
  },
  setHover: (hover) => set({ hover }),
}))
