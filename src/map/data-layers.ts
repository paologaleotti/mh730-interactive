// Evidence data layers on top of the basemap. Registered on every style.load
// (the basemap style can be swapped at runtime) and kept in sync with the
// layer-visibility store. Layer ids here map onto the registry ids in
// config/layers.ts; confidence styling follows P2 (recorded solid, derived
// dashed, modelled distinct + labeled).

import type maplibregl from 'maplibre-gl'
import arcs from '../data/arcs.geojson.json'
import epoch1 from '../data/flight-epoch1.geojson.json'
import epoch2 from '../data/flight-epoch2.geojson.json'
import epoch3 from '../data/flight-epoch3.geojson.json'
import debris from '../data/debris.geojson.json'
import searchAreas from '../data/search-areas.geojson.json'
import pois from '../data/pois.geojson.json'
import candidateSites from '../data/candidate-sites.geojson.json'

/** Campaign metadata for the sub-layer toggles and the legend. */
export const SEARCH_CAMPAIGNS = searchAreas.features
  .map((f) => ({
    id: String(f.properties?.id),
    name: String(f.properties?.name),
    kind: String(f.properties?.kind),
    color: String(f.properties?.color),
  }))
  .sort((a, b) => a.id.localeCompare(b.id))

// AWS Open Data terrain tiles (Mapzen terrarium encoding): global elevation
// incl. ocean bathymetry (ETOPO1-derived at sea). Keyless, spec B.13-style.
// High-res GA survey patches layer on top later (B.7 pipeline).
const TERRAIN_TILES = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'

const C = {
  recorded: '#dfe6ec',
  recordedDim: '#b7c2cc',
  derived: '#c9a35b',
  arcHi: '#e8c987',
  green: '#6faf7d',
  amber: '#c9a35b',
  gray: '#5f6b77',
  violet: '#9d86c9',
  halo: '#05070a',
}

/** registry layer id -> maplibre layer ids owned by it */
export const REGISTRY_TO_MAP_LAYERS: Record<string, string[]> = {
  'flight-epoch1': ['mh-epoch1'],
  'flight-epoch2': ['mh-epoch2'],
  'flight-epoch3': ['mh-epoch3', 'mh-epoch3-labels'],
  arcs: ['mh-arcs', 'mh-arc7', 'mh-arc-labels', 'mh-arc7-label'],
  search: ['mh-search-fill', 'mh-search-line', 'mh-search-labels'],
  debris: ['mh-debris', 'mh-debris-labels'],
  poi: ['mh-poi', 'mh-poi-labels', 'mh-departure', 'mh-departure-label'],
  'candidate-sites': ['mh-sites', 'mh-sites-labels'],
  bathymetry: ['mh-bathy-relief', 'mh-bathy-hillshade'],
}

// ------------------------------------------------------------------ icons
// Shape-coded markers (legend-matched): triangle=debris, square=airport,
// diamond=waypoint, circle=event, hexagon=station, star=candidate site,
// cross=satellite sub-point. Generated on a canvas so no sprite assets.

type Shape = 'triangle' | 'square' | 'diamond' | 'circle' | 'hexagon' | 'star' | 'cross'

const shapePath = (ctx: CanvasRenderingContext2D, shape: Shape, c: number, r: number) => {
  const poly = (n: number, rot: number, radius = r) => {
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const a = rot + (i * 2 * Math.PI) / n
      const [x, y] = [c + radius * Math.cos(a), c + radius * Math.sin(a)]
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
  }
  if (shape === 'triangle') poly(3, -Math.PI / 2)
  else if (shape === 'square') poly(4, -Math.PI / 4, r * 0.95)
  else if (shape === 'diamond') poly(4, 0)
  else if (shape === 'hexagon') poly(6, -Math.PI / 2)
  else if (shape === 'circle') {
    ctx.beginPath()
    ctx.arc(c, c, r * 0.85, 0, 2 * Math.PI)
  } else if (shape === 'star') {
    ctx.beginPath()
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5
      const radius = i % 2 === 0 ? r : r * 0.45
      const [x, y] = [c + radius * Math.cos(a), c + radius * Math.sin(a)]
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
  } else {
    // cross
    const w = r * 0.32
    ctx.beginPath()
    ctx.rect(c - w, c - r, 2 * w, 2 * r)
    ctx.rect(c - r, c - w, 2 * r, 2 * w)
  }
}

