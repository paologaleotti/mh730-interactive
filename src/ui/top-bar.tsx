import { useView, type Mode } from '../state/view'

// `planned` marks a mode whose full experience (flight-clock audio +
// choreography) is not finished yet; it renders a PLANNED badge and a tooltip.
const MODES: { id: Mode; label: string; planned?: boolean }[] = [
  { id: 'explore', label: 'EXPLORE' },
  { id: 'flight', label: 'FLIGHT', planned: true },
  { id: 'database', label: 'DATABASE' },
]

export const TopBar = () => {
  const mode = useView((s) => s.mode)
  const setMode = useView((s) => s.setMode)
  const projection = useView((s) => s.projection)
  const setProjection = useView((s) => s.setProjection)
  const panelOpen = useView((s) => s.panelOpen)
  const setPanelOpen = useView((s) => s.setPanelOpen)
  const onMap = mode !== 'database'

  return (
    <header className="topbar">
      <div className="topbar-strip">UNCLASSIFIED · OPEN-SOURCE EVIDENCE COMPILATION</div>
      <div className="topbar-main">
        <div className="topbar-left">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">◆</span>
            <span className="brand-code">MH370</span>
            <span className="brand-sub">INTERACTIVE EVIDENCE GLOBE</span>
          </div>

          <div className="seg" role="group" aria-label="Mode">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className="seg-btn"
                aria-pressed={mode === m.id}
                title={m.planned ? 'Work in progress: flight-clock audio and choreography are still being built' : undefined}
                onClick={() => setMode(m.id)}
              >
                {m.label}
                {m.planned && <span className="conf conf-planned" aria-hidden="true">PLANNED</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="topbar-controls">
          {onMap && (
            <>
              <div className="seg" role="group" aria-label="Projection">
                <button
                  type="button"
                  className="seg-btn"
                  aria-pressed={projection === 'globe'}
                  onClick={() => setProjection('globe')}
                >
                  GLOBE
                </button>
                <button
                  type="button"
                  className="seg-btn"
                  aria-pressed={projection === 'mercator'}
                  onClick={() => setProjection('mercator')}
                >
                  FLAT
                </button>
              </div>

              <button
                type="button"
                className="icon-btn"
                aria-pressed={panelOpen}
                aria-label="Toggle layers panel"
                onClick={() => setPanelOpen(!panelOpen)}
              >
                LAYERS
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
