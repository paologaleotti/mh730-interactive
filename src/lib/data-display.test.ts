import { describe, it, expect } from 'vitest'
import { bodyText, confidenceFor, hoverText, kindTitle, rowsFor, titleFor } from './data-display'
import { dataPointByKind } from '../data/collections'
import type { FeatureKind } from '../data/data-point'

const point = (kind: FeatureKind, id: string) => {
  const p = dataPointByKind(kind, id)
  if (!p) throw new Error(`missing ${kind}:${id}`)
  return p
}

describe('titleFor', () => {
  it('uses partId for debris and name for everything else', () => {
    expect(titleFor(point('arc', 'hs1'))).toMatch(/Handshake 1/)
    const debris = point('debris', 'tataly-trunnion-door-claim')
    expect(titleFor(debris)).toBe(debris.kind === 'debris' ? debris.partId : '')
  })
})

describe('kindTitle', () => {
  it('maps each kind to its heading', () => {
    expect(kindTitle(point('arc', 'hs1'))).toBe('SATELLITE TIMING RING')
    expect(kindTitle(point('site', 'ugib-2020-lep'))).toBe('CANDIDATE CRASH SITE')
  })
})

describe('confidenceFor', () => {
  it('uses the point confidence, with POI caveats demoting RECORDED to modelled', () => {
    expect(confidenceFor(point('arc', 'hs1'))).toBe('derived')
    expect(confidenceFor(point('epoch1', 'epoch1'))).toBe('recorded')
    expect(confidenceFor(point('poi', 'igari'))).toBe('recorded')
    expect(confidenceFor(point('poi', 'kate-tee-sighting'))).toBe('modelled')
  })
})

describe('bodyText', () => {
  it('leads with plain text when present, else with the technical narrative', () => {
    const emirates = bodyText(point('poi', 'emirates-etihad-near-miss'))
    expect(emirates.lead).not.toBeNull()
    expect(emirates.detail).not.toBeNull() // has both plain + technical

    const igari = bodyText(point('poi', 'igari'))
    expect(igari.lead).not.toBeNull()
    expect(igari.detail).toBeNull() // oneLiner only, no plain

    // Search has neither desc nor oneLiner -> no body paragraph.
    expect(bodyText(point('search', 'atsb-underwater-2014-2017')).lead).toBeNull()
  })
})

describe('rowsFor', () => {
  it('search rows expose campaignKind as TYPE', () => {
    const rows = rowsFor(point('search', 'atsb-underwater-2014-2017'))
    const type = rows.find(([label]) => label === 'TYPE')
    expect(type?.[1]).toBe('underwater')
  })

  it('epoch rows render times in KL local (UTC+8)', () => {
    const rows = rowsFor(point('epoch1', 'epoch1'))
    const from = rows.find(([label]) => label === 'FROM (KL LOCAL)')
    expect(String(from?.[1])).toContain('(UTC+8)')
  })
})

describe('hoverText', () => {
  it('summarises each kind from typed fields', () => {
    expect(hoverText(point('arc', 'hs1')).sub).toBe('Satellite timing ring')
    const debris = hoverText(point('debris', 'tataly-trunnion-door-claim'))
    expect(debris.sub).toMatch(/found /)
    expect(hoverText(point('poi', 'kate-tee-sighting')).sub.length).toBeGreaterThan(0)
  })
})
