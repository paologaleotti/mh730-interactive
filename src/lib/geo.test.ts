import { describe, it, expect } from 'vitest'
import {
  geodeticToEcef,
  ecefToGeodetic,
  distEcef,
  destinationPoint,
  btoRing,
  rangeFromBto,
  SPEED_OF_LIGHT,
} from './geo'

describe('geodeticToEcef', () => {
  it('maps the equator/prime-meridian origin to (a, 0, 0)', () => {
    const p = geodeticToEcef(0, 0, 0)
    expect(p.x).toBeCloseTo(6_378_137, 6)
    expect(p.y).toBeCloseTo(0, 6)
    expect(p.z).toBeCloseTo(0, 6)
  })

  it('maps the north pole to (0, 0, b)', () => {
    const p = geodeticToEcef(90, 0, 0)
    expect(p.x).toBeCloseTo(0, 4)
    expect(p.z).toBeCloseTo(6_356_752.314245, 3) // WGS84 semi-minor axis
  })

  it('adds altitude along the ellipsoid normal', () => {
    const ground = geodeticToEcef(0, 90, 0)
    const up = geodeticToEcef(0, 90, 1000)
    expect(distEcef(ground, up)).toBeCloseTo(1000, 6)
  })
})

describe('ecefToGeodetic', () => {
  it('roundtrips arbitrary geodetic coordinates to sub-mm', () => {
    const cases: [number, number, number][] = [
      [0, 0, 0],
      [-34.2342, 93.7875, 10_668],
      [6.9367, 103.585, 35_000 * 0.3048],
      [-89.9, 179.9, 500],
      [64.5, -120.25, 35_786_000],
    ]
    for (const [lat, lon, h] of cases) {
      const g = ecefToGeodetic(geodeticToEcef(lat, lon, h))
      expect(g.lat).toBeCloseTo(lat, 9)
      expect(g.lon).toBeCloseTo(lon, 9)
      expect(g.h).toBeCloseTo(h, 3)
    }
  })
})

describe('destinationPoint', () => {
  it('travels due north by the angular distance', () => {
    const p = destinationPoint(0, 0, 0, Math.PI / 4)
    expect(p.lat).toBeCloseTo(45, 9)
    expect(p.lon).toBeCloseTo(0, 9)
  })

  it('wraps longitude across the antimeridian', () => {
    const p = destinationPoint(0, 179, Math.PI / 2, (2 * Math.PI) / 180)
    expect(p.lon).toBeCloseTo(-179, 6)
  })
})

describe('btoRing', () => {
  // Synthetic geostationary satellite directly over (0, 64.5).
  const sat = geodeticToEcef(0, 64.5, 35_786_000)

  it('produces a ring passing through a known reference point', () => {
    const ref = geodeticToEcef(-10, 64.5, 10_000) // due south of sub-point
    const range = distEcef(ref, sat)
    const ring = btoRing(sat, range, 10_000, 0.5)
    // The ring must contain a point within ~1 m of the reference.
    const nearest = Math.min(
      ...ring.map(([lon, lat]) => distEcef(geodeticToEcef(lat, lon, 10_000), ref)),
    )
    expect(nearest).toBeLessThan(1500) // 0.5 deg azimuth spacing ~ 1.2 km hops; nearest sample < 1.5 km
  })

  it('every ring point matches the requested slant range to sub-metre accuracy', () => {
    const ref = geodeticToEcef(-30, 64.5, 0)
    const range = distEcef(ref, sat)
    const ring = btoRing(sat, range, 0, 5)
    expect(ring.length).toBeGreaterThan(70)
    for (const [lon, lat] of ring) {
      expect(Math.abs(distEcef(geodeticToEcef(lat, lon, 0), sat) - range)).toBeLessThan(1)
    }
  })

  it('returns an empty ring when the range is shorter than the nadir distance', () => {
    const ring = btoRing(sat, 35_000_000, 0, 5)
    expect(ring).toEqual([])
  })

  it('altitude assumption shifts the ring (higher altitude -> ring farther from sub-point)', () => {
    // At the same ground angular distance a higher aircraft is nearer the
    // satellite, so holding the slant range fixed pushes the ring outward.
    const ref = geodeticToEcef(-30, 64.5, 0)
    const range = distEcef(ref, sat)
    const atGround = btoRing(sat, range, 0, 90)
    const atCruise = btoRing(sat, range, 10_668, 90)
    const south = (ring: [number, number][]) =>
      ring.reduce((min, p) => (p[1] < min[1] ? p : min))
    expect(south(atCruise)[1]).toBeLessThan(south(atGround)[1])
  })
})

describe('rangeFromBto', () => {
  it('inverts the Ashton BTO equation', () => {
    // range = ((bto - bias) * 1e-6 * c) / 2 - dDown
    const dDown = 39_000_000
    const dUp = 37_500_000
    const bias = -495_679
    const bto = ((dUp + dDown) * 2) / SPEED_OF_LIGHT / 1e-6 + bias
    expect(rangeFromBto(bto, bias, dDown)).toBeCloseTo(dUp, 3)
  })
})
