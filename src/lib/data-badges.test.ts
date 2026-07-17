import { describe, it, expect } from 'vitest'
import { badgesFor } from './data-badges'
import { allDataPoints, dataPointByKind } from '../data/collections'
import type { FeatureKind } from '../data/data-point'

const byKind = (kind: FeatureKind) => {
  const p = allDataPoints.find((x) => x.kind === kind)
  if (!p) throw new Error(`no ${kind} in data`)
  return p
}

const point = (kind: FeatureKind, id: string) => {
  const p = dataPointByKind(kind, id)
  if (!p) throw new Error(`missing ${kind}:${id}`)
  return p
}

describe('badgesFor', () => {
  it('debris shows one status chip, coloured by status', () => {
    const badges = badgesFor(byKind('debris'))
    expect(badges).toHaveLength(1)
    expect(badges[0].color).toMatch(/^#/)
  })

  it('search distinguishes proposed vs searched by campaignKind', () => {
    expect(badgesFor(point('search', 'captio-blelly-marchand-proposed'))[0].label).toBe(
      'PROPOSED · UNSEARCHED',
    )
    expect(badgesFor(point('search', 'atsb-underwater-2014-2017'))[0].label).toBe('SEARCHED')
  })

  it('aux (the CAPTIO distance ring) shows a DISTANCE READING badge', () => {
    expect(badgesFor(point('aux', 'aux-18-28'))[0].label).toBe('DISTANCE READING')
  })

  it('site shows its status plus the disputed caveat for the WSPR site', () => {
    const labels = badgesFor(point('site', 'godfrey-wspr-2023')).map((b) => b.label)
    expect(labels).toContain('UNSEARCHED')
    expect(labels).toContain('DISPUTED')
  })

  it('the contested WSPR reconstruction gets a single CONTESTED METHOD badge', () => {
    const labels = badgesFor(point('epoch3', 'wspr-gdtaaa-2023')).map((b) => b.label)
    expect(labels).toEqual(['CONTESTED METHOD'])
  })

  it('a non-contested reconstruction and the epoch/arc lines get no badge', () => {
    expect(badgesFor(point('epoch3', 'ashton-2015'))).toEqual([])
    expect(badgesFor(point('arc', 'hs1'))).toEqual([])
    expect(badgesFor(point('epoch1', 'epoch1'))).toEqual([])
  })

  it('a POI badge comes from the typed caveat field, not from prose', () => {
    // Carries caveat -> one caveat badge.
    expect(badgesFor(point('poi', 'kate-tee-sighting')).map((b) => b.label)).toEqual([
      'UNCORROBORATED',
    ])
    // No caveat, even though its text may contain trigger words -> no badge.
    expect(badgesFor(point('poi', 'igari'))).toEqual([])
  })

  it('never scans a description: debris with "DISPUTED" in prose still shows only its status', () => {
    const tataly = point('debris', 'tataly-trunnion-door-claim')
    const badges = badgesFor(tataly)
    expect(badges).toHaveLength(1)
    expect(badges.map((b) => b.label)).not.toContain('DISPUTED')
  })
})
