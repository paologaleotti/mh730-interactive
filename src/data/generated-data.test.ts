// Invariants over the build-time-generated GeoJSON (scripts/build-data.ts).
// These pin the arc computation to independently published anchors so a
// regression in the geodesy or the pipeline fails loudly.

import { describe, it, expect } from 'vitest'
import arcs from './arcs.geojson.json'
import epoch1 from './flight-epoch1.geojson.json'
import epoch2 from './flight-epoch2.geojson.json'
import epoch3 from './flight-epoch3.geojson.json'
import candidateSites from './candidate-sites.geojson.json'
import pois from './pois.geojson.json'
import debris from './debris.geojson.json'
import searchAreas from './search-areas.geojson.json'

import type { Feature } from 'geojson'

const lineCoords = (f: Feature): [number, number][] =>
  f.geometry.type === 'LineString'
    ? f.geometry.coordinates.map(([lon, lat]): [number, number] => [lon, lat])
    : []

describe('display-grade properties (every clickable feature)', () => {
  it('every feature carries a human-readable name/partId and a description', () => {
    const collections = [
      { label: 'arcs', fc: arcs },
      { label: 'epoch1', fc: epoch1 },
      { label: 'epoch2', fc: epoch2 },
      { label: 'epoch3', fc: epoch3 },
      { label: 'debris', fc: debris },
      { label: 'search', fc: searchAreas },
      { label: 'pois', fc: pois },
      { label: 'sites', fc: candidateSites },
    ]
    for (const { label, fc } of collections) {
      for (const f of fc.features) {
        const p = f.properties ?? {}
        const display = String(p.name ?? p.partId ?? '')
        expect(display.length, `${label}: feature ${p.id} has no display name`).toBeGreaterThan(3)
        // A name that is just the raw id means the data was not shaped.
        expect(display, `${label}: display name equals raw id`).not.toBe(String(p.id))
        const about = String(p.desc ?? p.oneLiner ?? p.outcome ?? p.methodology ?? '')
        expect(about.length, `${label}: feature ${p.id} has no description`).toBeGreaterThan(10)
      }
    }
  })

  it('epoch lines carry time range and point provenance counts', () => {
    for (const fc of [epoch1, epoch2]) {
      const p = fc.features[0].properties ?? {}
      expect(String(p.timeStart)).toMatch(/^2014-03-07T/)
      expect(String(p.timeEnd)).toMatch(/^2014-03-07T/)
      expect(Number(p.pointCount)).toBeGreaterThanOrEqual(10)
      expect(Number(p.interpolatedCount)).toBeGreaterThanOrEqual(0)
      expect(p.citation).toBeDefined()
    }
  })
})

describe('arcs.geojson', () => {
  it('contains all seven handshake arcs', () => {
    const ids = arcs.features.map((f) => f.properties?.id).sort()
    expect(ids).toEqual(['hs1', 'hs2', 'hs3', 'hs4', 'hs5', 'hs6', 'hs7'])
  })

  it('7th arc passes the published UGIB LEP longitude at its latitude (FL350 ring ~8 km outside)', () => {
    const hs7 = arcs.features.find((f) => f.properties?.id === 'hs7')
    expect(hs7).toBeDefined()
    const coords = lineCoords(hs7!)
    const nearest = coords.reduce((best, p) =>
      Math.abs(p[1] - -34.2342) < Math.abs(best[1] - -34.2342) ? p : best,
    )
    // UGIB 2020 last-estimated-position: 34.2342 S, 93.7875 E (on the arc).
    expect(nearest[0]).toBeGreaterThan(93.6)
    expect(nearest[0]).toBeLessThan(94.1)
  })

  it('ring radius order follows BTO order (BTO dips at HS2: aircraft first flew toward the satellite)', () => {
    const byId = (id: string) => arcs.features.find((x) => x.properties?.id === id)
    const southLat = (id: string) => Math.min(...lineCoords(byId(id)!).map((p) => p[1]))
    const bto = (id: string) => Number(byId(id)?.properties?.btoUs)
    const ids = ['hs1', 'hs2', 'hs3', 'hs4', 'hs5', 'hs6', 'hs7']
    // Larger BTO -> larger ring -> reaches farther south (smaller min lat).
    const byBto = [...ids].sort((a, b) => bto(a) - bto(b))
    const byRadius = [...ids].sort((a, b) => southLat(b) - southLat(a))
    expect(byRadius).toEqual(byBto)
    // And the documented dip: hs2 has the smallest BTO of all seven.
    expect(byBto[0]).toBe('hs2')
    expect(byBto[6]).toBe('hs7')
  })

  it('every arc coordinate is a valid lon/lat inside the render bbox', () => {
    for (const f of arcs.features) {
      for (const [lon, lat] of lineCoords(f)) {
        expect(lat).toBeGreaterThanOrEqual(-62)
        expect(lat).toBeLessThanOrEqual(47)
        expect(lon).toBeGreaterThanOrEqual(20)
        expect(lon).toBeLessThanOrEqual(150)
      }
    }
  })
})

