/**
 * Physics check for every guide demonstration, on both sides.
 *
 * For each of the 189 stretches and nerve glides it samples the movement at 60 Hz and measures:
 *   floating / penetration  the performer rests on its floor or seat, no gap, no sinking
 *   atlas floating          the bare atlas tissue rests within a tissue-thickness of the floor
 *   balance                 the centre of mass stays over the base of support (feet, knees, seat,
 *                           hands on a declared fixture)
 *   slide                   a planted foot does not drift
 *   smoothness              no pops (point and joint accelerations) and no shimmer in a hold
 * Joint ranges are held by `check:form`; this check does not repeat them.
 *
 *   npm run check:physics                      # prints every failing exercise, fails if any
 *   npm run check:physics -- --only deep-squat-hold,ninety-ninety
 *   npm run check:physics -- --report out.json # every number for every exercise
 *   npm run check:physics:all                  # every failure, known or new, fails the run
 *   npm run check:physics -- --write-known     # record today's failures as the known list
 *
 * The right side of a one-sided guide is the left reflected, so only the left is measured unless
 * --both-sides is given. `checks/physics-known.json` lists, for each guide that still fails, the
 * kinds of failure it has; `npm run check` fails on any guide or kind that is not listed, so a
 * known failure can be fixed but never quietly made worse or joined by a new one.
 */
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { from } from '../asset-pipeline/motion/geometry'
import { createMovementRig } from '../src/motion/movementRig'
import { analyse, type Report } from '../src/motion/physics/analyse'
import { clips, type Side } from '../src/studio/clips'
import { type AuthoredId } from '../src/studio/choreography'

const { values } = parseArgs({
  options: {
    only: { type: 'string' },
    report: { type: 'string' },
    quiet: { type: 'boolean' },
    'allow-known': { type: 'boolean' },
    'write-known': { type: 'boolean' },
    'both-sides': { type: 'boolean' },
  },
})
const rig = createMovementRig(),
  skin = await from('src/motion/studio/assets/performer.glb', true)
const ids = (values.only?.split(',') ??
  Object.entries(clips)
    .filter(([, c]) => c.guide)
    .map(([id]) => id)) as AuthoredId[]
const knownFile = new URL('./physics-known.json', import.meta.url)
const known: Record<string, string[]> = (() => {
  try {
    return JSON.parse(readFileSync(knownFile, 'utf8'))
  } catch {
    return {}
  }
})()
const kindsOf = new Map<string, Set<string>>()
const reports: Report[] = []
const failing = new Map<string, string[]>()
for (const id of ids) {
  const clip = clips[id]
  assert(clip, 'Unknown guide ' + id)
  for (const side of (clip.unilateral && values['both-sides']
    ? ['left', 'right']
    : ['left']) as Side[]) {
    const report = analyse(rig, id, side, skin)
    reports.push(report)
    // One line per kind, at the worst moment.
    const worst = new Map<string, Report['findings'][number]>()
    for (const f of report.findings) {
      const w = worst.get(f.kind)
      if (!w || Math.abs(f.value) > Math.abs(w.value)) worst.set(f.kind, f)
    }
    for (const [kind, f] of worst) {
      if (!kindsOf.has(id)) kindsOf.set(id, new Set())
      kindsOf.get(id)!.add(kind)
      const mm =
        kind.includes('accel') || kind === 'hold-motion'
          ? f.value.toFixed(1) + (kind === 'joint-accel' ? ' rad/s²' : ' m/s²')
          : (f.value * 1000).toFixed(0) + ' mm'
      const line = `${kind} ${mm} at ${f.t.toFixed(2)} s${f.detail ? ' (' + f.detail + ')' : ''}`
      failing.set(id, [...(failing.get(id) ?? []), side + ': ' + line])
    }
  }
}
rig.skeleton.dispose()
if (values.report) writeFileSync(values.report, JSON.stringify(reports, null, 1))
const failed = [...failing.keys()]
// A guide is new if it is not listed, or has a kind of failure that its entry does not list.
const fresh = failed.filter((id) => [...kindsOf.get(id)!].some((k) => !known[id]?.includes(k)))
if (values['write-known']) {
  const all = Object.fromEntries(failed.sort().map((id) => [id, [...kindsOf.get(id)!].sort()]))
  const { format, resolveConfig } = await import('prettier')
  const path = fileURLToPath(knownFile)
  writeFileSync(
    path,
    await format(JSON.stringify(all), { ...(await resolveConfig(path)), filepath: path }),
  )
  console.log('Wrote ' + failed.length + ' known failures.')
  process.exit(0)
}
if (!values.quiet)
  for (const id of failed)
    console.log(
      (fresh.includes(id) ? '' : '[known] ') + id + '\n  ' + failing.get(id)!.join('\n  '),
    )
else for (const id of fresh) console.log(id + '\n  ' + failing.get(id)!.join('\n  '))
console.log(
  `${ids.length} guides, ${reports.length} sides: ${failed.length} fail physics, ${fresh.length} of them new or worse than the known list.`,
)
if (values['allow-known'])
  assert.equal(fresh.length, 0, 'New physics failures: ' + fresh.join(', '))
else assert.equal(failed.length, 0, failed.length + ' guides fail physics')
