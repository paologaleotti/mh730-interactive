import { describe, it, expect } from 'vitest'
import type { StyleSpecification } from 'maplibre-gl'
import { darkStyle, fallbackStyle } from './basemap'

const styles: { name: string; style: StyleSpecification }[] = [
  { name: 'darkStyle', style: darkStyle() },
  { name: 'fallbackStyle', style: fallbackStyle() },
]

describe.each(styles)('$name', ({ style }) => {
  it('is a version 8 style', () => {
    expect(style.version).toBe(8)
  })

  it('uses the globe projection', () => {
    expect(style.projection).toEqual({ type: 'globe' })
  })

  it('declares glyphs for symbol layers', () => {
    expect(style.glyphs).toMatch(/^https?:\/\/.+\{fontstack\}.+\{range\}/)
  })

  it('has at least one source and a background layer', () => {
    expect(Object.keys(style.sources).length).toBeGreaterThan(0)
    expect(style.layers.some((l) => l.type === 'background')).toBe(true)
  })

  it('every layer that references a source references a declared one', () => {
    const sourced = style.layers.filter((l) => 'source' in l)
    expect(sourced.length).toBeGreaterThan(0)
    for (const layer of sourced) {
      expect(Object.keys(style.sources)).toContain(layer.source)
    }
  })

  it('every non-background layer references a source', () => {
    const ok = style.layers.every((l) => l.type === 'background' || 'source' in l)
    expect(ok).toBe(true)
  })

  it('has no duplicate layer ids', () => {
    const ids = style.layers.map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

})

describe('style separation', () => {
  it('each call returns a fresh object (no shared mutable style)', () => {
    expect(darkStyle()).not.toBe(darkStyle())
    expect(fallbackStyle()).not.toBe(fallbackStyle())
  })

  it('primary and fallback use different tile sources', () => {
    expect(Object.keys(darkStyle().sources)).not.toEqual(
      Object.keys(fallbackStyle().sources),
    )
  })
})
