import { describe, it, expect } from 'vitest'
import {
  LAYERS,
  LAYER_GROUPS,
  DEFAULT_LAYER_VIS,
  CONFIDENCE_META,
} from './layers'

describe('LAYERS registry invariants', () => {
  it('has at least one layer', () => {
    expect(LAYERS.length).toBeGreaterThan(0)
  })

  it('layer ids are unique', () => {
    const ids = LAYERS.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every layer has a non-empty id, label, group and desc', () => {
    const ok = LAYERS.every(
      (l) => l.id.length > 0 && l.label.length > 0 && l.group.length > 0 && l.desc.length > 0,
    )
    expect(ok).toBe(true)
  })

  it('every layer id appears in DEFAULT_LAYER_VIS with its defaultVisible flag', () => {
    for (const l of LAYERS) {
      expect(DEFAULT_LAYER_VIS[l.id]).toBe(l.defaultVisible)
    }
    expect(Object.keys(DEFAULT_LAYER_VIS).length).toBe(LAYERS.length)
  })

  it('LAYER_GROUPS order matches first appearance in LAYERS', () => {
    const firstAppearance = LAYERS.map((l) => l.group).reduce(
      (acc: string[], g) => (acc.includes(g) ? acc : [...acc, g]),
      [],
    )
    expect(LAYER_GROUPS).toEqual(firstAppearance)
  })

  it('LAYER_GROUPS has no duplicates', () => {
    expect(new Set(LAYER_GROUPS).size).toBe(LAYER_GROUPS.length)
  })

  it('every citation URL is http(s) and non-empty', () => {
    const cited = LAYERS.map((l) => l.citation).filter((c) => c !== undefined)
    expect(cited.length).toBeGreaterThan(0)
    for (const c of cited) {
      expect(c.label.length).toBeGreaterThan(0)
      expect(c.url).toMatch(/^https?:\/\/.+/)
    }
  })

  it('every declared confidence has display metadata', () => {
    const confidences = LAYERS.map((l) => l.confidence).filter((c) => c !== undefined)
    for (const c of confidences) {
      expect(CONFIDENCE_META[c].label.length).toBeGreaterThan(0)
      expect(CONFIDENCE_META[c].hint.length).toBeGreaterThan(0)
    }
  })
})
