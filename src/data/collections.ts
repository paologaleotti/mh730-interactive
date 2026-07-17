// Typed data access. Parses every generated GeoJSON feature's properties into a
// DataPoint at load (a legitimate boundary: static JSON crossing into the app),
// and exposes lookups by (kind, id) plus the small metadata lists the legend
// needs. Consumers never touch raw feature.properties again.

import type { Feature } from 'geojson'
import { keyBy } from 'es-toolkit'
import arcs from './arcs.geojson.json'
import auxArcs from './aux-arcs.geojson.json'
import epoch1 from './flight-epoch1.geojson.json'
import epoch2 from './flight-epoch2.geojson.json'
import epoch3 from './flight-epoch3.geojson.json'
import debris from './debris.geojson.json'
import searchAreas from './search-areas.geojson.json'
import pois from './pois.geojson.json'
import candidateSites from './candidate-sites.geojson.json'
import { parseDataPoint, type DataPoint, type FeatureKind } from './data-point'

interface Entry {
  point: DataPoint
  feature: Feature
}

// All feature collections, in one place. Kind is carried inside each feature's
// properties (stamped by build-data), so parsing is uniform across sources.
const SOURCES: { features: Feature[] }[] = [
  pois,
  debris,
  arcs,
  auxArcs,
  searchAreas,
  candidateSites,
  epoch1,
  epoch2,
  epoch3,
]

const entries: Entry[] = SOURCES.flatMap((fc) =>
  fc.features.map((feature) => ({ feature, point: parseDataPoint(feature.properties) })),
)

const byKey = keyBy(entries, (e) => `${e.point.kind}:${e.point.id}`)

export const allDataPoints: DataPoint[] = entries.map((e) => e.point)

/** The typed DataPoint for a (kind, id) pair; null if unknown. */
export const dataPointByKind = (kind: FeatureKind, id: string): DataPoint | null =>
  byKey[`${kind}:${id}`]?.point ?? null

/** The raw GeoJSON feature (for geometry: highlight, representative point). */
export const featureByKind = (kind: FeatureKind, id: string): Feature | null =>
  byKey[`${kind}:${id}`]?.feature ?? null

// Legend/panel metadata, derived from typed points (filter narrows the union).
export const SEARCH_CAMPAIGNS = allDataPoints
  .filter((p) => p.kind === 'search')
  .map((p) => ({ id: p.id, name: p.name, campaignKind: p.campaignKind, color: p.color }))
  .sort((a, b) => a.id.localeCompare(b.id))

export const RECONSTRUCTIONS = allDataPoints
  .filter((p) => p.kind === 'epoch3')
  .map((p) => ({ id: p.id, name: p.name, color: p.color, contested: p.contested }))