describe('flight track geojson', () => {
  it('epoch 1 starts at WMKK and ends near IGARI', () => {
    const coords = lineCoords(epoch1.features[0])
    expect(coords.length).toBeGreaterThanOrEqual(2)
    const [startLon, startLat] = coords[0]
    const [endLon, endLat] = coords[coords.length - 1]
    expect(startLat).toBeCloseTo(2.75, 1)
    expect(startLon).toBeCloseTo(101.7, 1)
    expect(endLat).toBeCloseTo(6.94, 0)
    expect(endLon).toBeCloseTo(103.6, 0)
  })

  it('epoch 2 ends past MEKAR in the Strait of Malacca (last primary radar)', () => {
    const coords = lineCoords(epoch2.features[0])
    const [endLon, endLat] = coords[coords.length - 1]
    // SIR-interpreted 18:22:12 fix: 6.5777 N, 96.3409 E
    expect(endLat).toBeCloseTo(6.58, 1)
    expect(endLon).toBeCloseTo(96.34, 1)
  })

  it('epochs are temporally contiguous (epoch1 end == epoch2 start)', () => {
    const e1 = lineCoords(epoch1.features[0])
    const e2 = lineCoords(epoch2.features[0])
    expect(e1[e1.length - 1]).toEqual(e2[0])
  })
})

describe('flight-epoch3.geojson (candidate reconstructions)', () => {
  it('has at least two named reconstructions, all labeled modelled (FR-5.1.3)', () => {
    expect(epoch3.features.length).toBeGreaterThanOrEqual(2)
    for (const f of epoch3.features) {
      expect(f.properties?.confidence).toBe('modelled')
      expect(String(f.properties?.label)).toContain('RECONSTRUCTION')
      expect(f.properties?.citation).toBeDefined()
    }
  })

  it('every reconstruction starts in Epoch 3 (after last radar) and ends on the 7th arc region', () => {
    for (const f of epoch3.features) {
      const coords = lineCoords(f)
      const [, startLat] = coords[0]
      const [endLon, endLat] = coords[coords.length - 1]
      expect(startLat).toBeGreaterThan(5) // near the Strait of Malacca
      expect(endLat).toBeLessThan(-30) // southern Indian Ocean
      expect(endLon).toBeGreaterThan(90)
      expect(endLon).toBeLessThan(96)
    }
  })
})

describe('debris.geojson', () => {
  it('carries the MOT-verified status tallies (3 confirmed, 7 almost certain, 8 highly likely)', () => {
    const count = (s: string) =>
      debris.features.filter((f) => f.properties?.status === s).length
    expect(debris.features.length).toBeGreaterThanOrEqual(30)
    expect(count('confirmed')).toBe(3)
    expect(count('almost-certain')).toBe(7)
    expect(count('highly-likely')).toBe(8)
  })

  it('includes the flaperon at Saint-André, Réunion (first confirmed find)', () => {
    const flaperon = debris.features.find(
      (f) => f.properties?.status === 'confirmed' && String(f.properties?.findDate) === '2015-07-29',
    )
    expect(flaperon).toBeDefined()
    const [lon, lat] = flaperon!.geometry.type === 'Point'
      ? flaperon!.geometry.coordinates
      : [0, 0]
    expect(lat).toBeCloseTo(-20.92, 1)
    expect(lon).toBeCloseTo(55.65, 1)
  })

  it('every find is in the western Indian Ocean basin (drift direction sanity)', () => {
    for (const f of debris.features) {
      const [lon, lat] = f.geometry.type === 'Point' ? f.geometry.coordinates : [0, 0]
      expect(lat).toBeGreaterThan(-40)
      expect(lat).toBeLessThan(0)
      expect(lon).toBeGreaterThan(20)
      expect(lon).toBeLessThan(120)
    }
  })
})

