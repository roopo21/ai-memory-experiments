/**
 * Reference-envelope check: is each guide's motion typical of how people move?
 *
 * `check:form` and `check:physics` say a pose is not impossible. This says it is also not unusual,
 * by comparing every guide, sampled at 30 Hz, with envelopes derived from two open datasets
 * (UI-PRMD, public domain; AddBiomechanics, CC BY 4.0). See docs/reference/motion-reference/.
 *
 *   generic, every guide   peak angular speed and acceleration per joint class, and the jerk of
 *                          each move between beats, against all reference movement
 *   mapped guides          joint extremes, joint coupling, move timing and foot contact against
 *                          the matching reference movement (checks/check-reference-map.ts)
 *
 * It is a REPORTING check. It always exits 0 unless --strict is given, and then only guides or
 * kinds missing from checks/check-reference-known.json fail, as with check:physics.
 *
 *   npm run check:reference                       # summary and every warning and failure
 *   npm run check:reference -- --only deep-squat-hold,cossack-squat
 *   npm run check:reference -- --report out.json  # every number per guide
 *   npm run check:reference -- --quiet            # summary line and new findings only
 *   npm run check:reference:strict                # fail on findings not in the known list
 *   npm run check:reference -- --write-known      # record today's findings as the known list
 *   npm run check:reference -- --write-map        # regenerate docs/reference/motion-reference/guide-map.md
 */
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { Vector3 } from 'three'
import { createMovementRig } from '../src/motion/movementRig'
import { measure } from '../src/motion/anatomy'
import { solePad, toePad } from '../src/motion/studio/anchors'
import { sampleStudio } from '../src/motion/studio/sample'
import { newProject } from '../src/studio/project'
import { scores, type AuthoredId } from '../src/studio/choreography'
import { clips } from '../src/studio/clips'
import { GUIDE_REFERENCE, type Mapping } from './check-reference-map'
import { FS, coupling, derivs, ldlj, range, timing } from './check-reference-metrics'

// ---- thresholds: everything tunable is here, in one place -------------------------------------
export const TOL = {
  /** Degrees beyond the reference extreme that warn and fail, for joint range. */
  angleWarn: 10,
  angleFail: 25,
  /**
   * A guide that is only *similar* to a reference movement (a passive stretch of the same joints)
   * may go beyond free active movement by this much before it is flagged. An assumption: no
   * reference here measures passive end range, so this is the least-supported number in the check.
   */
  passive: 30,
  /** A guide must move a joint this far in a move for its jerk to be judged (degrees). */
  jerkMinRange: 10,
  /** Peak speed and acceleration warn beyond the reference p99.9 times this, and fail beyond the second. */
  speedWarn: 1,
  speedFail: 1.5,
  /** Coupling slope: warn beyond the reference p5..p95 widened by max(floor, share of its width). */
  couplingFloor: 0.15,
  couplingShare: 0.3,
  /** The driving joint must move this far (degrees) for a coupling slope to mean anything. */
  couplingMinRange: 20,
  /** A guide rises faster than this share of the reference's fastest 5 percent (10 to 90 percent of range). */
  fastWarn: 0.6,
  fastFail: 0.4,
  /** Heel-lift share of the clip beyond the reference p95 that warns, and foot drift beyond p95. */
  heelLift: 0.15,
  drift: 0.015,
  /** Jerk: warn below the reference p1, fail this far below it. */
  jerkFail: 2,
  /** Lumbar share of trunk lean: warn beyond the reference p5..p95 by this, fail by twice it. */
  share: 0.25,
  /** Trunk lean (degrees from vertical) below which the lumbopelvic split is not judged. */
  leanMin: 15,
} as const

/**
 * The estimator must not drift from its Python twin. A minimum-jerk stroke scores -5.3 over its
 * whole span and -4.36 once trimmed to where speed exceeds 5 percent of peak, which both ends use.
 */
