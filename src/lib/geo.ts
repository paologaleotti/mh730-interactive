// WGS84 geodesy for the Inmarsat BTO arc computation. All math is exact
// ellipsoidal ECEF; the only spherical step is the azimuth parametrization of
// the search ray, which does not affect precision because every candidate
// point is evaluated through the exact geodetic -> ECEF -> slant-range chain.

export interface Ecef {
  x: number
  y: number
  z: number
}

// WGS84 ellipsoid
const A = 6_378_137.0 // semi-major axis, m
const F = 1 / 298.257223563
const E2 = F * (2 - F) // first eccentricity squared

export const SPEED_OF_LIGHT = 299_792_458 // m/s

const rad = (deg: number) => (deg * Math.PI) / 180
const deg = (r: number) => (r * 180) / Math.PI

/** Geodetic (degrees, metres above ellipsoid) to ECEF (metres). */
export const geodeticToEcef = (latDeg: number, lonDeg: number, hM: number): Ecef => {
  const lat = rad(latDeg)
  const lon = rad(lonDeg)
  const sinLat = Math.sin(lat)
  const n = A / Math.sqrt(1 - E2 * sinLat * sinLat)
  return {
    x: (n + hM) * Math.cos(lat) * Math.cos(lon),
    y: (n + hM) * Math.cos(lat) * Math.sin(lon),
    z: (n * (1 - E2) + hM) * sinLat,
  }
}

/** ECEF (metres) to geodetic (degrees, metres). Bowring's method, iterated;
    five fixed-point iterations converge to sub-mm for terrestrial points. */
export const ecefToGeodetic = (p: Ecef): { lat: number; lon: number; h: number } => {
  const lon = Math.atan2(p.y, p.x)
  const r = Math.hypot(p.x, p.y)
  let lat = Math.atan2(p.z, r * (1 - E2))
  let h = 0
  for (let i = 0; i < 5; i++) {
    const sinLat = Math.sin(lat)
    const n = A / Math.sqrt(1 - E2 * sinLat * sinLat)
    h = r / Math.cos(lat) - n
    lat = Math.atan2(p.z, r * (1 - (E2 * n) / (n + h)))
  }
  return { lat: deg(lat), lon: deg(lon), h }
}

export const distEcef = (a: Ecef, b: Ecef): number =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)

/**
 * Spherical destination point: from (latDeg, lonDeg) travel angular distance
 * `delta` (radians) along initial azimuth `azimuth` (radians). Used only to
 * parametrize the ring search; precision comes from the ECEF evaluation.
 */
export const destinationPoint = (
  latDeg: number,
  lonDeg: number,
  azimuth: number,
  delta: number,
): { lat: number; lon: number } => {
  const lat1 = rad(latDeg)
  const lon1 = rad(lonDeg)
  const sinLat2 =
    Math.sin(lat1) * Math.cos(delta) + Math.cos(lat1) * Math.sin(delta) * Math.cos(azimuth)
  const lat2 = Math.asin(Math.min(1, Math.max(-1, sinLat2)))
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(azimuth) * Math.sin(delta) * Math.cos(lat1),
      Math.cos(delta) - Math.sin(lat1) * sinLat2,
    )
  return { lat: deg(lat2), lon: deg(((lon2 + Math.PI * 3) % (Math.PI * 2)) - Math.PI) }
}

/**
 * BTO ping ring: the locus of aircraft positions (at altitude `altM`) whose
 * slant range to the satellite equals `rangeM`. Solved per azimuth from the
 * sub-satellite point by bisection on angular distance; slant range grows
 * monotonically with angular distance from the sub-satellite point for a
 * (near-)geostationary satellite, so bisection is exact.
 *
 * Returns [lon, lat] pairs (GeoJSON order), one per azimuth step. Azimuths
 * with no solution (range shorter than the nadir distance) are skipped.
 */
export const btoRing = (
  satEcef: Ecef,
  rangeM: number,
  altM: number,
  stepDeg = 0.25,
): [number, number][] => {
  const sub = ecefToGeodetic(satEcef)
  const rangeAt = (az: number, delta: number) => {
    const p = destinationPoint(sub.lat, sub.lon, az, delta)
    return distEcef(geodeticToEcef(p.lat, p.lon, altM), satEcef)
  }

  const steps = Math.round(360 / stepDeg)
  return Array.from({ length: steps + 1 }, (_, i) => {
    const az = rad(i * stepDeg)
    // Bracket: nadir (delta ~ 0) up to 89 deg angular distance.
    let lo = 1e-6
    let hi = rad(89)
    if (rangeAt(az, lo) > rangeM || rangeAt(az, hi) < rangeM) return null
    // ~50 bisection steps -> delta resolved to ~1e-14 rad; sub-mm on ground.
    for (let i2 = 0; i2 < 60; i2++) {
      const mid = (lo + hi) / 2
      if (rangeAt(az, mid) < rangeM) lo = mid
      else hi = mid
    }
    const p = destinationPoint(sub.lat, sub.lon, az, (lo + hi) / 2)
    return [p.lon, p.lat] satisfies [number, number]
  }).filter((p) => p !== null)
}

/**
 * Aircraft-to-satellite range from a BTO measurement (Ashton et al. 2015
 * model): BTO = (2/c) * (d_up + d_down) + bias, where d_down is the constant
 * satellite-to-GES leg. All inputs in metres/microseconds.
 */
export const rangeFromBto = (btoUs: number, biasUs: number, satToGesM: number): number =>
  ((btoUs - biasUs) * 1e-6 * SPEED_OF_LIGHT) / 2 - satToGesM
