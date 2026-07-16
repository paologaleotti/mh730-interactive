import { useState } from 'react'
import { LAYERS, LAYER_GROUPS, CONFIDENCE_META } from '../config/layers'
import { SEARCH_CAMPAIGNS } from '../map/data-layers'
import { useView } from '../state/view'

const CampaignSubMenu = () => {
  const disabled = useView((s) => s.disabledCampaigns)
  const toggleCampaign = useView((s) => s.toggleCampaign)
  const [expanded, setExpanded] = useState(false)
  const activeCount = SEARCH_CAMPAIGNS.length - disabled.length

  return (
    <div className="campaign-menu">
      <button
        type="button"
        className="campaign-expander"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? '▾' : '▸'} CAMPAIGNS ({activeCount}/{SEARCH_CAMPAIGNS.length})
      </button>
      {expanded && (
        <div className="campaign-list" role="group" aria-label="Search campaigns">
          {SEARCH_CAMPAIGNS.map((c) => {
            const on = !disabled.includes(c.id)
            return (
              <label key={c.id} className="campaign-row">
                <input type="checkbox" checked={on} onChange={() => toggleCampaign(c.id)} />
                <i className="campaign-swatch" style={{ background: c.color }} />
                <span className="campaign-name">{c.name}</span>
                <span className="campaign-kind">{c.kind === 'underwater' ? 'UW' : 'SFC'}</span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

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
          {`${LAYERS.filter((l) => !l.planned && layers[l.id]).length}/${
            LAYERS.filter((l) => !l.planned).length
          }`}
        </span>
      </div>

      <div className="panel-body">
        {LAYER_GROUPS.map((group) => (
          <section key={group} className="layer-group">
            <h3 className="layer-group-title">{group}</h3>
            {LAYERS.filter((l) => l.group === group).map((l) => {
              const on = !l.planned && !!layers[l.id]
              return (
                <div key={l.id} className={`layer-row${on ? ' is-on' : ''}${l.planned ? ' is-planned' : ''}`}>
                  <label className="layer-toggle">
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={l.planned}
                      onChange={() => toggleLayer(l.id)}
                    />
                    <span className="layer-label">{l.label}</span>
                    {l.planned && <span className="conf conf-planned">PLANNED</span>}
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
                  {l.id === 'search' && on && <CampaignSubMenu />}
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
