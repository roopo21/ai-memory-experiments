import { Euler, Quaternion, Vector3 } from 'three'
import { createMovementRig, restPose, worldRotation, type MovementRig } from '../../movementRig'
import { ANKLE_Y, indexOfJoint, joints, type Joint } from '../../joints'
import type { Side } from '../../../studio/clips'
import { scores, type AuthoredId } from '../../../studio/choreography'
import { grip, loopGrip } from '../../../studio/choreography/types'
import type { Aim, Mark, Pose, Point, Reach } from '../../../studio/choreography/types'
import { contactBone, contactPoints, contactShape, markOf, placeHand } from './contacts'
import { crossedAnkle, pinch, equipmentPose, inchworm } from './precision'
import { fitGuideGrips, refitCarriedShaft } from './grips'
import { cycleAt } from './cycles'
import { groundGuide, lowestHandBone, lowestLegPoint, sitsOnFloor } from './ground'
import {
  prepareSupports,
  clearFloorArms,
  floorHands,
  standingMarks,
  lockStandingFeet,
  toeOut,
  type FootMark,
} from './supports'
import { postures } from './postures'
import {
  articulateArm,
  isHinged,
  articulateLeg,
  hipAngles,
  hipFromAngles,
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
    // The 90/90 turns its pelvis toward the front shin and its legs turn with it.
    if (hinged.has(score.posture) && id !== 'inchworm' && id !== 'ninety-ninety')
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
  leanToReach(r, id, p)
  equipmentPose(r, id, p)
  placeHand(r, id, p.ga, 1, p.ha, p.ea, false, before[0])
  placeHand(r, id, p.gb, -1, p.hb, p.eb, false, before[1])
  floorHands(r, id, p)
  clearFloorArms(r, id)
}
/**
 * A hand that rests on the floor must be able to get there. Where the shoulder is further from its
 * mark than the arm is long, the body folds the way a person does: first the spine flexes, then
 * (in postures that hinge at the hips) the pelvis tips over the thighs, until the palm is in reach
 * or the joint runs out of range. The root height stays where the legs put it, so the hands
 * come down to the floor instead of the floor being brought up to the hands.
 */
