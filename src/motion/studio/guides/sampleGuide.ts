import { Euler, Quaternion, Vector3 } from 'three'
import { createMovementRig, restPose, type MovementRig } from '../../movementRig'
import { ANKLE_Y, indexOfJoint, joints, type Joint } from '../../joints'
import type { Side } from '../../../studio/clips'
import { scores, type AuthoredId } from '../../../studio/choreography'
import { grip, loopGrip } from '../../../studio/choreography/types'
import type { Aim, Mark, Pose, Point, Reach } from '../../../studio/choreography/types'
import { contactBone, contactShape, markOf, placeHand } from './contacts'
import { crossedAnkle, pinch, equipmentPose, inchworm } from './precision'
import { fitGuideGrips, refitCarriedShaft } from './grips'
import { cycleAt } from './cycles'
import { groundGuide, lowestHandBone } from './ground'
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
  isHinged,
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
function poseAt(
  r: MovementRig,
  id: AuthoredId,
  frame: Pose,
  phase: number,
  before: (Quaternion | undefined)[] = [],
) {
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
  if (p.head) {
    r.bones[4].quaternion.copy(trunk(p.neck, 1))
    r.bones[5].quaternion.copy(trunk(p.head, 1))
  } else {
    r.bones[4].quaternion.copy(trunk(p.neck, 0.57))
    r.bones[5].quaternion.copy(trunk(p.neck, 0.43))
  }
  r.bones[20].quaternion.copy(Q(p.jaw?.[0], p.jaw?.[1]))
  for (const s of sides) {
    const act = s === 1,
      j = limb(s)
    const shoulder = act || score.both ? p.shoulders : undefined
    setArm(r, s, (act ? p.a : p.b) ?? [], shoulder)
    setLeg(r, s, (act ? p.leg : p.other) ?? [])
    if (hinged.has(score.posture) && id !== 'inchworm')
      r.bones[j.thigh].quaternion.premultiply(pelvis.clone().invert())
    const holdingLoop =
      (score.gear?.includes('footStrap') || score.gear?.includes('quadStrap')) &&
      (id !== 'strap-itb' || !act)
    setHand(
      r,
      s,
      handShape(
        (act ? p.f : p.g) ??
          (holdingLoop
            ? id === 'tibial-tensioner-strap'
              ? grip
              : loopGrip
            : contactShape(act ? p.ga : p.gb)),
      ),
    )
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
  placeHand(r, id, p.ga, 1, p.ha, p.ea, false, before[0])
  placeHand(r, id, p.gb, -1, p.hb, p.eb, false, before[1])
  floorHands(r, id, p)
  clearFloorArms(r, id)
}
/**
 * Make every limb anatomical while keeping each hand and foot exactly where it is. Between beats
 * the solve stays local, so the limbs follow the interpolated pose without jumping.
 */
function articulate(r: MovementRig, local = false) {
  for (const s of sides) {
    articulateArm(r, s, local)
    articulateLeg(r, s, local)
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
  /** Each hand's orientation on the bone it holds, or in the world on a fixture. */
  held: Quaternion[]
  reach: (Reach | undefined)[]
  aims: (Aim | undefined)[]
  elbows: (Point | undefined)[]
  pose: Pose
}
const cache = new Map<AuthoredId, Key[]>()
/** A hand's world orientation as seen from `bone`, or the world when the bone is −1. */
function heldOn(r: MovementRig, bone: number, s: 1 | -1) {
  const hand = r.bones[limb(s).hand].getWorldQuaternion(new Quaternion())
  return bone < 0
    ? hand
    : r.bones[bone].getWorldQuaternion(new Quaternion()).invert().multiply(hand)
}
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
  const keys: Key[] = [],
    solved = new Map<string, Key>()
  score.frames.forEach((f, phase) => {
    // A beat that repeats an earlier pose, such as the return to the start, arrives exactly
    // where that pose was, so a repeated take has no seam. The inchworm's stages travel.
    const same = id === 'inchworm' ? undefined : solved.get(JSON.stringify(f.pose))
    if (same) {
      keys.push({ ...same, time: f.time })
      return
    }
    // A hand that stays on the same contact as in the previous beat keeps its turn on it.
    const last = keys.at(-1),
      before = sides.map((_, n) =>
        last &&
        contactKind(last.reach[n]) &&
        contactKind(last.reach[n]) === contactKind([f.pose.ga, f.pose.gb][n])
          ? last.held[n]
          : undefined,
      )
    poseAt(r, id, f.pose, phase, before)
    articulate(r)
    if (!f.time) feet.set(id, standingMarks(r, id))
    // Beats accumulate, so each frame's pose already carries every contact still in force.
    const reach = [f.pose.ga, f.pose.gb],
      aims = [f.pose.ha, f.pose.hb],
      elbows = [f.pose.ea, f.pose.eb]
    const capture = (): Key => ({
      time: f.time,
      root: r.root.position.clone(),
      rotations: r.bones.map((b) => b.quaternion.clone()),
      hands: sides.map((s) => effector(r, limb(s).hand)),
      feet: sides.map((s) => effector(r, limb(s).foot)),
      held: sides.map((s, n) => heldOn(r, contactBone(r, id, reach[n], s), s)),
      reach,
      aims,
      elbows,
      pose: f.pose,
    })
    // Settle the beat through the same local pass every frame between beats runs, so the frames
    // either side of a beat arrive at exactly the pose stored for it.
    for (let pass = 0; pass < 2; pass++) {
      const key = capture()
      holdFeet(r, id, key, key, 0)
      holdHands(r, id, key, key, 0)
      clearFloorHands(r)
      articulate(r, true)
    }
    fitGuideGrips(r, id, reach)
    const key = capture()
    keys.push(key)
    solved.set(JSON.stringify(f.pose), key)
  })
  r.skeleton.dispose()
  cache.set(id, keys)
  return keys
}
/** Whether a hand's contact is a floor, seat, table, wall or post, or a bare point on the floor. */
const onSurface = (reach: Reach | undefined) => {
  const kind = contactKind(reach)
  if (kind === 'point') return (reach as readonly number[])[1] < 0.1
  return (
    kind !== undefined && ['floor', 'seat', 'table', 'wall', 'door', 'post', 'bar'].includes(kind)
  )
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
const grounded = (a: Effector, b: Effector, height: number) => Math.max(a.at.y, b.at.y) < height
/** Slide a planted point, or lift it a little in a step when it travels. */
const stepTo = (a: Effector, b: Effector, f: number) => {
  const at = a.at.clone().lerp(b.at, f),
    travel = a.at.distanceTo(b.at)
  if (travel > 0.02) at.y += Math.min(0.05, travel * 0.15) * Math.sin(Math.PI * f)
  return at
}
export function sampleGuide(r: MovementRig, id: AuthoredId, at: number, side: Side) {
  const keys = keysFor(id),
    // A take that returns to its first beat ends on exactly that pose.
    time = at >= keys.at(-1)!.time && keys.at(-1)!.rotations === keys[0].rotations ? 0 : at,
    i = keys.findIndex((k) => k.time >= time),
    a = keys[Math.max(0, i - 1)],
    b = keys[i < 0 ? keys.length - 1 : i]
  const u = b.time === a.time ? 0 : (time - a.time) / (b.time - a.time),
    f = u * u * (3 - 2 * u)
  r.root.position.lerpVectors(a.root, b.root, f)
  // A free hand follows the arm into a gesture. Warp the interval by up to 45 ms,
  // returning exactly to each authored beat even when sampling out of order.
  const lag = (n: number) => {
    if (contactKind(a.reach[n]) || contactKind(b.reach[n]) || b.time === a.time) return f
    const v = u - (0.045 / (b.time - a.time)) * 4 * u * (1 - u)
    return v * v * (3 - 2 * v)
  }
  const left = lag(0),
    right = lag(1)
  for (let j = 0; j < joints.length; j++) {
    const blend =
      j === 8 || (j >= 21 && j <= 35) ? left : j === 11 || (j >= 50 && j <= 64) ? right : f
    r.bones[j].quaternion.slerpQuaternions(a.rotations[j], b.rotations[j], blend)
  }
  cycleAt(r, id, time)
  lockStandingFeet(r, feet.get(id)!)
  // A crossed ankle stays on the opposite thigh between beats.
  if (id === 'standing-figure-four' || scores[id].posture === 'figureFour')
    crossedAnkle(r, id, a.pose)
  // The legs take their final anatomical shape before the body rests on the floor, so a limit that
  // turns a foot, such as the end of ankle dorsiflexion in a deep squat, is felt by the grounding.
  for (const s of sides) articulateLeg(r, s, true)
  // Arriving at a beat is that beat, contacts and all, so a take ends exactly where it began.
  const [from, to, along] = f === 1 ? [b, b, 0] : [a, b, f]
  const planted = sides.map((_, n) => onSurface(a.reach[n]) || onSurface(b.reach[n]))
  r.root.updateMatrixWorld(true)
  groundGuide(r, id, false, planted)
  r.root.updateMatrixWorld(true)
  // Planted feet keep their marks; holding them can sink a heel or toe a few millimetres, so the
  // body is rested on the floor once more before the hands take their holds.
  holdFeet(r, id, from, to, along)
  groundGuide(r, id, false, planted)
  r.root.updateMatrixWorld(true)
  holdHands(r, id, from, to, along)
  clearFloorHands(r)
  articulate(r, true)
  refitCarriedShaft(r, id)
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
 * Between beats, a hand that keeps the same contact stays on it, and a planted hand stays planted,
 * instead of drifting while the joints interpolate.
 */
function holdHands(r: MovementRig, id: AuthoredId, a: Key, b: Key, f: number) {
  // The body marks for a carried shaft stage the keyframes. The hands hold the
  // moving shaft itself between beats.
  if (scores[id].gear?.some((g) => g === 'stick' || g === 'towel')) return
  sides.forEach((s, n) => {
    const reachA = a.reach[n],
      reachB = b.reach[n],
      mark = contactKind(reachA)
    if (mark && mark === contactKind(reachB)) {
      // Keep the hand turned on its contact as both beats had it, including any turn about the
      // palm that the beats chose for comfort.
      const reach = blendReach(reachA!, reachB!, f),
        bone = contactBone(r, id, reach, s),
        q = a.held[n].clone().slerp(b.held[n], f)
      if (bone >= 0) q.premultiply(r.bones[bone].getWorldQuaternion(new Quaternion()))
      placeHand(r, id, reach, s, q, a.elbows[n] ?? b.elbows[n], true)
      return
    }
    // A palm on the floor in both beats stays down, or walks along the floor between them.
    if (grounded(a.hands[n], b.hands[n], 0.06)) {
      const j = limb(s)
      reachArm(
        r,
        s,
        stepTo(a.hands[n], b.hands[n], f),
        r.bones[j.hand].getWorldQuaternion(new Quaternion()),
        r.bones[j.fore].getWorldPosition(new Vector3()),
        { local: true },
      )
    }
  })
}
/**
 * A hand never sinks into the floor. Where its bones would cross it, the whole hand lifts just
 * enough that its fingers and palm rest on it, so a hand sweeping low or pitched forward touches
 * down on its fingertips instead of passing through. The hand keeps its turn; the arm bends to
 * carry it.
 */
function clearFloorHands(r: MovementRig) {
  r.root.updateMatrixWorld(true)
  for (const s of sides) {
    const below = 0.001 - lowestHandBone(r, s)
    if (below <= 0) continue
    const j = limb(s)
    reachArm(
      r,
      s,
      r.bones[j.hand].getWorldPosition(new Vector3()).add(new Vector3(0, below, 0)),
      r.bones[j.hand].getWorldQuaternion(new Quaternion()),
      r.bones[j.fore].getWorldPosition(new Vector3()),
      { local: true },
    )
  }
}
/** A planted foot stays planted, or steps along the floor, as the joints interpolate. */
function holdFeet(r: MovementRig, id: AuthoredId, a: Key, b: Key, f: number) {
  const posture = scores[id].posture
  // Standing feet are locked to their floor marks already; the inchworm walks them instead.
  if ((posture === 'stand' || posture === 'lunge' || posture === 'squat') && id !== 'inchworm')
    return
  sides.forEach((s, n) => {
    // A foot on the floor in both beats keeps its place or steps along the floor; it may still
    // turn, as in a cycle.
    if (!grounded(a.feet[n], b.feet[n], ANKLE_Y + 0.03)) return
    const j = limb(s),
      at = stepTo(a.feet[n], b.feet[n], f)
    // A planted foot already on its mark needs no new solve; a straight leg would only roll.
    if (at.distanceTo(r.bones[j.foot].getWorldPosition(new Vector3())) < 0.004 && isHinged(r, s))
      return
    reachLeg(
      r,
      s,
      at,
      r.bones[j.foot].getWorldQuaternion(new Quaternion()),
      r.bones[j.shin].getWorldPosition(new Vector3()),
      { local: true },
    )
  })
}
