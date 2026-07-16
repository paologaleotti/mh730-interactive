// The globe (FR-4.1). MapLibre with the globe projection by default; it
// auto-transitions to a flat map as the camera descends. A manual globe/flat
// toggle is also exposed via view state. This component owns the imperative map
// instance and bridges it to the zustand stores.

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { darkStyle, fallbackStyle } from './basemap'
import {
  registerDataLayers,
  syncLayerVisibility,
  syncCampaignFilter,
  setHighlightFeature,
} from './data-layers'
import { wireInteractions } from './interactions'
import { useView } from '../state/view'
import { useCursor } from '../state/cursor'
import { useHighlight } from '../state/highlight'
import { featureByKind, useSelection } from '../state/selection'
import { motionDuration } from '../lib/motion'

// Dark atmosphere / halo around the globe.
const SKY: maplibregl.SkySpecification = {
  'sky-color': '#0a1119',
  'sky-horizon-blend': 0.5,
  'horizon-color': '#16222c',
  'horizon-fog-blend': 0.5,
  'fog-color': '#05070a',
  'fog-ground-blend': 0.6,
  'atmosphere-blend': [
    'interpolate',
    ['linear'],
    ['zoom'],
    0, 0.7,
    5, 0.35,
    8, 0,
  ],
}

// A maplibre control button (grouped with the zoom/compass stack) that resets
// pan, zoom, bearing (north up) and pitch to the opening pose via the store,
// which the camera drift-guard subscription eases the map back to.
const makeResetControl = (): maplibregl.IControl => {
  const container = document.createElement('div')
  container.className = 'maplibregl-ctrl maplibregl-ctrl-group'
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'mh-reset-ctrl'
  button.title = 'Reset view'
  button.setAttribute('aria-label', 'Reset view')
  button.innerHTML =
    '<svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">' +
    '<path fill="none" stroke="currentColor" stroke-width="1.6" ' +
    'd="M10 3v3M10 14v3M3 10h3M14 10h3"/>' +
    '<circle cx="10" cy="10" r="4.2" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
    '</svg>'
  button.addEventListener('click', () => useView.getState().resetCamera())
  container.appendChild(button)
  return {
    onAdd: () => container,
    onRemove: () => container.remove(),
  }
}

