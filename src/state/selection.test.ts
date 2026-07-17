import { describe, it, expect, beforeEach } from 'vitest'
import { useSelection, resolveFeature } from './selection'
import debris from '../data/debris.geojson.json'

const initial = useSelection.getState()

beforeEach(() => {
  useSelection.setState(initial, true)
})

describe('resolveFeature', () => {
  it('resolves a debris item by id with its properties and position', () => {
    const anyId = String(debris.features[0].properties?.id)
    const sel = resolveFeature('debris', anyId)
    expect(sel).not.toBeNull()
    expect(sel!.point.kind).toBe('debris')
    expect(sel!.point.id).toBe(anyId)
    expect(sel!.lngLat[0]).toBeGreaterThan(20)
    expect(sel!.lngLat[1]).toBeLessThan(0)
  })

  it('resolves the epoch lines by their kind id', () => {
    const sel = resolveFeature('epoch1', 'epoch1')
    expect(sel).not.toBeNull()
    expect(sel!.lngLat[0]).toBeGreaterThan(95) // mid-track, SE Asia
  })

  it('resolves an arc by handshake id', () => {
    const sel = resolveFeature('arc', 'hs7')
    expect(sel?.point.kind === 'arc' && sel.point.btoUs).toBe(18400)
  })

  it('returns null for unknown ids and kinds', () => {
    expect(resolveFeature('debris', 'nope')).toBeNull()
    expect(resolveFeature('poi', '')).toBeNull()
  })
})

describe('useSelection', () => {
  it('selectById populates selected; unknown id clears it', () => {
    useSelection.getState().selectById('arc', 'hs1')
    expect(useSelection.getState().selected?.point.id).toBe('hs1')
    useSelection.getState().selectById('arc', 'hs99')
    expect(useSelection.getState().selected).toBeNull()
  })
})
