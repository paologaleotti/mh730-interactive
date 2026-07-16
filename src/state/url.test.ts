// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { encodeState, applyStateFromHash } from './url'
import { useClock, FLIGHT_START, FLIGHT_END } from './clock'
import { useView, type Camera } from './view'
import { LAYERS, DEFAULT_LAYER_VIS } from '../config/layers'

const initialClock = useClock.getState()
const initialView = useView.getState()

const setHash = (raw: string) => {
  window.location.hash = raw
}

beforeEach(() => {
  useClock.setState(initialClock, true)
  useView.setState(initialView, true)
  window.history.replaceState(null, '', window.location.pathname)
})

describe('encodeState / applyStateFromHash roundtrip', () => {
  it('reproduces mode, projection, time, camera and layers exactly', () => {
    const camera: Camera = { center: [101.25, -33.5], zoom: 5.25, bearing: 42.5, pitch: 30 }
    const visibleIds = ['flight-epoch1', 'arcs', 'poi']
    useView.getState().setMode('flight')
    useView.getState().setProjection('mercator')
    useView.getState().setCamera(camera)
    useView.getState().setLayers(
      Object.fromEntries(LAYERS.map((l) => [l.id, visibleIds.includes(l.id)])),
    )
    const t = FLIGHT_START + 4_890_000
    useClock.getState().setTime(t)

    const encoded = encodeState()

    // Reset to defaults, then re-apply from the hash.
    useClock.setState(initialClock, true)
    useView.setState(initialView, true)
    setHash(encoded)
    applyStateFromHash()

    const view = useView.getState()
    const clock = useClock.getState()
    expect(view.mode).toBe('flight')
    expect(view.projection).toBe('mercator')
    expect(view.camera).toEqual(camera)
    expect(clock.scale).toBe('flight')
    expect(clock.times.flight).toBe(t)
    const nowVisible = LAYERS.filter((l) => view.layers[l.id]).map((l) => l.id)
    expect(nowVisible).toEqual(visibleIds)
  })

  it('roundtrips time scale, speed and panel state', () => {
    useClock.getState().setScale('calendar')
    useClock.getState().setSpeed(86_400)
    useView.getState().setPanelOpen(false)
    const encoded = encodeState()

    useClock.setState(initialClock, true)
    useView.setState(initialView, true)
    setHash(encoded)
    applyStateFromHash()

    expect(useClock.getState().scale).toBe('calendar')
    expect(useClock.getState().speed).toBe(86_400)
    expect(useView.getState().panelOpen).toBe(false)
  })

  it('encodes a human-readable hash (no percent-encoded commas)', () => {
    expect(encodeState()).not.toContain('%2C')
  })

  it('ignores a non-positive or non-numeric speed', () => {
    setHash('v=-5')
    applyStateFromHash()
    expect(useClock.getState().speed).toBe(initialClock.speed)
    setHash('v=abc')
    applyStateFromHash()
    expect(useClock.getState().speed).toBe(initialClock.speed)
  })

  it('roundtrips the open Detail Panel target (ft)', async () => {
    const { useSelection } = await import('./selection')
    useSelection.getState().selectById('arc', 'hs7')
    const encoded = encodeState()
    expect(encoded).toContain('ft=arc:hs7')

    useSelection.setState({ selected: null, hover: null })
    setHash(encoded)
    applyStateFromHash()
    expect(useSelection.getState().selected?.kind).toBe('arc')
    expect(useSelection.getState().selected?.id).toBe('hs7')
  })

  it('ignores a hostile ft target', async () => {
    const { useSelection } = await import('./selection')
    useSelection.setState({ selected: null, hover: null })
    setHash('ft=zz:qq')
    applyStateFromHash()
    expect(useSelection.getState().selected).toBeNull()
    setHash('ft=debris:doesnotexist')
    applyStateFromHash()
    expect(useSelection.getState().selected).toBeNull()
  })

  it('roundtrips explore mode and globe projection', () => {
    useView.getState().setMode('explore')
    useView.getState().setProjection('globe')
    const encoded = encodeState()

    useView.getState().setMode('database')
    useView.getState().setProjection('mercator')
    setHash(encoded)
    applyStateFromHash()

    expect(useView.getState().mode).toBe('explore')
    expect(useView.getState().projection).toBe('globe')
  })

  it('roundtrips database mode', () => {
    useView.getState().setMode('database')
    const encoded = encodeState()
    useView.setState(initialView, true)
    setHash(encoded)
    applyStateFromHash()
    expect(useView.getState().mode).toBe('database')
  })

  it('camera survives the 4-decimal rounding for typical values', () => {
    const camera: Camera = { center: [92.1234, -12.9876], zoom: 1.75, bearing: 0, pitch: 0 }
    useView.getState().setCamera(camera)
    setHash(encodeState())
    useView.setState(initialView, true)
    applyStateFromHash()
    expect(useView.getState().camera).toEqual(camera)
  })
})

