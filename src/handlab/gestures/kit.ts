import { Quaternion, Vector3 } from 'three'
import {
  limb,
  measure,
  reachArm,
  setArm,
  setLeg,
  turn,
  RELAXED_ARM,
  type ArmAngles,
  type Side,
} from '../../motion/anatomy'
import type { MovementRig } from '../../motion/movementRig'
import { flatPalmOrientation, palmOrientation } from '../../motion/studio/handOrientation'
import { applyAngles, type HandAngles } from '../../motion/hands/fit'
import type { PropSpec } from '../types'

export const V = (x = 0, y = 0, z = 0) => new Vector3(x, y, z)
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
export const ease = (v: number) => {
  const u = clamp01(v)
  return u * u * (3 - 2 * u)
}
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** World position of the wrist joint. */
export const wristOf = (r: MovementRig, s: Side) =>
  r.bones[limb(s).hand].getWorldPosition(new Vector3())

/**
 * Put the wrist at `wrist` with the fingers pointing along `fingers` and the palm facing `normal`
 * (both world directions); the elbow swings toward `pole`. Returns the solver's result.
 */
export function placeHand(
  r: MovementRig,
  s: Side,
  wrist: Vector3,
  fingers: Vector3,
  normal: Vector3,
  pole: Vector3,
  flat = false,
) {
  const q = (flat ? flatPalmOrientation : palmOrientation)(s, fingers.clone(), normal.clone())
  return reachArm(r, s, wrist, q, pole)
}

/** A hanging arm with the hand in `angles`. */
export function hang(r: MovementRig, s: Side, angles: HandAngles, arm: ArmAngles = RELAXED_ARM) {
  setArm(r, s, arm)
  r.root.updateMatrixWorld(true)
  applyAngles(r, s, angles)
}

export const quatOf = (r: MovementRig, i: number) => r.bones[i].getWorldQuaternion(new Quaternion())

/** Seat the skeleton on a simple chair bench with both feet resting flat on the floor (y=0). */
export function sitInChair(r: MovementRig): PropSpec {
  r.root.position.set(0, 0.5, -0.2)
  setLeg(r, 1, [84, 2, 84, 0, 0, 0])
  setLeg(r, -1, [84, 2, 84, 0, 0, 0])
  r.root.updateMatrixWorld(true)
  // Seat top sits just under the pelvis/thighs; front edge around z = 0.02, side edge x = +-0.215.
  return {
    kind: 'box',
    name: 'chair-seat',
    centre: V(0, 0.375, -0.17),
    size: [0.43, 0.04, 0.38],
    color: '#394048',
  }
}

/** Put the skeleton in an all-fours posture with knees and shins resting on the floor (y=0). */
export function allFoursPose(r: MovementRig, rootY = 0.445) {
  r.root.position.set(0, rootY, 0)
  r.bones[0].quaternion.copy(turn(new Vector3(1, 0, 0), 79))
  setLeg(r, 1, [88, 2, 90, 25])
  setLeg(r, -1, [88, 2, 90, 25])
  r.root.updateMatrixWorld(true)
}

/** Standard joint summary for the active hand. */
export function handNotes(r: MovementRig, s: Side, extra: Record<string, number | string> = {}) {
  const a = measure(r)
  const k = s === 1 ? 'L.' : 'R.'
  return {
    wristExt: +a[k + 'wrist.extension'].toFixed(1),
    wristRad: +a[k + 'wrist.radial'].toFixed(1),
    pron: +a[k + 'forearm.pronation'].toFixed(1),
    elbow: +a[k + 'elbow.flexion'].toFixed(1),
    ...extra,
  }
}
