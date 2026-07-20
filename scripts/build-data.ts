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
import { DataPointSchema, ArcFitSchema } from '../src/data/data-point.ts'
import type { ZodType } from 'zod'

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

interface AuxConstraint {
  id: string
  label: string
  name: string
  plain?: string
  timeUtc: string
  timeUtcExact?: string
  messageType: string
  btoRawUs: number | null
  btoCorrectedUs: number | null
  bfoHz: number | null
  definesRing: boolean
  captioCrossing?: { lat: number; lon: number }
  reasonNotUsedOfficially: string
}

interface SatcomJson {
  meta: { sources: { label: string; url: string }[] }
  gesPerth: { lat: number; lon: number; ecefKm: { x: number; y: number; z: number } }
  btoModel: { biasUs: number; logonCorrectionUs: number }
  satelliteEphemeris: { rows: EphemerisRow[] }
  handshakes: RawHandshake[]
  auxiliaryConstraints?: { description: string; sources: string[]; items: AuxConstraint[] }
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

// Write a FeatureCollection, validating every feature's properties against the
// shared DataPoint schema first. A shape/enum/rename drift throws here and fails
// the build - the same schema the app parses these files back with at load.
const writeOut = (
  name: string,
  features: { properties: unknown }[],
  schema: ZodType = DataPointSchema,
) => {
  features.forEach((f, i) => {
    const r = schema.safeParse(f.properties)
    if (!r.success) fail(`${name} feature ${i}: ${r.error.issues.map((x) => `${x.path.join('.')} ${x.message}`).join('; ')}`)
  })
  writeFileSync(join(outDir, name), JSON.stringify({ type: 'FeatureCollection', features }))
  console.log(`✓ src/data/${name} (${features.length} features)`)
}

// UTC ISO -> Kuala Lumpur local "HH:MM" (MYT = UTC+8). Times shown to users are
// local; only the raw source keeps UTC.
const localHM = (iso: string): string => {
  const d = new Date(Date.parse(iso) + 8 * 3600_000)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`
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

// All times shown to users are Kuala Lumpur local (MYT = UTC+8); the flight ran
// the morning of 8 March 2014 local. Raw UTC is kept only in the source data.
const ARC_NAMES: Record<string, { name: string; desc: string }> = {
  hs1: {
    name: 'Handshake 1 · 02:25 (UTC+8) log-on ring',
    desc: 'The SATCOM terminal logged back on at 02:25:27 (UTC+8), three minutes after the last radar fix. First of the seven timing rings.',
  },
  hs2: {
    name: 'Handshake 2 · 03:41 (UTC+8) ring',
    desc: 'Hourly ground-station interrogation. The smallest of the seven rings: the aircraft was closest to the satellite around this time.',
  },
  hs3: { name: 'Handshake 3 · 04:41 (UTC+8) ring', desc: 'Hourly ground-station interrogation.' },
  hs4: { name: 'Handshake 4 · 05:41 (UTC+8) ring', desc: 'Hourly ground-station interrogation.' },
  hs5: { name: 'Handshake 5 · 06:41 (UTC+8) ring', desc: 'Hourly ground-station interrogation.' },
  hs6: { name: 'Handshake 6 · 08:11 (UTC+8) ring', desc: 'The last routine hourly interrogation.' },
  hs7: {
    name: '7th arc · 08:19 (UTC+8) final log-on',
    desc: 'The final, incomplete log-on at 08:19:29 (UTC+8), consistent with restart after fuel exhaustion. Every underwater search has followed this ring.',
  },
}

// The whole ring is a locus; the aircraft sat at one point on it. BFO resolved
// the southern hemisphere, and the published southern-route reconstructions,
// each independently forced to satisfy every BTO/BFO measurement, pin WHERE on
// each ring the aircraft was at that handshake's clock time. Their spread is the
// honest along-track uncertainty: wide right after the turn south, narrowing to
// a tight band on the 7th arc. The contested WSPR/GDTAAA track is excluded so a
// disputed path never widens the "likely position" band.
const FIT_RECON_IDS = ['ashton-2015', 'ugib-2020', 'captio-2022']
// Ring padding each side of the reconstruction spread (0.1 deg azimuth per step,
// so ~0.8 deg total visual margin), just enough to keep a tight cluster legible
// without materially overstating the reported convergence band.
const FIT_PAD_STEPS = 4

const r4 = (n: number) => Math.round(n * 10_000) / 10_000

interface TimedPoint {
  t: number
  lat: number
  lon: number
}

// A reconstruction's timed vertices, parsed + sorted once (reused across every
// handshake) so posAtTime does no per-call parsing or sorting.
const toTimed = (points: { timeUtc: string | null; lat: number; lon: number }[]): TimedPoint[] =>
  points
    .filter((p) => p.timeUtc !== null)
    .map((p) => ({ t: Date.parse(p.timeUtc ?? ''), lat: p.lat, lon: p.lon }))
    .sort((a, b) => a.t - b.t)

// Aircraft position at an epoch, linearly interpolated along a timed
// reconstruction polyline. Null if the epoch is outside the covered interval.
const posAtTime = (timed: TimedPoint[], isoTime: string): [number, number] | null => {
  if (timed.length < 2) return null
  // Reconstruction points are tabulated to whole seconds at the nominal handshake
  // times; a 2 s boundary tolerance absorbs sub-second rounding (00:19:29 vs a
  // 00:19:29.416 epoch) without ever clamping to a point the track never reached.
  const TOL_MS = 2_000
  const raw = Date.parse(isoTime)
  if (raw < timed[0].t - TOL_MS || raw > timed[timed.length - 1].t + TOL_MS) return null
  const t = Math.min(Math.max(raw, timed[0].t), timed[timed.length - 1].t)
  const i = timed.findIndex((p) => p.t >= t)
  const b = timed[i]
  if (i === 0 || b.t === t) return [b.lon, b.lat]
  const a = timed[i - 1]
  const s = (t - a.t) / (b.t - a.t)
  return [a.lon + (b.lon - a.lon) * s, a.lat + (b.lat - a.lat) * s]
}

// Index of the ring vertex nearest a point (equirectangular metric; the ring is
// dense enough that vertex snapping stays well below the display precision). One
// distance evaluation per vertex.
const nearestRingIndex = (ring: [number, number][], [lon, lat]: [number, number]): number => {
  const cos = Math.cos((lat * Math.PI) / 180)
  const d2 = ([rlon, rlat]: [number, number]) => ((rlon - lon) * cos) ** 2 + (rlat - lat) ** 2
  return ring.reduce(
    (best, p, i) => {
      const d = d2(p)
      return d < best.d ? { i, d } : best
    },
    { i: 0, d: d2(ring[0]) },
  ).i
}

const hemi = (lat: number) => `${Math.abs(lat).toFixed(1)}°${lat < 0 ? 'S' : 'N'}`

const buildArcs = (satcom: SatcomJson, reconstructions: Reconstruction[]) => {
  const { biasUs } = satcom.btoModel
  if (!Number.isFinite(biasUs)) fail('satcom: biasUs missing')
  // Published ECEF for the Perth GES (Ashton Table 2); no altitude published.
  const gesKm = satcom.gesPerth.ecefKm
  const ges: Ecef = { x: gesKm.x * 1000, y: gesKm.y * 1000, z: gesKm.z * 1000 }

  const ephemeris = [...satcom.satelliteEphemeris.rows].sort((a, b) =>
    a.timeUtc.localeCompare(b.timeUtc),
  )
  const fitRecons = reconstructions
    .filter((r) => FIT_RECON_IDS.includes(r.id))
    .map((r) => ({ id: r.id, timed: toTimed(r.points) }))
  // Reconstructions present but none matched the hardcoded id list -> drift; fail
  // loudly rather than silently emit an empty arc-fit.geojson. (An entirely
  // absent reconstructions.json is a separate, already-warned missing input.)
  if (reconstructions.length && !fitRecons.length) {
    fail(`arc-fit: none of FIT_RECON_IDS [${FIT_RECON_IDS.join(', ')}] match the ${reconstructions.length} reconstructions - id drift?`)
  }

  const built = satcom.handshakes
    .filter((h) => !h.excluded)
    .map((h) => {
      const bto = h.btoCorrectedUs ?? fail(`handshake ${h.id}: btoCorrectedUs missing`)
      const time = h.timeUtcExact ?? h.timeUtc
      const sat = satelliteAt(ephemeris, time)
      const dDown = distEcef(sat, ges)
      const range = rangeFromBto(bto, biasUs, dDown)
      if (range < 36_000_000 || range > 40_000_000) {
        fail(`handshake ${h.id}: implausible aircraft-satellite range ${Math.round(range / 1000)} km`)
      }
      // 0.1 deg azimuth step ~ 70 km spacing on the ring; coordinates rounded
      // to 4 dp (~11 m), an order of magnitude below the data's precision.
      const ring = btoRing(sat, range, RING_ALT_M, 0.1).map(
        ([lon, lat]): [number, number] => [r4(lon), r4(lat)],
      )
      const hourLabel = localHM(h.timeUtc)
      const arcs = clipToBbox(ring).map((coords) => ({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coords },
        properties: {
          kind: 'arc',
          id: h.id,
          label: `${h.id.toUpperCase()} ${hourLabel} (UTC+8)`,
          name: ARC_NAMES[h.id]?.name ?? `Handshake ${h.id}`,
          desc: ARC_NAMES[h.id]?.desc ?? '',
          timeUtc: h.timeUtc,
          btoUs: bto,
          bfoHz: h.bfoHz,
          altAssumptionFt: 35_000,
          confidence: 'derived',
        },
      }))

      // Bolder "likely position" sub-segment: where the credible southern-route
      // reconstructions place the aircraft on this ring at this clock time.
      // Anchor on the nominal handshake second (reconstruction tables are keyed
      // to it), not the sub-second exact epoch used for the ring geometry.
      const hits = fitRecons
        .map((r) => ({ id: r.id, pos: posAtTime(r.timed, h.timeUtc) }))
        .filter((x) => x.pos !== null)
      // A fit reconstruction set exists but none covers this handshake time ->
      // coverage gap/drift; fail loudly instead of dropping the ring's band.
      if (fitRecons.length && !hits.length) {
        fail(`arc-fit ${h.id}: no fit reconstruction covers ${h.timeUtc}`)
      }
      const anchors = hits.map((x) => x.pos ?? [0, 0])
      const idxs = anchors.map((p) => nearestRingIndex(ring, p))
      const lats = anchors.map((p) => p[1]).sort((a, b) => a - b)
      const [latLo, latHi] = [lats[0], lats[lats.length - 1]]
      const fits = idxs.length
        ? clipToBbox(
            ring.slice(
              Math.max(0, Math.min(...idxs) - FIT_PAD_STEPS),
              Math.min(ring.length, Math.max(...idxs) + FIT_PAD_STEPS + 1),
            ),
          ).map((coords) => ({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: coords },
            properties: {
              kind: 'arc-fit',
              id: `${h.id}-fit`,
              refId: h.id,
              label: `${h.id.toUpperCase()} ${hourLabel} (UTC+8) · likely position`,
              name: `${ARC_NAMES[h.id]?.name ?? h.id}: likely aircraft position`,
              desc:
                `The credible southern-route reconstructions (${hits.map((x) => x.id).join(', ')}) ` +
                `converge on ~${hemi(latLo)} to ${hemi(latHi)} on the ${hourLabel} (UTC+8) ring; ` +
                `the bold stretch marks that likely aircraft position (drawn with a small margin ` +
                `for legibility). The band tightens toward the 7th arc as the along-track solution firms up.`,
              timeUtc: h.timeUtc,
              latBand: [r4(latLo), r4(latHi)],
              reconIds: hits.map((x) => x.id),
              confidence: 'derived',
            },
          }))
        : []
      return { arcs, fits }
    })

  writeOut('arcs.geojson.json', built.flatMap((b) => b.arcs))
  writeOut('arc-fit.geojson.json', built.flatMap((b) => b.fits), ArcFitSchema)
}

// ---------------------------------------------------- auxiliary arcs (CAPTIO)

// The extra Inmarsat distance ring(s) CAPTIO uses beyond the official 7 arcs.
// Each defines a BTO ring (LineString), drawn in a distinct colour so it never
// reads as an official arc. BFO-only signals (the unanswered phone calls) are
// not rendered: they fix only direction, not a position, so they would show as
// misleading point markers - they live in the timeline instead.
const buildAuxArcs = (satcom: SatcomJson) => {
  const aux = satcom.auxiliaryConstraints
  if (!aux?.items?.length) {
    console.warn('! satcom.auxiliaryConstraints missing, skipping aux-arcs')
    return
  }
  const { biasUs } = satcom.btoModel
  const gesKm = satcom.gesPerth.ecefKm
  const ges: Ecef = { x: gesKm.x * 1000, y: gesKm.y * 1000, z: gesKm.z * 1000 }
  const ephemeris = [...satcom.satelliteEphemeris.rows].sort((a, b) =>
    a.timeUtc.localeCompare(b.timeUtc),
  )

  // Only distance-ring constraints are rendered; BFO-only calls are excluded
  // upstream (data/satcom.json). Fail loudly if a non-ring item reappears.
  const features = aux.items.flatMap((c) => {
    if (!c.definesRing) fail(`aux ${c.id}: BFO-only constraints are no longer rendered`)
    const base = {
      kind: 'aux',
      id: c.id,
      label: c.label,
      name: c.name,
      plain: c.plain,
      timeUtc: c.timeUtc,
      messageType: c.messageType,
      btoUs: c.btoCorrectedUs,
      bfoHz: c.bfoHz,
      definesRing: c.definesRing,
      reason: c.reasonNotUsedOfficially,
      citation: {
        label: 'Blelly & Marchand (CAPTIO), Table 10; released Inmarsat log (davetaz CSV)',
        url: 'https://www.mh370-caption.net/index.php/caption-technical-documentation/',
      },
      confidence: 'modelled',
      desc: c.reasonNotUsedOfficially,
    }
    const bto = c.btoCorrectedUs ?? fail(`aux ${c.id}: btoCorrectedUs missing for a ring`)
    const sat = satelliteAt(ephemeris, c.timeUtcExact ?? c.timeUtc)
    const range = rangeFromBto(bto, biasUs, distEcef(sat, ges))
    if (range < 36_000_000 || range > 40_000_000) {
      fail(`aux ${c.id}: implausible range ${Math.round(range / 1000)} km`)
    }
    const ring = btoRing(sat, range, RING_ALT_M, 0.1).map(
      ([lon, lat]): [number, number] => [
        Math.round(lon * 10_000) / 10_000,
        Math.round(lat * 10_000) / 10_000,
      ],
    )
    return clipToBbox(ring).map((coords) => ({
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: coords },
      properties: base,
    }))
  })

  writeOut('aux-arcs.geojson.json', features)
}

// ---------------------------------------------------------------- track

const buildTrack = (track: { epoch1: TrackPoint[]; epoch2: TrackPoint[] }) => {
  // Display-grade epoch metadata: the tooltip and Detail Panel render these
  // properties directly, so they must read like evidence, not like ids.
  interface EpochMeta {
    name: string
    desc: string
    citation: { label: string; url: string }
  }
  const EPOCH_META: Record<1 | 2, EpochMeta> = {
    1: {
      name: 'Epoch 1 · Recorded flight path (ADS-B)',
      desc:
        'Civil secondary-radar/ADS-B positions from takeoff at Kuala Lumpur (00:42 UTC+8) ' +
        'to the final transponder return near waypoint IGARI (01:21:13 UTC+8). ' +
        'Compiled from report-quoted positions and the filed route; the authoritative ' +
        'track is in the SIR 2018 / Factual Information 2015 appendix figures.',
      citation: {
        label: 'Malaysian Safety Investigation Report (2018); Factual Information (2015)',
        url: 'https://www.mot.gov.my/en/MH370%20Investigation%20Report/01-Report/MH370SafetyInvestigationReport.pdf',
      },
    },
    2: {
      name: 'Epoch 2 · Military radar path',
      desc:
        'Primary (military) radar track: the turnback at IGARI, recrossing the Malay ' +
        'peninsula near Kota Bharu, passing south of Penang, then northwest up the ' +
        'Strait of Malacca to the last fix 10 NM past waypoint MEKAR at 02:22:12 UTC+8. ' +
        'Recorded but lower precision; no transponder was operating.',
      citation: {
        label: 'Malaysian SIR (2018); ATSB Definition of Underwater Search Areas',
        url: 'https://www.atsb.gov.au/mh370-pages/updates/reports',
      },
    },
  }

  const toFeatures = (points: TrackPoint[], epoch: 1 | 2) => {
    for (const p of points) assertLatLon(p.lat, p.lon, `epoch${epoch} ${p.timeUtc}`)
    const sorted = [...points].sort((a, b) => a.timeUtc.localeCompare(b.timeUtc))
    const interpolated = sorted.filter((p) => p.source === 'interpolated').length
    const meta = EPOCH_META[epoch]
    return [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: sorted.map((p) => [p.lon, p.lat]),
        },
        properties: {
          kind: `epoch${epoch}`,
          id: `epoch${epoch}`,
          epoch,
          name: meta.name,
          desc: meta.desc,
          citation: meta.citation,
          confidence: 'recorded',
          timeStart: sorted[0].timeUtc,
          timeEnd: sorted[sorted.length - 1].timeUtc,
          pointCount: sorted.length,
          interpolatedCount: interpolated,
          points: sorted.map((p) => ({
            t: p.timeUtc,
            alt: p.altFt,
            label: p.label ?? null,
            source: p.source,
          })),
        },
      },
    ]
  }
  if (track.epoch1.length < 2) fail('epoch1: need >= 2 points')
  if (track.epoch2.length < 2) fail('epoch2: need >= 2 points')
  writeOut('flight-epoch1.geojson.json', toFeatures(track.epoch1, 1))
  writeOut('flight-epoch2.geojson.json', toFeatures(track.epoch2, 2))
}

// ------------------------------------------------------- reconstructions

interface Reconstruction {
  id: string
  name: string
  citation: { label: string; url: string }
  synthesizedFromParameters: boolean
  points: { timeUtc: string | null; lat: number; lon: number }[]
}

// Per-reconstruction colour + contested flag: the four candidate routes were
// previously indistinguishable (one violet for all), which read as
// "unaligned". Each hypothesis now gets a distinct hue; the contested WSPR
// track is flagged so the UI can render it more faintly.
const RECON_STYLE: Record<string, { color: string; contested: boolean }> = {
  'ashton-2015': { color: '#9d86c9', contested: false }, // violet - Inmarsat example
  'ugib-2020': { color: '#5fb0d0', contested: false }, // cyan - independent group best-fit
  'captio-2022': { color: '#e0996b', contested: false }, // sand - piloted-ditching
  'wspr-gdtaaa-2023': { color: '#c77dae', contested: true }, // magenta - contested WSPR
}

// Last primary-radar fix (18:22:12, end of Epoch 2) as [lon, lat] - the shared
// origin all Epoch-3 reconstructions continue from.
const LAST_RADAR_FIX: [number, number] = [96.340864, 6.577655]

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
    // Anchor every reconstruction to the shared last primary-radar fix
    // (18:22:12, end of Epoch 2) so all four visibly continue from the one
    // known last position instead of fanning out from scattered first points.
    // Skip when the first vertex is already essentially at the fix (UGIB).
    const coords = r.points.map((p): [number, number] => [p.lon, p.lat])
    const [flon, flat] = coords[0]
    const atFix =
      Math.abs(flon - LAST_RADAR_FIX[0]) < 0.05 && Math.abs(flat - LAST_RADAR_FIX[1]) < 0.05
    const anchored = atFix ? coords : [LAST_RADAR_FIX, ...coords]
    return {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: anchored,
      },
      properties: {
        kind: 'epoch3',
        id: r.id,
        name: r.name,
        label: `${r.name} · RECONSTRUCTION`,
        desc:
          `Published candidate route for the SATCOM-only final hours (02:22-08:19 UTC+8), ` +
          `${r.points.length} path points ending at or near the 7th arc. A model claimed ` +
          `consistent with the satellite data by its authors, not a recorded track.`,
        citation: r.citation,
        synthesized: r.synthesizedFromParameters,
        color: RECON_STYLE[r.id]?.color ?? '#9d86c9',
        contested: RECON_STYLE[r.id]?.contested ?? false,
        confidence: 'modelled',
      },
    }
  })
  writeOut('flight-epoch3.geojson.json', features)
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
  examiner?: string
  source: string
  /** Why this piece matters to the investigation (optional, display-grade). */
  significance?: string
}

const DEBRIS_STATUSES = new Set([
  'confirmed', 'almost-certain', 'highly-likely', 'likely', 'unidentifiable',
])

const buildDebris = (raw: { items: DebrisItem[] }) => {
  const features = raw.items.map((d) => {
    assertLatLon(d.lat, d.lon, `debris ${d.id}`)
    if (!DEBRIS_STATUSES.has(d.status)) fail(`debris ${d.id}: bad status "${d.status}"`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.findDate)) fail(`debris ${d.id}: bad date`)
    const statusText = d.status.replace('-', ' ')
    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [d.lon, d.lat] },
      properties: {
        kind: 'debris',
        id: d.id,
        partId: d.partId,
        findDate: d.findDate,
        locationName: d.locationName,
        status: d.status,
        discoverer: d.discoverer,
        examiner: d.examiner,
        source: d.source,
        significance: d.significance,
        desc:
          `${d.partId}, found ${d.findDate} at ${d.locationName}` +
          `${d.discoverer ? ` by ${d.discoverer}` : ''}. ` +
          `Official identification status: ${statusText}.` +
          `${d.significance ? ` ${d.significance}` : ''}`,
        confidence: 'recorded',
      },
    }
  })
  writeOut('debris.geojson.json', features)
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
  // Same sand hue as the CAPTIO reconstruction line, visually linking the
  // hypothesis to the search zone its authors propose.
  'captio-blelly-marchand-proposed': '#e0996b',
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
        kind: 'search',
        id: c.id,
        name: c.name,
        campaignKind: c.kind,
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
  writeOut('search-areas.geojson.json', features)
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
  caveat?: string
}

const buildCandidateSites = (raw: { sites: CandidateSite[] }) => {
  const features = raw.sites.map((s) => {
    assertLatLon(s.lat, s.lon, `site ${s.id}`)
    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
      properties: {
        kind: 'site',
        id: s.id,
        name: s.name,
        publishedBy: s.publishedBy,
        date: s.date,
        citation: s.citation,
        methodology: s.methodology,
        status: s.status,
        note: s.note,
        caveat: s.caveat,
        confidence: 'modelled',
      },
    }
  })
  writeOut('candidate-sites.geojson.json', features)
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
  short?: string
  plain?: string
  caveat?: string
}

const buildPois = (raw: Poi[]) => {
  const features = raw.map((p) => {
    assertLatLon(p.lat, p.lon, `poi ${p.id}`)
    if (![1, 2, 3].includes(p.rank)) fail(`poi ${p.id}: rank must be 1-3`)
    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
      properties: {
        kind: 'poi',
        id: p.id,
        name: p.name,
        category: p.category,
        rank: p.rank,
        oneLiner: p.oneLiner,
        source: p.source,
        short: p.short,
        plain: p.plain,
        caveat: p.caveat,
      },
    }
  })
  writeOut('pois.geojson.json', features)
}

// ------------------------------------------------------------------ media

interface MediaItem {
  id: string
  kind: string
  title: string
  featureIds: string[]
  directUrl: string | null
  embedUrl: string | null
  pageUrl: string | null
  mimeType: string | null
  durationS: number | null
  publisher: string
  license: string
  verified: string
  notes: string
}

const MEDIA_KINDS = new Set(['audio', 'video', 'image'])

/**
 * Validate the media manifest against the known feature ids and pass it
 * through (FR-8.4.1: manifest ships with the app; payloads load on demand).
 */
const buildMedia = (
  raw: { meta: unknown; items: MediaItem[] },
  knownFeatureIds: Set<string>,
) => {
  // Locally-mirrored payloads live under public/media/ and are served at
  // /media/... so assert every such file actually exists: a renamed or
  // missing asset fails the build instead of shipping a dead local link.
  const publicDir = join(root, 'public')
  for (const m of raw.items) {
    if (!MEDIA_KINDS.has(m.kind)) fail(`media ${m.id}: bad kind "${m.kind}"`)
    if (!m.directUrl && !m.embedUrl && !m.pageUrl) fail(`media ${m.id}: no URL at all`)
    if (!m.license) fail(`media ${m.id}: license missing`)
    if (!m.featureIds.length) fail(`media ${m.id}: no featureIds`)
    if (m.directUrl?.startsWith('/') && !existsSync(join(publicDir, m.directUrl))) {
      fail(`media ${m.id}: local file ${m.directUrl} missing from public/`)
    }
    for (const fid of m.featureIds) {
      if (!knownFeatureIds.has(fid)) fail(`media ${m.id}: unknown featureId "${fid}"`)
    }
  }
  const ids = raw.items.map((m) => m.id)
  if (new Set(ids).size !== ids.length) fail('media: duplicate item ids')
  writeFileSync(join(outDir, 'media.manifest.json'), JSON.stringify(raw))
  console.log(`✓ src/data/media.manifest.json (${raw.items.length} items)`)
}

// ---------------------------------------------------------------- main

const recon = readRaw<{ reconstructions: Reconstruction[] }>('reconstructions.json')

const satcom = readRaw<SatcomJson>('satcom.json')
if (satcom) {
  buildArcs(satcom, recon?.reconstructions ?? [])
  buildAuxArcs(satcom)
}

const track = readRaw<{ epoch1: TrackPoint[]; epoch2: TrackPoint[] }>('flight-track.json')
if (track) buildTrack(track)

if (recon) buildReconstructions(recon)

const debris = readRaw<{ items: DebrisItem[] }>('debris.json')
if (debris) buildDebris(debris)

const search = readRaw<{ campaigns: Campaign[] }>('search-areas.json')
if (search) buildSearch(search)

const pois = readRaw<Poi[]>('pois.json')
if (pois) buildPois(pois)

const sites = readRaw<{ sites: CandidateSite[] }>('candidate-sites.json')
if (sites) buildCandidateSites(sites)

const media = readRaw<{ meta: unknown; items: MediaItem[] }>('media.json')
if (media) {
  const knownFeatureIds = new Set([
    ...(pois ?? []).map((p) => p.id),
    ...(debris?.items ?? []).map((d) => d.id),
    ...(search?.campaigns ?? []).map((c) => c.id),
    ...(sites?.sites ?? []).map((s) => s.id),
    ...(satcom?.handshakes ?? []).map((h) => h.id),
    ...(recon?.reconstructions ?? []).map((r) => r.id),
    'epoch1',
    'epoch2',
  ])
  buildMedia(media, knownFeatureIds)
}

writeFileSync(
  join(outDir, 'manifest.json'),
  JSON.stringify({ generated: new Date().toISOString(), inputs: 'data/*.json' }, null, 2),
)
console.log('done')
