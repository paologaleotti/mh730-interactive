// Detail Panel (§9): one consistent panel for every clickable feature.
// Title, category, timestamps, structured properties, citations, actions.
// Everything is derived from the typed DataPoint via helpers in lib/data-* -
// no untyped property bag, no reflection, no prose scanning.

import { useView } from '../state/view'
import { useClock, FLIGHT_START, FLIGHT_END } from '../state/clock'
import { useSelection } from '../state/selection'
import { MediaSection } from './media-section'
import { fmtUTC, fmtLocalMYTFull } from '../lib/format'
import { badgesFor } from '../lib/data-badges'
import {
  bodyText,
  citationOf,
  confidenceFor,
  flightTimeUtc,
  kindTitle,
  rowsFor,
  sourceOf,
  titleFor,
  type Row as RowSpec,
} from '../lib/data-display'
import type { ArcPoint, DataPoint } from '../data/data-point'

const Row = ({ label, value }: { label: string; value: RowSpec[1] }) => {
  if (value === null || value === '') return null
  return (
    <div className="dp-row">
      <span className="dp-key">{label}</span>
      <span className="dp-val">{value}</span>
    </div>
  )
}

interface BadgeStyle extends React.CSSProperties {
  '--bd': string
}
const badgeStyle = (color: string): BadgeStyle => ({ '--bd': color })

const Citation = ({ point }: { point: DataPoint }) => {
  const citation = citationOf(point)
  const source = sourceOf(point)
  if (!citation && !source) return null
  return (
    <div className="dp-section">
      <div className="dp-section-title">SOURCE</div>
      {citation ? (
        <a className="dp-cite" href={citation.url} target="_blank" rel="noopener noreferrer">
          ↗ {citation.label}
        </a>
      ) : (
        <p className="dp-source-text">{source}</p>
      )}
    </div>
  )
}

const ArcExplainer = ({ point }: { point: ArcPoint }) => (
  <div className="dp-section">
    <div className="dp-section-title">WHAT THIS RING MEANS</div>
    <p className="dp-text">
      Each hour, the Inmarsat-3F1 satellite exchanged a brief "handshake" with
      the aircraft. The measured signal round-trip time (Burst Timing Offset,
      here {point.btoUs} microseconds) fixes the aircraft's distance from the
      satellite at that instant. All positions at that distance form this ring:
      the aircraft was somewhere on it at{' '}
      {fmtLocalMYTFull(Date.parse(point.timeUtc))}, at the assumed cruise
      altitude of {point.altAssumptionFt} ft.
    </p>
    <a
      className="dp-cite"
      href="https://www.cambridge.org/core/journals/journal-of-navigation/article/search-for-mh370/D2D1C4C99E7BFDE35841CFD70081114A"
      target="_blank"
      rel="noopener noreferrer"
    >
      ↗ Methodology: Ashton et al. 2015 (open access)
    </a>
    <a
      className="dp-cite"
      href="https://github.com/davetaz/mh370-data"
      target="_blank"
      rel="noopener noreferrer"
    >
      ↗ Released SATCOM log (validated CSV)
    </a>
  </div>
)

export const DetailPanel = () => {
  const selected = useSelection((s) => s.selected)
  const select = useSelection((s) => s.select)
  const setCamera = useView((s) => s.setCamera)
  const camera = useView((s) => s.camera)
  const setMode = useView((s) => s.setMode)
  const setTime = useClock((s) => s.setTime)

  if (!selected) return null
  const { point, lngLat } = selected
  const conf = confidenceFor(point)
  const badges = badgesFor(point)
  const { lead, detail } = bodyText(point)

  const timeUtc = flightTimeUtc(point)
  const flightTime = timeUtc ? Date.parse(timeUtc) : NaN
  const inFlightRange = flightTime >= FLIGHT_START && flightTime <= FLIGHT_END
  // Point features only: the aux constraint is now a ring (line), so a single
  // lat/lon would misrepresent it.
  const isPoint = point.kind === 'poi' || point.kind === 'debris' || point.kind === 'site'

  const flyHere = () =>
    setCamera({
      center: lngLat,
      zoom: Math.max(camera.zoom, point.kind === 'poi' || point.kind === 'debris' ? 6 : 4),
      bearing: 0,
      pitch: 0,
    })

  return (
    <aside className="detail-panel" aria-label="Feature details">
      <div className="dp-head">
        <div>
          <div className="dp-kind">
            {kindTitle(point)} <span className={`conf conf-${conf}`}>{conf.toUpperCase()}</span>
          </div>
          <h2 className="dp-title">{titleFor(point)}</h2>
          {badges.length > 0 && (
            <div className="dp-badges">
              {badges.map((b) => (
                <span key={b.label} className="dp-badge" style={badgeStyle(b.color)}>
                  {b.label}
                </span>
              ))}
            </div>
          )}
        </div>
        <button type="button" className="dp-close" aria-label="Close details" onClick={() => select(null)}>
          ✕
        </button>
      </div>

      <div className="dp-body">
        {point.kind === 'arc' && <ArcExplainer point={point} />}

        {lead && (
          <div className="dp-section">
            {detail && <div className="dp-section-title">IN PLAIN TERMS</div>}
            <p className="dp-text dp-lead">{lead}</p>
          </div>
        )}

        {detail && (
          <div className="dp-section">
            <div className="dp-section-title">TECHNICAL DETAIL</div>
            <p className="dp-text">{detail}</p>
          </div>
        )}

        <div className="dp-section">
          {rowsFor(point).map(([label, value]) => (
            <Row key={label} label={label} value={value} />
          ))}
          {timeUtc && Number.isFinite(flightTime) && (
            <>
              <Row label="TIME (KL LOCAL)" value={fmtLocalMYTFull(flightTime)} />
              <Row label="TIME (UTC)" value={fmtUTC(flightTime)} />
            </>
          )}
          {/* A single position is only meaningful for point features. */}
          {isPoint && (
            <Row label="POSITION" value={`${lngLat[1].toFixed(4)}, ${lngLat[0].toFixed(4)}`} />
          )}
        </div>

        <MediaSection featureId={point.id} />

        <Citation point={point} />
      </div>

      <div className="dp-actions">
        <button type="button" className="icon-btn" onClick={flyHere}>
          FLY HERE
        </button>
        {inFlightRange && (
          <button
            type="button"
            className="icon-btn"
            onClick={() => {
              setMode('flight')
              setTime(flightTime)
            }}
          >
            SET FLIGHT CLOCK
          </button>
        )}
      </div>
    </aside>
  )
}
