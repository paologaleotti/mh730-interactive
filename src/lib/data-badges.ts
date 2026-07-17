// Status/quality chips shown under the Detail Panel title, matched from the
// typed DataPoint (never from prose). Colours come from the shared palette so
// the chip matches the map and legend.

import { match } from 'ts-pattern'
import type { Caveat, DataPoint } from '../data/data-point'
import { BADGE_COLORS, CAVEAT_COLORS, CAVEAT_LABELS, DEBRIS_STATUS_COLORS } from '../config/palette'

export interface Badge {
  label: string
  color: string
}

const caveatBadge = (caveat: Caveat): Badge => ({
  label: CAVEAT_LABELS[caveat],
  color: CAVEAT_COLORS[caveat],
})

const maybeCaveat = (caveat: Caveat | undefined): Badge[] => (caveat ? [caveatBadge(caveat)] : [])

export const badgesFor = (point: DataPoint): Badge[] =>
  match(point)
    .with({ kind: 'debris' }, (p) => [
      { label: p.status.replace('-', ' ').toUpperCase(), color: DEBRIS_STATUS_COLORS[p.status] },
    ])
    .with({ kind: 'search' }, (p) =>
      p.campaignKind === 'proposed'
        ? [{ label: 'PROPOSED · UNSEARCHED', color: BADGE_COLORS.proposed }]
        : [{ label: 'SEARCHED', color: BADGE_COLORS.searched }],
    )
    .with({ kind: 'site' }, (p) => [
      {
        label: p.status.replace(/-/g, ' ').toUpperCase(),
        color: p.status.includes('unsearched') ? BADGE_COLORS.siteUnsearched : BADGE_COLORS.siteSearched,
      },
      ...maybeCaveat(p.caveat),
    ])
    // Every rendered aux constraint is a distance ring (BFO-only calls are not
    // drawn); the field stays in the schema but the badge is uniform.
    .with({ kind: 'aux' }, () => [{ label: 'DISTANCE READING', color: BADGE_COLORS.aux }])
    .with({ kind: 'epoch3' }, (p) => [
      ...(p.contested ? [{ label: 'CONTESTED METHOD', color: BADGE_COLORS.contestedMethod }] : []),
      ...maybeCaveat(p.caveat),
    ])
    .with({ kind: 'poi' }, (p) => maybeCaveat(p.caveat))
    .with({ kind: 'arc' }, { kind: 'epoch1' }, { kind: 'epoch2' }, () => [])
    .exhaustive()