const makeShapeImage = (shape: Shape, fill: string): ImageData => {
  const size = 36 // drawn at 2x, rendered ~18px
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2d context unavailable')
  shapePath(ctx, shape, size / 2, size / 2 - 4)
  ctx.fillStyle = fill
  ctx.fill()
  ctx.lineWidth = 2.5
  ctx.strokeStyle = '#05070a'
  ctx.stroke()
  return ctx.getImageData(0, 0, size, size)
}

const DEBRIS_STATUS_COLORS: Record<string, string> = {
  confirmed: '#6faf7d',
  'almost-certain': '#8fae6f',
  'highly-likely': '#c9a35b',
  likely: '#c9865b',
  unidentifiable: '#7b8794',
}

const ICONS: [name: string, shape: Shape, color: string][] = [
  ...Object.entries(DEBRIS_STATUS_COLORS).map(
    ([status, color]): [string, Shape, string] => [`mh-tri-${status}`, 'triangle', color],
  ),
  ['mh-sq-airport', 'square', '#6fb7cc'],
  ['mh-di-waypoint', 'diamond', '#8fa8b8'],
  ['mh-ci-event', 'circle', '#dfe6ec'],
  ['mh-hx-station', 'hexagon', '#c9a35b'],
  ['mh-st-site', 'star', '#c65d5d'],
  ['mh-cr-satellite', 'cross', '#6fb7cc'],
]

const registerIcons = (map: maplibregl.Map) => {
  for (const [name, shape, color] of ICONS) {
    if (!map.hasImage(name)) {
      map.addImage(name, makeShapeImage(shape, color), { pixelRatio: 2 })
    }
  }
}

const FONT = ['Noto Sans Regular']
const FONT_BOLD = ['Noto Sans Bold']

// Depth palette: dark abyss -> lighter shelf; land fully transparent so the
// basemap shows through.
const RELIEF_COLOR: maplibregl.ExpressionSpecification = [
  'interpolate',
  ['linear'],
  ['elevation'],
  -7000, 'rgba(8, 16, 28, 0.95)',
  -5000, 'rgba(12, 28, 46, 0.9)',
  -3500, 'rgba(18, 42, 64, 0.85)',
  -2000, 'rgba(28, 60, 84, 0.8)',
  -1000, 'rgba(40, 78, 102, 0.75)',
  -200, 'rgba(56, 96, 118, 0.7)',
  -1, 'rgba(70, 110, 130, 0.6)',
  0, 'rgba(0, 0, 0, 0)',
  9000, 'rgba(0, 0, 0, 0)',
]

const addSourceOnce = (
  map: maplibregl.Map,
  id: string,
  source: maplibregl.SourceSpecification,
) => {
  if (!map.getSource(id)) map.addSource(id, source)
}

/**
 * Add all evidence sources and layers to the (freshly loaded) style.
 * Idempotent: safe to call repeatedly.
 */
