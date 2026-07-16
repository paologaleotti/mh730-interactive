import { describe, it, expect } from 'vitest'
import { EVIDENCE, EVIDENCE_SORTED, CATEGORY_META } from './evidence'
import { LAYERS } from './layers'

const LAYER_IDS = new Set(LAYERS.map((l) => l.id))

describe('EVIDENCE invariants', () => {
  it('has at least one item', () => {
    expect(EVIDENCE.length).toBeGreaterThan(0)
  })

  it('item ids are unique', () => {
    const ids = EVIDENCE.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every date is a valid ISO yyyy-mm-dd that parses to a real UTC date', () => {
    for (const e of EVIDENCE) {
      expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      const parsed = new Date(e.date)
      expect(Number.isNaN(parsed.getTime())).toBe(false)
      // Round-trip guards against overflow dates like 2014-02-31.
      expect(parsed.toISOString().slice(0, 10)).toBe(e.date)
    }
  })

  it('every URL is http(s) and non-empty', () => {
    for (const e of EVIDENCE) {
      expect(e.url).toMatch(/^https?:\/\/.+/)
    }
  })

  it('every layers[] entry references an existing layer id', () => {
    const referenced = EVIDENCE.flatMap((e) => e.layers ?? [])
    expect(referenced.length).toBeGreaterThan(0)
    for (const id of referenced) {
      expect(LAYER_IDS.has(id)).toBe(true)
    }
  })

  it('every category has display metadata', () => {
    const ok = EVIDENCE.every((e) => CATEGORY_META[e.category].label.length > 0)
    expect(ok).toBe(true)
  })

  it('every item has non-empty title, publisher and desc', () => {
    const ok = EVIDENCE.every(
      (e) => e.title.length > 0 && e.publisher.length > 0 && e.desc.length > 0,
    )
    expect(ok).toBe(true)
  })
})

describe('EVIDENCE_SORTED', () => {
  it('is sorted ascending by date', () => {
    const dates = EVIDENCE_SORTED.map((e) => e.date)
    expect(dates.every((d, i) => i === 0 || dates[i - 1] <= d)).toBe(true)
  })

  it('is a permutation of EVIDENCE (same ids, nothing lost)', () => {
    expect(EVIDENCE_SORTED.length).toBe(EVIDENCE.length)
    expect(new Set(EVIDENCE_SORTED.map((e) => e.id))).toEqual(
      new Set(EVIDENCE.map((e) => e.id)),
    )
  })

  it('does not mutate the source EVIDENCE array order', () => {
    // EVIDENCE itself contains at least one out-of-order pair, proving the
    // sort operated on a copy.
    const first = EVIDENCE.find((e) => e.id === 'first-principles')
    const csiro = EVIDENCE.find((e) => e.id === 'csiro-drift-1')
    expect(first).toBeDefined()
    expect(csiro).toBeDefined()
    expect(EVIDENCE.indexOf(first ?? EVIDENCE[0])).toBeLessThan(
      EVIDENCE.indexOf(csiro ?? EVIDENCE[0]),
    )
  })
})