describe('applyStateFromHash hostile input', () => {
  it('is a no-op on an empty hash', () => {
    setHash('')
    applyStateFromHash()
    expect(useView.getState()).toEqual(initialView)
    expect(useClock.getState()).toEqual(initialClock)
  })

  it('ignores garbage that parses to no known keys', () => {
    setHash('!!!not&&&a=hash%%%')
    applyStateFromHash()
    expect(useView.getState().mode).toBe('explore')
    expect(useView.getState().camera).toEqual(initialView.camera)
    expect(useClock.getState().times).toEqual(initialClock.times)
  })

  it('ignores an unknown mode code', () => {
    setHash('md=z')
    applyStateFromHash()
    expect(useView.getState().mode).toBe('explore')
  })

  it('ignores an unknown projection code', () => {
    setHash('pj=x')
    applyStateFromHash()
    expect(useView.getState().projection).toBe('globe')
  })

  it('ignores a NaN time', () => {
    setHash('t=notanumber')
    applyStateFromHash()
    expect(useClock.getState().times).toEqual(initialClock.times)
  })

  it('clamps an out-of-range time to the scale range', () => {
    setHash('md=f&t=99999999999999')
    applyStateFromHash()
    expect(useClock.getState().times.flight).toBe(FLIGHT_END)
  })

  it('filters unknown layer ids, keeping known ones', () => {
    setHash('l=flight-epoch1,totally-bogus,arcs')
    applyStateFromHash()
    const layers = useView.getState().layers
    expect(layers['flight-epoch1']).toBe(true)
    expect(layers.arcs).toBe(true)
    expect(layers['totally-bogus']).toBeUndefined()
    expect(layers.debris).toBe(false)
  })

  it('an empty layer list means all layers off', () => {
    setHash('l=')
    applyStateFromHash()
    const layers = useView.getState().layers
    expect(Object.keys(layers).sort()).toEqual(Object.keys(DEFAULT_LAYER_VIS).sort())
    expect(Object.values(layers).some(Boolean)).toBe(false)
  })

  it('a missing layer key leaves defaults untouched', () => {
    setHash('md=e')
    applyStateFromHash()
    expect(useView.getState().layers).toEqual(DEFAULT_LAYER_VIS)
  })

  it('rejects a camera tuple with too few parts', () => {
    setHash('c=1,2,3')
    applyStateFromHash()
    expect(useView.getState().camera).toEqual(initialView.camera)
  })

  it('rejects a camera tuple with too many parts', () => {
    setHash('c=1,2,3,4,5,6')
    applyStateFromHash()
    expect(useView.getState().camera).toEqual(initialView.camera)
  })

  it('rejects a camera tuple containing non-numbers', () => {
    setHash('c=1,2,abc,4,5')
    applyStateFromHash()
    expect(useView.getState().camera).toEqual(initialView.camera)
  })

  it('rejects a camera tuple containing a literal NaN', () => {
    setHash('c=1,NaN,3,4,5')
    applyStateFromHash()
    expect(useView.getState().camera).toEqual(initialView.camera)
  })

  it('rejects a camera tuple containing Infinity', () => {
    setHash('c=1,2,Infinity,4,5')
    applyStateFromHash()
    expect(useView.getState().camera).toEqual(initialView.camera)
  })

  it('rejects a camera tuple with an empty slot (Number("") would silently become 0)', () => {
    setHash('c=1,,3,4,5')
    applyStateFromHash()
    expect(useView.getState().camera).toEqual(initialView.camera)
  })

  it('clamps out-of-range camera values instead of crashing the map', () => {
    setHash('c=200,999,99,999,999')
    applyStateFromHash()
    expect(useView.getState().camera).toEqual({
      center: [-160, 90],
      zoom: 22,
      bearing: 180,
      pitch: 80,
    })
  })

  it('accepts a well-formed camera among other bad keys', () => {
    setHash('md=q&pj=?&t=xx&c=10,-20,3,90,45')
    applyStateFromHash()
    expect(useView.getState().camera).toEqual({
      center: [10, -20],
      zoom: 3,
      bearing: 90,
      pitch: 45,
    })
  })
})

describe('mode and projection codes', () => {
  it("md=e -> explore, md=f -> flight, md=d -> database", () => {
    setHash('md=f')
    applyStateFromHash()
    expect(useView.getState().mode).toBe('flight')
    setHash('md=d')
    applyStateFromHash()
    expect(useView.getState().mode).toBe('database')
    setHash('md=e')
    applyStateFromHash()
    expect(useView.getState().mode).toBe('explore')
  })

  it("md=f also arms the flight clock scale", () => {
    useClock.getState().setScale('calendar')
    setHash('md=f')
    applyStateFromHash()
    expect(useClock.getState().scale).toBe('flight')
  })

  it("pj=m -> mercator, pj=g -> globe", () => {
    setHash('pj=m')
    applyStateFromHash()
    expect(useView.getState().projection).toBe('mercator')
    setHash('pj=g')
    applyStateFromHash()
    expect(useView.getState().projection).toBe('globe')
  })
})

describe('encodeState output shape', () => {
  it('contains all five keys', () => {
    const params = new URLSearchParams(encodeState())
    expect(params.get('md')).toBe('e')
    expect(params.get('pj')).toBe('g')
    expect(params.get('t')).toBe(String(FLIGHT_START))
    expect(params.get('c')).toBe('92,-12,1.7,0,0')
    const visible = LAYERS.filter((l) => l.defaultVisible).map((l) => l.id)
    expect(params.get('l')).toBe(visible.join(','))
  })

  it('encodes the time of the active scale, rounded to integer ms', () => {
    useClock.getState().setTime(FLIGHT_START + 1000.6)
    const params = new URLSearchParams(encodeState())
    expect(params.get('t')).toBe(String(FLIGHT_START + 1001))
  })
})
