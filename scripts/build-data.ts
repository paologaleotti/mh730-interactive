// Build-time data compiler (FR-16: all data compiled at build time).
// Reads the sourced raw data in data/ (fetched from primary sources, with
// citations) and writes render-ready GeoJSON into src/data/.
//
// Run: node scripts/build-data.ts
// Requires Node >= 23.6 (native TS type stripping).

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { distEcef, btoRing, rangeFromBto, type Ecef } from '../src/lib/geo.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rawDir = join(root, 'data')
// MH_DATA_OUT lets the drift test regenerate into a temp dir and diff against
// the committed output without touching it.
const outDir = process.env.MH_DATA_OUT ?? join(root, 'src', 'data')

interface RawHandshake {
  id: string
  timeUtc: string
  timeUtcExact: string
  btoRawUs: number | null
  btoCorrectedUs: number | null
  isLogon: boolean
  bfoHz: number | null
  excluded?: boolean
}

interface EphemerisRow {
  timeUtc: string
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
}

interface SatcomJson {
  meta: { sources: { label: string; url: string }[] }
  gesPerth: { lat: number; lon: number; ecefKm: { x: number; y: number; z: number } }
  btoModel: { biasUs: number; logonCorrectionUs: number }
  satelliteEphemeris: { rows: EphemerisRow[] }
  handshakes: RawHandshake[]
}

interface TrackPoint {
  timeUtc: string
  lat: number
  lon: number
  altFt: number | null
  label?: string
  source: string
}

const fail = (msg: string): never => {
  throw new Error(`build-data: ${msg}`)
}

const readRaw = <T>(name: string): T | null => {
  const p = join(rawDir, name)
  if (!existsSync(p)) {
    console.warn(`! ${name} missing, skipping`)
    return null
  }
  return JSON.parse(readFileSync(p, 'utf8'))
}

const writeOut = (name: string, fc: unknown, count: number) => {
  writeFileSync(join(outDir, name), JSON.stringify(fc))
  console.log(`✓ src/data/${name} (${count} features)`)
}

const assertLatLon = (lat: number, lon: number, ctx: string) => {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) fail(`${ctx}: bad lat ${lat}`)
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) fail(`${ctx}: bad lon ${lon}`)
}

// ---------------------------------------------------------------- arcs

// Region of interest for arc rendering (generous Indian Ocean + SE Asia box).
const ARC_BBOX = { minLat: -62, maxLat: 47, minLon: 20, maxLon: 150 }
// Aircraft altitude assumption for ring computation: FL350 for the in-flight
// pings; the 7th arc is customarily drawn near sea level band as the aircraft
// was descending (ATSB uses 0-40k ft; we render the 35k ft ring and note it).
const RING_ALT_M = 35_000 * 0.3048

/**
 * Inmarsat-3F1 position at an exact epoch, cubic-Hermite interpolated from the
 * published position+velocity table (Ashton et al. Table 4, rows at rounded
 * clock times). Outside the table: nearest row extrapolated linearly with its
 * velocity. Returns metres.
 */
const satelliteAt = (sorted: EphemerisRow[], isoTime: string): Ecef => {
  if (!sorted.length) fail('satcom: empty satellite ephemeris')
  const t = Date.parse(isoTime) / 1000
  const times = sorted.map((r) => Date.parse(r.timeUtc) / 1000)

  const kmToM = (p: { x: number; y: number; z: number }): Ecef => ({
    x: p.x * 1000,
    y: p.y * 1000,
    z: p.z * 1000,
  })
  const linear = (r: EphemerisRow, dt: number): Ecef =>
    kmToM({ x: r.x + r.vx * dt, y: r.y + r.vy * dt, z: r.z + r.vz * dt })

  if (t <= times[0]) return linear(sorted[0], t - times[0])
  const lastIdx = times.length - 1
  if (t >= times[lastIdx]) return linear(sorted[lastIdx], t - times[lastIdx])

  const i1 = times.findIndex((rt) => rt >= t)
  const [r0, r1] = [sorted[i1 - 1], sorted[i1]]
  const dt = times[i1] - times[i1 - 1]
  const s = (t - times[i1 - 1]) / dt
  // Cubic Hermite basis
  const h00 = 2 * s ** 3 - 3 * s ** 2 + 1
  const h10 = s ** 3 - 2 * s ** 2 + s
  const h01 = -2 * s ** 3 + 3 * s ** 2
  const h11 = s ** 3 - s ** 2
  const interp = (p0: number, v0: number, p1: number, v1: number) =>
    h00 * p0 + h10 * dt * v0 + h01 * p1 + h11 * dt * v1
  return kmToM({
    x: interp(r0.x, r0.vx, r1.x, r1.vx),
    y: interp(r0.y, r0.vy, r1.y, r1.vy),
    z: interp(r0.z, r0.vz, r1.z, r1.vz),
  })
}

