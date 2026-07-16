// View state: application mode, camera pose, and per-layer visibility.
// The map engine reads camera on init and writes it back on user movement;
// the layer panel and URL codec read/write layers.

import { create } from 'zustand'
import { DEFAULT_LAYER_VIS } from '../config/layers'
import { useClock } from './clock'

// explore: free globe, all layers, no timeline.
// flight:  the night of 7-8 March 2014 on the flight clock (audio + choreography later).
// database: no map; chronological index of every evidence item.
export type Mode = 'explore' | 'flight' | 'database'
export type Projection = 'globe' | 'mercator'

export interface Camera {
  center: [number, number] // [lng, lat]
  zoom: number
  bearing: number
  pitch: number
}

// Opening pose: whole globe, framed on the Indian Ocean / SE-Asia region
// where the story unfolds.
export const DEFAULT_CAMERA: Camera = {
  center: [92, -12],
  zoom: 1.7,
  bearing: 0,
  pitch: 0,
}

interface ViewState {
  mode: Mode
  projection: Projection
  camera: Camera
  layers: Record<string, boolean>
  /** Per-campaign sub-toggles for the search layer; absent id = enabled. */
  disabledCampaigns: string[]
  panelOpen: boolean
  legendOpen: boolean
  /** Set when the primary basemap failed to load and a fallback is in use. */
  basemapDegraded: boolean

  setMode: (m: Mode) => void
  setProjection: (p: Projection) => void
  setCamera: (c: Camera) => void
  setLayers: (l: Record<string, boolean>) => void
  toggleLayer: (id: string) => void
  toggleCampaign: (id: string) => void
  setDisabledCampaigns: (ids: string[]) => void
  setPanelOpen: (open: boolean) => void
  setLegendOpen: (open: boolean) => void
  setBasemapDegraded: (v: boolean) => void
}

export const useView = create<ViewState>((set) => ({
  mode: 'explore',
  projection: 'globe',
  camera: DEFAULT_CAMERA,
  layers: { ...DEFAULT_LAYER_VIS },
  disabledCampaigns: [],
  panelOpen: true,
  legendOpen: true,
  basemapDegraded: false,

  setMode: (mode) => {
    set({ mode })
    // Only flight mode has a timeline; entering it arms the flight clock,
    // leaving it stops playback.
    if (mode === 'flight') useClock.getState().setScale('flight')
    else useClock.getState().pause()
  },
  setProjection: (projection) => set({ projection }),
  setCamera: (camera) => set({ camera }),
  setLayers: (layers) => set({ layers }),
  toggleLayer: (id) =>
    set((st) => ({ layers: { ...st.layers, [id]: !st.layers[id] } })),
  toggleCampaign: (id) =>
    set((st) => ({
      disabledCampaigns: st.disabledCampaigns.includes(id)
        ? st.disabledCampaigns.filter((c) => c !== id)
        : [...st.disabledCampaigns, id],
    })),
  setDisabledCampaigns: (disabledCampaigns) => set({ disabledCampaigns }),
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  setLegendOpen: (legendOpen) => set({ legendOpen }),
  setBasemapDegraded: (basemapDegraded) => set({ basemapDegraded }),
}))
