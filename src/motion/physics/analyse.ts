/**
 * Physics report for one guide demonstration: floor and seat contact, balance, planted feet and
 * smoothness, measured on the same samples the player draws. Used by `check:physics` and handy
 * from a script when authoring.
 */
import { Quaternion, Vector3 } from 'three'
import { scores, type AuthoredId } from '../../studio/choreography'
import { clips, type Side } from '../../studio/clips'
import { chairSeat } from '../../studio/props/chair'
import { newProject } from '../../studio/project'
import { joints } from '../joints'
import type { MovementRig } from '../movementRig'
import { lowestHandBone } from '../studio/guides/ground'
import { contactGap, fixturePoint } from '../studio/guides/contacts'
import { solePad, toePad } from '../studio/anchors'
import { sampleStudio } from '../studio/sample'
import { bareJoint, centreOfMass, hull, isHandJoint, marginInside, worldBare } from './body'
import { BRIDGED, HANGING, RESTS_ON, TOL, TRAVELLING, WEIGHT_BEARING_GEAR } from './policy'

export const HZ = 60
const project = newProject()
const FIXTURES = new Set(['post', 'wall', 'door', 'table', 'bar'])
const pelvisJoints = new Set([0, 1, 12, 13, 15, 16])
/** Points followed for smoothness: trunk, head, and both arms and legs to their ends. */
const TRACKED = [0, 3, 5, 7, 8, 10, 11, 13, 14, 16, 17].map((i) => i)

export type Finding = { kind: string; t: number; value: number; detail?: string }
/** Skinned vertices of the performer: positions, joint indices and weights, four per vertex. */
export type Skin = { coords: Float32Array; indices: ArrayLike<number>; weights: ArrayLike<number> }
export type Report = {
  id: AuthoredId
  side: Side
  frames: number
  /** Lowest the performer rests above the floor during the clip, mm (negative: sunk in). */
  floorLow: number
  /** Highest the performer's lowest point rises above its support, mm. */
  floating: number
  /** Deepest penetration of floor or seat, mm. */
  penetration: number
  /** Lowest the bare atlas tissue rests above the floor in the clip, mm. */
  atlasLow: number
  atlasFloating: number
  /** Smallest margin of the centre of mass inside the base of support, mm (negative: outside). */
  balance: number
  /** Furthest a planted foot drifted, mm. */
  slide: number
  /** Largest acceleration of a tracked point, m/s². */
  pointAccel: number
  /** Largest joint angular acceleration, rad/s². */
  jointAccel: number
  /** Fastest tracked point during a held pose, m/s. */
  holdSpeed: number
  /** Furthest a hand's contact mark lies from the hand at a beat, mm. */
  reach: number
  findings: Finding[]
}

const key = (a: unknown) => JSON.stringify(a)
/** Time spans where the authored pose does not change: the holds. */
function holds(id: AuthoredId) {
  const f = scores[id]?.frames ?? [],
    out: [number, number][] = []
  for (let i = 1; i < f.length; i++)
    if (key(f[i].pose) === key(f[i - 1].pose)) out.push([f[i - 1].time, f[i].time])
  return out
}
/** Does this frame's support come from props the physics does not model? */
export const propSupported = (id: AuthoredId) =>
  (scores[id]?.gear ?? []).some((g) => WEIGHT_BEARING_GEAR.has(g))