describe('search-areas.geojson', () => {
  it('has all nine campaigns with closed polygons', () => {
    expect(searchAreas.features.length).toBe(9)
    for (const f of searchAreas.features) {
      expect(f.geometry.type).toBe('Polygon')
      const ring = f.geometry.type === 'Polygon' ? f.geometry.coordinates[0] : []
      expect(ring.length).toBeGreaterThanOrEqual(5)
      expect(ring[0]).toEqual(ring[ring.length - 1])
    }
  })

  it('underwater campaigns lie along the 7th arc corridor in the SIO', () => {
    const underwater = searchAreas.features.filter((f) => f.properties?.kind === 'underwater')
    // ATSB 2014-17, OI 2018, OI 2025-26, Ocean Shield acoustic 2014
    expect(underwater.length).toBe(4)
    for (const f of underwater) {
      const ring = f.geometry.type === 'Polygon' ? f.geometry.coordinates[0] : []
      for (const [lon, lat] of ring) {
        expect(lat).toBeLessThan(-19)
        expect(lat).toBeGreaterThan(-42)
        // ATSB band's SW end reaches ~84.4E at 39.3S
        expect(lon).toBeGreaterThan(82)
        expect(lon).toBeLessThan(125)
      }
    }
  })

  it('includes the Ocean Shield acoustic-detection zone at the published corners (~20-22S, 104E)', () => {
    const os = searchAreas.features.find((f) => f.properties?.id === 'ocean-shield-acoustic-2014')
    expect(os).toBeDefined()
    const ring = os!.geometry.type === 'Polygon' ? os!.geometry.coordinates[0] : []
    // Published corners U1-U4 (ATSB final report p.194) span 103.5-105.0E.
    for (const [lon, lat] of ring) {
      expect(lat).toBeLessThan(-20)
      expect(lat).toBeGreaterThan(-22.5)
      expect(lon).toBeGreaterThan(103.4)
      expect(lon).toBeLessThan(105.1)
    }
  })
})

describe('candidate-sites.geojson', () => {
  it('has at least 5 published sites, all modelled, all in the SIO', () => {
    expect(candidateSites.features.length).toBeGreaterThanOrEqual(5)
    for (const f of candidateSites.features) {
      expect(f.properties?.confidence).toBe('modelled')
      expect(f.properties?.citation).toBeDefined()
      const [lon, lat] = f.geometry.type === 'Point' ? f.geometry.coordinates : [0, 0]
      expect(lat).toBeLessThan(-25)
      expect(lat).toBeGreaterThan(-40)
      expect(lon).toBeGreaterThan(88)
      expect(lon).toBeLessThan(103)
    }
  })

  it('includes the UGIB 2020 last estimated position exactly as published', () => {
    const ugib = candidateSites.features.find((f) => String(f.properties?.id).includes('ugib'))
    expect(ugib).toBeDefined()
    const [lon, lat] = ugib!.geometry.type === 'Point' ? ugib!.geometry.coordinates : [0, 0]
    expect(lat).toBeCloseTo(-34.2342, 4)
    expect(lon).toBeCloseTo(93.7875, 4)
  })
})

describe('pois.geojson', () => {
  it('has unique ids and valid ranks', () => {
    const ids = pois.features.map((f) => f.properties?.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const f of pois.features) {
      expect([1, 2, 3]).toContain(f.properties?.rank)
    }
  })

  it('includes the load-bearing POIs', () => {
    const ids = new Set(pois.features.map((f) => f.properties?.id))
    for (const required of ['igari', 'mekar', 'vampi']) {
      const found = [...ids].some((id) => String(id).includes(required))
      expect(found, `missing POI ${required}`).toBe(true)
    }
  })
})
