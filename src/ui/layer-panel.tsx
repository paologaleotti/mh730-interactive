import { LAYERS, LAYER_GROUPS, CONFIDENCE_META } from '../config/layers'
import { useView } from '../state/view'

export const LayerPanel = () => {
  const open = useView((s) => s.panelOpen)
  const layers = useView((s) => s.layers)
  const toggleLayer = useView((s) => s.toggleLayer)

  if (!open) return null

  return (
    <aside className="layer-panel" aria-label="Data layers">
      <div className="panel-head">
        <span className="panel-title">DATA LAYERS</span>
        <span className="panel-count">
          {Object.values(layers).filter(Boolean).length}/{LAYERS.length}
        </span>
      </div>

      <div className="panel-body">
        {LAYER_GROUPS.map((group) => (
          <section key={group} className="layer-group">
            <h3 className="layer-group-title">{group}</h3>
            {LAYERS.filter((l) => l.group === group).map((l) => {
              const on = !!layers[l.id]
              return (
                <div key={l.id} className={`layer-row${on ? ' is-on' : ''}`}>
                  <label className="layer-toggle">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleLayer(l.id)}
                    />
                    <span className="layer-label">{l.label}</span>
                    {l.confidence && (
                      <span
                        className={`conf conf-${l.confidence}`}
                        title={CONFIDENCE_META[l.confidence].hint}
                      >
                        {CONFIDENCE_META[l.confidence].label}
                      </span>
                    )}
                  </label>
                  <p className="layer-desc">{l.desc}</p>
                  {l.citation && (
                    <a
                      className="layer-cite"
                      href={l.citation.url}
                      target="_blank"
                      rel="noopener"
                    >
                      ↗ {l.citation.label}
                    </a>
                  )}
                </div>
              )
            })}
          </section>
        ))}
      </div>

      <div className="panel-foot">
        <span className="legend-item"><i className="swatch conf-recorded" />recorded</span>
        <span className="legend-item"><i className="swatch conf-derived" />derived</span>
        <span className="legend-item"><i className="swatch conf-modelled" />modelled</span>
      </div>
    </aside>
  )
}
