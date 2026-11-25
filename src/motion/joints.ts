import { distalJoints } from './distalJoints'
/** Joint origins in the registered atlas bind pose, in metres. Left is positive X. */
export const joints = [
  ['pelvis', -1, [0, 0.88, 0.06]],
  ['lumbar', 0, [0, 0.97, 0.07]],
  ['spine', 1, [0, 1.1, 0.07]],
  ['chest', 2, [0, 1.26, 0.07]],
  ['neck', 3, [0, 1.41, 0.075]],
  ['head', 4, [0, 1.49, 0.075]],
  ['leftArm', 18, [0.17, 1.33, 0.075]],
  ['leftForearm', 6, [0.226, 1.05, 0.08]],
  ['leftHand', 7, [0.25, 0.83, 0.09]],
  ['rightArm', 19, [-0.17, 1.33, 0.075]],
  ['rightForearm', 9, [-0.226, 1.05, 0.08]],
  ['rightHand', 10, [-0.25, 0.83, 0.09]],
  ['leftThigh', 0, [0.09, 0.82, 0.075]],
  ['leftShin', 12, [0.08, 0.405, 0.075]],
  ['leftFoot', 13, [0.08, 0.065, 0.07]],
  ['rightThigh', 0, [-0.09, 0.82, 0.075]],
  ['rightShin', 15, [-0.08, 0.405, 0.075]],
  ['rightFoot', 16, [-0.08, 0.065, 0.07]],
  ['leftShoulder', 3, [0.04, 1.34, 0.09]],
  ['rightShoulder', 3, [-0.04, 1.34, 0.09]],
  ...distalJoints,
] as const

export type Joint = (typeof joints)[number][0]
export type Triple = [number, number, number]
export const indexOfJoint = Object.fromEntries(joints.map(([name], i) => [name, i])) as Record<
  Joint,
  number
>
