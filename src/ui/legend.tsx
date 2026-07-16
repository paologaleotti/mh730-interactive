// Map legend (collapsible). Mirrors exactly the shape/color coding used by
// data-layers.ts: line treatments encode confidence (P2), marker shapes
// encode feature category, colors encode status/campaign.

import { useView } from '../state/view'
import { SEARCH_CAMPAIGNS } from '../map/data-layers'

// Labels written for a first-time visitor: plain words first, technical term
// in parentheses where it matters.
const LINE_ITEMS: { label: string; className: string; title?: string }[] = [
  {
    label: 'Recorded path (ADS-B)',
    className: 'lg-line lg-epoch1',
    title: 'Civil transponder positions, takeoff to 17:21 UTC',
  },
  {
    label: 'Military radar path',
    className: 'lg-line lg-epoch2',
    title: 'Primary radar, 17:21-18:22 UTC (recorded, lower precision)',
  },
  {
    label: 'Reconstructed paths',
    className: 'lg-line lg-epoch3',
    title: 'Published candidate routes for the unrecorded final hours',
  },
  {
    label: 'Satellite rings 1-6',
    className: 'lg-line lg-arc',
    title: 'Hourly Inmarsat handshakes: the plane was somewhere on each ring',
  },
  {
    label: '7th ring · last signal',
    className: 'lg-line lg-arc7',
    title: 'The final, incomplete satellite log-on at 00:19 UTC; all searches follow this line',
  },
]

const MARKER_ITEMS: { label: string; shape: string; color: string; title?: string }[] = [
  {
    label: 'Airport',
    shape: 'square',
    color: '#6fb7cc',
    title: 'Departure airport WMKK is drawn larger and labeled',
  },
  { label: 'Waypoint', shape: 'diamond', color: '#8fa8b8' },
  { label: 'Recovered debris', shape: 'triangle', color: '#6faf7d' },
  { label: 'Candidate crash site', shape: 'star', color: '#b79ddb' },
  { label: 'Hydrophone station', shape: 'hexagon', color: '#c9a35b' },
  { label: 'Satellite position', shape: 'cross', color: '#6fb7cc' },
  { label: 'Key event', shape: 'circle', color: '#dfe6ec' },
]

const DEBRIS_SCALE: { label: string; color: string }[] = [
  { label: 'confirmed', color: '#6faf7d' },
  { label: 'almost certain', color: '#8fae6f' },
  { label: 'highly likely', color: '#c9a35b' },
  { label: 'likely', color: '#c9865b' },
  { label: 'unidentified', color: '#7b8794' },
]

/** Compact display names for the campaign swatch grid (full name on hover). */
const CAMPAIGN_SHORT: Record<string, string> = {
  'south-china-sea-2014': 'South China Sea 2014',
  'malacca-andaman-2014': 'Malacca Strait 2014',
  'sio-surface-initial-2014': 'Surface, initial 2014',
  'sio-surface-refined-2014': 'Surface, refined 2014',
  'sio-surface-final-2014': 'Surface, final 2014',
  'ocean-shield-acoustic-2014': 'Ocean Shield 2014',
  'atsb-underwater-2014-2017': 'ATSB seabed 2014-17',
  'ocean-infinity-2018': 'Ocean Infinity 2018',
  'ocean-infinity-2025-26': 'Ocean Inf. 2025-26',
}

// CSSProperties has no custom-property keys; extending it types `--mk`
// without a cast.
interface MarkerStyle extends React.CSSProperties {
  '--mk': string
}
const markerStyle = (color: string): MarkerStyle => ({ '--mk': color })

const Marker = ({ shape, color }: { shape: string; color: string }) => (
  <i className={`lg-marker lg-${shape}`} style={markerStyle(color)} />
)

export const Legend = () => {
  const open = useView((s) => s.legendOpen)
  const setOpen = useView((s) => s.setLegendOpen)

  return (
    <div className="legend" data-open={open}>
      <button
        type="button"
        className="legend-toggle"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        LEGEND {open ? '▾' : '▸'}
      </button>

      {open && (
        <div className="legend-body">
          <div className="lg-section lg-grid-2">
            <div className="lg-section-title">FLIGHT PATH &amp; SIGNALS</div>
            {LINE_ITEMS.map((it) => (
              <div key={it.label} className="lg-row" title={it.title}>
                <span className={it.className} />
                <span className="lg-label">{it.label}</span>
              </div>
            ))}
          </div>

          <div className="lg-section lg-grid-2">
            <div className="lg-section-title">MAP MARKERS</div>
            {MARKER_ITEMS.map((it) => (
              <div key={it.label} className="lg-row" title={it.title}>
                <Marker shape={it.shape} color={it.color} />
                <span className="lg-label">{it.label}</span>
              </div>
            ))}
          </div>

          <div className="lg-section">
            <div className="lg-section-title">DEBRIS IDENTIFICATION</div>
            <div className="lg-row lg-scale">
              {DEBRIS_SCALE.map((d) => (
                <span key={d.label} className="lg-scale-item">
                  <i className="lg-dot" style={{ background: d.color }} />
                  {d.label}
                </span>
              ))}
            </div>
          </div>

          <div className="lg-section lg-grid-2">
            <div className="lg-section-title">SEARCH CAMPAIGNS</div>
            {SEARCH_CAMPAIGNS.map((c) => (
              <div key={c.id} className="lg-row" title={c.name}>
                <span className="lg-area" style={markerStyle(c.color)} />
                <span className="lg-label">{CAMPAIGN_SHORT[c.id] ?? c.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