export function analyse(
  rig: MovementRig,
  id: AuthoredId,
  side: Side,
  skin: Skin[] = [],
  stride = 3,
): Report {
  // Two guides are hand-written presets without a score: they have no seat model and no marks.
  const score = scores[id] as (typeof scores)[AuthoredId] | undefined,
    clip = clips[id],
    seated = score?.posture === 'chair' || score?.posture === 'figureFour',
    seat = score && seated ? chairSeat(id, side) : undefined
  const fixtures = new Set<string>()
  for (const f of score?.frames ?? [])
    for (const reach of [f.pose.ga, f.pose.gb]) {
      const mark = typeof reach === 'string' ? reach : Array.isArray(reach) ? reach[0] : undefined
      if (typeof mark === 'string' && FIXTURES.has(mark)) fixtures.add(mark)
    }
  const n = Math.ceil(clip.seconds * HZ)
  const times = Array.from({ length: n + 1 }, (_, i) => Math.min(clip.seconds, i / HZ))
  const holdSpans = holds(id)
  // A body in the middle of a move may leave its support (a hip switch lifts the pelvis to turn);
  // it must rest on it wherever it stops: at every beat and throughout every hold.
  const atRest = (t: number) =>
    !score ||
    score.frames.some((fr) => Math.abs(fr.time - t) < 0.5 / HZ) ||
    holdSpans.some(([s0, e0]) => t >= s0 && t <= e0)
  const beats = new Set((score?.frames ?? []).map((f) => Math.round(f.time * HZ)))
  const findings: Finding[] = []
  const prev: Vector3[][] = [],
    qprev: Quaternion[][] = []
  const b = new Float32Array(bareJoint.length * 3)
  const com = new Vector3(),
    tmp = new Vector3()
  const report: Report = {
    id,
    side,
    frames: times.length,
    floorLow: Infinity,
    floating: -Infinity,
    penetration: 0,
    atlasLow: Infinity,
    atlasFloating: -Infinity,
    balance: Infinity,
    slide: 0,
    pointAccel: 0,
    jointAccel: 0,
    holdSpeed: 0,
    reach: 0,
    findings,
  }
  const pos = (i: number) => rig.bones[i].getWorldPosition(new Vector3())
  const feet = [14, 17].map((j) => ({
    joint: j,
    sole: solePad(j === 14 ? 1 : -1),
    toe: toePad(j === 14 ? 1 : -1),
    mode: '' as '' | 'flat' | 'toe' | 'heel',
    start: new Vector3(),
  }))
  const bandWide = TOL.contact * 2
  for (let f = 0; f < times.length; f++) {
    const t = times[f]
    sampleStudio(rig, id, t, side, project)
    // Geometry at 30 Hz is plenty and keeps the sweep quick.
    if (f % 2 === 0) {
      const M = rig.skeleton.boneMatrices!
      let low = Infinity,
        seatGap = Infinity,
        seatSink = 0,
        restGap = Infinity
      const rests = score && !BRIDGED.has(id) ? RESTS_ON[score.posture] : undefined
      const support: [number, number][] = []
      const onSeat = (x: number, z: number) =>
        !!seat && Math.abs(x) < seat.width / 2 && Math.abs(z - seat.z) < seat.depth / 2
      for (const { coords, indices, weights } of skin)
        for (let i = 0, k = 0; i < coords.length; i += 3 * stride, k += 4 * stride) {
          const x = coords[i],
            y = coords[i + 1],
            z = coords[i + 2]
          let X = 0,
            Y = 0,
            Z = 0,
            top = 0
          for (let j = k; j < k + 4; j++) {
            const wt = weights[j]
            if (!wt) continue
            const o = indices[j] * 16
            X += wt * (M[o] * x + M[o + 4] * y + M[o + 8] * z + M[o + 12])
            Y += wt * (M[o + 1] * x + M[o + 5] * y + M[o + 9] * z + M[o + 13])
            Z += wt * (M[o + 2] * x + M[o + 6] * y + M[o + 10] * z + M[o + 14])
            if (wt > weights[top] || j === k) top = j
          }
          const hand = isHandJoint(indices[top])
          // The performer's hands are rigid mittens; the anatomy is judged on hands instead.
          if (hand) continue
          if (Y < low) low = Y
          if (rests?.includes(indices[top]) && Y < restGap) restGap = Y
          if (Y < bandWide) support.push([X, Z])
          if (seat && onSeat(X, Z)) {
            if (Y > seat.top - seat.depth && Y < seat.top + TOL.seatBand) support.push([X, Z])
            if (pelvisJoints.has(indices[top])) {
              seatGap = Math.min(seatGap, Y - seat.top)
              if (Y < seat.top - TOL.seatPenetration && Y > seat.top - 0.2)
                seatSink = Math.max(seatSink, seat.top - Y)
            }
          }
        }
      let handLow = Infinity
      for (const s of [1, -1] as const) handLow = Math.min(handLow, lowestHandBone(rig, s))
      const floor = Math.min(low, handLow)
      report.floorLow = Math.min(report.floorLow, low)
      const hung = HANGING.has(id),
        props = propSupported(id)
      // A seated body must reach its seat; any other posture must reach its floor; and the
      // segments the posture rests on must touch too, not only a heel or a toe.
      const rested = Math.min(floor, seat ? seatGap : Infinity)
      const resting = seat ? seatGap : restGap
      if (!hung && !props && atRest(t)) {
        const gap = Math.max(rested, rests ? resting : -Infinity)
        if (gap > report.floating) report.floating = gap
        if (rested > TOL.contact || (rests && resting > TOL.rest))
          findings.push({
            kind: 'floating',
            t,
            value: gap,
            detail: rested > TOL.contact ? 'whole body' : 'the resting segments',
          })
      }
      const sink = Math.max(-floor, seatSink)
      if (sink > report.penetration) report.penetration = sink
      if (
        sink > TOL.penetration &&
        !(seat && -floor < TOL.penetration && seatSink < TOL.seatPenetration)
      )
        findings.push({ kind: 'penetration', t, value: sink })
      // The bare atlas figure rests on the floor too, over a thin cushion of tissue it cannot show.
      worldBare(rig, b)
      let bareLow = Infinity
      for (let k = 1, i = 0; i < bareJoint.length; i++, k += 3)
        if (!isHandJoint(bareJoint[i])) bareLow = Math.min(bareLow, b[k])
      report.atlasLow = Math.min(report.atlasLow, bareLow)
      if (!hung && !props && !seat) {
        report.atlasFloating = Math.max(report.atlasFloating, bareLow)
        if (bareLow > TOL.tissueRest + TOL.contact)
          findings.push({ kind: 'atlas-floating', t, value: bareLow })
      }
      // Balance: centre of mass over the base of support. Hands on a declared fixture count.
      if (!hung && skin.length && atRest(t)) {
        centreOfMass(rig, com)
        let gripping = false
        for (const mark of fixtures)
          for (const s of [1, -1] as const) {
            const p = fixturePoint(id, mark as never, s),
              hand = rig.bones[s === 1 ? 8 : 11].getWorldPosition(tmp)
            if (hand.distanceTo(p) < 0.08) {
              support.push([p.x, p.z])
              gripping = true
            }
          }
        for (const s of [1, -1] as const)
          if (lowestHandBone(rig, s) < TOL.contact) {
            const hand = rig.bones[s === 1 ? 8 : 11].getWorldPosition(tmp)
            support.push([hand.x, hand.z])
          }
        const margin = marginInside(hull(support), com.x, com.z)
        report.balance = Math.min(report.balance, margin)
        if (margin < -(TOL.balance + (gripping ? TOL.heldBalance : 0))) {
          const poly = hull(support),
            box = [0, 1].map((a) => [
              Math.min(...poly.map((q) => q[a])),
              Math.max(...poly.map((q) => q[a])),
            ])
          findings.push({
            kind: 'balance',
            t,
            value: margin,
            detail: `com ${com.x.toFixed(2)},${com.z.toFixed(2)} base x ${box[0].map((v) => v.toFixed(2))} z ${box[1].map((v) => v.toFixed(2))} n${support.length}`,
          })
        }
      }
      // Planted feet stay put.
      for (const foot of feet) {
        const sole = rig.bones[foot.joint].localToWorld(foot.sole.clone()),
          toe = rig.bones[foot.joint].localToWorld(foot.toe.clone())
        const mode =
          sole.y < TOL.contact && toe.y < TOL.contact
            ? 'flat'
            : toe.y < TOL.contact
              ? 'toe'
              : sole.y < TOL.contact
                ? 'heel'
                : ''
        const at = mode === 'toe' ? toe : sole
        if (mode !== foot.mode) {
          foot.mode = mode
          foot.start.copy(at)
        } else if (mode && !TRAVELLING.has(id)) {
          const drift = Math.hypot(at.x - foot.start.x, at.z - foot.start.z)
          if (drift > report.slide) report.slide = drift
          if (drift > TOL.slide) findings.push({ kind: 'slide', t, value: drift, detail: mode })
        }
      }
    }
    // A hand's contact mark must lie within reach of the hand at every beat.
    if (score && side === 'left' && beats.has(f)) {
      const pose = score.frames.find((fr) => Math.round(fr.time * HZ) === f)!.pose
      for (const s of [1, -1] as const) {
        const gap = contactGap(rig, id, s === 1 ? pose.ga : pose.gb, s, s === 1 ? pose.ha : pose.hb)
        if (gap > report.reach) report.reach = gap
        if (gap > TOL.reach)
          findings.push({
            kind: 'reach',
            t,
            value: gap,
            detail: s === 1 ? 'left hand' : 'right hand',
          })
      }
    }
    // Smoothness at the full rate.
    prev.push(TRACKED.map(pos))
    qprev.push(TRACKED.map((j) => rig.bones[j].quaternion.clone()))
    if (prev.length > 3) {
      prev.shift()
      qprev.shift()
    }
    if (prev.length === 3) {
      const [a, m, c] = prev,
        [qa, qm, qc] = qprev
      for (let k = 0; k < TRACKED.length; k++) {
        const acc = tmp.copy(a[k]).addScaledVector(m[k], -2).add(c[k]).length() * HZ * HZ
        if (acc > report.pointAccel) report.pointAccel = acc
        if (acc > TOL.pointAccel)
          findings.push({ kind: 'point-accel', t, value: acc, detail: joints[TRACKED[k]][0] })
        const w1 = qa[k].angleTo(qm[k]) * HZ,
          w2 = qm[k].angleTo(qc[k]) * HZ,
          alpha = Math.abs(w2 - w1) * HZ
        if (alpha > report.jointAccel) report.jointAccel = alpha
        if (alpha > TOL.jointAccel && Math.max(w1, w2) > 0.2)
          findings.push({ kind: 'joint-accel', t, value: alpha, detail: joints[TRACKED[k]][0] })
      }
    }
    if (prev.length >= 2 && holdSpans.some(([s0, e0]) => t > s0 + 0.4 && t < e0))
      for (let k = 0; k < TRACKED.length; k++) {
        const v = prev.at(-1)![k].distanceTo(prev.at(-2)![k]) * HZ
        if (v > report.holdSpeed) report.holdSpeed = v
        if (v > TOL.holdSpeed)
          findings.push({ kind: 'hold-motion', t, value: v, detail: joints[TRACKED[k]][0] })
      }
  }
  return report
}
