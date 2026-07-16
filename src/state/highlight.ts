// Map highlight state: which feature is visually emphasized on the globe.
// Decoupled from selection so multiple drivers can use it: clicking a feature
// (via the Detail Panel) highlights it now; the flight clock will highlight
// the active path segment / handshake during replay later.

import { create } from 'zustand'
import type { FeatureKind } from './selection'

export interface HighlightKey {
  kind: FeatureKind
  id: string
}

interface HighlightState {
  key: HighlightKey | null
  set: (key: HighlightKey | null) => void
}

export const useHighlight = create<HighlightState>((set) => ({
  key: null,
  set: (key) => set({ key }),
}))
