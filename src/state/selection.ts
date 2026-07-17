// Feature selection (drives the Detail Panel, §9) and hover state (drives the
// instant tooltip). Selection is identified by (kind, id) so it can be encoded
// in the URL and re-resolved from the static data on load.

import { create } from 'zustand'
import type { Feature } from 'geojson'
import { useHighlight } from './highlight'
import arcs from '../data/arcs.geojson.json'
import auxArcs from '../data/aux-arcs.geojson.json'
import epoch1 from '../data/flight-epoch1.geojson.json'
import epoch2 from '../data/flight-epoch2.geojson.json'
import epoch3 from '../data/flight-epoch3.geojson.json'
import debris from '../data/debris.geojson.json'
import searchAreas from '../data/search-areas.geojson.json'
import pois from '../data/pois.geojson.json'
import candidateSites from '../data/candidate-sites.geojson.json'

export type FeatureKind =
  | 'poi'
  | 'debris'
  | 'arc'
  | 'aux'
  | 'search'
  | 'site'
  | 'epoch1'
  | 'epoch2'
  | 'epoch3'

export interface Selected {
  kind: FeatureKind
  id: string
  /** GeoJSON properties of the selected feature. */
  props: Record<string, unknown>
  /** Representative position (feature point, or click point for lines/fills). */
  lngLat: [number, number]
}

export interface Hover {
  name: string
  sub: string
  x: number
  y: number
}

const COLLECTIONS: Record<FeatureKind, { features: Feature[] }> = {
  poi: pois,
  debris,
  arc: arcs,
  aux: auxArcs,
  search: searchAreas,
  site: candidateSites,
  epoch1,
  epoch2,
  epoch3,
}

/** Identity of a feature within its collection (epochs have a single feature). */
export const featureId = (kind: FeatureKind, f: Feature): string =>
  kind === 'epoch1' || kind === 'epoch2'
    ? kind
    : String(f.properties?.id ?? '')

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

/** The full GeoJSON feature for a (kind, id) pair; null if unknown. */
export const featureByKind = (kind: FeatureKind, id: string): Feature | null =>
  COLLECTIONS[kind]?.features.find((x) => featureId(kind, x) === id) ?? null

/** Resolve a (kind, id) pair against the static data; null if unknown. */
export const resolveFeature = (kind: FeatureKind, id: string): Selected | null => {
  const f = featureByKind(kind, id)
  if (!f) return null
  return {
    kind,
    id,
    props: { ...(f.properties ?? {}) },
    lngLat: representativePoint(f),
  }
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
  useHighlight.getState().set(selected ? { kind: selected.kind, id: selected.id } : null)

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