function selfTest() {
  const x = Array.from({ length: 61 }, (_, i) => {
    const u = i / 60
    return 60 * (10 * u ** 3 - 15 * u ** 4 + 6 * u ** 5)
  })
  const j = ldlj(x)
  assert(
    j !== undefined && Math.abs(j - -4.36) < 0.1,
    `minimum-jerk LDLJ ${j} should be about -4.36`,
  )
  const t = timing(x)
  assert(t && t.rise > 0.5 && t.rise < 1.5, 'rise time of a two second stroke')
  assert(
    Math.abs(
      coupling(
        x,
        x.map((q) => 2 * q + 1),
      )!.slope - 2,
    ) < 1e-9,
    'coupling slope',
  )
}
selfTest()

const { values } = parseArgs({
  options: {
    only: { type: 'string' },
    report: { type: 'string' },
    quiet: { type: 'boolean' },
    strict: { type: 'boolean' },
    'write-known': { type: 'boolean' },
    'write-map': { type: 'boolean' },
  },
})

type Status = 'pass' | 'warn' | 'fail'
type Finding = {
  kind: string
  severity: 'warn' | 'fail'
  joint: string
  /** Seconds into the clip and the 30 Hz frame index. */
  t: number
  frame: number
  value: number
  limit: string
}

// ---- reference data ---------------------------------------------------------------------------
type Pct = Record<string, number>
type Family = {
  subjects: number
  items: number
  primary: string | null
  sided: boolean
  angles: Record<string, { frames: Pct; min: Pct; max: Pct; rom: Pct }>
  timing?: Record<string, Pct>
  smoothness?: Record<string, Pct>
  coupling?: Record<string, Record<string, Pct>>
  contact?: Record<string, Pct>
}
type Envelopes = {
  generic: {
    speed_dps: Record<string, Pct>
    accel_dps2: Record<string, Pct>
    ldlj: Pct
    lumbar_share: Record<string, Pct>
  }
  families: Record<string, Family>
}
const dataFile = new URL('../docs/reference/motion-reference/data/envelopes.json', import.meta.url)
const env: Envelopes = JSON.parse(readFileSync(dataFile, 'utf8'))
const knownFile = new URL('./check-reference-known.json', import.meta.url)
const known: Record<string, string[]> = (() => {
  try {
    return JSON.parse(readFileSync(knownFile, 'utf8'))
  } catch {
    return {}
  }
})()

/** Joint class for the generic speed envelope, by the part of the measure() key after the side. */
const CLASS: Record<string, string> = {
  'hip.flexion': 'hip',
  'hip.abduction': 'hip',
  'knee.flexion': 'knee',
  'ankle.plantarflexion': 'ankle',
  'shoulder.elevation': 'shoulder',
  'elbow.flexion': 'elbow',
  'trunk.flexion': 'trunk',
  'trunk.rotation': 'trunk',
  'trunk.lateral': 'trunk',
  'pelvis.tilt': 'pelvis',
}

// The reference was low-passed at 5 Hz to remove sensor noise. Guides are analytic and noise free,
// so they are measured raw: a low-pass would hide the one-frame pops this check is meant to find.
// ---- sampling ---------------------------------------------------------------------------------
const rig = createMovementRig(),
  project = newProject(),
  tmp = new Vector3(),
  hipP = new Vector3(),
  kneeP = new Vector3()
const THIGH = [12, 15] as const,
  SHIN = [13, 16] as const,
  FOOT = [14, 17] as const

/** Sagittal swing of a vector from straight down toward the body's front (+z), degrees. */
const swing = (v: Vector3) => (Math.atan2(v.z, -v.y) * 180) / Math.PI

