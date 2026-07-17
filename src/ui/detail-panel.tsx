// Detail Panel (§9): one consistent panel for every clickable feature.
// Title, category, timestamps, structured properties, citations, actions.
// Evidence media (audio + photos) renders via <MediaSection>, driven by the
// media manifest with locally-mirrored payloads.

import { useView } from '../state/view'
import { useClock, FLIGHT_START, FLIGHT_END } from '../state/clock'
import { useSelection, type Selected } from '../state/selection'
import { MediaSection } from './media-section'
import { fmtUTC, fmtLocalMYTFull } from '../lib/format'

const KIND_META: Record<Selected['kind'], { title: string; conf: string }> = {
  poi: { title: 'POINT OF INTEREST', conf: 'recorded' },
  debris: { title: 'RECOVERED DEBRIS', conf: 'recorded' },
  arc: { title: 'SATELLITE TIMING RING', conf: 'derived' },
  aux: { title: 'EXTRA INMARSAT CONSTRAINT (CAPTIO)', conf: 'modelled' },
  search: { title: 'SEARCH CAMPAIGN', conf: 'derived' },
  site: { title: 'CANDIDATE CRASH SITE', conf: 'modelled' },
  epoch1: { title: 'FLIGHT PATH · EPOCH 1', conf: 'recorded' },
  epoch2: { title: 'FLIGHT PATH · EPOCH 2', conf: 'recorded' },
  epoch3: { title: 'CANDIDATE RECONSTRUCTION', conf: 'modelled' },
}

const str = (v: unknown): string | null =>
  v === null || v === undefined || v === '' ? null : String(v)

interface Badge {
  label: string
  color: string
}

const DEBRIS_STATUS_COLORS: Record<string, string> = {
  confirmed: '#6faf7d',
  'almost-certain': '#8fae6f',
  'highly-likely': '#c9a35b',
  likely: '#c9865b',
  unidentifiable: '#7b8794',
}

/** Status/quality chips shown under the title, colour-coded to match the map
    and legend so epistemic status reads at a glance. */
const badgesFor = (kind: Selected['kind'], props: Record<string, unknown>): Badge[] => {
  const out: Badge[] = []
  const id = str(props.id) ?? ''
  const text = `${str(props.desc) ?? ''} ${str(props.oneLiner) ?? ''} ${str(props.note) ?? ''} ${str(props.methodology) ?? ''}`.toLowerCase()

  if (kind === 'debris') {
    const s = str(props.status)
    if (s) out.push({ label: s.replace('-', ' ').toUpperCase(), color: DEBRIS_STATUS_COLORS[s] ?? '#7b8794' })
  }
  if (kind === 'search') {
    out.push(
      str(props.kind) === 'proposed'
        ? { label: 'PROPOSED · UNSEARCHED', color: '#e0996b' }
        : { label: 'SEARCHED', color: '#6fb7cc' },
    )
  }
  if (kind === 'site') {
    const s = str(props.status)
    if (s) out.push({ label: s.replace(/-/g, ' ').toUpperCase(), color: s.includes('unsearched') ? '#e0996b' : '#6fb7cc' })
  }
  if (kind === 'aux') {
    out.push(
      props.definesRing
        ? { label: 'DISTANCE READING', color: '#5fb89a' }
        : { label: 'DIRECTION ONLY', color: '#5fb89a' },
    )
  }
  if (kind === 'epoch3' && id.includes('wspr')) {
    out.push({ label: 'CONTESTED METHOD', color: '#c65d5d' })
  }
  // Generic quality flags, from an explicit flag or the wording of the text.
  if (props.contested === true || /\bdisputed\b/.test(text)) {
    out.push({ label: /\bdisputed\b/.test(text) ? 'DISPUTED' : 'CONTESTED', color: '#c65d5d' })
  } else if (/uncorroborated|unverified|not substantiated|debated/.test(text)) {
    out.push({ label: 'UNCORROBORATED', color: '#c9865b' })
  } else if (/model-dependent/.test(text)) {
    out.push({ label: 'MODEL-DEPENDENT', color: '#c9865b' })
  }
  return out
}

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

interface BadgeStyle extends React.CSSProperties {
  '--bd': string
}
const badgeStyle = (color: string): BadgeStyle => ({ '--bd': color })

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
  aux: [
    ['messageTypeRaw', 'MESSAGE'],
    ['btoUs', 'BTO (μs)'],
    ['bfoHz', 'BFO (Hz)'],
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
    ['note', 'NOTE'],
  ],
  poi: [
    ['category', 'CATEGORY'],
  ],
  epoch1: [
    ['timeStart', 'FROM (KL LOCAL)'],
    ['timeEnd', 'TO (KL LOCAL)'],
    ['pointCount', 'ANCHOR POINTS'],
    ['interpolatedCount', 'OF WHICH INTERPOLATED'],
  ],
  epoch2: [
    ['timeStart', 'FROM (KL LOCAL)'],
    ['timeEnd', 'TO (KL LOCAL)'],
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
  const badges = badgesFor(selected.kind, props)
  // Plain-language summary (for non-experts) leads; the technical narrative is
  // demoted to a secondary block so the panel serves both audiences.
  const plain = str(props.plain)
  const technical = str(props.desc) ?? str(props.oneLiner)
  // When there is no plain text, the technical narrative is the lead.
  const leadText = plain ?? technical
  const detailText = plain ? technical : null
  // Header confidence: a feature's own confidence wins over the kind default,
  // and a contested/model-dependent POI must not read as RECORDED.
  const conf =
    str(props.confidence) ??
    (props.contested === true && meta.conf === 'recorded' ? 'modelled' : meta.conf)

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
            {meta.title} <span className={`conf conf-${conf}`}>{conf.toUpperCase()}</span>
          </div>
          <h2 className="dp-title">{title}</h2>
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
        {selected.kind === 'arc' && <ArcExplainer props={props} />}

        {leadText && (
          <div className="dp-section">
            {plain && <div className="dp-section-title">IN PLAIN TERMS</div>}
            <p className="dp-text dp-lead">{leadText}</p>
          </div>
        )}

        {detailText && (
          <div className="dp-section">
            <div className="dp-section-title">TECHNICAL DETAIL</div>
            <p className="dp-text">{detailText}</p>
          </div>
        )}

        <div className="dp-section">
          {KIND_ROWS[selected.kind].map(([key, label]) => {
            // Epoch time bounds are stored as UTC ISO; show them in KL local.
            const raw = props[key]
            const v =
              (key === 'timeStart' || key === 'timeEnd') && str(raw)
                ? fmtLocalMYTFull(Date.parse(String(raw)))
                : raw
            return <Row key={key} k={label} v={v} />
          })}
          {timeUtc && Number.isFinite(flightTime) && (
            <>
              <Row k="TIME (KL LOCAL)" v={fmtLocalMYTFull(flightTime)} />
              <Row k="TIME (UTC)" v={fmtUTC(flightTime)} />
            </>
          )}
          {/* A single position is only meaningful for point features. */}
          {['poi', 'debris', 'site', 'aux'].includes(selected.kind) && (
            <Row
              k="POSITION"
              v={`${selected.lngLat[1].toFixed(4)}, ${selected.lngLat[0].toFixed(4)}`}
            />
          )}
        </div>

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
