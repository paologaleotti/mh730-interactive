// Typed imports for build-time-generated GeoJSON data files. Kept as a module
// declaration (instead of resolveJsonModule) so the import site gets the real
// FeatureCollection type rather than a widened literal shape.
declare module '*.geojson.json' {
  import type { FeatureCollection } from 'geojson'
  const data: FeatureCollection
  export default data
}