type Sampled = {
  id: string
  times: number[]
  series: Record<string, number[]>
  feet: { heel: number[]; toe: number[] }[]
}
function sample(id: AuthoredId): Sampled {
  const clip = clips[id],
    n = Math.ceil(clip.seconds * FS),
    times: number[] = [],
    frames: Record<string, number>[] = [],
    feet = [0, 1].map(() => ({ heel: [] as number[], toe: [] as number[] }))
  for (let f = 0; f <= n; f++) {
    const t = Math.min(clip.seconds, f / FS)
    times.push(t)
    sampleStudio(rig, id, t, 'left', project)
    const m = measure(rig)
    // Pelvic tilt: the hip angle is measured against the pelvis, so the thigh's own swing from
    // the vertical differs from it by the tilt. Same relation the AddBiomechanics tilt obeys. The
    // difference is wrapped to +-180 so a leg passing the vertical does not jump 360 degrees.
    let tilt = 0
    for (const s of [0, 1]) {
      rig.bones[THIGH[s]].getWorldPosition(hipP)
      rig.bones[SHIN[s]].getWorldPosition(kneeP)
      const d = m[(s === 0 ? 'L.' : 'R.') + 'hip.flexion'] - swing(tmp.subVectors(kneeP, hipP))
      tilt += (d - 360 * Math.round(d / 360)) / 2
    }
    frames.push({ ...m, 'pelvis.tilt': tilt, 'trunk.inclination': tilt + m['trunk.flexion'] })
    for (const s of [0, 1]) {
      const sign = s === 0 ? 1 : -1
      feet[s].heel.push(rig.bones[FOOT[s]].localToWorld(solePad(sign)).y)
      feet[s].toe.push(rig.bones[FOOT[s]].localToWorld(toePad(sign)).y)
    }
  }
  // Some angles are undefined in part of a clip (shoulder rotation near full elevation): NaN there.
  const series: Record<string, number[]> = {}
  for (const k of new Set(frames.flatMap((m) => Object.keys(m))))
    series[k] = frames.map((m) => m[k] ?? NaN)
  return { id, times, series, feet }
}

// ---- the findings -----------------------------------------------------------------------------
const stripSide = (k: string) => k.replace(/^[LR]\./, '')
const UPRIGHT = new Set([
  'stand',
  'chair',
  'lunge',
  'squat',
  'halfKneel',
  'kneel',
  'split',
  'heelSit',
  'floorSeat',
  'longSit',
  'straddle',
  'butterfly',
  'figureFour',
])
/**
 * Joint class of a measured series for the speed and jerk envelopes. Pelvic tilt is a world angle
 * and only means something upright; lying down it is skipped.
 */
function classOf(id: string, k: string) {
  const cls = CLASS[stripSide(k)]
  return cls === 'pelvis' && !UPRIGHT.has(scores[id as AuthoredId]?.posture ?? '') ? undefined : cls
}
const names = (s: Sampled, joint: string) =>
  joint.includes('.') && !['pelvis.tilt', 'trunk.inclination', 'trunk.flexion'].includes(joint)
    ? ['L.' + joint, 'R.' + joint].filter((k) => s.series[k])
    : [joint]
const at = (s: Sampled, i: number) => ({ t: +s.times[i].toFixed(2), frame: i })
const argExt = (x: number[], max: boolean) => x.indexOf(max ? Math.max(...x) : Math.min(...x))

/** Moves between the authored beats, as [start, end] frame pairs where the pose changes. */
function transitions(id: AuthoredId, s: Sampled): [number, number][] {
  const frames = scores[id]?.frames ?? [],
    out: [number, number][] = []
  const key = (a: unknown) => JSON.stringify(a)
  for (let i = 1; i < frames.length; i++)
    if (key(frames[i].pose) !== key(frames[i - 1].pose))
      out.push([
        Math.min(s.times.length - 1, Math.round(frames[i - 1].time * FS)),
        Math.min(s.times.length - 1, Math.round(frames[i].time * FS)),
      ])
  return out
}

/** Postures in which the trunk's angle from the vertical says how far it is bent. */

