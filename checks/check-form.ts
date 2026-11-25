/**
 * Joint-range check for every guide demonstration.
 *
 * Samples each stretch and nerve glide on both sides at 30 Hz and measures the anatomical angle of
 * every joint: shoulder, elbow, forearm, wrist, fingers and thumb, hip, knee, ankle, toes, trunk,
 * neck and jaw. A pose fails when any joint leaves its normal range (see `LIMITS` in
 * src/motion/anatomy.ts) or when the radius leaves its pronation axis.
 *
 *   npm run check:form                      # all guides; fails on any violation
 *   npm run check:form -- --report out.json # also write every guide's angle extremes
 *   npm run check:form -- --only ulnar-slider,median-slider
 */
import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { createMovementRig } from '../src/motion/movementRig'
import { limitFor, measure } from '../src/motion/anatomy'
import { clips, type Side } from '../src/studio/clips'
import { type AuthoredId } from '../src/studio/choreography'
import { sampleStudio } from '../src/motion/studio/sample'
import { newProject } from '../src/studio/project'

const { values } = parseArgs({
  options: { report: { type: 'string' }, only: { type: 'string' }, quiet: { type: 'boolean' } },
})
const r = createMovementRig(),
  project = newProject()
// Every stretch and nerve glide, including the two whose motion is written by hand.
const ids = (values.only?.split(',') ??
  Object.entries(clips)
    .filter(([, c]) => c.guide)
    .map(([id]) => id)) as AuthoredId[]
type Extreme = { min: number; max: number; minAt: number; maxAt: number }
const report: Record<string, Record<string, Extreme>> = {}
const failures: string[] = []
let frames = 0
for (const id of ids) {
  const clip = clips[id]
  assert(clip, 'Unknown guide ' + id)
  const sides: Side[] = clip.unilateral ? ['left', 'right'] : ['left']
  const extremes: Record<string, Extreme> = {}
  for (const side of sides)
    for (let n = 0; n <= Math.ceil(clip.seconds * 30); n++) {
      const t = Math.min(clip.seconds, n / 30)
      sampleStudio(r, id, t, side, project)
      frames++
      for (const [key, value] of Object.entries(measure(r))) {
        // Report the working side as L and the other as R, whichever side is performing.
        const label =
          side === 'right'
            ? key.replace(/^L\./, 'X.').replace(/^R\./, 'L.').replace(/^X\./, 'R.')
            : key
        const e = (extremes[label] ??= { min: Infinity, max: -Infinity, minAt: 0, maxAt: 0 })
        if (value < e.min) Object.assign(e, { min: value, minAt: t })
        if (value > e.max) Object.assign(e, { max: value, maxAt: t })
      }
    }
  report[id] = extremes
  for (const [key, e] of Object.entries(extremes)) {
    const limit = limitFor(key)
    if (!limit) continue
    if (e.min < limit[0] - 0.5)
      failures.push(
        `${id} ${key} ${e.min.toFixed(1)}° at ${e.minAt.toFixed(2)} s (min ${limit[0]})`,
      )
    if (e.max > limit[1] + 0.5)
      failures.push(
        `${id} ${key} ${e.max.toFixed(1)}° at ${e.maxAt.toFixed(2)} s (max ${limit[1]})`,
      )
  }
}
r.skeleton.dispose()
if (values.report) writeFileSync(values.report, JSON.stringify(report, null, 1))
if (!values.quiet) for (const f of failures) console.log(f)
assert.equal(
  failures.length,
  0,
  failures.length + ' joint-range violations across ' + ids.length + ' guides',
)
console.log(
  `Joint ranges held across ${ids.length} guides, ${frames} sampled poses and ${Object.keys(report[ids[0]]).length} measured angles per pose.`,
)
