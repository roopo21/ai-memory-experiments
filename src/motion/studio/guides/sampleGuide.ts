import { Euler, Quaternion, Vector3 } from 'three'
import { createMovementRig, restPose, type MovementRig } from '../../movementRig'
import { ANKLE_Y, indexOfJoint, joints, type Joint } from '../../joints'
import type { Side } from '../../../studio/clips'
import { scores, type AuthoredId } from '../../../studio/choreography'
import type { Aim, Mark, Pose, Point, Reach } from '../../../studio/choreography/types'
import { contactOrientation, contactShape, markOf, placeHand } from './contacts'
import { crossedAnkle, pinch, equipmentPose, inchworm } from './precision'
import { cycleAt } from './cycles'
import { groundGuide } from './ground'
import {
  prepareSupports,
  clearFloorArms,
  floorHands,
  standingMarks,
  lockStandingFeet,
  type FootMark,
} from './supports'
import { postures } from './postures'
import {
  articulateArm,
  articulateLeg,
  handShape,
  limb,
  reachArm,
  reachLeg,
  setArm,
  setHand,
  setLeg,
  setToes,
} from '../../anatomy'
const rad = Math.PI / 180
const Q = (x = 0, y = 0, z = 0, order: Euler['order'] = 'XYZ') =>
  new Quaternion().setFromEuler(new Euler(x * rad, y * rad, z * rad, order))
const trunk = (v: Point | undefined, share: number) =>
  Q((v?.[0] ?? 0) * share, (v?.[1] ?? 0) * share, -(v?.[2] ?? 0) * share)
const other = joints.map(([n], i) =>
  n.startsWith('left')
    ? indexOfJoint[n.replace('left', 'right') as Joint]
    : n.startsWith('right')
      ? indexOfJoint[n.replace('right', 'left') as Joint]
      : i,
)
// A standing hinge or a seated forward fold turns the pelvis above supporting legs.
const hinged = new Set([
  'stand',
  'chair',
  'figureFour',
  'floorSeat',
  'longSit',
  'straddle',
  'butterfly',
  'lunge',
  'halfKneel',
  'split',
])
const sides = [1, -1] as const
function poseAt(r: MovementRig, id: AuthoredId, frame: Pose, phase: number) {
  const score = scores[id],
    base = postures[score.posture],
    p = { ...base.pose, ...frame },
    offset = p.shift ?? [0, 0, 0]
  restPose(r)
  r.root.position.set(offset[0], base.y + offset[1], (base.z ?? 0.06) + offset[2])
  const pelvis = trunk(p.pelvis, 1),
    onSide = score.posture === 'side'
  r.root.quaternion
    .copy(Q(base.pitch ?? 0, 0, onSide ? (id === 'sleeper-stretch' ? -90 : 90) : 0))
    .multiply(pelvis)
  for (const [j, share] of [
    [1, 0.36],
    [2, 0.38],
    [3, 0.26],
  ])
    r.bones[j].quaternion.copy(trunk(p.spine, share))
  r.bones[4].quaternion.copy(trunk(p.neck, 0.57))
  r.bones[5].quaternion.copy(trunk(p.neck, 0.43))
  r.bones[20].quaternion.copy(Q(p.jaw?.[0], p.jaw?.[1]))
  for (const s of sides) {
    const act = s === 1,
      j = limb(s)
    const shoulder = act || score.both ? p.shoulders : undefined
    setArm(r, s, (act ? p.a : p.b) ?? [], shoulder)
    setLeg(r, s, (act ? p.leg : p.other) ?? [])
    if (hinged.has(score.posture) && id !== 'inchworm')
      r.bones[j.thigh].quaternion.premultiply(pelvis.clone().invert())
    setHand(r, s, handShape((act ? p.f : p.g) ?? contactShape(act ? p.ga : p.gb)))
    setToes(r, s, act ? p.toes : p.otherToes)
  }
  r.root.updateMatrixWorld(true)
  if (id === 'inchworm') {
    inchworm(r, phase)
    return
  }
  prepareSupports(r, id, p)
  crossedAnkle(r, id, p)
  if (id === 'ulnar-tensioner' && Array.isArray(p.f) && p.f[6]) pinch(r)
  groundGuide(r, id, true)
  r.root.updateMatrixWorld(true)
  equipmentPose(r, id, p)
  placeHand(r, id, p.ga, 1, p.ha)
  placeHand(r, id, p.gb, -1, p.hb)
  floorHands(r, id, p)
  clearFloorArms(r, id)
}
/** Make every limb anatomical while keeping each hand and foot exactly where it is. */
function articulate(r: MovementRig) {
  for (const s of sides) {
    articulateArm(r, s)
    articulateLeg(r, s)
  }
  r.root.updateMatrixWorld(true)
}
type Effector = { at: Vector3; q: Quaternion }
type Key = {
  time: number
  root: Vector3
  rotations: Quaternion[]
  hands: Effector[]
  feet: Effector[]
  reach: (Reach | undefined)[]
  aims: (Aim | undefined)[]
}
const cache = new Map<AuthoredId, Key[]>()
const feet = new Map<AuthoredId, FootMark[]>()
const effector = (r: MovementRig, i: number): Effector => ({
  at: r.bones[i].getWorldPosition(new Vector3()),
  q: r.bones[i].getWorldQuaternion(new Quaternion()),
})
function keysFor(id: AuthoredId) {
  const cached = cache.get(id)
  if (cached) return cached
  const r = createMovementRig(),
    score = scores[id]
  const keys = score.frames.map((f, phase) => {
    poseAt(r, id, f.pose, phase)
    articulate(r)
    if (!f.time) feet.set(id, standingMarks(r, id))
    // Beats accumulate, so each frame's pose already carries every contact still in force.
    const reach = [f.pose.ga, f.pose.gb],
      aims = [f.pose.ha, f.pose.hb]
    return {
      time: f.time,
      root: r.root.position.clone(),
      rotations: r.bones.map((b) => b.quaternion.clone()),
      hands: sides.map((s) => effector(r, limb(s).hand)),
      feet: sides.map((s) => effector(r, limb(s).foot)),
      reach,
      aims,
    }
  })
  r.skeleton.dispose()
  cache.set(id, keys)
  return keys
}
/** The mark a contact uses, `point` for a bare coordinate, or nothing for a free hand. */
const contactKind = (reach: Reach | undefined): Mark | 'point' | undefined =>
  reach === undefined || reach === 'free' ? undefined : (markOf(reach) ?? 'point')