function generic(id: AuthoredId, s: Sampled, out: Finding[]) {
  // Lumbopelvic rhythm: in a bend the trunk's lean is shared between the lumbar spine and the
  // pelvis. The reference squats and sit-to-stand put the lumbar share at about 40 to 60 percent.
  const share = env.generic.lumbar_share?.addbiomechanics
  if (share && UPRIGHT.has(scores[id]?.posture ?? '')) {
    const incl = s.series['trunk.inclination'],
      i = argExt(incl, true)
    if (incl[i] >= TOL.leanMin) {
      const value = s.series['trunk.flexion'][i] / incl[i],
        over = Math.max(share.p5 - value, value - share.p95)
      if (over > TOL.share)
        out.push({
          kind: 'lumbopelvic',
          severity: over > 2 * TOL.share ? 'fail' : 'warn',
          joint: 'trunk.flexion/trunk.inclination',
          ...at(s, i),
          value: +value.toFixed(2),
          limit: `${share.p5}..${share.p95} ± ${TOL.share} (reference lumbar share of trunk lean, p5..p95)`,
        })
    }
  }
  for (const [k, raw] of Object.entries(s.series)) {
    const cls = classOf(id, k)
    if (!cls || !raw.every(Number.isFinite)) continue
    const { v, a } = derivs(raw)
    for (const [kind, arr, limits, unit] of [
      ['speed', v, env.generic.speed_dps[cls], 'deg/s'],
      ['accel', a, env.generic.accel_dps2[cls], 'deg/s²'],
    ] as const) {
      if (!limits) continue
      const abs = arr.map(Math.abs),
        peak = Math.max(...abs),
        i = abs.indexOf(peak),
        ref = limits['p99.9']
      if (peak > ref * TOL.speedFail || peak > ref * TOL.speedWarn)
        out.push({
          kind,
          severity: peak > ref * TOL.speedFail ? 'fail' : 'warn',
          joint: k,
          ...at(s, i),
          value: +peak.toFixed(0),
          limit: `${ref} ${unit} (reference p99.9)`,
        })
    }
  }
  // Jerk of each move between beats, for the joints that really move in it.
  const floor = env.generic.ldlj.p1
  for (const [a, b] of transitions(id, s))
    for (const [k, raw] of Object.entries(s.series)) {
      if (!classOf(id, k) || !raw.every(Number.isFinite)) continue
      const seg = raw.slice(a, b + 1)
      if (seg.length < 6 || range(seg) < TOL.jerkMinRange) continue
      const j = ldlj(seg)
      if (j !== undefined && j < floor)
        out.push({
          kind: 'jerk',
          severity: j < floor - TOL.jerkFail ? 'fail' : 'warn',
          joint: k,
          ...at(s, a),
          value: +j.toFixed(2),
          limit: `>= ${floor} (reference p1 log dimensionless jerk)`,
        })
    }
}

/** The side doing the work: the one whose primary joint moves more. */
function working(s: Sampled, primary: string) {
  const r = ['L.', 'R.'].map((p) => (s.series[p + primary] ? range(s.series[p + primary]) : -1))
  return r[0] >= r[1] ? 0 : 1
}

