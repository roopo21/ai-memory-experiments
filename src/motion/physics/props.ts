/**
 * Where weight-bearing props hold the body up, as a height field over the floor, so the physics
 * check can judge contact, sinking and balance against a roller, pillow, ball, bed or step instead
 * of skipping those guides. The shapes are the ones `equipment.ts` draws; keep the two in step.
 */
import type { AuthoredId } from '../../studio/choreography'

/** Top of the prop at a point of the floor plan, in metres; -Infinity where there is none. */
export type Surface = (x: number, z: number) => number

const cap = (r: number, d: number) => Math.sqrt(Math.max(0, r * r - d * d))
const inside = (v: number, a: number, b: number) => v >= a && v <= b

/** Every gear item that carries weight, and its top surface. */
const SURFACES: Record<string, (id: AuthoredId, side: 1 | -1) => Surface> = {
  // A foam roller along the spine: a cylinder of radius 52 mm on the floor, 0.8 m long.
  longRoll: () => (x, z) =>
    inside(z, -0.76, 0.025) && Math.abs(x) < 0.052 ? 0.052 + cap(0.052, x) : -Infinity,
  // A roller across the upper back, 0.48 m wide.
  crossRoll: () => (x, z) =>
    inside(x, -0.24, 0.24) && Math.abs(z + 0.37) < 0.052 ? 0.052 + cap(0.052, z + 0.37) : -Infinity,
  // A pillow under the head: an ellipsoid, 0.38 m by 0.4 m and 65 mm tall above its centre.
  pillow: () => (x, z) => {
    const q = 1 - (x / 0.19) ** 2 - ((z + 0.045) / 0.2) ** 2
    return q > 0 ? 0.06 + 0.065 * Math.sqrt(q) : -Infinity
  },
  // A stability ball under the back for a backbend: a sphere of radius 0.32 m.
  ball: () => (x, z) => {
    const q = 0.32 ** 2 - x * x - (z + 0.16) ** 2
    return q > 0 ? 0.32 + Math.sqrt(q) : -Infinity
  },
  // The edge of a bed: a mattress 0.86 m wide with its top at 0.578 m.
  bed: () => (x, z) => (Math.abs(x) < 0.43 && inside(z, -1.3, 0.1) ? 0.578 : -Infinity),
  // A step: a wide one for the heel drop, a small one beside the foot for the hamstring stretch.
  step: (id, side) =>
    id === 'step-heel-drop'
      ? (x, z) => (Math.abs(x) < 0.315 && inside(z, 0.165, 0.455) ? 0.152 : -Infinity)
      : (x, z) => (Math.abs(x - side * 0.095) < 0.15 && inside(z, 0.385, 0.735) ? 0.16 : -Infinity),
}

/** The combined height of every weight-bearing prop a guide uses, or nothing if it uses none. */
export function propSurface(id: AuthoredId, gear: readonly string[], side: 1 | -1) {
  const parts = gear.filter((g) => g in SURFACES).map((g) => SURFACES[g](id, side))
  if (!parts.length) return undefined
  const top: Surface = (x, z) => Math.max(...parts.map((p) => p(x, z)))
  return top
}

/**
 * The joints a prop can carry. A roller, pillow, bed or ball holds up the head, trunk, pelvis and
 * thighs; the shins and feet beside it stand on the floor and must not be judged against a prop
 * they are not touching. A step carries the foot and shin that stand on it.
 */
export function carriedByProp(gear: readonly string[], joint: number) {
  const onStep = gear.includes('step'),
    torso = joint <= 5 || joint === 12 || joint === 15
  return onStep ? joint >= 12 && joint <= 17 : torso
}
