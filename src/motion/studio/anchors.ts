import { Quaternion, Vector3 } from 'three'
import { indexOfJoint, type Triple } from '../joints'
import { solveLimb, worldRotation, type MovementRig } from '../movementRig'
import { pinWeight } from '../../studio/pins'
import type { AnchorSpace, EndJoint, Pin } from '../../studio/pins'

export const palmPad = (side: number) => new Vector3(0.012 * side, -0.075, 0.083)
export const toePad = () => new Vector3(0, -0.046, 0.166)
export const solePad = () => new Vector3(0, -0.064, 0.04)
const offset = (limb: EndJoint, point: Pin['point']) =>
  point === 'palm' ? palmPad(limb === 'leftHand' ? 1 : -1) : point === 'toe' ? toePad() : solePad()
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
    v = landmark(r, { limb, point })
  if (space !== 'world') r.bones[indexOfJoint[space]].worldToLocal(v)
  return {
    limb,
    space,
    point,
    at: v.toArray() as Triple,
    rotation: bone.getWorldQuaternion(new Quaternion()).toArray() as Pin['rotation'],
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
