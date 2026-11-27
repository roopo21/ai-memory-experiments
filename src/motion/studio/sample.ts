import { sampleGuide } from './guides/sampleGuide'
import { hasScore } from '../../studio/choreography'
import { basis, flatPalmOrientation, palmOrientation } from './handOrientation'
import { Euler, Quaternion, Vector3 } from 'three'
import { palmPad, toePad, applyPins } from './anchors'
import { ANKLE_Y, indexOfJoint, joints, pivot, type Triple } from '../joints'
import { oldLocal } from '../oldPivots'
import {
  articulateArm,
  articulateLeg,
  followUlna,
  handShape,
  reachPalm,
  RELAXED_ARM,
  setArm,
  setHand,
} from '../anatomy'
import { FLAT_ON_SURFACE } from './guides/contacts'
import { restOnFloor } from './guides/ground'
import {
  restPose,
  sampleMovement,
  solveLimb,
  worldRotation,
  type MovementRig,
} from '../movementRig'
import { clips, type ClipId, type Side } from '../../studio/clips'
import type { Project } from '../../studio/project'

const rad = Math.PI / 180
const V = (x: number, y: number, z: number) => new Vector3(x, y, z)
const Q = (degrees: number) => new Quaternion().setFromAxisAngle(V(1, 0, 0), degrees * rad)
const clamp = (v: number) => Math.min(1, Math.max(0, v))
const ease = (v: number) => {
  const u = clamp(v)
  return u * u * (3 - 2 * u)
}
const rep = (f: number) => ease(1 - Math.abs(2 * f - 1))
export const chair = { width: 0.46, depth: 0.37, z: -0.15 }
// Bones and clothing meet supports at different depths while the shared joints stay in place.
export const supports = (human: boolean) => ({
  seat: human ? 0.378 : 0.415,
  mat: human ? 0.014 : 0.052,
  head: human ? 0.027 : 0.061,
})
const sides = [1, -1] as const
// Behind the middle of the thigh, where both arms reach with the elbows nearly straight.
export const thighGrip = (side: number, thigh: number) => oldLocal(thigh, side * 0.04, -0.17, -0.05)
function handOn(r: MovementRig, side: number, at: Vector3, q: Quaternion, pole: Vector3) {
  const arm = side === 1 ? 6 : 9
  solveLimb(r, arm, arm + 1, arm + 2, at.clone().sub(palmPad(side).applyQuaternion(q)), pole)
  // Anchor forearm roll to the thumb side of the planted hand. A half-angle twist can
  // switch branches at 180 degrees even while both the wrist and elbow remain stationary.
  const lower = r.bones[arm + 1],
    hand = r.bones[arm + 2]
  const axis = hand.getWorldPosition(new Vector3()).sub(lower.getWorldPosition(new Vector3()))
  const lateral = V(side, 0, 0)
  const orientation = basis(axis, lateral.clone().applyQuaternion(q)).multiply(
    basis(r.rest[arm + 2].clone(), lateral).invert(),
  )
  worldRotation(lower, orientation)
  worldRotation(hand, q)
}
function footOn(r: MovementRig, side: number, ankle: Vector3, pole: Vector3) {
  const thigh = side === 1 ? 12 : 15
  solveLimb(r, thigh, thigh + 1, thigh + 2, ankle, pole)
  worldRotation(r.bones[thigh + 2], new Quaternion())
}
/** Where each palm presses in the push-up: a little wider than the shoulders and just ahead. */
export const pushUpPalm = (side: number) => V(side * 0.225, 0, 0.58)
function pushUp(r: MovementRig, t: number) {
  const depth = t <= 1.8 ? ease(t / 1.8) : 1 - ease((t - 1.8) / 1.95)
  // At the top the arms are straight under the shoulders; at the bottom the chest is just off
  // the floor with the elbows bent past a right angle.
  const body = Q(72.5 + 15 * depth),
    foot = Q(70)
  const ankle = V(0.08, 0, -0.68).sub(toePad(1).applyQuaternion(foot))
  // The straight legs hang from the pelvis as in the bind pose; split the small left-right
  // difference in the scanned ankles between the two feet.
  const hang = pivot(14)
    .add(pivot(17).multiply(V(-1, 1, 1)))
    .multiplyScalar(0.5)
    .sub(pivot(0))
  r.root.position.copy(ankle).sub(hang.applyQuaternion(body))
  r.root.quaternion.copy(body)
  r.root.updateMatrixWorld(true)
  for (const side of sides) {
    worldRotation(r.bones[side === 1 ? 14 : 17], foot)
    // Palms flat, fingers forward and turned a little out, which the forearm reaches without
    // full pronation.
    const q = flatPalmOrientation(side, V(0.21 * side, 0, 1), V(0, -1, 0))
    setHand(r, side, handShape(FLAT_ON_SURFACE))
    // At the top the shoulder blades slide forward round the ribs to finish the press.
    reachPalm(r, side, pushUpPalm(side), q, palmPad(side), V(side * 0.38, 0.32, 0.05))
  }
}
// The palms take hold of the thigh as the stretch begins and then turn with it, as hands that
// grip do. Their hold, in the thigh's frame, is solved once per side.
const held: Partial<Record<Side, Quaternion[]>> = {}
function hamstring(r: MovementRig, t: number, which: Side) {
  const s = which === 'left' ? 1 : -1,
    active = s === 1 ? 12 : 15
  const legs = (extend: number) => {
    restPose(r)
    r.root.position.set(0, 0.123, -0.06)
    r.root.quaternion.copy(Q(-90))
    r.bones[active].rotation.x = (-116 - 7 * extend) * rad
    r.bones[active + 1].rotation.x = (80 - 59 * extend) * rad
    r.root.updateMatrixWorld(true)
    footOn(r, -s, V(-s * 0.11, ANKLE_Y, 0.53), V(-s * 0.15, 0.63, 0.45))
    // Settle both knees into true hinges before the hands take hold of the thigh.
    for (const side of sides) articulateLeg(r, side)
  }
  const thigh = () => r.bones[active].getWorldQuaternion(new Quaternion())
  const grip = (side: number) => r.bones[active].localToWorld(thighGrip(side, active))
  const pole = (side: number) => V(side * 0.42, 0.22, -0.28)
  if (!held[which]) {
    legs(0)
    const hip = r.bones[active].getWorldPosition(new Vector3()),
      knee = r.bones[active + 1].getWorldPosition(new Vector3()),
      along = knee.sub(hip).normalize(),
      frame = thigh().invert()
    // Palm toward the bone, fingers carrying on from the reaching arm and curling round it, so
    // the wrists stay near neutral.
    held[which] = sides.map((side) => {
      const anchor = grip(side),
        shoulder = r.bones[side === 1 ? 6 : 9].getWorldPosition(new Vector3()),
        core = hip.clone().addScaledVector(along, anchor.clone().sub(hip).dot(along))
      const q = palmOrientation(side, anchor.clone().sub(shoulder), core.sub(anchor))
      reachPalm(r, side, anchor, q, palmPad(side), pole(side), { spin: 60 })
      return frame
        .clone()
        .multiply(r.bones[side === 1 ? 8 : 11].getWorldQuaternion(new Quaternion()))
    })
  }
  legs(ease(t / 2.5) * (1 - ease((t - 5.5) / 2.5)))
  sides.forEach((side, k) =>
    reachPalm(r, side, grip(side), thigh().multiply(held[which]![k]), palmPad(side), pole(side)),
  )
}
function slider(r: MovementRig, t: number, which: Side) {
  const s = which === 'left' ? 1 : -1
  const f = t < 2.75 ? ease(t / 2.75) : 1 - ease((t - 2.75) / 3.25)
  r.root.position.set(0, 0.535, -0.2)
  r.bones[4].rotation.x = (11 - 24 * f) * rad
  r.bones[5].rotation.x = (8 - 18 * f) * rad
  for (const side of sides) {
    const leg = side === 1 ? 12 : 15
    // Thighs nearly level on the seat keep the heel of the working leg on the floor.
    r.bones[leg].rotation.x = -86 * rad
    r.bones[leg + 1].rotation.x = (72 - (s === side ? 53 * f : 0)) * rad
    r.root.updateMatrixWorld(true)
    if (s === side) worldRotation(r.bones[leg + 2], Q(-32 * f * f))
    else footOn(r, side, V(side * 0.095, ANKLE_Y, 0.285), V(side * 0.11, 0.48, 0.65))
    const palm = V(side * 0.115, 0.478, 0.0)
    setHand(r, side, handShape(FLAT_ON_SURFACE))
    handOn(
      r,
      side,
      palm,
      flatPalmOrientation(side, V(0, 0, 1), V(0, -1, 0)),
      V(side * 0.31, 0.53, -0.28),
    )
  }
}
const eulerQ = (v: Triple | undefined) =>
  new Quaternion().setFromEuler(new Euler(...((v ?? [0, 0, 0]).map((n) => n * rad) as Triple)))
