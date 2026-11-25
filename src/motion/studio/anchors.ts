import { Quaternion, Vector3 } from 'three'
import { indexOfJoint, local, type Triple } from '../joints'
import { limbFrames } from '../limbFrames'
import { solveLimb, worldRotation, type MovementRig } from '../movementRig'
import { pinWeight } from '../../studio/pins'
import type { AnchorSpace, EndJoint, Pin } from '../../studio/pins'

const frame = (side: number) => (side === 1 ? limbFrames.left : limbFrames.right)
/** Centre of the palm's soft-tissue surface, over the third metacarpal. */
export const palmPad = (side: number) => {
  const p = frame(side).palmCentre
  return local(side === 1 ? 8 : 11, p[0], p[1], p[2])
}
// Plantar landmarks in bind coordinates: under the toe pads, and under the midfoot.
const TOE = [0.08, 0.019, 0.236] as const,
  SOLE = [0.08, 0.001, 0.11] as const
/** The pads of the toes, where the foot meets the floor in a plank. */
export const toePad = (side = 1) => local(side === 1 ? 14 : 17, side * TOE[0], TOE[1], TOE[2])
/** The sole under the midfoot, at floor level when standing. */
export const solePad = (side = 1) => local(side === 1 ? 14 : 17, side * SOLE[0], SOLE[1], SOLE[2])
const offset = (limb: EndJoint, point: Pin['point']) => {
  const side = limb.startsWith('left') ? 1 : -1
  return point === 'palm' ? palmPad(side) : point === 'toe' ? toePad(side) : solePad(side)
}
export function landmark(r: MovementRig, p: Pick<Pin, 'limb' | 'point'>) {
  return r.bones[indexOfJoint[p.limb]].localToWorld(offset(p.limb, p.point))
}
export function destination(r: MovementRig, p: Pin) {
  const v = new Vector3(...p.at)
  return p.space === 'world' ? v : r.bones[indexOfJoint[p.space]].localToWorld(v)
}
export function pinHere(
  r: MovementRig,
  limb: EndJoint,
  space: AnchorSpace,
  point: Pin['point'],
): Pin {
  const bone = r.bones[indexOfJoint[limb]],
    v = landmark(r, { limb, point }),
    q = bone.getWorldQuaternion(new Quaternion())
  if (space === 'world')
    return {
      limb,
      space,
      point,
      at: v.toArray() as Triple,
      rotation: q.toArray() as Pin['rotation'],
    }
  const parent = r.bones[indexOfJoint[space]]
  parent.worldToLocal(v)
  q.premultiply(parent.getWorldQuaternion(new Quaternion()).invert())
  return {
    limb,
    space,
    point,
    at: v.toArray() as Triple,
    rotation: q.toArray() as Pin['rotation'],
    relative: true,
  }
}
export function applyPins(r: MovementRig, pins: Pin[], t: number) {
  // A thigh-relative hand must read the leg after its foot has been solved.
  for (const hand of [false, true])
    for (const p of pins) {
      const weight = pinWeight(p, t)
      if (!weight || p.limb.endsWith('Hand') !== hand) continue
      const end = indexOfJoint[p.limb],
        [a, b, c] = r.bones.slice(end - 2, end + 1),
        q = new Quaternion(...p.rotation)
      if (p.relative && p.space !== 'world')
        q.premultiply(r.bones[indexOfJoint[p.space]].getWorldQuaternion(new Quaternion()))
      const target = destination(r, p).sub(offset(p.limb, p.point).applyQuaternion(q))
      const [start, bend, tip] = [a, b, c].map((bone) => bone.getWorldPosition(new Vector3()))
      if (weight < 1) {
        target.lerp(tip, 1 - weight)
        q.slerp(c.getWorldQuaternion(new Quaternion()), 1 - weight)
      }
      if (target.distanceToSquared(tip) > 1e-12) {
        const qs = [a, b].map((bone) => bone.getWorldQuaternion(new Quaternion()))
        solveLimb(r, end - 2, end - 1, end, target, bend)
        const newBend = b.getWorldPosition(new Vector3()),
          newTip = c.getWorldPosition(new Vector3())
        // Only tilt each segment toward its corrected endpoint. Keep the author's measured roll.
        worldRotation(
          a,
          new Quaternion()
            .setFromUnitVectors(
              bend.clone().sub(start).normalize(),
              newBend.clone().sub(start).normalize(),
            )
            .multiply(qs[0]),
        )
        worldRotation(
          b,
          new Quaternion()
            .setFromUnitVectors(tip.sub(bend).normalize(), newTip.sub(newBend).normalize())
            .multiply(qs[1]),
        )
      }
      worldRotation(c, q)
    }
}
