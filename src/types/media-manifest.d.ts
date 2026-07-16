// Typed import for the build-time-generated media manifest (FR-8.4.1:
// manifest ships with the bundle, payloads load on demand).
declare module '*media.manifest.json' {
  export interface MediaItem {
    id: string
    kind: 'audio' | 'video' | 'image'
    title: string
    featureIds: string[]
    directUrl: string | null
    embedUrl: string | null
    pageUrl: string | null
    mimeType: string | null
    durationS: number | null
    publisher: string
    license: string
    verified: string
    notes: string
  }
  const manifest: { meta: unknown; items: MediaItem[] }
  export default manifest
}