function custom(r: MovementRig, p: Project, t: number) {
  const end = p.frames.findIndex((f) => f.time >= t),
    b = p.frames[end < 0 ? p.frames.length - 1 : end],
    a = p.frames[Math.max(0, (end < 0 ? p.frames.length - 1 : end) - 1)]
  const f = b.time === a.time ? 0 : ease((t - a.time) / (b.time - a.time))
  r.root.position.add(new Vector3(...a.root).lerp(new Vector3(...b.root), f))
  for (const [key] of joints)
    r.bones[indexOfJoint[key]].quaternion
      .copy(eulerQ(a.angles[key]))
      .slerp(eulerQ(b.angles[key]), f)
  // The root height comes from what the body rests on, unless the movement leaves the floor.
  if (!p.airborne && p.prop !== 'chair') restOnFloor(r, p.prop === 'mat' ? 0.014 : 0)
  if (p.pins?.length) {
    r.root.updateMatrixWorld(true)
    applyPins(r, p.pins, t)
  }
  if (p.plantFeet) {
    r.root.updateMatrixWorld(true)
    for (const side of sides)
      footOn(r, side, pivot(side === 1 ? 14 : 17), V(side * 0.13, 0.46, 0.8))
  }
}
export function sampleStudio(r: MovementRig, id: ClipId, time: number, side: Side, p: Project) {
  const duration = id === 'custom' ? p.frames.at(-1)!.time : clips[id].seconds
  const t = Number.isFinite(time) ? Math.max(0, Math.min(duration, time)) : 0
  restPose(r)
  if (id === 'push-up') pushUp(r, t)
  else if (id === 'supine-hamstring') hamstring(r, t, side)
  else if (id === 'sciatic-slider-seated') slider(r, t, side)
  else if (id === 'squat') {
    const f = rep(t / duration)
    r.root.position.add(V(0, -0.001 - 0.32 * f, -0.18 * f))
    r.bones[1].rotation.x = 0.19 * f
    r.bones[2].rotation.x = 0.16 * f
    r.root.updateMatrixWorld(true)
    for (const s of sides) {
      footOn(r, s, V(s * 0.115, ANKLE_Y, 0.07), V(s * 0.18, 0.47, 0.55))
      // The arms rise forward to balance the hips going back, palms turning down.
      setArm(r, s, [78 * f, 7, 12, 78 + 87 * f])
    }
  } else if (id === 'curl') {
    // The elbow hinges with the forearm supinated while the upper arm stays at the side, rising a
    // little at the top; the other arm hangs relaxed.
    const s = side === 'left' ? 1 : -1,
      f = rep(t / duration)
    setArm(r, s, [6 * f, 7, 12 + 123 * f, 0])
    setArm(r, s === 1 ? -1 : 1, RELAXED_ARM)
  } else if (id === 'custom') custom(r, p, t)
  else if (hasScore(id)) sampleGuide(r, id, t, side)
  else sampleMovement(r, id, t)
  // The hand-written presets place some hands and feet on targets; make those limbs anatomical
  // around them. The push-up's straight legs already rest on their toe marks and the hamstring
  // stretch settled its legs before gripping the thigh. Other movements only need the ulna to
  // hinge with the forearm.
  const arms = ['push-up', 'supine-hamstring', 'sciatic-slider-seated'].includes(id),
    legs = ['sciatic-slider-seated', 'squat'].includes(id)
  if (arms || legs) {
    r.root.updateMatrixWorld(true)
    for (const s of [1, -1] as const) {
      if (arms) articulateArm(r, s)
      if (legs) articulateLeg(r, s)
    }
  } else if (!hasScore(id)) followUlna(r)
  // Chained solver turns drift a hair from unit length; keep every rotation exact.
  for (const b of r.bones) b.quaternion.normalize()
  r.root.updateMatrixWorld(true)
  r.skeleton.update()
}