const LEAN = { spine: 38, pelvis: 45, step: 3 }
function leanToReach(r: MovementRig, id: AuthoredId, p: Pose) {
  const goals = ([1, -1] as const).flatMap((s) => {
    const reach = s === 1 ? p.ga : p.gb,
      aim = s === 1 ? p.ha : p.hb
    if (!reach || reach === 'free') return []
    const pts = contactPoints(r, id, reach, s, aim)
    return pts && pts[0].y < 0.1 ? [{ s, goal: pts[0] }] : []
  })
  if (!goals.length) return
  const arm = (s: number) => (s === 1 ? 6 : 9),
    length = (s: number) => r.rest[arm(s) + 1].length() + r.rest[arm(s) + 2].length() + 0.04
  const short = () => {
    r.root.updateMatrixWorld(true)
    return Math.max(
      ...goals.map(
        ({ s, goal }) =>
          r.bones[arm(s)].getWorldPosition(new Vector3()).distanceTo(goal) - length(s),
      ),
    )
  }
  const hinges = ['stand', 'lunge', 'split', 'halfKneel'].includes(scores[id].posture)
  let gap = short()
  const turn = (who: 'spine' | 'pelvis', degrees: number) => {
    const q = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), degrees * rad)
    if (who === 'spine')
      for (const [j, share] of [
        [1, 0.36],
        [2, 0.38],
        [3, 0.26],
      ] as const)
        r.bones[j].quaternion.multiply(
          new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), degrees * share * rad),
        )
    else {
      // Tip the pelvis over the hips: the thighs keep their place in the world.
      const thighs = [12, 15].map((i) => r.bones[i].getWorldQuaternion(new Quaternion()))
      r.root.quaternion.multiply(q)
      r.root.updateMatrixWorld(true)
      ;[12, 15].forEach((i, k) => worldRotation(r.bones[i], thighs[k]))
    }
  }
  // Fold forward first; where that only takes the hands further away (hands behind the hips),
  // lean back instead, as far as the spine extends.
  for (const who of ['spine', 'pelvis'] as const) {
    if (who === 'pelvis' && !hinges) break
    for (const direction of [1, -1]) {
      if (gap <= 0.004) break
      const limit = direction > 0 ? LEAN[who] : who === 'spine' ? 12 : 12
      let total = 0
      while (gap > 0.004 && total < limit) {
        turn(who, direction * LEAN.step)
        total += LEAN.step
        const next = short()
        if (next >= gap - 1e-5) {
          turn(who, -direction * total)
          total = 0
          gap = short()
          break
        }
        gap = next
      }
    }
  }
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
    for (let pass = 0; pass < 3; pass++) {
      const key = capture()
      // Rest the whole body the way every sampled frame does, so the stored beat is the pose a
      // frame at that beat would arrive at, not one sunk a few millimetres into the floor.
      const planted = sides.map((_, n) => onSurface(key.reach[n]))
      lockStandingFeet(r, feet.get(id)!, toeOut(id))
      if (id === 'standing-figure-four' || scores[id].posture === 'figureFour')
        crossedAnkle(r, id, key.pose)
      for (const s of sides) articulateLeg(r, s, true)
      r.root.updateMatrixWorld(true)
      // The body is rested once. Resting it again after the hands were pinned where the last pass
      // left them would lift it a little more every pass.
      // A hand that the authored arm drove into the floor is lifted before the body is rested, as
      // it is in every sampled frame; otherwise the body would be raised to clear it.
      if (pass === 1) groundGuide(r, id, false, planted)
      r.root.updateMatrixWorld(true)
      holdFeet(r, id, key, key, 0)
      if (pass === 1) groundGuide(r, id, false, planted)
      r.root.updateMatrixWorld(true)
      holdHands(r, id, key, key, 0)
      clearFloorHands(r)
      articulate(r, true)
      clearFloorFeet(r, id)
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
/**
 * Move each hip between two beats by its anatomical angles (flexion, abduction, rotation) instead
 * of by the shortest arc between two orientations. A hip carried through an arc can pass through
 * flexion, abduction or rotation far outside what the joint allows even when both beats are in
 * range, as when the legs swap roles in a 90/90 switch; angles that move straight between two
 * in-range poses stay in range, and a hip rotates the way a person turns it.
 */
/**
 * Guides whose hips swing far between beats, moved by joint angle instead of shortest arc. The
 * angle path is only well defined while the hip has real flexion, abduction and rotation to
 * measure; a straight leg folding forward (the inchworm) has none, and its angles jump. Opt a
 * guide in only after `check-studio`'s 60 Hz continuity test and `check:form` still pass.
 */
const ANGLE_HIPS = new Set<AuthoredId>(['ninety-ninety'])
function blendHips(r: MovementRig, a: Key, b: Key, f: number) {
  for (const s of sides) {
    const j = limb(s).thigh,
      qa = a.rotations[j],
      qb = b.rotations[j]
    if (f <= 0 || f >= 1 || qa.angleTo(qb) < 0.02) continue
    const A = hipAngles(s, qa),
      B = hipAngles(s, qb)
    // Unwrap a flexion that crosses the ±180 seam, and keep the orientation when the angles do
    // not reproduce it (a thigh pointing straight up has no flexion to speak of).
    const wrap = (d: number) => d - 360 * Math.round(d / 360)
    const from = hipFromAngles(s, A.flexion, A.abduction, A.rotation),
      to = hipFromAngles(s, B.flexion, B.abduction, B.rotation)
    if (from.angleTo(qa) > 0.01 || to.angleTo(qb) > 0.01) continue
    r.bones[j].quaternion.copy(
      hipFromAngles(
        s,
        A.flexion + wrap(B.flexion - A.flexion) * f,
        A.abduction + (B.abduction - A.abduction) * f,
        A.rotation + wrap(B.rotation - A.rotation) * f,
      ),
    )
  }
}
export function sampleGuideRaw(r: MovementRig, id: AuthoredId, at: number, side: Side) {
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
  if (ANGLE_HIPS.has(id)) blendHips(r, a, b, f)
  cycleAt(r, id, time)
  lockStandingFeet(r, feet.get(id)!, toeOut(id))
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
  clearFloorFeet(r, id)
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
/**
 * A foot never sinks into the floor. A body resting on its pelvis cannot also rest on a heel that
 * hangs below the floor, so the foot is lifted just enough to touch it and the leg bends to carry
 * it, the way a hip flexes a little more to bring a straight leg up off the floor.
 */
function clearFloorFeet(r: MovementRig, id: AuthoredId) {
  if (!sitsOnFloor(id, scores[id].posture)) return
  const x = new Vector3(1, 0, 0)
  let lift = 0
  for (const s of sides) {
    const j = limb(s)
    // A hip lifts a leg a few degrees to clear the floor, no more; past that the body rests on it.
    let turned = 0
    for (let pass = 0; pass < 6; pass++) {
      r.root.updateMatrixWorld(true)
      const low = lowestLegPoint(r, s),
        below = 0.001 - low.y
      if (below <= 0.0002) break
      // A turn of the whole leg about the hip's side-to-side axis raises a point by -z per
      // radian. A leg pointing straight down cannot be raised this way, and is left to the pelvis.
      const dz = low.z - r.bones[j.thigh].getWorldPosition(new Vector3()).z
      if (Math.abs(dz) < 0.06) break
      const angle = Math.max(-0.1 - turned, Math.min(0.1 - turned, -below / dz))
      turned += angle
      if (angle === 0) break
      // The foot keeps its own turn: the ankle takes up the few degrees the leg was raised.
      const foot = r.bones[j.foot].getWorldQuaternion(new Quaternion())
      worldRotation(
        r.bones[j.thigh],
        new Quaternion()
          .setFromAxisAngle(x, angle)
          .multiply(r.bones[j.thigh].getWorldQuaternion(new Quaternion())),
      )
      worldRotation(r.bones[j.foot], foot)
    }
    r.root.updateMatrixWorld(true)
    lift = Math.max(lift, 0.001 - lowestLegPoint(r, s).y)
  }
  // A leg that hangs straight down cannot be raised by turning it; the body rests on it instead.
  if (lift > 0.0005) r.root.position.y += lift
}
/** A planted foot stays planted, or steps along the floor, as the joints interpolate. */
function holdFeet(r: MovementRig, id: AuthoredId, a: Key, b: Key, f: number) {
  const posture = scores[id].posture
  // The 90/90 swings both legs through joint angles; pinning feet to straight-line marks would
  // fight the hips.
  if (id === 'ninety-ninety') return
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

/**
 * The frame-to-frame solves (elbow swing, forearm roll, knee swing) each settle on the nearest
 * anatomical solution, and where two are nearly equal the winner can change from one frame to the
 * next, which shows as a pop. Every guide is therefore baked once at 60 Hz and its joint rotations
 * and root are low-passed with a short zero-phase Gaussian (about 27 ms), the way a solved track
 * is cleaned in animation. A hold is untouched, because smoothing a constant returns it exactly,
 * and the beats and holds the physics check judges stay where they were authored.
 */
const BAKE_HZ = 60,
  SIGMA = 1.6,
  RADIUS = 5
const KERNEL = Array.from({ length: 2 * RADIUS + 1 }, (_, i) =>
  Math.exp(-((i - RADIUS) ** 2) / (2 * SIGMA * SIGMA)),
)
type Baked = { n: number; root: Float64Array; frames: Float64Array[] }
const baked = new Map<AuthoredId, Baked>(),
  bakeOrder: AuthoredId[] = []
let bakeRig: MovementRig | undefined
const keep = 6
const FRAME = 8 + joints.length * 4
function bake(id: AuthoredId): Baked {
  const known = baked.get(id)
  if (known) return known
  bakeRig ??= createMovementRig()
  const rig = bakeRig,
    end = keysFor(id).at(-1)!.time,
    n = Math.ceil(end * BAKE_HZ) + 1 + RADIUS
  const raw: Float64Array[] = []
  for (let k = 0; k < n; k++) {
    restPose(rig)
    sampleGuideRaw(rig, id, k / BAKE_HZ, 'left')
    const f = new Float64Array(FRAME)
    f.set([rig.root.position.x, rig.root.position.y, rig.root.position.z], 0)
    f.set(
      [rig.root.quaternion.x, rig.root.quaternion.y, rig.root.quaternion.z, rig.root.quaternion.w],
      3,
    )
    rig.bones.forEach((b, j) =>
      f.set([b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w], 8 + j * 4),
    )
    raw.push(f)
  }
  // Smooth: positions average directly; quaternions average in the hemisphere of the centre frame.
  const out: Float64Array[] = []
  for (let k = 0; k < n; k++) {
    const f = new Float64Array(FRAME)
    let wsum = 0
    for (let d = -RADIUS; d <= RADIUS; d++) {
      const src = raw[Math.min(n - 1, Math.max(0, k + d))],
        w = KERNEL[d + RADIUS]
      wsum += w
      for (let c = 0; c < 3; c++) f[c] += w * src[c]
    }
    for (let c = 0; c < 3; c++) f[c] /= wsum
    for (let q = 0; q <= joints.length; q++) {
      // q === 0 is the root rotation (stored at 3..6), the rest are bones at 8 + j * 4.
      const o = q === 0 ? 3 : 8 + (q - 1) * 4,
        ref = raw[k]
      for (let d = -RADIUS; d <= RADIUS; d++) {
        const src = raw[Math.min(n - 1, Math.max(0, k + d))],
          w = KERNEL[d + RADIUS]
        const dot =
          src[o] * ref[o] +
          src[o + 1] * ref[o + 1] +
          src[o + 2] * ref[o + 2] +
          src[o + 3] * ref[o + 3]
        const sign = dot < 0 ? -w : w
        for (let c = 0; c < 4; c++) f[o + c] += sign * src[o + c]
      }
      const len = Math.hypot(f[o], f[o + 1], f[o + 2], f[o + 3]) || 1
      for (let c = 0; c < 4; c++) f[o + c] /= len
    }
    out.push(f)
  }
  const result = { n, root: new Float64Array(0), frames: out }
  baked.set(id, result)
  bakeOrder.push(id)
  if (bakeOrder.length > keep) baked.delete(bakeOrder.shift()!)
  return result
}
const qa = new Quaternion(),
  qb = new Quaternion()
export function sampleGuide(r: MovementRig, id: AuthoredId, at: number, side: Side) {
  if (!Number.isFinite(at)) return sampleGuideRaw(r, id, at, side)
  const track = bake(id),
    x = Math.max(0, at) * BAKE_HZ,
    k = Math.min(track.n - 2, Math.floor(x)),
    u = x - k
  const a = track.frames[k],
    b = track.frames[k + 1]
  r.root.position.set(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u)
  r.root.quaternion.slerpQuaternions(qa.fromArray(a, 3), qb.fromArray(b, 3), u)
  for (let j = 0; j < joints.length; j++)
    r.bones[j].quaternion.slerpQuaternions(
      qa.fromArray(a, 8 + j * 4),
      qb.fromArray(b, 8 + j * 4),
      u,
    )
  if (side === 'right' && !scores[id].both) {
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

/** Drop a guide's solved beats and baked track, so a tool that edits its score can re-sample it. */
export function forgetGuide(id: AuthoredId) {
  cache.delete(id)
  baked.delete(id)
  const at = bakeOrder.indexOf(id)
  if (at >= 0) bakeOrder.splice(at, 1)
}
