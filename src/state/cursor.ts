// Live cursor readout (FR-4.4). Depth is a placeholder until bathymetry lands.

import { create } from 'zustand'

export interface CursorState {
  lng: number | null
  lat: number | null
  depth: number | null // metres below sea level, when over surveyed seabed
  set: (v: { lng: number; lat: number }) => void
  clear: () => void
}

export const useCursor = create<CursorState>((set) => ({
  lng: null,
  lat: null,
  depth: null,
  set: ({ lng, lat }) => set({ lng, lat }),
  clear: () => set({ lng: null, lat: null, depth: null }),
}))
