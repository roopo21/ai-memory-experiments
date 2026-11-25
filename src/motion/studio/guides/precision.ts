import { Quaternion, Vector3 } from 'three'
import { digitTips } from '../../distalJoints'
import { ANKLE_Y, indexOfJoint, joints } from '../../joints'
import { oldLocal } from '../../oldPivots'
import { solveLimb, worldRotation, type MovementRig } from '../../movementRig'
import { palmPad, toePad } from '../anchors'
import { palmOrientation } from '../handOrientation'
import { scores, type AuthoredId } from '../../../studio/choreography'
import type { Pose } from '../../../studio/choreography/types'
const V = (x = 0, y = 0, z = 0) => new Vector3(x, y, z)
const X = V(1, 0, 0),
  rot = (degrees: number) => new Quaternion().setFromAxisAngle(X, (degrees * Math.PI) / 180)
export function tip(r: MovementRig, name: 'Thumb' | 'Index') {
  const i = indexOfJoint[name === 'Thumb' ? 'leftThumb2' : 'leftIndex3']
  return r.bones[i].localToWorld(
    V(...digitTips[('left' + name) as 'leftThumb' | 'leftIndex']).sub(V(...joints[i][2])),
  )
}
export function pinch(r: MovementRig) {
  const hand = r.bones[8]
  for (const name of ['Thumb', 'Index'] as const) {
    const end = indexOfJoint[name === 'Thumb' ? 'leftThumb2' : 'leftIndex3']
    const target = hand.localToWorld(
      oldLocal(8, 0.043 + (name === 'Thumb' ? 0.0017 : -0.0017), -0.081, 0.077),
    )
    for (let sweep = 0; sweep < 14 && tip(r, name).distanceTo(target) > 0.00025; sweep++)
      for (let i = end; i >= end - 2; i--) {
        const joint = r.bones[i],
          origin = joint.getWorldPosition(V()),
          delta = new Quaternion().setFromUnitVectors(
            tip(r, name).sub(origin).normalize(),
            target.clone().sub(origin).normalize(),
          )
        delta.copy(new Quaternion().rotateTowards(delta, 0.42))
        worldRotation(joint, delta.multiply(joint.getWorldQuaternion(new Quaternion())))
      }
  }
}
export function crossedAnkle(r: MovementRig, id: AuthoredId, p: Pose) {
  if (
    scores[id].posture !== 'figureFour' &&
    id !== 'standing-figure-four' &&
    !(id === 'supine-figure-four' && p.leg?.[4])
  )
    return
  const ankle = r.bones[15].localToWorld(
    r.rest[16]
      .clone()
      .multiplyScalar(0.87)
      .add(V(0.005, 0, 0.067)),
  )
  const q = r.bones[14].getWorldQuaternion(new Quaternion()),
    hip = r.bones[12].getWorldPosition(V())
  solveLimb(r, 12, 13, 14, ankle, hip.add(V(0.55, 0.04, 0.32).applyQuaternion(r.root.quaternion)))
  worldRotation(r.bones[14], q)
}
export function equipmentPose(r: MovementRig, id: AuthoredId, p: Pose) {
  if (id === 'golf-ball-roll') {
    const knee = p.leg?.[2] ?? 76,
      travel = Math.max(0, Math.min(1, (76 - knee) / 19))
    solveLimb(r, 12, 13, 14, V(0.09, 0.045 + ANKLE_Y, 0.4 - 0.17 * travel), V(0.12, 0.48, 0.7))
    worldRotation(r.bones[14], rot(0))
  }
  if (id === 'step-heel-drop') {
    for (const i of [12, 15]) {
      const s = i === 12 ? 1 : -1,
        q = rot(i === 12 ? (p.leg?.[3] ?? 0) : 0)
      const goal = V(s * 0.085, 0.152, 0.233).sub(toePad(s).applyQuaternion(q))
      solveLimb(r, i, i + 1, i + 2, goal, V(s * 0.11, 0.51, 0.57))
      worldRotation(r.bones[i + 2], q)
    }
  }
  if (id === 'ball-backbend') {
    const travel = (p.shift?.[2] ?? 0) / 0.16
    for (const i of [12, 15]) {
      const s = i === 12 ? 1 : -1
      solveLimb(
        r,
        i,
        i + 1,
        i + 2,
        V(s * 0.19, ANKLE_Y, 0.24 + 0.29 * travel),
        V(s * 0.22, 0.49, 0.64),
      )
      worldRotation(r.bones[i + 2], rot(0))
    }
  }
}
export function inchworm(r: MovementRig, stage: number) {
  const stand = stage === 0 || stage === 3,
    plank = stage === 2
  const baseZ = [-0.12, -0.12, 0.55, 0.71, 0.72][stage]
  // The last pose is a standing landing at the hands. A repeated take starts a new travelling rep.
  if (stage === 0 || stage === 4) {
    r.root.position.set(0, 0.88, baseZ)
    r.root.quaternion.identity()
    r.root.updateMatrixWorld(true)
    return
  }
  r.root.position.set(0, plank ? 0.32 : 0.59, baseZ)
  r.root.quaternion.copy(rot(plank ? 77 : 94))
  r.root.updateMatrixWorld(true)
  for (const i of [12, 15]) {
    const s = i === 12 ? 1 : -1,
      foot = rot(plank ? 68 : 0),
      z = stand ? 0.72 : -0.12,
      ankle = plank
        ? V(s * 0.09, 0, z).sub(toePad(s).applyQuaternion(foot))
        : V(s * 0.09, ANKLE_Y, z)
    solveLimb(r, i, i + 1, i + 2, ankle, V(s * 0.12, 0.45, baseZ + 0.37))
    worldRotation(r.bones[i + 2], foot)
    const arm = i === 12 ? 6 : 9,
      hand = palmOrientation(s, V(s * 0.04, 0, 1), V(0, -1, 0))
    const goal = V(s * 0.2, 0.002, stage === 1 ? 0.335 : 1.08).sub(palmPad(s).applyQuaternion(hand))
    solveLimb(r, arm, arm + 1, arm + 2, goal, V(s * 0.34, 0.3, baseZ + 0.23))
    worldRotation(r.bones[arm + 2], hand)
  }
}
