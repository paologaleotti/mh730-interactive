// Feature selection (drives the Detail Panel, §9) and hover state (drives the
// instant tooltip). Selection is identified by (kind, id) so it can be encoded
// in the URL and re-resolved from the static data on load.

import { create } from 'zustand'
import type { Feature } from 'geojson'
import arcs from '../data/arcs.geojson.json'
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

/** Resolve a (kind, id) pair against the static data; null if unknown. */
export const resolveFeature = (kind: FeatureKind, id: string): Selected | null => {
  const coll = COLLECTIONS[kind]
  if (!coll) return null
  const f = coll.features.find((x) => featureId(kind, x) === id)
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

export const useSelection = create<SelectionState>((set) => ({
  selected: null,
  hover: null,
  select: (selected) => set({ selected }),
  selectById: (kind, id) => set({ selected: resolveFeature(kind, id) }),
  setHover: (hover) => set({ hover }),
}))