/** Split ring points into bbox-clipped line segments. */
const clipToBbox = (points: [number, number][]): [number, number][][] => {
  const inside = ([lon, lat]: [number, number]) =>
    lat >= ARC_BBOX.minLat && lat <= ARC_BBOX.maxLat && lon >= ARC_BBOX.minLon && lon <= ARC_BBOX.maxLon
  const segments: [number, number][][] = []
  for (const p of points) {
    if (!inside(p)) {
      if (segments.at(-1)?.length) segments.push([])
      continue
    }
    if (!segments.length) segments.push([])
    segments[segments.length - 1].push(p)
  }
  return segments.filter((s) => s.length >= 2)
}

const buildArcs = (satcom: SatcomJson) => {
  const { biasUs } = satcom.btoModel
  if (!Number.isFinite(biasUs)) fail('satcom: biasUs missing')
  // Published ECEF for the Perth GES (Ashton Table 2); no altitude published.
  const gesKm = satcom.gesPerth.ecefKm
  const ges: Ecef = { x: gesKm.x * 1000, y: gesKm.y * 1000, z: gesKm.z * 1000 }

  const ephemeris = [...satcom.satelliteEphemeris.rows].sort((a, b) =>
    a.timeUtc.localeCompare(b.timeUtc),
  )
  const features = satcom.handshakes
    .filter((h) => !h.excluded)
    .flatMap((h) => {
      const bto = h.btoCorrectedUs ?? fail(`handshake ${h.id}: btoCorrectedUs missing`)
      const sat = satelliteAt(ephemeris, h.timeUtcExact ?? h.timeUtc)
      const dDown = distEcef(sat, ges)
      const range = rangeFromBto(bto, biasUs, dDown)
      if (range < 36_000_000 || range > 40_000_000) {
        fail(`handshake ${h.id}: implausible aircraft-satellite range ${Math.round(range / 1000)} km`)
      }
      // 0.1 deg azimuth step ~ 70 km spacing on the ring; coordinates rounded
      // to 4 dp (~11 m), an order of magnitude below the data's precision.
      const ring = btoRing(sat, range, RING_ALT_M, 0.1).map(
        ([lon, lat]): [number, number] => [
          Math.round(lon * 10_000) / 10_000,
          Math.round(lat * 10_000) / 10_000,
        ],
      )
      const hourLabel = h.timeUtc.slice(11, 16)
      return clipToBbox(ring).map((coords) => ({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coords },
        properties: {
          id: h.id,
          label: `${h.id.toUpperCase()} ${hourLabel}Z`,
          timeUtc: h.timeUtc,
          btoUs: bto,
          bfoHz: h.bfoHz,
          altAssumptionFt: 35_000,
          confidence: 'derived',
        },
      }))
    })

  writeOut(
    'arcs.geojson.json',
    { type: 'FeatureCollection', features },
    features.length,
  )
}

// ---------------------------------------------------------------- track

