// FR-13: Deep linking & sharing. The full view is encoded in location.hash so
// a reload (or a shared link) reproduces the state exactly.
//
// Keys (all optional): md=mode (e/f/d), pj=projection (g/m), s=time scale
// (f/c), t=time (ms, on the encoded scale), v=playback speed,
// c=lng,lat,zoom,brg,pit, l=comma-list of visible layer ids, p=layer panel
// (1/0). Missing keys fall back to store defaults. All values are decoded
// defensively: a hostile or truncated hash must never crash the map.

import { useClock, type TimeScale } from './clock'
import { useView, type Mode, type Camera } from './view'
import { LAYERS } from '../config/layers'
import searchAreas from '../data/search-areas.geojson.json'

const CAMPAIGN_IDS = new Set(searchAreas.features.map((f) => String(f.properties?.id)))
/** Upper bound for the playback-speed URL value (above any UI preset). */
const MAX_SPEED = 5_000_000

const MODE_CODE: Record<Mode, string> = { explore: 'e', flight: 'f', database: 'd' }
const CODE_MODE: Record<string, Mode> = { e: 'explore', f: 'flight', d: 'database' }
const SCALE_CODE: Record<TimeScale, string> = { flight: 'f', calendar: 'c' }
const CODE_SCALE: Record<string, TimeScale> = { f: 'flight', c: 'calendar' }

const LAYER_IDS = new Set(LAYERS.map((l) => l.id))

const round = (n: number, d: number) => {
  const f = 10 ** d
  return Math.round(n * f) / f
}

const clampNum = (n: number, min: number, max: number) =>
  n < min ? min : n > max ? max : n

/** Wrap a longitude into [-180, 180]; in-range values pass through exactly
    (the modulo dance introduces floating-point noise). */
const wrapLng = (lng: number) =>
  lng >= -180 && lng <= 180 ? lng : ((((lng + 180) % 360) + 360) % 360) - 180

const encodeCamera = (c: Camera): string =>
  [
    round(c.center[0], 4),
    round(c.center[1], 4),
    round(c.zoom, 2),
    round(c.bearing, 1),
    round(c.pitch, 1),
  ].join(',')

// Every component is clamped to MapLibre's accepted ranges: an out-of-range
// latitude reaching `new Map({ center })` throws and (behind the error
// boundary) would brick the shared link.
const decodeCamera = (s: string): Camera | null => {
  const parts = s.split(',')
  if (parts.length !== 5 || parts.some((p) => p.trim() === '')) return null
  const nums = parts.map(Number)
  if (nums.some((n) => !Number.isFinite(n))) return null
  const [lng, lat, zoom, bearing, pitch] = nums
  return {
    center: [wrapLng(lng), clampNum(lat, -90, 90)],
    zoom: clampNum(zoom, 0, 22),
    bearing: clampNum(bearing, -180, 180),
    pitch: clampNum(pitch, 0, 80),
  }
}

/** Serialize current store state into a hash string (without leading '#'). */
export const encodeState = (): string => {
  const clock = useClock.getState()
  const view = useView.getState()
  const visible = LAYERS.filter((l) => view.layers[l.id]).map((l) => l.id)

  // Built by hand instead of URLSearchParams: every value here is URL-safe by
  // construction, and percent-encoded commas make shared links unreadable.
  return [
    `md=${MODE_CODE[view.mode]}`,
    `pj=${view.projection === 'mercator' ? 'm' : 'g'}`,
    `s=${SCALE_CODE[clock.scale]}`,
    `t=${Math.round(clock.times[clock.scale])}`,
    `v=${clock.speed}`,
    `c=${encodeCamera(view.camera)}`,
    `l=${visible.join(',')}`,
    `p=${view.panelOpen ? 1 : 0}`,
    // Disabled search campaigns (FR-11.3); omitted when all enabled.
    ...(view.disabledCampaigns.length ? [`dc=${view.disabledCampaigns.join(',')}`] : []),
  ].join('&')
}

/**
 * Parse the current hash and apply it to the stores. Called before the map
 * mounts (boot) and again on hashchange. Every key is optional and validated.
 */
export const applyStateFromHash = (): void => {
  const raw = window.location.hash.replace(/^#/, '')
  if (!raw) return
  const params = new URLSearchParams(raw)

  const md = params.get('md')
  if (md && CODE_MODE[md]) {
    // setMode also arms/pauses the clock for the mode.
    useView.getState().setMode(CODE_MODE[md])
  }

  const pj = params.get('pj')
  if (pj === 'g' || pj === 'm') {
    useView.getState().setProjection(pj === 'm' ? 'mercator' : 'globe')
  }

  // Scale is encoded explicitly so a calendar-scale share never decodes onto
  // the flight clock (where it would clamp to the range edge).
  const s = params.get('s')
  if (s && CODE_SCALE[s]) {
    useClock.getState().setScale(CODE_SCALE[s])
  }

  const t = params.get('t')
  if (t !== null && t.trim() !== '' && Number.isFinite(Number(t))) {
    useClock.getState().setTime(Number(t))
  }

  const v = params.get('v')
  if (v !== null && Number.isFinite(Number(v)) && Number(v) > 0) {
    useClock.getState().setSpeed(Math.min(Number(v), MAX_SPEED))
  }

  const c = params.get('c')
  if (c) {
    const cam = decodeCamera(c)
    if (cam) useView.getState().setCamera(cam)
  }

  const l = params.get('l')
  if (l !== null) {
    const wanted = new Set(l.split(',').filter((id) => LAYER_IDS.has(id)))
    const layers = Object.fromEntries([...LAYER_IDS].map((id) => [id, wanted.has(id)]))
    useView.getState().setLayers(layers)
  }

  const p = params.get('p')
  if (p === '0' || p === '1') {
    useView.getState().setPanelOpen(p === '1')
  }

  const dc = params.get('dc')
  if (dc !== null) {
    useView
      .getState()
      .setDisabledCampaigns(dc.split(',').filter((id) => CAMPAIGN_IDS.has(id)))
  }
}

/**
 * Two-way URL sync: store changes write a debounced, replace-mode hash, and
 * external hash changes (paste, back/forward) apply back to the stores.
 * Returns an unsubscribe function.
 */
export const startUrlSync = (): (() => void) => {
  let timer: ReturnType<typeof setTimeout> | null = null
  let lastWritten = ''

  const write = () => {
    timer = null
    // Skip writes during playback: the clock changes every frame and Safari
    // rate-limits replaceState (~100 calls / 30 s -> SecurityError).
    if (useClock.getState().playing) return
    const hash = '#' + encodeState()
    if (hash !== window.location.hash) {
      lastWritten = hash
      window.history.replaceState(null, '', hash)
    }
  }
  const schedule = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(write, 500)
  }

  const onHashChange = () => {
    // Ignore the echo of our own replaceState writes.
    if (window.location.hash === lastWritten) return
    applyStateFromHash()
  }

  const unsubClock = useClock.subscribe(schedule)
  const unsubView = useView.subscribe(schedule)
  window.addEventListener('hashchange', onHashChange)
  return () => {
    if (timer) clearTimeout(timer)
    unsubClock()
    unsubView()
    window.removeEventListener('hashchange', onHashChange)
  }
}
