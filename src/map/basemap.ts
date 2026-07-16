// Custom dark basemap (FR-4.3). A focused OpenMapTiles style over OpenFreeMap's
// keyless vector tiles (spec B.13). Sparse and desaturated by design so the
// evidence layers dominate. Palette matches the app theme tokens.

import type { StyleSpecification } from 'maplibre-gl'

const TILES = 'https://tiles.openfreemap.org/planet'
const GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf'

// Palette (kept in sync with styles/theme.css).
const C = {
  land: '#0b0e12',
  landHi: '#10141a',
  water: '#0c1a24',
  waterLine: '#16303f',
  border: '#2b3742',
  borderState: '#1c252d',
  road: '#20272f',
  roadHi: '#2b343d',
  label: '#aeb8c1',
  labelHi: '#dfe6ec',
  labelDim: '#5d6b76',
  ocean: '#4a6472',
  halo: '#05070a',
}

const FONT = ['Noto Sans Regular']
const FONT_BOLD = ['Noto Sans Bold']
const FONT_ITALIC = ['Noto Sans Italic']

export const darkStyle = (): StyleSpecification => {
  return {
    version: 8,
    name: 'MH370 Dark',
    projection: { type: 'globe' },
    glyphs: GLYPHS,
    sources: {
      openmaptiles: { type: 'vector', url: TILES },
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': C.land },
      },
      {
        id: 'landcover',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'landcover',
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: { 'fill-color': C.landHi, 'fill-opacity': 0.35 },
      },
      {
        id: 'water',
        type: 'fill',
        source: 'openmaptiles',
        'source-layer': 'water',
        paint: { 'fill-color': C.water },
      },
      {
        id: 'waterway',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'waterway',
        minzoom: 5,
        paint: {
          'line-color': C.waterLine,
          'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.4, 12, 1.2],
          'line-opacity': 0.7,
        },
      },
      {
        id: 'boundary-state',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'boundary',
        // coalesce: admin_level is null on some boundary features, and a null
        // comparison logs "Expected value to be of type number" per feature.
        filter: ['==', ['coalesce', ['get', 'admin_level'], -1], 4],
        minzoom: 4,
        paint: {
          'line-color': C.borderState,
          'line-width': 0.6,
          'line-dasharray': [3, 3],
        },
      },
      {
        id: 'boundary-country',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'boundary',
        filter: ['<=', ['coalesce', ['get', 'admin_level'], 99], 2],
        paint: {
          'line-color': C.border,
          'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.4, 6, 1.1],
          'line-opacity': 0.8,
        },
      },
      {
        id: 'road-major',
        type: 'line',
        source: 'openmaptiles',
        'source-layer': 'transportation',
        filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk', 'primary']]],
        minzoom: 6,
        paint: {
          'line-color': ['match', ['get', 'class'], 'motorway', C.roadHi, C.road],
          'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.3, 12, 1.6],
          'line-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0, 8, 0.8],
        },
      },
      // --- Labels ---
      {
        id: 'label-water',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'water_name',
        minzoom: 2,
        layout: {
          'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
          'text-font': FONT_ITALIC,
          'text-size': ['interpolate', ['linear'], ['zoom'], 2, 10, 6, 14],
          'text-letter-spacing': 0.2,
          'text-max-width': 6,
          'symbol-placement': 'point',
        },
        paint: {
          'text-color': C.ocean,
          'text-halo-color': C.halo,
          'text-halo-width': 1,
          'text-opacity': 0.85,
        },
      },
      {
        id: 'label-place-city',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'place',
        filter: ['in', ['get', 'class'], ['literal', ['city', 'town']]],
        minzoom: 4,
        layout: {
          'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
          'text-font': FONT,
          'text-size': ['interpolate', ['linear'], ['zoom'], 4, 10, 10, 14],
          'text-letter-spacing': 0.05,
          'text-max-width': 8,
        },
        paint: {
          'text-color': C.label,
          'text-halo-color': C.halo,
          'text-halo-width': 1.2,
        },
      },
      {
        id: 'label-place-country',
        type: 'symbol',
        source: 'openmaptiles',
        'source-layer': 'place',
        filter: ['==', ['get', 'class'], 'country'],
        maxzoom: 8,
        layout: {
          'text-field': ['upcase', ['coalesce', ['get', 'name:en'], ['get', 'name']]],
          'text-font': FONT_BOLD,
          'text-size': ['interpolate', ['linear'], ['zoom'], 1, 10, 5, 15],
          'text-letter-spacing': 0.25,
          'text-max-width': 8,
        },
        paint: {
          'text-color': C.labelHi,
          'text-halo-color': C.halo,
          'text-halo-width': 1.4,
          'text-opacity': 0.9,
        },
      },
    ],
  }
}

// Fallback basemap: MapLibre's own keyless Natural Earth vector tiles. Coarse
// (country polygons only) but reliable, used when the primary tile host is
// unreachable (e.g. blocked by a browser extension or proxy). Dark-themed so
// the app still looks intentional; the globe still renders.
const DEMO = 'https://demotiles.maplibre.org'
export const fallbackStyle = (): StyleSpecification => {
  return {
    version: 8,
    name: 'MH370 Dark (fallback)',
    projection: { type: 'globe' },
    glyphs: `${DEMO}/font/{fontstack}/{range}.pbf`,
    sources: {
      demo: { type: 'vector', url: `${DEMO}/tiles/tiles.json` },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': C.water } },
      {
        id: 'countries-fill',
        type: 'fill',
        source: 'demo',
        'source-layer': 'countries',
        paint: { 'fill-color': C.land },
      },
      {
        id: 'countries-line',
        type: 'line',
        source: 'demo',
        'source-layer': 'countries',
        paint: { 'line-color': C.border, 'line-width': 0.6, 'line-opacity': 0.8 },
      },
    ],
  }
}
