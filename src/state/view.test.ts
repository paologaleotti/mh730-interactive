import { describe, it, expect, beforeEach } from 'vitest'
import { useView, DEFAULT_CAMERA, type Camera } from './view'
import { useClock } from './clock'
import { DEFAULT_LAYER_VIS, LAYERS } from '../config/layers'

const initialView = useView.getState()
const initialClock = useClock.getState()

beforeEach(() => {
  useView.setState(initialView, true)
  useClock.setState(initialClock, true)
})

describe('initial state', () => {
  it('starts in explore mode on the globe with the default camera', () => {
    const st = useView.getState()
    expect(st.mode).toBe('explore')
    expect(st.projection).toBe('globe')
    expect(st.camera).toEqual(DEFAULT_CAMERA)
    expect(st.panelOpen).toBe(true)
    expect(st.basemapDegraded).toBe(false)
  })

  it('starts with the default layer visibility', () => {
    expect(useView.getState().layers).toEqual(DEFAULT_LAYER_VIS)
  })
})

describe('setMode', () => {
  it("setMode('flight') switches the clock to the flight scale", () => {
    useClock.getState().setScale('calendar')
    useView.getState().setMode('flight')
    expect(useView.getState().mode).toBe('flight')
    expect(useClock.getState().scale).toBe('flight')
  })

  it("setMode('explore') pauses the clock", () => {
    useClock.getState().play()
    useView.getState().setMode('explore')
    expect(useView.getState().mode).toBe('explore')
    expect(useClock.getState().playing).toBe(false)
  })

  it("setMode('database') pauses the clock", () => {
    useClock.getState().play()
    useView.getState().setMode('database')
    expect(useView.getState().mode).toBe('database')
    expect(useClock.getState().playing).toBe(false)
  })

  it("re-entering flight while already on the flight scale keeps playback state", () => {
    useView.getState().setMode('flight')
    useClock.getState().play()
    useView.getState().setMode('flight')
    expect(useClock.getState().playing).toBe(true)
  })
})

describe('toggleLayer', () => {
  it('flips a single layer without touching the others', () => {
    const id = LAYERS[0].id
    const before = useView.getState().layers
    useView.getState().toggleLayer(id)
    const after = useView.getState().layers
    expect(after[id]).toBe(!before[id])
    const untouched = Object.keys(before).filter((k) => k !== id)
    expect(untouched.every((k) => after[k] === before[k])).toBe(true)
  })

  it('double toggle restores the original value', () => {
    const id = LAYERS[1].id
    const before = useView.getState().layers[id]
    useView.getState().toggleLayer(id)
    useView.getState().toggleLayer(id)
    expect(useView.getState().layers[id]).toBe(before)
  })

  it('toggling an unknown id sets it to true (from undefined)', () => {
    useView.getState().toggleLayer('nonexistent')
    expect(useView.getState().layers.nonexistent).toBe(true)
  })
})

describe('simple setters', () => {
  it('setProjection switches projection', () => {
    useView.getState().setProjection('mercator')
    expect(useView.getState().projection).toBe('mercator')
  })

  it('setCamera replaces the camera pose', () => {
    const cam: Camera = { center: [100, 5], zoom: 4, bearing: 90, pitch: 30 }
    useView.getState().setCamera(cam)
    expect(useView.getState().camera).toEqual(cam)
  })

  it('setLayers replaces the whole visibility map', () => {
    const off = Object.fromEntries(LAYERS.map((l) => [l.id, false]))
    useView.getState().setLayers(off)
    expect(Object.values(useView.getState().layers).some(Boolean)).toBe(false)
  })

  it('setPanelOpen and setBasemapDegraded update flags', () => {
    useView.getState().setPanelOpen(false)
    useView.getState().setBasemapDegraded(true)
    expect(useView.getState().panelOpen).toBe(false)
    expect(useView.getState().basemapDegraded).toBe(true)
  })
})
