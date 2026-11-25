import type { Triple } from '../motion/joints'

export const limbs = ['leftHand', 'rightHand', 'leftFoot', 'rightFoot'] as const
export type EndJoint = (typeof limbs)[number]
export type AnchorSpace = 'world' | 'pelvis' | 'leftThigh' | 'rightThigh'
export interface Pin {
  limb: EndJoint
  space: AnchorSpace
  point: 'palm' | 'sole' | 'toe'
  from?: number
  until?: number
  at: Triple
  /** Orientation as x, y, z, w: in the world, or in `space` when `relative` is set. */
  rotation: [number, number, number, number]
  /**
   * A hand holding a thigh turns with it. Older motions stored body-space pins in world
   * orientation, so the flag keeps them as they were saved.
   */
  relative?: true
}
export function readPins(input: unknown, duration: number): Pin[] | undefined {
  if (input === undefined) return
  if (!Array.isArray(input) || input.length > 4)
    throw Error('Use at most one anchor per hand or foot.')
  const seen = new Set<string>()
  return input.map((p): Pin => {
    if (
      !p ||
      !limbs.includes(p.limb) ||
      seen.has(p.limb) ||
      !['world', 'pelvis', 'leftThigh', 'rightThigh'].includes(p.space)
    )
      throw Error('Invalid or duplicate limb anchor.')
    seen.add(p.limb)
    const hand = p.limb.endsWith('Hand')
    if (hand ? p.point !== 'palm' : !['sole', 'toe'].includes(p.point) || p.space.endsWith('Thigh'))
      throw Error('This anchor point or parent cannot support that limb.')
    if (
      !Array.isArray(p.at) ||
      p.at.length !== 3 ||
      !p.at.every((n: unknown) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 5)
    )
      throw Error('Anchor positions must be within five metres.')
    if (
      !Array.isArray(p.rotation) ||
      p.rotation.length !== 4 ||
      !p.rotation.every(Number.isFinite) ||
      Math.abs(Math.hypot(...p.rotation) - 1) > 1e-5
    )
      throw Error('Invalid anchor orientation.')
    if (p.relative !== undefined && (p.relative !== true || p.space === 'world'))
      throw Error('Only a body-space anchor can turn with its parent.')
    const from = p.from ?? 0,
      until = p.until ?? duration
    if (
      !Number.isFinite(from) ||
      !Number.isFinite(until) ||
      from < 0 ||
      until > duration ||
      until <= from
    )
      throw Error('Anchor intervals must fit inside the clip.')
    return {
      ...(p.from !== undefined ? { from } : {}),
      ...(p.until !== undefined ? { until } : {}),
      limb: p.limb,
      space: p.space,
      point: p.point,
      at: [...p.at] as Triple,
      rotation: [...p.rotation] as Pin['rotation'],
      ...(p.relative ? { relative: true as const } : {}),
    }
  })
}

// Ease into a lock before its first frame and ease out after the final locked frame.
export function pinWeight(pin: Pin, t: number) {
  const distance =
    t < (pin.from ?? 0)
      ? (pin.from ?? 0) - t
      : t > (pin.until ?? Infinity)
        ? t - (pin.until ?? Infinity)
        : 0
  const u = Math.max(0, 1 - distance / 0.15)
  return u * u * (3 - 2 * u)
}
