// Drift guard for the data pipeline: regenerates every GeoJSON output into a
// temp directory and diffs it against the committed files in src/data/.
// Fails when scripts/build-data.ts or data/*.json changed without re-running
// `pnpm data`, so stale committed output can never pass the gates silently.

import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const committedDir = join(root, 'src', 'data')

describe('build-data output drift', () => {
  it('regenerating from data/*.json reproduces the committed src/data output exactly', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'mh-data-'))
    try {
      execFileSync(process.execPath, [join(root, 'scripts', 'build-data.ts')], {
        env: { ...process.env, MH_DATA_OUT: tmp },
        stdio: 'pipe',
        timeout: 120_000,
      })

      const generated = readdirSync(tmp).filter((f) => f.endsWith('.geojson.json'))
      expect(generated.length).toBeGreaterThanOrEqual(8)

      for (const file of generated) {
        const fresh = JSON.parse(readFileSync(join(tmp, file), 'utf8'))
        const committed = JSON.parse(readFileSync(join(committedDir, file), 'utf8'))
        expect(fresh, `${file} drifted: re-run \`pnpm data\``).toEqual(committed)
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true })
    }
  }, 120_000)
})
