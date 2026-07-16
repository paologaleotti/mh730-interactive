import { useEffect } from 'react'
import { GlobeMap } from './map/globe-map'
import { TopBar } from './ui/top-bar'
import { LayerPanel } from './ui/layer-panel'
import { Timeline } from './ui/timeline'
import { CursorReadout } from './ui/cursor-readout'
import { Legend } from './ui/legend'
import { Database } from './ui/database'
import { ClockDriver } from './state/clock-driver'
import { ErrorBoundary } from './ui/error-boundary'
import { startUrlSync } from './state/url'
import { useView } from './state/view'

const BasemapBanner = () => {
  const degraded = useView((s) => s.basemapDegraded)
  if (!degraded) return null
  return (
    <div className="basemap-banner" role="status">
      PRIMARY BASEMAP UNREACHABLE · using fallback. Check ad-blocker / proxy for
      tiles.openfreemap.org
    </div>
  )
}

const App = () => {
  const mode = useView((s) => s.mode)
  const panelOpen = useView((s) => s.panelOpen)
  const onMap = mode !== 'database'
  const hasTimeline = mode === 'flight'
  useEffect(() => startUrlSync(), [])

  return (
    <div
      className="app"
      data-panel={panelOpen && onMap ? 'open' : 'closed'}
      data-timeline={hasTimeline ? 'on' : 'off'}
    >
      {/* The map stays mounted in database mode (display: none) so switching
          back is instant and the WebGL context survives. */}
      <div className="map-wrap" style={{ display: onMap ? undefined : 'none' }}>
        <ErrorBoundary>
          <GlobeMap />
        </ErrorBoundary>
      </div>

      {onMap && (
        <div className="frame" aria-hidden="true">
          <span className="corner tl" />
          <span className="corner tr" />
          <span className="corner bl" />
          <span className="corner br" />
        </div>
      )}

      <TopBar />
      {onMap && <BasemapBanner />}
      {onMap && <LayerPanel />}
      {onMap && <CursorReadout />}
      {onMap && <Legend />}
      {hasTimeline && <Timeline />}
      {mode === 'database' && <Database />}

      <ClockDriver />
    </div>
  )
}

export default App
