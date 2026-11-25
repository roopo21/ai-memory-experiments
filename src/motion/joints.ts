import { Vector3 } from 'three'
import { distalJoints } from './distalJoints'
import { limbFrames } from './limbFrames'

const L = limbFrames.left,
  R = limbFrames.right
/**
 * Joint origins in the registered atlas bind pose, in metres. Left is positive X.
 * Limb pivots are fitted joint centres from `limbFrames`: the humeral head, the capitulum,
 * the head of the capitate, the femoral head, the femoral condyles and the talar dome.
 * The ulna joints come last so earlier indices stay stable. Each ulna shares its pivot with
 * the forearm, but only hinges: the radius and hand turn about it in pronation.
 */
export const joints = [
  ['pelvis', -1, [0, 0.88, 0.06]],
  ['lumbar', 0, [0, 0.97, 0.07]],
  ['spine', 1, [0, 1.1, 0.07]],
  ['chest', 2, [0, 1.26, 0.07]],
  ['neck', 3, [0, 1.41, 0.075]],
  ['head', 4, [0, 1.49, 0.075]],
  ['leftArm', 18, L.shoulder],
  ['leftForearm', 6, L.elbow],
  ['leftHand', 7, L.wrist],
  ['rightArm', 19, R.shoulder],
  ['rightForearm', 9, R.elbow],
  ['rightHand', 10, R.wrist],
  ['leftThigh', 0, L.hip],
  ['leftShin', 12, L.knee],
  ['leftFoot', 13, L.ankle],
  ['rightThigh', 0, R.hip],
  ['rightShin', 15, R.knee],
  ['rightFoot', 16, R.ankle],
  ['leftShoulder', 3, [0.04, 1.34, 0.09]],
  ['rightShoulder', 3, [-0.04, 1.34, 0.09]],
  ...distalJoints,
  ['leftUlna', 6, L.elbow],
  ['rightUlna', 9, R.elbow],
] as const

export type Joint = (typeof joints)[number][0]
export type Triple = [number, number, number]
export const indexOfJoint = Object.fromEntries(joints.map(([name], i) => [name, i])) as Record<
  Joint,
  number
>
export const ULNA = { left: indexOfJoint.leftUlna, right: indexOfJoint.rightUlna } as const
/** Joints that follow others and are never authored directly. */
export const derivedJoints = new Set<Joint>(['leftUlna', 'rightUlna'])
/** Bind position of a joint. */
export const pivot = (i: number) => new Vector3(...(joints[i][2] as readonly number[]))
/** A point given in bind coordinates, expressed in the local frame of joint `i`. */
export const local = (i: number, x: number, y: number, z: number) =>
  new Vector3(x, y, z).sub(pivot(i))
/** Height of the ankle pivot when the sole is flat on the floor (the bind pose stands flat). */
export const ANKLE_Y = (L.ankle[1] + R.ankle[1]) / 2
