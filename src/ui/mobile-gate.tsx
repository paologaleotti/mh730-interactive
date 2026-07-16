// Desktop-only gate. The globe UI (layer panel, timeline, detail panel,
// legend) assumes a wide pointer-driven viewport; mobile layout is planned.
// Shows a full-screen notice on small screens instead of a broken experience.

import { useSyncExternalStore } from 'react'

const QUERY = '(max-width: 820px), (pointer: coarse) and (max-width: 1024px)'

const subscribe = (cb: () => void) => {
  const mql = window.matchMedia(QUERY)
  mql.addEventListener('change', cb)
  return () => mql.removeEventListener('change', cb)
}
const isMobile = () => window.matchMedia(QUERY).matches

export const MobileGate = () => {
  const mobile = useSyncExternalStore(subscribe, isMobile, () => false)
  if (!mobile) return null

  return (
    <div
      className="mobile-gate"
      role="region"
      aria-labelledby="mg-heading"
      aria-describedby="mg-desc"
    >
      <div className="mg-strip">UNCLASSIFIED · OPEN-SOURCE EVIDENCE COMPILATION</div>
      <div className="mg-body">
        <h1 id="mg-heading" className="mg-brand">
          <span className="brand-mark" aria-hidden="true">◆</span> MH370
        </h1>
        <div className="mg-tag">INTERACTIVE EVIDENCE GLOBE</div>

        <div className="mg-badge">DESKTOP ONLY <span className="mg-planned">MOBILE PLANNED</span></div>

        <p id="mg-desc" className="mg-text">
          This interactive globe is built for a large screen and a mouse or
          trackpad. Open it on a desktop or laptop for the full evidence map,
          timeline, and detail panels.
        </p>
        <p className="mg-text mg-dim">
          A touch-friendly mobile layout is planned.
        </p>
      </div>
    </div>
  )
}
