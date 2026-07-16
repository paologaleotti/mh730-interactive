import { useCursor } from '../state/cursor'
import { fmtDeg } from '../lib/format'

export const CursorReadout = () => {
  const lat = useCursor((s) => s.lat)
  const lng = useCursor((s) => s.lng)
  const depth = useCursor((s) => s.depth)

  // role=status + aria-live=off: reachable by screen readers (FR-4.4/FR-14.4)
  // without announcing every mousemove.
  return (
    <div className="cursor-readout" role="status" aria-live="off" aria-label="Cursor position">
      <div className="cr-row">
        <span className="cr-key">LAT</span>
        <span className="cr-val">{lat === null ? '  --.----' : fmtDeg(lat)}</span>
      </div>
      <div className="cr-row">
        <span className="cr-key">LON</span>
        <span className="cr-val">{lng === null ? ' ---.----' : fmtDeg(lng)}</span>
      </div>
      <div className="cr-row">
        <span className="cr-key">DPT</span>
        <span className="cr-val">{depth === null ? '     -- m' : `${depth} m`}</span>
      </div>
    </div>
  )
}
