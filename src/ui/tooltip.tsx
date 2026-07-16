// Instant hover tooltip: name + one-liner at the cursor. Click opens the
// Detail Panel. Pointer-events none so it never intercepts the map.

import { useSelection } from '../state/selection'

export const MapTooltip = () => {
  const hover = useSelection((s) => s.hover)
  if (!hover) return null

  return (
    <div
      className="map-tooltip"
      style={{ transform: `translate(${hover.x + 14}px, ${hover.y + 14}px)` }}
      aria-hidden="true"
    >
      <div className="tt-name">{hover.name}</div>
      {hover.sub && <div className="tt-sub">{hover.sub}</div>}
      <div className="tt-hint">click for details</div>
    </div>
  )
}
