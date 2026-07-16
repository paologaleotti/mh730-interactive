// The globe (FR-4.1). MapLibre with the globe projection by default; it
// auto-transitions to a flat map as the camera descends. A manual globe/flat
// toggle is also exposed via view state. This component owns the imperative map
// instance and bridges it to the zustand stores.

import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { darkStyle, fallbackStyle } from './basemap'
import { useView } from '../state/view'
import { useCursor } from '../state/cursor'

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

export const GlobeMap = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)

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
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')
    // Source attributions (OpenFreeMap / OpenMapTiles / OSM) come from the
    // TileJSON itself; a custom string would duplicate them.
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

    const applyGlobe = () => {
      map.setProjection({ type: useView.getState().projection })
      map.setSky(SKY)
    }
    map.on('style.load', applyGlobe)
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
      map.once('style.load', applyGlobe)
      map.setStyle(fallbackStyle())
    })
    // When connectivity returns, retry the primary basemap once per event.
    const onOnline = () => {
      if (!usingFallback) return
      usingFallback = false
      primaryRendered = false
      useView.getState().setBasemapDegraded(false)
      map.once('style.load', applyGlobe)
      map.setStyle(darkStyle())
    }
    window.addEventListener('online', onOnline)

    // Write camera back to the store after user movement (drives URL state).
    const syncCamera = () => {
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

    return () => {
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
  // pad for the top bar, timeline, and the layer panel when it is open.
  const mode = useView((s) => s.mode)
  const panelOpen = useView((s) => s.panelOpen)
  useEffect(() => {
    const map = mapRef.current
    if (!map || mode === 'database') return
    map.resize() // in case the container was display:none (database mode)
    map.easeTo({
      padding: {
        top: 66,
        bottom: mode === 'flight' ? 78 : 12, // timeline bar only in flight
        left: 0,
        right: panelOpen ? 344 : 0,
      },
      duration: 500,
    })
  }, [panelOpen, mode])

  return <div ref={containerRef} className="map-canvas" />
}
