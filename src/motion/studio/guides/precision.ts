import { Quaternion, Vector3 } from 'three'
import { digitTips } from '../../distalJoints'
import { ANKLE_Y, indexOfJoint, joints } from '../../joints'
import { solveLimb, worldRotation, type MovementRig } from '../../movementRig'
import { legFrame, turn } from '../../anatomy'
import { palmPad, toePad } from '../anchors'
import { flatPalmOrientation } from '../handOrientation'
import { scores, type AuthoredId } from '../../../studio/choreography'
import type { Pose } from '../../../studio/choreography/types'
import { okSign } from '../../hands/shapes'
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
  okSign(r, 1)
}
export function crossedAnkle(r: MovementRig, id: AuthoredId, p: Pose) {
  // Lying, the crossed leg is authored directly so the ankle rests on the other thigh.
  if (scores[id].posture !== 'figureFour' && id !== 'standing-figure-four') return
  const ankle = r.bones[15].localToWorld(
    r.rest[16]
      .clone()
      .multiplyScalar(0.87)
      .add(V(0.005, 0, 0.067)),
  )
  const hip = r.bones[12].getWorldPosition(V())
  // The knee drops out to the side so the hip opens with abduction, not only rotation.
  solveLimb(r, 12, 13, 14, ankle, hip.add(V(0.65, -0.18, 0.24).applyQuaternion(r.root.quaternion)))
  // The crossed foot rests relaxed on the thigh, slightly pointed, unless the guide moves it.
  const f = legFrame(1)
  r.bones[14].quaternion
    .copy(turn(f.ankleAxis, p.leg?.[3] ?? 18))
    .multiply(turn(f.eversionAxis, p.leg?.[5] ?? 0))
  r.bones[14].updateMatrixWorld(true)
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
    // Knees face the floor in the plank and forward in the fold.
    solveLimb(
      r,
      i,
      i + 1,
      i + 2,
      ankle,
      plank ? V(s * 0.1, -0.6, z + 0.2) : V(s * 0.12, 0.45, z + 0.6),
    )
    worldRotation(r.bones[i + 2], foot)
    const arm = i === 12 ? 6 : 9,
      // Fingers turned a little out, which the forearm reaches without full pronation. Once the
      // feet have walked in, the shoulders pass over the hands and the heels of the hands lift.
      hand = flatPalmOrientation(
        s,
        V(s * 0.2, stage === 3 ? -0.5 : 0, 1),
        V(0, -1, stage === 3 ? 0.5 : 0),
      )
    // With the heel of the hand lifted in the fold, the palm rides above the floor on the fingers.
    const goal = V(s * 0.2, stage === 3 ? 0.062 : 0.002, stage === 1 ? 0.335 : 1.08).sub(
      palmPad(s).applyQuaternion(hand),
    )
    solveLimb(r, arm, arm + 1, arm + 2, goal, V(s * 0.34, 0.3, baseZ + 0.23))
    worldRotation(r.bones[arm + 2], hand)
  }
}