function mapped(s: Sampled, map: Mapping, out: Finding[]) {
  const fams = map.families.map((f) => env.families[f]).filter(Boolean)
  if (!fams.length) return
  const lowBound = (j: string) =>
    Math.min(
      ...fams
        .map((f) => f.angles[j])
        .filter(Boolean)
        .flatMap((a) => [a.min.p5, a.frames.p1]),
    )
  const highBound = (j: string) =>
    Math.max(
      ...fams
        .map((f) => f.angles[j])
        .filter(Boolean)
        .flatMap((a) => [a.max.p95, a.frames.p99]),
    )
  const sided = fams.some((f) => f.sided)
  const primary = fams.find((f) => f.primary)?.primary
  const side = sided && primary ? working(s, primary) : -1
  const sideKeys = (j: string) =>
    side >= 0 ? [(side === 0 ? 'L.' : 'R.') + j].filter((k) => s.series[k]) : names(s, j)
  const joints = new Set(map.joints ?? fams.flatMap((f) => Object.keys(f.angles)))
  // Joint extremes. A 'similar' movement may be a passive stretch that goes beyond free active
  // movement, so it gets the passive allowance on top of the tolerance.
  const allow = map.relation === 'similar' ? TOL.passive : 0
  for (const j of joints) {
    {
      const hi = highBound(j),
        lo = lowBound(j)
      if (!Number.isFinite(hi) || j.startsWith('other.')) continue
      for (const k of sideKeys(j)) {
        const x = s.series[k],
          iMax = argExt(x, true),
          iMin = argExt(x, false)
        for (const [value, i, limit, over, label] of [
          [x[iMax], iMax, hi, x[iMax] - hi, 'high'],
          [x[iMin], iMin, lo, lo - x[iMin], 'low'],
        ] as const)
          if (over > TOL.angleWarn + allow)
            out.push({
              kind: 'range',
              severity: over > TOL.angleFail + allow ? 'fail' : 'warn',
              joint: k,
              ...at(s, i),
              value: +value.toFixed(1),
              limit: `${limit.toFixed(0)}° (reference ${label} extreme${allow ? ' plus the passive allowance' : ''})`,
            })
      }
    }
  }
  // Coupling between joints over the whole clip.
  const pairs = new Set(
    map.relation === 'same' || map.coupling
      ? fams.flatMap((f) => Object.keys(f.coupling ?? {}))
      : [],
  )
  for (const pair of pairs) {
    const [a, b] = pair.split('->')
    if (!b || !joints.has(a) || !joints.has(b)) continue
    const slopes = fams.flatMap((f) => (f.coupling?.[pair]?.slope ? [f.coupling[pair].slope] : []))
    const lo = Math.min(...slopes.map((q) => q.p5)),
      hi = Math.max(...slopes.map((q) => q.p95)),
      tol = Math.max(TOL.couplingFloor, TOL.couplingShare * (hi - lo))
    for (const ka of sideKeys(a)) {
      const kb = ka.replace(a, b),
        c =
          s.series[kb] && range(s.series[ka]) >= TOL.couplingMinRange
            ? coupling(s.series[ka], s.series[kb])
            : undefined
      if (!c) continue
      const over = Math.max(lo - c.slope, c.slope - hi)
      if (over > tol)
        out.push({
          kind: 'coupling',
          severity: over > 2 * tol ? 'fail' : 'warn',
          joint: `${ka}->${kb}`,
          ...at(s, argExt(s.series[ka], true)),
          value: +c.slope.toFixed(2),
          limit: `${lo.toFixed(2)}..${hi.toFixed(2)} ± ${tol.toFixed(2)} (reference p5..p95)`,
        })
    }
  }
  // Move timing: not faster than the quickest natural repetitions.
  if (primary && map.relation === 'same') {
    const k = sideKeys(primary)[0],
      tm = k && timing(s.series[k])
    const refs = fams.flatMap((f) => (f.timing ? [f.timing] : []))
    if (tm && refs.length)
      for (const phase of ['rise', 'fall'] as const) {
        const ref = Math.min(...refs.map((t) => t[phase + '_s'].p5))
        if (tm[phase] < ref * TOL.fastWarn)
          out.push({
            kind: 'timing',
            severity: tm[phase] < ref * TOL.fastFail ? 'fail' : 'warn',
            joint: k,
            ...at(s, argExt(s.series[k], true)),
            value: +tm[phase].toFixed(2),
            limit: `>= ${(ref * TOL.fastWarn).toFixed(2)} s (${phase}, 60% of the reference p5)`,
          })
      }
  }
  // Foot contact: heels stay down and planted feet do not drift, as in the reference.
  const contact = fams.flatMap((f) => (f.contact ? [f.contact] : []))
  if (contact.length && map.relation === 'same') {
    const heelRef = Math.max(...contact.map((c) => c.heel_up_frac.p95))
    for (const [i, foot] of s.feet.entries()) {
      const up =
        foot.heel.filter((h, n) => h >= 0.015 && foot.toe[n] < 0.015).length / foot.heel.length
      if (up > heelRef + TOL.heelLift)
        out.push({
          kind: 'contact',
          severity: 'warn',
          joint: (i === 0 ? 'L' : 'R') + '.heel',
          t: 0,
          frame: 0,
          value: +up.toFixed(2),
          limit: `<= ${(heelRef + TOL.heelLift).toFixed(2)} of the clip with the heel up and toes down`,
        })
    }
  }
}

