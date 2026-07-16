// Pointer interactions: cursor conventions (grab / grabbing / pointer),
// instant hover tooltip, and click-to-select for the Detail Panel.

import type maplibregl from 'maplibre-gl'
import { useSelection, type FeatureKind, type Hover } from '../state/selection'
import { fmtDate } from '../lib/format'

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
  ['mh-search-fill', 'search'],
]
const LAYER_IDS = LAYER_KINDS.map(([id]) => id)
const KIND_BY_LAYER = new Map(LAYER_KINDS)

const KIND_PRIORITY = new Map(LAYER_KINDS.map(([id], i) => [id, i]))

interface Picked {
  kind: FeatureKind
  feature: maplibregl.MapGeoJSONFeature
}

const pick = (map: maplibregl.Map, point: { x: number; y: number }): Picked | null => {
  const existing = LAYER_IDS.filter((id) => map.getLayer(id))
  if (!existing.length) return null
  const hits = map.queryRenderedFeatures(
    // Small pixel box makes thin lines clickable.
    [
      [point.x - 4, point.y - 4],
      [point.x + 4, point.y + 4],
    ],
    { layers: existing },
  )
  if (!hits.length) return null
  const best = hits.reduce((a, b) =>
    (KIND_PRIORITY.get(a.layer.id) ?? 99) <= (KIND_PRIORITY.get(b.layer.id) ?? 99) ? a : b,
  )
  const kind = KIND_BY_LAYER.get(best.layer.id)
  return kind ? { kind, feature: best } : null
}

const hoverText = (p: Picked): Hover => {
  const props = p.feature.properties ?? {}
  const name = String(props.name ?? props.partId ?? props.label ?? p.kind)
  const sub =
    p.kind === 'debris'
      ? `${props.status} · found ${props.findDate}`
      : p.kind === 'arc'
        ? 'Satellite timing ring'
        : p.kind === 'search'
          ? `Search area · ${fmtDate(Date.parse(String(props.startDate)))}`
          : p.kind === 'site'
            ? `Candidate crash site · ${props.publishedBy ?? ''}`
            : p.kind === 'epoch1'
              ? 'Recorded flight path (ADS-B)'
              : p.kind === 'epoch2'
                ? 'Military radar path'
                : p.kind === 'epoch3'
                  ? 'Reconstructed path'
                  : String(props.oneLiner ?? '')
  return { name, sub, x: 0, y: 0 }
}

const selectedId = (p: Picked): string => {
  if (p.kind === 'epoch1' || p.kind === 'epoch2') return p.kind
  return String(p.feature.properties?.id ?? '')
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
    if (!hit) {
      canvas.style.cursor = 'grab'
      if (useSelection.getState().hover) useSelection.getState().setHover(null)
      return
    }
    canvas.style.cursor = 'pointer'
    useSelection.getState().setHover({ ...hoverText(hit), x: e.point.x, y: e.point.y })
  })
  map.on('mouseout', () => useSelection.getState().setHover(null))

  map.on('click', (e) => {
    const hit = pick(map, e.point)
    if (!hit) {
      useSelection.getState().select(null)
      return
    }
    useSelection.getState().select({
      kind: hit.kind,
      id: selectedId(hit),
      props: { ...(hit.feature.properties ?? {}) },
      lngLat: [e.lngLat.lng, e.lngLat.lat],
    })
    // FR-9.2: the map's left padding shifts to clear the Detail Panel (see
    // the padding effect in globe-map.tsx), keeping the feature visible for
    // both click and deep-link, and honoring reduced-motion there.
  })
}
