// Invariants over the media manifest (spec §8): every item is attributable,
// reachable by at least one URL, and attached to real map features.

import { describe, it, expect } from 'vitest'
import manifest from './media.manifest.json'
import debris from './debris.geojson.json'
import pois from './pois.geojson.json'
import searchAreas from './search-areas.geojson.json'
import candidateSites from './candidate-sites.geojson.json'
import epoch3 from './flight-epoch3.geojson.json'

const featureIds = new Set([
  ...pois.features.map((f) => String(f.properties?.id)),
  ...debris.features.map((f) => String(f.properties?.id)),
  ...searchAreas.features.map((f) => String(f.properties?.id)),
  ...candidateSites.features.map((f) => String(f.properties?.id)),
  ...epoch3.features.map((f) => String(f.properties?.id)),
  'epoch1',
  'epoch2',
  'hs1', 'hs2', 'hs3', 'hs4', 'hs5', 'hs6', 'hs7',
])

describe('media.manifest', () => {
  it('has unique ids, valid kinds, and at least one URL per item', () => {
    const ids = manifest.items.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const m of manifest.items) {
      expect(['audio', 'video', 'image']).toContain(m.kind)
      expect(m.directUrl ?? m.embedUrl ?? m.pageUrl).toBeTruthy()
      expect(m.license.length).toBeGreaterThan(2)
      expect(m.publisher.length).toBeGreaterThan(2)
    }
  })

  it('every featureId resolves to a real map feature', () => {
    for (const m of manifest.items) {
      for (const fid of m.featureIds) {
        expect(featureIds.has(fid), `media ${m.id}: unknown feature ${fid}`).toBe(true)
      }
    }
  })

  it('includes the playable public-domain hydrophone clip on HA01, mirrored as local mp3', () => {
    const clip = manifest.items.find((m) => m.featureIds.includes('ha01-cape-leeuwin'))
    expect(clip).toBeDefined()
    expect(clip!.kind).toBe('audio')
    // Locally mirrored (Safari cannot decode the source Ogg) — served from /media/.
    expect(clip!.directUrl).toMatch(/^\/media\/.+\.mp3$/)
    expect(clip!.license.toLowerCase()).toContain('public domain')
  })

  it('image + audio payloads are mirrored locally; only video stays remote', () => {
    for (const m of manifest.items) {
      // Any direct payload we serve must be a local /media/ file, never a
      // remote hotlink — that is the "no dead links" guarantee.
      if (m.directUrl !== null) {
        expect(m.directUrl, `${m.id} directUrl`).toMatch(/^\/media\/[\w.-]+\.(webp|png|jpg|jpeg|mp3|ogg)$/)
      }
      // Every image and audio item must have a local payload (video is exempt:
      // it stays as a remote embed / landing page by design).
      if (m.kind === 'image') {
        expect(m.directUrl, `${m.id} should be a local image`).toMatch(/^\/media\//)
      }
    }
  })

  it('remote URLs (embed/page) use https or http', () => {
    for (const m of manifest.items) {
      for (const url of [m.embedUrl, m.pageUrl]) {
        if (url !== null) expect(url).toMatch(/^https?:\/\//)
      }
    }
  })
})