// ---- quarantine: the licence safeguard, which is not a report --------------------------------
/**
 * Only aggregate numbers from the two approved open sources may be in the repository. This fails
 * (even without --strict) if the data file names a source outside the allowlist, has an entry with
 * fewer than five subjects, or if any tracked file looks like raw motion data.
 */
const ALLOWED = new Set(['CC-BY-4.0', 'ODC-PDDL-1.0', 'CC0-1.0'])
const RAW = /\.(bvh|amc|asf|c3d|fbx|npz|pkl|mot|osim|b3d|trc|smpl|bvhz)$/i
function quarantine() {
  const bad: string[] = []
  const sources = (
    env as unknown as { sources?: Record<string, { licence?: string; tier?: string }> }
  ).sources
  for (const [id, src] of Object.entries(sources ?? {}))
    if (!ALLOWED.has(src.licence ?? '') || src.tier !== 'commercial-safe')
      bad.push(`source ${id} has licence ${src.licence} / tier ${src.tier}`)
  for (const [name, fam] of Object.entries(env.families))
    if (fam.subjects < 5) bad.push(`${name} has only ${fam.subjects} subjects`)
  const files = execFileSync('git', ['ls-files'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
  })
    .toString()
    .split('\n')
  for (const f of files)
    if (RAW.test(f) || /smpl.*\.(pkl|npz)$/i.test(f)) bad.push(`raw motion file tracked: ${f}`)
  assert.equal(bad.length, 0, 'Reference quarantine violated:\n  ' + bad.join('\n  '))
}
quarantine()

// ---- the guide map as documentation ---------------------------------------------------------
if (values['write-map']) {
  const ordered = Object.entries(clips)
    .filter(([, c]) => c.guide)
    .map(([id, c]) => ({ id, name: c.name, kind: c.kind ?? 'stretch' }))
  const mapped = ordered.filter((g) => GUIDE_REFERENCE[g.id]),
    rest = ordered.filter((g) => !GUIDE_REFERENCE[g.id])
  const lines = [
    '# Guide to reference movement map',
    '',
    'Generated by `npm run check:reference -- --write-map` from `checks/check-reference-map.ts`. Do not edit by hand.',
    '',
    `${mapped.length} of ${ordered.length} guides are held against a reference movement. The other ${rest.length} get the generic checks only.`,
    '',
    '| Guide | Relation | Reference movements | Joints | Why |',
    '| ----- | -------- | ------------------- | ------ | --- |',
    ...mapped.map((g) => {
      const m = GUIDE_REFERENCE[g.id]
      return `| \`${g.id}\` | ${m.relation}${m.coupling ? ' + coupling' : ''} | ${m.families.map((f) => '`' + f + '`').join(', ')} | ${m.joints?.join(', ') ?? 'all the family reports'} | ${m.note} |`
    }),
    '',
    '## Generic only',
    '',
    rest.map((g) => '`' + g.id + '`').join(', ') + '.',
    '',
  ]
  const { format, resolveConfig } = await import('prettier')
  const path = fileURLToPath(
    new URL('../docs/reference/motion-reference/guide-map.md', import.meta.url),
  )
  writeFileSync(
    path,
    await format(lines.join('\n'), { ...(await resolveConfig(path)), filepath: path }),
  )
  console.log(`Wrote the map: ${mapped.length} mapped, ${rest.length} generic only.`)
  process.exit(0)
}

// ---- run ----------------------------------------------------------------------------------------
const ids = (values.only?.split(',') ??
  Object.entries(clips)
    .filter(([, c]) => c.guide)
    .map(([id]) => id)) as AuthoredId[]
