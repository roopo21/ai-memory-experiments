import { Quaternion, Vector3 } from 'three'
import { armFrame, limb, type Side } from '../motion/anatomy'
import type { MovementRig } from '../motion/movementRig'

export const VIEWS = [
  'front',
  'side',
  'top',
  'low',
  'oblique',
  'palm',
  'back',
  'thumb',
  'pinky',
] as const
export type ViewName = (typeof VIEWS)[number]
const V = (x: number, y: number, z: number) => new Vector3(x, y, z)
const WORLD_UP = V(0, 1, 0)

/** World-fixed views look at the focus from a fixed direction. */
const WORLD: Record<string, [Vector3, Vector3]> = {
  front: [V(0.18, 0.12, 1).normalize(), WORLD_UP],
  side: [V(1, 0.1, -0.12).normalize(), WORLD_UP],
  top: [V(0.04, 1, 0.12).normalize(), V(0, 0, -1)],
  // A camera at floor level shows daylight under anything that should touch the floor.
  low: [V(0.55, 0.02, 1).normalize(), WORLD_UP],
}

/** Pick a gravity-consistent camera up vector unless the view axis is nearly vertical. */
function uprightFor(dir: Vector3, fallback: Vector3) {
  return Math.abs(dir.y) > 0.88 ? fallback.clone() : WORLD_UP.clone()
}

/**
 * Camera placement for a named view. World views keep gravity upright; hand views sit on the
 * palm, back, thumb, little-finger or oblique side of the working hand.
 */
export function cameraFor(
  view: string,
  focus: Vector3,
  span: number,
  rig: MovementRig,
  side: Side,
  fov = 32,
  wholeBody = false,
) {
  const targetFocus = wholeBody ? V(0, 0.86, 0.12) : focus
  const targetSpan = wholeBody ? 0.92 : span
  const distance = targetSpan / Math.tan((fov * Math.PI) / 360) + (wholeBody ? 0.4 : 0.05)
  const fixed = WORLD[view]
  if (fixed)
    return {
      position: targetFocus.clone().addScaledVector(fixed[0], distance),
      up: fixed[1].clone(),
      focus: targetFocus,
    }
  const hand = rig.bones[limb(side).hand],
    q = hand.getWorldQuaternion(new Quaternion()),
    f = armFrame(side)
  const palmar = f.palmar.clone().applyQuaternion(q),
    radial = f.radial.clone().applyQuaternion(q),
    along = f.handLong.clone().applyQuaternion(q)
  const dir = (
    view === 'palm'
      ? palmar
      : view === 'back'
        ? palmar.clone().negate()
        : view === 'thumb'
          ? radial
          : view === 'pinky'
            ? radial.clone().negate()
            : palmar
                .clone()
                .multiplyScalar(0.65)
                .add(radial.clone().multiplyScalar(0.55))
                .add(along.clone().multiplyScalar(0.25))
  ).normalize()
  const fallback = along.y < -0.3 ? along.clone().negate() : along.clone()
  return {
    position: targetFocus.clone().addScaledVector(dir, distance),
    up: uprightFor(dir, fallback),
    focus: targetFocus,
  }
}