const buildTrack = (track: { epoch1: TrackPoint[]; epoch2: TrackPoint[] }) => {
  const toFc = (points: TrackPoint[], epoch: number) => {
    for (const p of points) assertLatLon(p.lat, p.lon, `epoch${epoch} ${p.timeUtc}`)
    const sorted = [...points].sort((a, b) => a.timeUtc.localeCompare(b.timeUtc))
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: sorted.map((p) => [p.lon, p.lat]),
          },
          properties: {
            epoch,
            confidence: 'recorded',
            points: sorted.map((p) => ({
              t: p.timeUtc,
              alt: p.altFt,
              label: p.label ?? null,
              source: p.source,
            })),
          },
        },
      ],
    }
  }
  if (track.epoch1.length < 2) fail('epoch1: need >= 2 points')
  if (track.epoch2.length < 2) fail('epoch2: need >= 2 points')
  writeOut('flight-epoch1.geojson.json', toFc(track.epoch1, 1), 1)
  writeOut('flight-epoch2.geojson.json', toFc(track.epoch2, 2), 1)
}

// ------------------------------------------------------- reconstructions

interface Reconstruction {
  id: string
  name: string
  citation: { label: string; url: string }
  synthesizedFromParameters: boolean
  points: { timeUtc: string | null; lat: number; lon: number }[]
}

const buildReconstructions = (raw: { reconstructions: Reconstruction[] }) => {
  if (raw.reconstructions.length < 2) {
    fail('reconstructions: spec FR-5.1.3 requires >= 2 named reconstructions')
  }
  // Epoch 3 begins where recorded data ends (last primary radar 18:22:12);
  // source tables may include earlier rows that duplicate Epochs 1-2.
  const EPOCH3_START = '2014-03-07T18:22:12Z'
  const features = raw.reconstructions.map((src) => {
    // Slice from the first timestamped point inside Epoch 3: keeps un-timed
    // interior vertices (e.g. IGOGU has no published passage time) but drops
    // any leading points that belong to the recorded epochs.
    const firstIdx = src.points.findIndex(
      (p) => p.timeUtc !== null && p.timeUtc >= EPOCH3_START,
    )
    const r = {
      ...src,
      points: firstIdx === -1 ? [] : src.points.slice(firstIdx),
    }
    if (r.points.length < 2) fail(`reconstruction ${r.id}: needs >= 2 points`)
    for (const p of r.points) assertLatLon(p.lat, p.lon, `reconstruction ${r.id}`)
    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: r.points.map((p) => [p.lon, p.lat]),
      },
      properties: {
        id: r.id,
        name: r.name,
        label: `${r.name} · RECONSTRUCTION`,
        citation: r.citation,
        synthesized: r.synthesizedFromParameters,
        confidence: 'modelled',
      },
    }
  })
  writeOut('flight-epoch3.geojson.json', { type: 'FeatureCollection', features }, features.length)
}

// ---------------------------------------------------------------- debris

interface DebrisItem {
  id: string
  findDate: string
  lat: number
  lon: number
  locationName: string
  partId: string
  status: string
  discoverer: string | null
  source: string
}

const DEBRIS_STATUSES = new Set([
  'confirmed', 'almost-certain', 'highly-likely', 'likely', 'unidentifiable',
])

const buildDebris = (raw: { items: DebrisItem[] }) => {
  const features = raw.items.map((d) => {
    assertLatLon(d.lat, d.lon, `debris ${d.id}`)
    if (!DEBRIS_STATUSES.has(d.status)) fail(`debris ${d.id}: bad status "${d.status}"`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.findDate)) fail(`debris ${d.id}: bad date`)
    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [d.lon, d.lat] },
      properties: { ...d, confidence: 'recorded' },
    }
  })
  writeOut('debris.geojson.json', { type: 'FeatureCollection', features }, features.length)
}

// ---------------------------------------------------------------- search

interface Campaign {
  id: string
  name: string
  kind: string
  startDate: string
  endDate: string
  areaKm2: number | null
  operator: string
  outcome: string
  source: string
  polygon: [number, number][]
}