/** Interpolate a contact between two beats that use the same mark. */
function blendReach(a: Reach, b: Reach, f: number): Reach {
  const off = (x: Reach) =>
    typeof x === 'string' ? [0, 0, 0] : typeof x[0] === 'string' ? x.slice(1) : x
  const [ax, ay, az] = off(a) as number[],
    [bx, by, bz] = off(b) as number[]
  const v = [ax + (bx - ax) * f, ay + (by - ay) * f, az + (bz - az) * f] as const
  const mark = contactKind(a)
  return mark === 'point' ? v : [mark as Mark, v[0], v[1], v[2]]
}
const planted = (a: Effector, b: Effector, height: number) =>
  a.at.distanceTo(b.at) < 0.02 && Math.max(a.at.y, b.at.y) < height
export function sampleGuide(r: MovementRig, id: AuthoredId, time: number, side: Side) {
  const keys = keysFor(id),
    i = keys.findIndex((k) => k.time >= time),
    a = keys[Math.max(0, i - 1)],
    b = keys[i < 0 ? keys.length - 1 : i]
  const u = b.time === a.time ? 0 : (time - a.time) / (b.time - a.time),
    f = u * u * (3 - 2 * u)
  r.root.position.lerpVectors(a.root, b.root, f)
  for (let j = 0; j < joints.length; j++)
    r.bones[j].quaternion.slerpQuaternions(a.rotations[j], b.rotations[j], f)
  cycleAt(r, id, time)
  lockStandingFeet(r, feet.get(id)!)
  if (id === 'standing-figure-four') crossedAnkle(r, id, {})
  groundGuide(r, id)
  r.root.updateMatrixWorld(true)
  if (f > 0 && f < 1) holdContacts(r, id, a, b, f)
  articulate(r)
  if (side === 'right' && !scores[id].both) {
    // Reflect the authored performance once. The tiny bilateral differences in the scanned
    // bind anatomy remain visible. Contact solves and phase timing stay on the same branch.
    r.root.position.x *= -1
    for (let j = 0; j < joints.length; j++) {
      if (other[j] < j) continue
      const q = r.bones[j].quaternion,
        v = r.bones[other[j]].quaternion
      const { x, y, z, w } = q
      q.set(v.x, -v.y, -v.z, v.w)
      if (other[j] !== j) v.set(x, -y, -z, w)
    }
  }
}
/**
 * Between beats, a hand that keeps the same contact stays on it, and a planted hand or foot stays
 * planted, instead of drifting while the joints interpolate.
 */
function holdContacts(r: MovementRig, id: AuthoredId, a: Key, b: Key, f: number) {
  const posture = scores[id].posture
  sides.forEach((s, n) => {
    const reachA = a.reach[n],
      reachB = b.reach[n],
      mark = contactKind(reachA)
    if (mark && mark === contactKind(reachB)) {
      const reach = blendReach(reachA!, reachB!, f),
        q = contactOrientation(r, id, reach, s, a.aims[n]).slerp(
          contactOrientation(r, id, reach, s, b.aims[n]),
          f,
        )
      placeHand(r, id, reach, s, q)
      return
    }
    // A palm planted on the floor in both beats stays where it was put.
    if (planted(a.hands[n], b.hands[n], 0.06)) {
      const j = limb(s)
      reachArm(
        r,
        s,
        a.hands[n].at.clone().lerp(b.hands[n].at, f),
        r.bones[j.hand].getWorldQuaternion(new Quaternion()),
        r.bones[j.fore].getWorldPosition(new Vector3()),
      )
    }
  })
  if (posture === 'stand' || posture === 'lunge' || posture === 'squat') return
  sides.forEach((s, n) => {
    // A foot on the floor in both beats keeps its place; it may still turn, as in a cycle.
    if (!planted(a.feet[n], b.feet[n], ANKLE_Y + 0.03)) return
    const j = limb(s)
    reachLeg(
      r,
      s,
      a.feet[n].at.clone().lerp(b.feet[n].at, f),
      r.bones[j.foot].getWorldQuaternion(new Quaternion()),
      r.bones[j.shin].getWorldPosition(new Vector3()),
    )
  })
}