export const GlobeMap = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  // Pending moveends that are padding-only re-centers: their camera must NOT
  // be written back to the store (the padding-shifted center would compound
  // into shared URLs on every reload).
  const suppressSyncRef = useRef(0)

  // Create the map once, immediately. (StrictMode is disabled app-wide, see
  // main.tsx, so this effect runs a single time and the WebGL context is stable.)
  useEffect(() => {
    const container = containerRef.current
    if (!container || mapRef.current) return

    const { camera } = useView.getState()
    const map = new maplibregl.Map({
      container,
      style: darkStyle(),
      center: camera.center,
      zoom: camera.zoom,
      bearing: camera.bearing,
      pitch: camera.pitch,
      maxPitch: 80,
      attributionControl: false,
      hash: false,
      dragRotate: true,
    })
    mapRef.current = map

    // Allow the browser to restore a lost GL context instead of hard-failing.
    const canvas = map.getCanvas()
    canvas.addEventListener('webglcontextlost', (e) => e.preventDefault(), false)
    canvas.addEventListener('webglcontextrestored', () => map.triggerRepaint(), false)

    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true, showZoom: true }),
      'bottom-right',
    )
    map.addControl(makeResetControl(), 'bottom-right')
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')
    // Source attributions (OpenFreeMap / OpenMapTiles / OSM) come from the
    // TileJSON itself; a custom string would duplicate them.
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

    // Reflect the highlight store onto the dedicated highlight source.
    const applyHighlight = (key: ReturnType<typeof useHighlight.getState>['key']) => {
      setHighlightFeature(map, key ? featureByKind(key.kind, key.id) : null)
    }
    const applyGlobe = () => {
      map.setProjection({ type: useView.getState().projection })
      map.setSky(SKY)
      // Data layers live on top of whichever basemap style is active, so they
      // are (re-)registered on every style load.
      registerDataLayers(map)
      syncLayerVisibility(map, useView.getState().layers)
      syncCampaignFilter(map, useView.getState().disabledCampaigns)
      applyHighlight(useHighlight.getState().key)
    }
    map.on('style.load', applyGlobe)

    const unsubHighlight = useHighlight.subscribe((s, prev) => {
      if (s.key !== prev.key) applyHighlight(s.key)
    })

    // Keep maplibre in sync with the store: layer visibility, and camera
    // changes that did NOT originate from the map itself (hashchange /
    // deep-link application). Self-originated changes match the map's pose
    // exactly, so the drift guard breaks the feedback loop.
    const unsubLayers = useView.subscribe((s, prev) => {
      if (s.layers !== prev.layers && map.getLayer('mh-epoch1')) {
        syncLayerVisibility(map, s.layers)
      }
      if (s.disabledCampaigns !== prev.disabledCampaigns && map.getLayer('mh-search-fill')) {
        syncCampaignFilter(map, s.disabledCampaigns)
      }
      if (s.camera !== prev.camera) {
        const mc = map.getCenter()
        // Bearings compare on the wrapped angular difference: a stored -179.9
        // vs map's +180 is 0.1 deg apart, not 359.9.
        const bearingDiff = Math.abs(
          ((s.camera.bearing - map.getBearing() + 540) % 360) - 180,
        )
        const drift =
          Math.abs(mc.lng - s.camera.center[0]) +
          Math.abs(mc.lat - s.camera.center[1]) +
          Math.abs(map.getZoom() - s.camera.zoom) +
          bearingDiff +
          Math.abs(map.getPitch() - s.camera.pitch)
        if (drift > 0.01) {
          map.easeTo({
            center: s.camera.center,
            zoom: s.camera.zoom,
            bearing: s.camera.bearing,
            pitch: s.camera.pitch,
            duration: motionDuration(600),
          })
        }
      }
    })
    // Defensive: ensure the canvas matches the container once loaded.
    map.on('load', () => map.resize())

    // Basemap resilience: if the primary style/tiles cannot load AT STARTUP
    // (blocked host, offline), swap to the keyless fallback so a globe still
    // renders. Transient tile errors after the first successful render are
    // ignored: MapLibre retains loaded tiles and retries on its own, and
    // downgrading the whole style for one 404 would be far worse.
    let primaryRendered = false
    let usingFallback = false
    map.once('load', () => {
      primaryRendered = true
    })
    map.on('error', (e) => {
      const msg = e.error?.message ?? ''
      const fromTiles =
        ('sourceId' in e && e.sourceId === 'openmaptiles') ||
        /AJAXError|NetworkError|Failed to fetch|openfreemap/i.test(msg)
      if (usingFallback || primaryRendered || !fromTiles) return
      usingFallback = true
      useView.getState().setBasemapDegraded(true)
      // The persistent 'style.load' handler re-applies globe/sky/data layers.
      map.setStyle(fallbackStyle())
    })
    // When connectivity returns, retry the primary basemap once per event.
    const onOnline = () => {
      if (!usingFallback) return
      usingFallback = false
      primaryRendered = false
      useView.getState().setBasemapDegraded(false)
      map.setStyle(darkStyle())
    }
    window.addEventListener('online', onOnline)

    // Write camera back to the store after user movement (drives URL state).
    const syncCamera = () => {
      if (suppressSyncRef.current > 0) {
        suppressSyncRef.current--
        return
      }
      const c = map.getCenter()
      useView.getState().setCamera({
        center: [c.lng, c.lat],
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
      })
    }
    map.on('moveend', syncCamera)
    map.on('rotateend', syncCamera)
    map.on('pitchend', syncCamera)

    map.on('mousemove', (e) => useCursor.getState().set({ lng: e.lngLat.lng, lat: e.lngLat.lat }))
    map.on('mouseout', () => useCursor.getState().clear())

    // Cursor conventions, hover tooltip, click-to-select (Detail Panel).
    wireInteractions(map)

    // Dev-only handle for the headless verification harness (CLAUDE.md gate 4).
    if (import.meta.env.DEV) {
      Object.assign(window, { __mhmap: map })
    }

    return () => {
      unsubLayers()
      unsubHighlight()
      window.removeEventListener('online', onOnline)
      map.remove()
      mapRef.current = null
    }
  }, [])

  // React to projection toggle. Guard against calling before the style has
  // finished loading (setProjection throws otherwise); defer to style.load.
  const projection = useView((s) => s.projection)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const apply = () => map.setProjection({ type: projection })
    if (map.isStyleLoaded()) {
      apply()
      return
    }
    map.once('style.load', apply)
    // Remove the pending handler if the projection changes again before the
    // style loads; otherwise stale handlers stack and all fire later.
    return () => {
      map.off('style.load', apply)
    }
  }, [projection])

  // Keep the visual center of the globe centered in the unobscured viewport:
  // pad for the top bar, timeline, the layer panel (right), and the Detail
  // Panel (left) so a selected/deep-linked feature is never hidden (FR-9.2).
  const mode = useView((s) => s.mode)
  const panelOpen = useView((s) => s.panelOpen)
  const detailOpen = useSelection((s) => s.selected !== null)
  useEffect(() => {
    const map = mapRef.current
    if (!map || mode === 'database') return
    map.resize() // in case the container was display:none (database mode)
    suppressSyncRef.current++ // padding-only ease; see syncCamera
    map.easeTo({
      padding: {
        top: 66,
        bottom: mode === 'flight' ? 78 : 12, // timeline bar only in flight
        left: detailOpen ? 380 : 0,
        right: panelOpen ? 344 : 0,
      },
      duration: motionDuration(500),
    })
  }, [panelOpen, mode, detailOpen])

  return <div ref={containerRef} className="map-canvas" />
}
