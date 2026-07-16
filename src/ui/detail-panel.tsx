// Detail Panel (§9): one consistent panel for every clickable feature.
// Title, category, timestamps, structured properties, citations, actions.
// Evidence media (audio + photos) renders via <MediaSection>, driven by the
// media manifest with locally-mirrored payloads.

import { useView } from '../state/view'
import { useClock, FLIGHT_START, FLIGHT_END } from '../state/clock'
import { useSelection, type Selected } from '../state/selection'
import { MediaSection } from './media-section'
import { fmtUTC } from '../lib/format'

const KIND_META: Record<Selected['kind'], { title: string; conf: string }> = {
  poi: { title: 'POINT OF INTEREST', conf: 'recorded' },
  debris: { title: 'RECOVERED DEBRIS', conf: 'recorded' },
  arc: { title: 'SATELLITE TIMING RING', conf: 'derived' },
  search: { title: 'SEARCH CAMPAIGN', conf: 'derived' },
  site: { title: 'CANDIDATE CRASH SITE', conf: 'modelled' },
  epoch1: { title: 'FLIGHT PATH · EPOCH 1', conf: 'recorded' },
  epoch2: { title: 'FLIGHT PATH · EPOCH 2', conf: 'recorded' },
  epoch3: { title: 'CANDIDATE RECONSTRUCTION', conf: 'modelled' },
}

const str = (v: unknown): string | null =>
  v === null || v === undefined || v === '' ? null : String(v)

const Row = ({ k, v }: { k: string; v: unknown }) => {
  const val = str(v)
  if (val === null) return null
  return (
    <div className="dp-row">
      <span className="dp-key">{k}</span>
      <span className="dp-val">{val}</span>
    </div>
  )
}

/** Read a key off an unknown value without casting (rule: never `as`). */
const at = (o: unknown, k: string): unknown =>
  o !== null && typeof o === 'object' && k in o ? Reflect.get(o, k) : undefined

const Citation = ({ props }: { props: Record<string, unknown> }) => {
  const c = props.citation
  const url = str(at(c, 'url'))
  const label = str(at(c, 'label'))
  const source = str(props.source)
  if (!url && !source && !label) return null
  return (
    <div className="dp-section">
      <div className="dp-section-title">SOURCE</div>
      {url ? (
        <a className="dp-cite" href={url} target="_blank" rel="noopener noreferrer">
          ↗ {label ?? url}
        </a>
      ) : (
        <p className="dp-source-text">{label ?? source}</p>
      )}
    </div>
  )
}

const ArcExplainer = ({ props }: { props: Record<string, unknown> }) => (
  <div className="dp-section">
    <div className="dp-section-title">WHAT THIS RING MEANS</div>
    <p className="dp-text">
      Each hour, the Inmarsat-3F1 satellite exchanged a brief "handshake" with
      the aircraft. The measured signal round-trip time (Burst Timing Offset,
      here {String(props.btoUs)} microseconds) fixes the aircraft's distance
      from the satellite at that instant. All positions at that distance form
      this ring: the aircraft was somewhere on it at{' '}
      {String(props.timeUtc).replace('T', ' ').replace('Z', ' UTC')}, at the
      assumed cruise altitude of {String(props.altAssumptionFt)} ft.
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

const KIND_ROWS: Record<Selected['kind'], [key: string, label: string][]> = {
  debris: [
    ['partId', 'PART'],
    ['status', 'STATUS'],
    ['findDate', 'FOUND'],
    ['locationName', 'LOCATION'],
    ['discoverer', 'DISCOVERER'],
    ['examiner', 'EXAMINER'],
  ],
  arc: [
    ['btoUs', 'BTO (μs)'],
    ['bfoHz', 'BFO (Hz)'],
    ['altAssumptionFt', 'ALT ASSUMED (ft)'],
  ],
  search: [
    ['operator', 'OPERATOR'],
    ['kind', 'TYPE'],
    ['startDate', 'START'],
    ['endDate', 'END'],
    ['areaKm2', 'AREA (km²)'],
    ['outcome', 'OUTCOME'],
  ],
  site: [
    ['publishedBy', 'PUBLISHED BY'],
    ['date', 'DATE'],
    ['methodology', 'METHOD'],
    ['status', 'SEARCH STATUS'],
    ['note', 'NOTE'],
  ],
  poi: [
    ['category', 'CATEGORY'],
    ['oneLiner', 'ABOUT'],
  ],
  epoch1: [
    ['timeStart', 'FROM (UTC)'],
    ['timeEnd', 'TO (UTC)'],
    ['pointCount', 'ANCHOR POINTS'],
    ['interpolatedCount', 'OF WHICH INTERPOLATED'],
  ],
  epoch2: [
    ['timeStart', 'FROM (UTC)'],
    ['timeEnd', 'TO (UTC)'],
    ['pointCount', 'ANCHOR POINTS'],
    ['interpolatedCount', 'OF WHICH INTERPOLATED'],
  ],
  epoch3: [['name', 'ANALYSIS']],
}

export const DetailPanel = () => {
  const selected = useSelection((s) => s.selected)
  const select = useSelection((s) => s.select)
  const setCamera = useView((s) => s.setCamera)
  const camera = useView((s) => s.camera)
  const setMode = useView((s) => s.setMode)
  const setTime = useClock((s) => s.setTime)

  if (!selected) return null
  const meta = KIND_META[selected.kind]
  const { props } = selected
  const title = str(props.name) ?? str(props.partId) ?? str(props.label) ?? selected.id

  const timeUtc = str(props.timeUtc)
  const flightTime = timeUtc ? Date.parse(timeUtc) : NaN
  const inFlightRange = flightTime >= FLIGHT_START && flightTime <= FLIGHT_END

  const flyHere = () =>
    setCamera({
      center: selected.lngLat,
      zoom: Math.max(camera.zoom, selected.kind === 'poi' || selected.kind === 'debris' ? 6 : 4),
      bearing: 0,
      pitch: 0,
    })

  return (
    <aside className="detail-panel" aria-label="Feature details">
      <div className="dp-head">
        <div>
          <div className="dp-kind">
            {meta.title} <span className={`conf conf-${meta.conf}`}>{meta.conf.toUpperCase()}</span>
          </div>
          <h2 className="dp-title">{title}</h2>
        </div>
        <button type="button" className="dp-close" aria-label="Close details" onClick={() => select(null)}>
          ✕
        </button>
      </div>

      <div className="dp-body">
        {selected.kind === 'arc' && <ArcExplainer props={props} />}

        <div className="dp-section">
          {KIND_ROWS[selected.kind].map(([key, label]) => (
            <Row key={key} k={label} v={props[key]} />
          ))}
          {timeUtc && Number.isFinite(flightTime) && <Row k="TIME" v={fmtUTC(flightTime)} />}
          {/* A single position is only meaningful for point features. */}
          {['poi', 'debris', 'site'].includes(selected.kind) && (
            <Row
              k="POSITION"
              v={`${selected.lngLat[1].toFixed(4)}, ${selected.lngLat[0].toFixed(4)}`}
            />
          )}
        </div>

        {str(props.desc) && (
          <div className="dp-section">
            <p className="dp-text">{str(props.desc)}</p>
          </div>
        )}

        <MediaSection featureId={selected.id} />

        <Citation props={props} />
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