export const registerDataLayers = (map: maplibregl.Map): void => {
  addSourceOnce(map, 'mh-terrain', {
    type: 'raster-dem',
    tiles: [TERRAIN_TILES],
    encoding: 'terrarium',
    tileSize: 256,
    maxzoom: 10,
    attribution:
      '<a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noopener">Terrain Tiles (ETOPO1/SRTM)</a>',
  })
  addSourceOnce(map, 'mh-arcs', { type: 'geojson', data: arcs })
  addSourceOnce(map, 'mh-epoch1', { type: 'geojson', data: epoch1 })
  addSourceOnce(map, 'mh-epoch2', { type: 'geojson', data: epoch2 })
  addSourceOnce(map, 'mh-epoch3', { type: 'geojson', data: epoch3 })
  addSourceOnce(map, 'mh-debris', { type: 'geojson', data: debris })
  addSourceOnce(map, 'mh-search', { type: 'geojson', data: searchAreas })
  addSourceOnce(map, 'mh-poi', { type: 'geojson', data: pois })
  addSourceOnce(map, 'mh-sites', { type: 'geojson', data: candidateSites })
  registerIcons(map)

  if (map.getLayer('mh-epoch1')) return // layers already registered

  // Insert seabed under everything drawn above water; 'waterway' is the first
  // layer above 'water' in the dark style. Fallback style lacks it -> append.
  const seabedBefore = map.getLayer('waterway') ? 'waterway' : undefined

  map.addLayer(
    {
      id: 'mh-bathy-relief',
      type: 'color-relief',
      source: 'mh-terrain',
      paint: { 'color-relief-color': RELIEF_COLOR, 'color-relief-opacity': 0.85 },
    },
    seabedBefore,
  )
  map.addLayer(
    {
      id: 'mh-bathy-hillshade',
      type: 'hillshade',
      source: 'mh-terrain',
      paint: {
        'hillshade-exaggeration': 0.6,
        'hillshade-shadow-color': '#020507',
        'hillshade-highlight-color': '#3d5a6e',
        'hillshade-accent-color': '#0a1420',
      },
    },
    seabedBefore,
  )

  // --- Search areas (derived: digitized from report figures) ---
  map.addLayer({
    id: 'mh-search-fill',
    type: 'fill',
    source: 'mh-search',
    paint: {
      'fill-color': ['coalesce', ['get', 'color'], C.violet],
      'fill-opacity': 0.08,
    },
  })
  map.addLayer({
    id: 'mh-search-line',
    type: 'line',
    source: 'mh-search',
    paint: {
      'line-color': ['coalesce', ['get', 'color'], C.violet],
      'line-width': 1,
      'line-dasharray': [3, 2],
      'line-opacity': 0.8,
    },
  })
  map.addLayer({
    id: 'mh-search-labels',
    type: 'symbol',
    source: 'mh-search',
    minzoom: 3.5,
    layout: {
      'text-field': ['get', 'name'],
      'text-font': FONT,
      'text-size': 10,
      'text-letter-spacing': 0.1,
      'symbol-placement': 'point',
    },
    paint: {
      'text-color': ['coalesce', ['get', 'color'], C.violet],
      'text-halo-color': C.halo,
      'text-halo-width': 1.2,
      'text-opacity': 0.9,
    },
  })

  // --- Inmarsat arcs (derived: dashed per P2). HS1-6 are context, kept thin
  // and faint so they never dominate; HS7 (the constraint on every search
  // area) is the visually prominent one.
  map.addLayer({
    id: 'mh-arcs',
    type: 'line',
    source: 'mh-arcs',
    filter: ['!=', ['get', 'id'], 'hs7'],
    paint: {
      'line-color': C.derived,
      'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.8, 6, 1.4],
      'line-dasharray': [3, 4],
      'line-opacity': 0.6,
    },
  })
  map.addLayer({
    id: 'mh-arc7',
    type: 'line',
    source: 'mh-arcs',
    filter: ['==', ['get', 'id'], 'hs7'],
    paint: {
      'line-color': C.arcHi,
      'line-width': ['interpolate', ['linear'], ['zoom'], 1, 2, 6, 3.5],
      'line-dasharray': [4, 2],
      'line-opacity': 0.95,
    },
  })
  map.addLayer({
    id: 'mh-arc-labels',
    type: 'symbol',
    source: 'mh-arcs',
    filter: ['!=', ['get', 'id'], 'hs7'],
    minzoom: 3.5,
    layout: {
      'symbol-placement': 'line',
      'text-field': ['get', 'label'],
      'text-font': FONT,
      'text-size': 9,
      'text-letter-spacing': 0.12,
      'symbol-spacing': 700,
    },
    paint: {
      'text-color': C.derived,
      'text-halo-color': C.halo,
      'text-halo-width': 1.2,
      'text-opacity': 0.7,
    },
  })
  map.addLayer({
    id: 'mh-arc7-label',
    type: 'symbol',
    source: 'mh-arcs',
    filter: ['==', ['get', 'id'], 'hs7'],
    minzoom: 1.5,
    layout: {
      'symbol-placement': 'line',
      'text-field': '7TH ARC · 00:19Z',
      'text-font': FONT_BOLD,
      'text-size': 11,
      'text-letter-spacing': 0.18,
      'symbol-spacing': 500,
    },
    paint: {
      'text-color': C.arcHi,
      'text-halo-color': C.halo,
      'text-halo-width': 1.4,
    },
  })

  // --- Flight path ---
  // Epoch 3 candidate reconstructions (modelled, P2: distinct dotted
  // treatment + explicit RECONSTRUCTION label; off by default, FR-5.1.3).
  map.addLayer({
    id: 'mh-epoch3',
    type: 'line',
    source: 'mh-epoch3',
    layout: { 'line-cap': 'round' },
    paint: {
      'line-color': C.violet,
      'line-width': ['interpolate', ['linear'], ['zoom'], 2, 1.2, 8, 2.2],
      'line-dasharray': [0.5, 2],
      'line-opacity': 0.9,
    },
  })
  map.addLayer({
    id: 'mh-epoch3-labels',
    type: 'symbol',
    source: 'mh-epoch3',
    minzoom: 2.5,
    layout: {
      'symbol-placement': 'line',
      'text-field': ['get', 'label'],
      'text-font': FONT,
      'text-size': 9.5,
      'text-letter-spacing': 0.12,
      'symbol-spacing': 500,
      'text-keep-upright': true,
    },
    paint: {
      'text-color': C.violet,
      'text-halo-color': C.halo,
      'text-halo-width': 1.2,
    },
  })
  map.addLayer({
    id: 'mh-epoch2',
    type: 'line',
    source: 'mh-epoch2',
    layout: { 'line-cap': 'round' },
    paint: {
      // Recorded but lower precision: dashed treatment, dimmer.
      'line-color': C.recordedDim,
      'line-width': ['interpolate', ['linear'], ['zoom'], 3, 1.4, 8, 3],
      'line-dasharray': [2, 2],
      'line-opacity': 0.9,
    },
  })
  map.addLayer({
    id: 'mh-epoch1',
    type: 'line',
    source: 'mh-epoch1',
    layout: { 'line-cap': 'round' },
    paint: {
      'line-color': C.recorded,
      'line-width': ['interpolate', ['linear'], ['zoom'], 3, 1.8, 8, 3.5],
      'line-opacity': 0.95,
    },
  })

  // --- Debris (recorded finds; triangle markers, color = confirmation status) ---
  map.addLayer({
    id: 'mh-debris',
    type: 'symbol',
    source: 'mh-debris',
    layout: {
      'icon-image': [
        'match',
        ['get', 'status'],
        'confirmed', 'mh-tri-confirmed',
        'almost-certain', 'mh-tri-almost-certain',
        'highly-likely', 'mh-tri-highly-likely',
        'likely', 'mh-tri-likely',
        'mh-tri-unidentifiable',
      ],
      'icon-size': ['interpolate', ['linear'], ['zoom'], 2, 0.75, 6, 1, 10, 1.3],
      'icon-allow-overlap': true,
    },
  })
  map.addLayer({
    id: 'mh-debris-labels',
    type: 'symbol',
    source: 'mh-debris',
    minzoom: 4,
    layout: {
      'text-field': ['get', 'partId'],
      'text-font': FONT,
      'text-size': 10,
      'text-offset': [0, 1.1],
      'text-anchor': 'top',
      'text-max-width': 12,
    },
    paint: {
      'text-color': C.recordedDim,
      'text-halo-color': C.halo,
      'text-halo-width': 1.2,
    },
  })

  // --- POIs (shape-coded by category; zoom-ranked visibility) ---
  const RANK_FILTER: maplibregl.ExpressionSpecification = [
    '<=', ['get', 'rank'], ['+', 1, ['floor', ['/', ['zoom'], 2.5]]],
  ]
  const POI_ICON: maplibregl.ExpressionSpecification = [
    'match',
    ['get', 'category'],
    'airport', 'mh-sq-airport',
    'waypoint', 'mh-di-waypoint',
    'station', 'mh-hx-station',
    'satellite', 'mh-cr-satellite',
    'mh-ci-event',
  ]
  const NOT_DEPARTURE: maplibregl.ExpressionSpecification = ['!=', ['get', 'id'], 'wmkk']
  map.addLayer({
    id: 'mh-poi',
    type: 'symbol',
    source: 'mh-poi',
    filter: ['all', RANK_FILTER, NOT_DEPARTURE],
    layout: {
      'icon-image': POI_ICON,
      'icon-size': ['interpolate', ['linear'], ['zoom'], 2, 0.72, 6, 1, 10, 1.25],
      'icon-allow-overlap': true,
    },
  })
  map.addLayer({
    id: 'mh-poi-labels',
    type: 'symbol',
    source: 'mh-poi',
    filter: ['all', RANK_FILTER, NOT_DEPARTURE],
    layout: {
      'text-field': ['get', 'name'],
      'text-font': FONT,
      'text-size': 10.5,
      'text-offset': [0, 0.9],
      'text-anchor': 'top',
      'text-letter-spacing': 0.08,
      'text-max-width': 9,
    },
    paint: {
      'text-color': '#9fc6d4',
      'text-halo-color': C.halo,
      'text-halo-width': 1.3,
    },
  })

  // Departure airport: the story's anchor. Always visible, larger, bold label.
  map.addLayer({
    id: 'mh-departure',
    type: 'symbol',
    source: 'mh-poi',
    filter: ['==', ['get', 'id'], 'wmkk'],
    layout: {
      'icon-image': 'mh-sq-airport',
      'icon-size': ['interpolate', ['linear'], ['zoom'], 2, 1, 8, 1.5],
      'icon-allow-overlap': true,
    },
  })
  map.addLayer({
    id: 'mh-departure-label',
    type: 'symbol',
    source: 'mh-poi',
    filter: ['==', ['get', 'id'], 'wmkk'],
    layout: {
      'text-field': 'WMKK · DEPARTURE',
      'text-font': FONT_BOLD,
      'text-size': 10.5,
      'text-offset': [0, 1],
      'text-anchor': 'top',
      'text-letter-spacing': 0.14,
      'text-allow-overlap': true,
    },
    paint: {
      'text-color': '#8fd0e2',
      'text-halo-color': C.halo,
      'text-halo-width': 1.4,
    },
  })

  // --- Candidate crash sites (published analyses; modelled) ---
  map.addLayer({
    id: 'mh-sites',
    type: 'symbol',
    source: 'mh-sites',
    layout: {
      'icon-image': 'mh-st-site',
      'icon-size': ['interpolate', ['linear'], ['zoom'], 2, 0.9, 8, 1.35],
      'icon-allow-overlap': true,
    },
  })
  map.addLayer({
    id: 'mh-sites-labels',
    type: 'symbol',
    source: 'mh-sites',
    minzoom: 3,
    layout: {
      'text-field': ['get', 'name'],
      'text-font': FONT,
      'text-size': 10,
      'text-offset': [0, 1],
      'text-anchor': 'top',
      'text-max-width': 11,
    },
    paint: {
      'text-color': '#c4aee6',
      'text-halo-color': C.halo,
      'text-halo-width': 1.3,
    },
  })
}

/** Show/hide individual search campaigns (sub-layer toggles). */
export const syncCampaignFilter = (map: maplibregl.Map, disabled: string[]): void => {
  const filter: maplibregl.ExpressionSpecification = [
    '!', ['in', ['get', 'id'], ['literal', disabled]],
  ]
  for (const layerId of ['mh-search-fill', 'mh-search-line', 'mh-search-labels']) {
    if (map.getLayer(layerId)) map.setFilter(layerId, filter)
  }
}

/** Apply registry visibility to every owned maplibre layer. */
export const syncLayerVisibility = (
  map: maplibregl.Map,
  visible: Record<string, boolean>,
): void => {
  for (const [registryId, mapLayerIds] of Object.entries(REGISTRY_TO_MAP_LAYERS)) {
    for (const layerId of mapLayerIds) {
      if (!map.getLayer(layerId)) continue
      map.setLayoutProperty(layerId, 'visibility', visible[registryId] ? 'visible' : 'none')
    }
  }
}