const CAMPAIGN_COLORS: Record<string, string> = {
  'south-china-sea-2014': '#7d8fa5',
  'malacca-andaman-2014': '#8aa58a',
  'sio-surface-initial-2014': '#9d86c9',
  'sio-surface-refined-2014': '#8f7bbd',
  'sio-surface-final-2014': '#7e6cae',
  'ocean-shield-acoustic-2014': '#6f8faf',
  'atsb-underwater-2014-2017': '#6fb7cc',
  'ocean-infinity-2018': '#c9a35b',
  'ocean-infinity-2025-26': '#c65d5d',
}

const buildSearch = (raw: { campaigns: Campaign[] }) => {
  const features = raw.campaigns.map((c) => {
    if (c.polygon.length < 4) fail(`campaign ${c.id}: polygon too small`)
    const [first, last] = [c.polygon[0], c.polygon.at(-1)]
    const closed =
      last !== undefined && first[0] === last[0] && first[1] === last[1]
        ? c.polygon
        : [...c.polygon, c.polygon[0]]
    for (const [lon, lat] of closed) assertLatLon(lat, lon, `campaign ${c.id}`)
    return {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [closed] },
      properties: {
        id: c.id,
        name: c.name,
        kind: c.kind,
        startDate: c.startDate,
        endDate: c.endDate,
        areaKm2: c.areaKm2,
        operator: c.operator,
        outcome: c.outcome,
        source: c.source,
        color: CAMPAIGN_COLORS[c.id] ?? '#9d86c9',
        confidence: 'derived',
      },
    }
  })
  writeOut('search-areas.geojson.json', { type: 'FeatureCollection', features }, features.length)
}

// ------------------------------------------------------- candidate sites

interface CandidateSite {
  id: string
  name: string
  lat: number
  lon: number
  publishedBy: string
  date: string
  citation: { label: string; url: string }
  methodology: string
  status: string
  note?: string
}

const buildCandidateSites = (raw: { sites: CandidateSite[] }) => {
  const features = raw.sites.map((s) => {
    assertLatLon(s.lat, s.lon, `site ${s.id}`)
    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
      properties: { ...s, confidence: 'modelled' },
    }
  })
  writeOut('candidate-sites.geojson.json', { type: 'FeatureCollection', features }, features.length)
}

// ---------------------------------------------------------------- pois

interface Poi {
  id: string
  name: string
  category: string
  lat: number
  lon: number
  rank: number
  oneLiner: string
  source: string
}

const buildPois = (raw: Poi[]) => {
  const features = raw.map((p) => {
    assertLatLon(p.lat, p.lon, `poi ${p.id}`)
    if (![1, 2, 3].includes(p.rank)) fail(`poi ${p.id}: rank must be 1-3`)
    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
      properties: { ...p },
    }
  })
  writeOut('pois.geojson.json', { type: 'FeatureCollection', features }, features.length)
}

// ---------------------------------------------------------------- main

const satcom = readRaw<SatcomJson>('satcom.json')
if (satcom) buildArcs(satcom)

const track = readRaw<{ epoch1: TrackPoint[]; epoch2: TrackPoint[] }>('flight-track.json')
if (track) buildTrack(track)

const recon = readRaw<{ reconstructions: Reconstruction[] }>('reconstructions.json')
if (recon) buildReconstructions(recon)

const debris = readRaw<{ items: DebrisItem[] }>('debris.json')
if (debris) buildDebris(debris)

const search = readRaw<{ campaigns: Campaign[] }>('search-areas.json')
if (search) buildSearch(search)

const pois = readRaw<Poi[]>('pois.json')
if (pois) buildPois(pois)

const sites = readRaw<{ sites: CandidateSite[] }>('candidate-sites.json')
if (sites) buildCandidateSites(sites)

writeFileSync(
  join(outDir, 'manifest.json'),
  JSON.stringify({ generated: new Date().toISOString(), inputs: 'data/*.json' }, null, 2),
)
console.log('done')
