// The single data entity. Every clickable feature on the globe is a DataPoint:
// a Zod discriminated union on `kind`. build-data.ts validates its generated
// GeoJSON against this schema (fails the build on drift) and the app parses the
// same static JSON back into these types at load. One shape, both ends.
//
// Pure: this module imports zod only (no *.geojson.json), so build-data.ts can
// import the schema without pulling in the generated output it is about to
// (re)write. Typed collections + lookups live in ./collections.ts.

import { z } from 'zod'

const Citation = z.object({ label: z.string(), url: z.string() })

// Explicit epistemic caveat. Replaces the old prose-scanning regexes: a badge is
// now driven by this typed field, never by words found in a description.
export const Caveat = z.enum(['contested', 'disputed', 'uncorroborated', 'model-dependent'])
export type Caveat = z.infer<typeof Caveat>

const DebrisStatus = z.enum([
  'confirmed',
  'almost-certain',
  'highly-likely',
  'likely',
  'unidentifiable',
])
export type DebrisStatus = z.infer<typeof DebrisStatus>

const SiteStatus = z.enum([
  'searched-2014-2017',
  'searched-2018',
  'partially-searched',
  'unsearched',
  'being-searched-2025-26',
])

const CampaignKind = z.enum(['underwater', 'surface', 'proposed'])
export type CampaignKind = z.infer<typeof CampaignKind>

// A recorded/interpolated vertex on an epoch track (embedded for provenance).
const TrackVertex = z.object({
  t: z.string(),
  alt: z.number().nullable(),
  label: z.string().nullable(),
  source: z.string(),
})

const Poi = z.object({
  kind: z.literal('poi'),
  id: z.string(),
  name: z.string(),
  category: z.enum(['airport', 'waypoint', 'event', 'region', 'station', 'satellite']),
  rank: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  oneLiner: z.string(),
  source: z.string(),
  short: z.string().optional(),
  plain: z.string().optional(),
  caveat: Caveat.optional(),
})

const Debris = z.object({
  kind: z.literal('debris'),
  id: z.string(),
  partId: z.string(),
  findDate: z.string(),
  locationName: z.string(),
  status: DebrisStatus,
  discoverer: z.string().nullable(),
  examiner: z.string().nullable().optional(),
  source: z.string(),
  significance: z.string().optional(),
  desc: z.string(),
  confidence: z.literal('recorded'),
})

const Arc = z.object({
  kind: z.literal('arc'),
  id: z.string(),
  label: z.string(),
  name: z.string(),
  desc: z.string(),
  timeUtc: z.string(),
  btoUs: z.number(),
  bfoHz: z.number().nullable(),
  altAssumptionFt: z.number(),
  confidence: z.literal('derived'),
})

const Aux = z.object({
  kind: z.literal('aux'),
  id: z.string(),
  label: z.string(),
  name: z.string(),
  plain: z.string().optional(),
  timeUtc: z.string(),
  messageType: z.string(),
  btoUs: z.number().nullable(),
  bfoHz: z.number().nullable(),
  definesRing: z.boolean(),
  reason: z.string(),
  citation: Citation,
  desc: z.string(),
  confidence: z.literal('modelled'),
})

const Search = z.object({
  kind: z.literal('search'),
  id: z.string(),
  name: z.string(),
  campaignKind: CampaignKind,
  startDate: z.string(),
  endDate: z.string(),
  areaKm2: z.number().nullable(),
  operator: z.string(),
  outcome: z.string(),
  source: z.string(),
  color: z.string(),
  confidence: z.literal('derived'),
})

const Site = z.object({
  kind: z.literal('site'),
  id: z.string(),
  name: z.string(),
  publishedBy: z.string(),
  date: z.string(),
  citation: Citation,
  methodology: z.string(),
  status: SiteStatus,
  note: z.string().optional(),
  caveat: Caveat.optional(),
  confidence: z.literal('modelled'),
})

// Epoch 1 and 2 share a shape and differ only by the discriminant + `epoch`.
const epochTrack = <K extends 'epoch1' | 'epoch2', E extends 1 | 2>(kind: K, epoch: E) =>
  z.object({
    kind: z.literal(kind),
    id: z.string(),
    epoch: z.literal(epoch),
    name: z.string(),
    desc: z.string(),
    citation: Citation,
    timeStart: z.string(),
    timeEnd: z.string(),
    pointCount: z.number(),
    interpolatedCount: z.number(),
    points: z.array(TrackVertex),
    confidence: z.literal('recorded'),
  })

const Epoch1 = epochTrack('epoch1', 1)
const Epoch2 = epochTrack('epoch2', 2)

const Epoch3 = z.object({
  kind: z.literal('epoch3'),
  id: z.string(),
  name: z.string(),
  label: z.string(),
  desc: z.string(),
  citation: Citation,
  synthesized: z.boolean(),
  color: z.string(),
  contested: z.boolean(),
  caveat: Caveat.optional(),
  confidence: z.literal('modelled'),
})

export const DataPointSchema = z.discriminatedUnion('kind', [
  Poi,
  Debris,
  Arc,
  Aux,
  Search,
  Site,
  Epoch1,
  Epoch2,
  Epoch3,
])

export type DataPoint = z.infer<typeof DataPointSchema>
export type FeatureKind = DataPoint['kind']

// Per-kind narrowed types, for helpers that take one variant.
export type PoiPoint = z.infer<typeof Poi>
export type DebrisPoint = z.infer<typeof Debris>
export type ArcPoint = z.infer<typeof Arc>
export type AuxPoint = z.infer<typeof Aux>
export type SearchPoint = z.infer<typeof Search>
export type SitePoint = z.infer<typeof Site>
export type EpochPoint = z.infer<typeof Epoch1> | z.infer<typeof Epoch2>
export type ReconstructionPoint = z.infer<typeof Epoch3>

// Single source of truth for the kind set (replaces the hand-lists that used to
// live in selection.ts and url.ts). Derived straight from the union.
export const DATA_POINT_KINDS: FeatureKind[] = DataPointSchema.options.map((o) => o.shape.kind.value)

/** Parse untyped feature properties (static JSON / MapLibre) into a DataPoint. */
export const parseDataPoint = (props: unknown): DataPoint => DataPointSchema.parse(props)

/** Non-throwing variant for defensive boundaries (deep-link restore). */
export const safeParseDataPoint = (props: unknown): DataPoint | null => {
  const r = DataPointSchema.safeParse(props)
  return r.success ? r.data : null
}