type Row = {
  id: string
  status: Status
  relation: string
  families: string[]
  findings: Finding[]
  /** Largest angular speed (deg/s) and acceleration (deg/s²) per joint class, for margins. */
  peaks: Record<string, { speed: number; accel: number }>
}
/** Peak speed and acceleration per joint class, over every angle of the class on both sides. */
function peaks(id: string, s: Sampled) {
  const out: Row['peaks'] = {}
  for (const [k, raw] of Object.entries(s.series)) {
    const cls = classOf(id, k)
    if (!cls || !raw.every(Number.isFinite)) continue
    const { v, a } = derivs(raw),
      p = (out[cls] ??= { speed: 0, accel: 0 })
    p.speed = Math.max(p.speed, ...v.map(Math.abs))
    p.accel = Math.max(p.accel, ...a.map(Math.abs))
  }
  for (const p of Object.values(out))
    ((p.speed = Math.round(p.speed)), (p.accel = Math.round(p.accel)))
  return out
}
const rows: Row[] = []
for (const id of ids) {
  const map = GUIDE_REFERENCE[id],
    s = sample(id),
    findings: Finding[] = []
  generic(id, s, findings)
  if (map) mapped(s, map, findings)
  const status: Status = findings.some((f) => f.severity === 'fail')
    ? 'fail'
    : findings.length
      ? 'warn'
      : 'pass'
  rows.push({
    id,
    status,
    relation: map?.relation ?? 'generic only',
    families: map?.families ?? [],
    findings,
    peaks: peaks(id, s),
  })
}
rig.skeleton.dispose()

const count = (st: Status) => rows.filter((r) => r.status === st).length
// A guide is new if it, or a kind of finding on it, is not in the known list.
const kindsOf = (r: Row) => [...new Set(r.findings.map((f) => f.kind))]
const fresh = rows.filter((r) => kindsOf(r).some((k) => !known[r.id]?.includes(k)))

if (values['write-known']) {
  const all = Object.fromEntries(
    rows
      .filter((r) => r.findings.length)
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((r) => [r.id, kindsOf(r).sort()]),
  )
  const { format, resolveConfig } = await import('prettier')
  const path = fileURLToPath(knownFile)
  writeFileSync(
    path,
    await format(JSON.stringify(all), { ...(await resolveConfig(path)), filepath: path }),
  )
  console.log('Wrote ' + Object.keys(all).length + ' known findings.')
  process.exit(0)
}
if (values.report) writeFileSync(values.report, JSON.stringify(rows, null, 1))

const show = values.quiet ? fresh : rows.filter((r) => r.status !== 'pass')
for (const r of show) {
  console.log(
    `${r.status.toUpperCase()} ${r.id}${fresh.includes(r) ? '' : ' [known]'}  (${r.relation}${r.families.length ? ': ' + r.families.join(', ') : ''})`,
  )
  // One line per kind and joint, at the worst moment.
  const worst = new Map<string, Finding>()
  for (const f of r.findings) {
    const key = f.kind + ' ' + f.joint,
      w = worst.get(key)
    if (
      !w ||
      (f.severity === 'fail' && w.severity !== 'fail') ||
      Math.abs(f.value) > Math.abs(w.value)
    )
      worst.set(key, f)
  }
  for (const f of worst.values())
    console.log(
      `  ${f.severity} ${f.kind} ${f.joint} ${f.value} at ${f.t.toFixed(2)} s (frame ${f.frame}); expected ${f.limit}`,
    )
}
const byKind = new Map<string, Set<string>>()
for (const r of rows)
  for (const f of r.findings) byKind.set(f.kind, (byKind.get(f.kind) ?? new Set()).add(r.id))
if (byKind.size)
  console.log(
    'Guides by kind of finding: ' +
      [...byKind]
        .sort((a, b) => b[1].size - a[1].size)
        .map(([k, v]) => `${k} ${v.size}`)
        .join(', '),
  )
const mappedCount = rows.filter((r) => r.families.length).length
console.log(
  `${rows.length} guides (${mappedCount} matched to reference movement, ${rows.length - mappedCount} generic only): ` +
    `${count('pass')} pass, ${count('warn')} warn, ${count('fail')} fail; ` +
    `${fresh.length} with findings not in the known list.`,
)
if (values.strict && fresh.length) {
  console.error('New reference findings: ' + fresh.map((r) => r.id).join(', '))
  process.exit(1)
}
