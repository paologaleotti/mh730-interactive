// Detail Panel + hover presentation, derived from the typed DataPoint via
// ts-pattern. Replaces the old KIND_META / KIND_ROWS tables and the stringly
// title/lead/hover logic that read an untyped property bag.

import { match } from 'ts-pattern'
import type { Confidence } from '../config/layers'
import type { DataPoint } from '../data/data-point'
import { fmtDate, fmtLocalMYTFull } from './format'

/** Kind heading shown above the feature title. */
export const kindTitle = (point: DataPoint): string =>
  match(point)
    .with({ kind: 'poi' }, () => 'POINT OF INTEREST')
    .with({ kind: 'debris' }, () => 'RECOVERED DEBRIS')
    .with({ kind: 'arc' }, () => 'SATELLITE TIMING RING')
    .with({ kind: 'aux' }, () => 'EXTRA INMARSAT CONSTRAINT (CAPTIO)')
    .with({ kind: 'search' }, () => 'SEARCH CAMPAIGN')
    .with({ kind: 'site' }, () => 'CANDIDATE CRASH SITE')
    .with({ kind: 'epoch1' }, () => 'FLIGHT PATH · EPOCH 1')
    .with({ kind: 'epoch2' }, () => 'FLIGHT PATH · EPOCH 2')
    .with({ kind: 'epoch3' }, () => 'CANDIDATE RECONSTRUCTION')
    .exhaustive()

/** The feature's own title (debris has no name, only a part id). */
export const titleFor = (point: DataPoint): string =>
  match(point)
    .with({ kind: 'debris' }, (p) => p.partId)
    .otherwise((p) => p.name)

/** Displayed epistemic status: the point's own confidence, or the kind default;
    a POI carrying a caveat must not read as RECORDED. */
export const confidenceFor = (point: DataPoint): Confidence =>
  match(point)
    .with({ kind: 'poi' }, (p) => (p.caveat ? 'modelled' : 'recorded'))
    .otherwise((p) => p.confidence)

/** Plain-language lead (for non-experts) and the technical detail below it.
    When there is no plain text, the technical narrative becomes the lead. */
export const bodyText = (point: DataPoint): { lead: string | null; detail: string | null } => {
  const plain = match(point)
    .with({ kind: 'poi' }, { kind: 'aux' }, (p) => p.plain ?? null)
    .otherwise(() => null)
  const technical = match(point)
    .with({ kind: 'poi' }, (p) => p.oneLiner)
    .with(
      { kind: 'debris' },
      { kind: 'arc' },
      { kind: 'aux' },
      { kind: 'epoch1' },
      { kind: 'epoch2' },
      { kind: 'epoch3' },
      (p) => p.desc,
    )
    .with({ kind: 'search' }, { kind: 'site' }, () => null)
    .exhaustive()
  return { lead: plain ?? technical, detail: plain ? technical : null }
}

export type Row = [label: string, value: string | number | null]

/** Structured key/value rows for the panel body, typed per variant. */
export const rowsFor = (point: DataPoint): Row[] =>
  match(point)
    .with({ kind: 'debris' }, (p): Row[] => [
      ['PART', p.partId],
      ['FOUND', p.findDate],
      ['LOCATION', p.locationName],
      ['DISCOVERER', p.discoverer],
      ['EXAMINER', p.examiner ?? null],
    ])
    .with({ kind: 'arc' }, (p): Row[] => [
      ['BTO (μs)', p.btoUs],
      ['BFO (Hz)', p.bfoHz],
      ['ALT ASSUMED (ft)', p.altAssumptionFt],
    ])
    .with({ kind: 'aux' }, (p): Row[] => [
      ['MESSAGE', p.messageType],
      ['BTO (μs)', p.btoUs],
      ['BFO (Hz)', p.bfoHz],
    ])
    .with({ kind: 'search' }, (p): Row[] => [
      ['OPERATOR', p.operator],
      ['TYPE', p.campaignKind],
      ['START', p.startDate],
      ['END', p.endDate],
      ['AREA (km²)', p.areaKm2],
      ['OUTCOME', p.outcome],
    ])
    .with({ kind: 'site' }, (p): Row[] => [
      ['PUBLISHED BY', p.publishedBy],
      ['DATE', p.date],
      ['METHOD', p.methodology],
      ['NOTE', p.note ?? null],
    ])
    .with({ kind: 'poi' }, (p): Row[] => [['CATEGORY', p.category]])
    .with({ kind: 'epoch1' }, { kind: 'epoch2' }, (p): Row[] => [
      ['FROM (KL LOCAL)', fmtLocalMYTFull(Date.parse(p.timeStart))],
      ['TO (KL LOCAL)', fmtLocalMYTFull(Date.parse(p.timeEnd))],
      ['ANCHOR POINTS', p.pointCount],
      ['OF WHICH INTERPOLATED', p.interpolatedCount],
    ])
    .with({ kind: 'epoch3' }, (p): Row[] => [['ANALYSIS', p.name]])
    .exhaustive()

/** Flight-clock timestamp (UTC ISO) for the kinds that carry one. */
export const flightTimeUtc = (point: DataPoint): string | null =>
  match(point)
    .with({ kind: 'arc' }, { kind: 'aux' }, (p) => p.timeUtc)
    .otherwise(() => null)

/** Linked citation, for kinds that carry a structured citation object. */
export const citationOf = (point: DataPoint): { label: string; url: string } | null =>
  match(point)
    .with(
      { kind: 'aux' },
      { kind: 'site' },
      { kind: 'epoch1' },
      { kind: 'epoch2' },
      { kind: 'epoch3' },
      (p) => p.citation,
    )
    .otherwise(() => null)

/** Free-text source line, for kinds that carry one instead of a citation. */
export const sourceOf = (point: DataPoint): string | null =>
  match(point)
    .with({ kind: 'poi' }, { kind: 'debris' }, { kind: 'search' }, (p) => p.source)
    .otherwise(() => null)

/** Instant-tooltip name + one-line subtitle. */
export const hoverText = (point: DataPoint): { name: string; sub: string } => {
  const name = match(point)
    .with({ kind: 'debris' }, (p) => p.partId)
    .otherwise((p) => p.name)
  const sub = match(point)
    .with({ kind: 'debris' }, (p) => `${p.status} · found ${p.findDate}`)
    .with({ kind: 'arc' }, () => 'Satellite timing ring')
    .with({ kind: 'aux' }, () => 'Extra Inmarsat constraint (CAPTIO)')
    .with({ kind: 'search' }, (p) => `Search area · ${fmtDate(Date.parse(p.startDate))}`)
    .with({ kind: 'site' }, (p) => `Candidate crash site · ${p.publishedBy}`)
    .with({ kind: 'epoch1' }, () => 'Recorded flight path (ADS-B)')
    .with({ kind: 'epoch2' }, () => 'Military radar path')
    .with({ kind: 'epoch3' }, () => 'Reconstructed path')
    .with({ kind: 'poi' }, (p) => p.short ?? p.oneLiner)
    .exhaustive()
  return { name, sub }
}
