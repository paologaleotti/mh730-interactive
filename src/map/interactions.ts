// Pointer interactions: cursor conventions (grab / grabbing / pointer),
// instant hover tooltip, and click-to-select for the Detail Panel.
//
// Both hover and click resolve the typed DataPoint from the pristine collection
// by (kind, id) - never from MapLibre's flattened feature.properties (which
// stringifies nested objects like citation). Only the top-level `id` is read off
// the picked feature, which survives flattening.

import type maplibregl from 'maplibre-gl'
import { useSelection, resolveFeature, type FeatureKind, type Hover } from '../state/selection'
import { dataPointByKind } from '../data/collections'
import { hoverText } from '../lib/data-display'

/** maplibre layer id -> selection kind, in hover/click priority order
    (points beat lines beat fills when overlapping). */
const LAYER_KINDS: [string, FeatureKind][] = [
  ['mh-departure', 'poi'],
  ['mh-poi', 'poi'],
  ['mh-debris', 'debris'],
  ['mh-sites', 'site'],
  ['mh-epoch1', 'epoch1'],
  ['mh-epoch2', 'epoch2'],
  ['mh-epoch3', 'epoch3'],
  ['mh-arc7', 'arc'],
  ['mh-arcs', 'arc'],
  ['mh-aux-arcs', 'aux'],
  ['mh-search-fill', 'search'],
]
const LAYER_IDS = LAYER_KINDS.map(([id]) => id)
const KIND_BY_LAYER = new Map(LAYER_KINDS)

const KIND_PRIORITY = new Map(LAYER_KINDS.map(([id], i) => [id, i]))

interface Picked {
  kind: FeatureKind
  feature: maplibregl.MapGeoJSONFeature
}

// Geometry precedence: a click always resolves to the topmost thing under the
// cursor - a point/marker beats a line, a line beats a fill - regardless of
// layer draw order. Within the same geometry class, the LAYER_KINDS order
// breaks ties. This guarantees "click a dot sitting on a line -> open the dot".
const geomRank = (f: maplibregl.MapGeoJSONFeature): number => {
  const t = f.geometry.type
  if (t === 'Point' || t === 'MultiPoint') return 0
  if (t === 'LineString' || t === 'MultiLineString') return 1
  return 2
}

const pick = (map: maplibregl.Map, point: { x: number; y: number }): Picked | null => {
  const existing = LAYER_IDS.filter((id) => map.getLayer(id))
  if (!existing.length) return null
  const hits = map.queryRenderedFeatures(
    // Small pixel box makes thin lines and small markers clickable.
    [
      [point.x - 5, point.y - 5],
      [point.x + 5, point.y + 5],
    ],
    { layers: existing },
  )
  if (!hits.length) return null
  const score = (f: maplibregl.MapGeoJSONFeature) =>
    geomRank(f) * 100 + (KIND_PRIORITY.get(f.layer.id) ?? 99)
  const best = hits.reduce((a, b) => (score(a) <= score(b) ? a : b))
  const kind = KIND_BY_LAYER.get(best.layer.id)
  return kind ? { kind, feature: best } : null
}

/** Feature id off the picked feature (top-level string, survives flattening). */
const pickedId = (p: Picked): string => String(p.feature.properties?.id ?? '')

const hoverFor = (p: Picked): Hover | null => {
  const point = dataPointByKind(p.kind, pickedId(p))
  if (!point) return null
  const { name, sub } = hoverText(point)
  return { name, sub, x: 0, y: 0 }
}

/** Wire cursor + hover + click. Call once after map creation. */
export const wireInteractions = (map: maplibregl.Map): void => {
  const canvas = map.getCanvas()
  canvas.style.cursor = 'grab'
  let dragging = false

  map.on('dragstart', () => {
    dragging = true
    canvas.style.cursor = 'grabbing'
    useSelection.getState().setHover(null)
  })
  map.on('dragend', () => {
    dragging = false
    canvas.style.cursor = 'grab'
  })

  map.on('mousemove', (e) => {
    if (dragging) return
    const hit = pick(map, e.point)
    const hover = hit ? hoverFor(hit) : null
    if (!hover) {
      canvas.style.cursor = 'grab'
      if (useSelection.getState().hover) useSelection.getState().setHover(null)
      return
    }
    canvas.style.cursor = 'pointer'
    useSelection.getState().setHover({ ...hover, x: e.point.x, y: e.point.y })
  })
  map.on('mouseout', () => useSelection.getState().setHover(null))

  map.on('click', (e) => {
    const hit = pick(map, e.point)
    // resolveFeature returns null for unknown/unpicked -> closes the panel.
    const selected = hit ? resolveFeature(hit.kind, pickedId(hit), [e.lngLat.lng, e.lngLat.lat]) : null
    useSelection.getState().select(selected)
    // FR-9.2: the map's left padding shifts to clear the Detail Panel (see
    // the padding effect in globe-map.tsx), keeping the feature visible for
    // both click and deep-link, and honoring reduced-motion there.
  })
}
