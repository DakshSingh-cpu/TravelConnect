/**
 * Build-time guard for data/match.db.
 *
 * The matching engine, destination autocomplete, and advisor profile pages all
 * read from data/match.db at runtime (lib/matchAgenciesStage1.ts opens it with
 * fileMustExist: true). This script guarantees the file is present before
 * `next build` produces a deployable artifact:
 *
 *   - If data/match.db already exists, do nothing (it is provided out-of-band,
 *     e.g. committed via LFS or uploaded into the build context).
 *   - Otherwise, try to build it from the source CSV via build-agency-match-index.
 *   - If neither the db nor the source CSV is available, fail the build with a
 *     clear, actionable message instead of shipping a broken deployment.
 *
 * Wired as the `prebuild` npm script so it runs automatically before `build`.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const dbPath = path.join(root, 'data', 'match.db')

if (fs.existsSync(dbPath)) {
  console.log('[ensure-match-db] data/match.db present — skipping index build')
  process.exit(0)
}

console.log('[ensure-match-db] data/match.db missing — attempting to build from source CSV')
const result = spawnSync(
  process.execPath,
  [path.join(__dirname, 'build-agency-match-index.mjs')],
  { stdio: 'inherit' },
)

if (result.status !== 0 || !fs.existsSync(dbPath)) {
  console.error(
    '\n[ensure-match-db] ERROR: data/match.db is required at runtime but could not be built.\n' +
      '  Fix one of the following before deploying:\n' +
      '    1. Provide a prebuilt data/match.db in the deployment/build context, or\n' +
      '    2. Make the source CSV available and run `npm run build:match-index`.\n' +
      '  Without it, /api/match-advisors, /api/destinations, and advisor profile pages will fail.\n',
  )
  process.exit(1)
}

console.log('[ensure-match-db] data/match.db built successfully')
