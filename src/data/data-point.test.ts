import { describe, it, expect } from 'vitest'
import { DataPointSchema, DATA_POINT_KINDS, safeParseDataPoint } from './data-point'
import arcs from './arcs.geojson.json'
import auxArcs from './aux-arcs.geojson.json'
import epoch1 from './flight-epoch1.geojson.json'
import epoch2 from './flight-epoch2.geojson.json'
import epoch3 from './flight-epoch3.geojson.json'
import debris from './debris.geojson.json'
import searchAreas from './search-areas.geojson.json'
import pois from './pois.geojson.json'
import candidateSites from './candidate-sites.geojson.json'

const collections = [
  { kind: 'arc', fc: arcs },
  { kind: 'aux', fc: auxArcs },
  { kind: 'epoch1', fc: epoch1 },
  { kind: 'epoch2', fc: epoch2 },
  { kind: 'epoch3', fc: epoch3 },
  { kind: 'debris', fc: debris },
  { kind: 'search', fc: searchAreas },
  { kind: 'poi', fc: pois },
  { kind: 'site', fc: candidateSites },
]

describe('DataPointSchema', () => {
  it('parses every generated feature, with kind matching its collection', () => {
    for (const { kind, fc } of collections) {
      for (const f of fc.features) {
        const parsed = DataPointSchema.parse(f.properties)
        expect(parsed.kind).toBe(kind)
      }
    }
  })

  it('DATA_POINT_KINDS is exactly the nine feature kinds', () => {
    expect([...DATA_POINT_KINDS].sort()).toEqual(
      ['arc', 'aux', 'debris', 'epoch1', 'epoch2', 'epoch3', 'poi', 'search', 'site'],
    )
  })

  it('rejects an unknown discriminant and malformed input', () => {
    expect(safeParseDataPoint({ kind: 'nope', id: 'x' })).toBeNull()
    expect(safeParseDataPoint({ kind: 'debris' })).toBeNull() // missing required fields
    expect(safeParseDataPoint(null)).toBeNull()
  })
})
