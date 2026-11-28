/**
 * Named hand shapes. Each starts from anatomy (per-joint angles inside `HAND_RANGES`, DIP following
 * PIP, the finger cascade) and finishes with a solve where two parts of the hand must touch: the
 * thumb pad on the index pad in a pinch, or the thumb across the fingers of a fist.
 *
 * They write the hand's bones and return the angles so a gesture can adjust them further.
 */
import { Quaternion } from 'three'
import { armFrame, limb, type Side } from '../anatomy'
import type { MovementRig } from '../movementRig'
import { palmPad } from '../studio/anchors'
import {
  applyAngles,
  capsuleSurface,
  fingerCapsules,
  padPoint,
  placeThumb,
  thumbCapsules,
  type HandAngles,
} from './fit'
import { applyTenodesis, coupledDip, HAND_RANGES } from './ranges'

/**
 * The resting hand: neither tensed nor draped. Fingers fall into the cascade, each a little more
 * flexed than its radial neighbour, MCP 22 to 46, PIP 30 to 46 and DIP 14 to 18; adjacent fingers
 * stay close; the thumb lies alongside the index finger, slightly flexed. When `wristExtension`
 * is provided, passive tenodesis adjusts finger flexion accordingly.
 */
export const relaxedAngles = (wristExtension = 0): HandAngles => {
  const base = {
    mcp: [22, 30, 38, 46] as const,
    pip: [30, 36, 42, 46] as const,
    dip: [14, 16, 18, 18] as const,
  }
  const flexed =
    wristExtension !== 0
      ? applyTenodesis(wristExtension, base)
      : {
          mcp: [...base.mcp] as [number, number, number, number],
          pip: [...base.pip] as [number, number, number, number],
          dip: [...base.dip] as [number, number, number, number],
        }
  return {
    ...flexed,
    fan: [1, 0, -1, -3],
    thumb: [8, 10, 4, 14, 14],
  }
}

/** Straight fingers with the slight cascade a real open hand keeps. */
export const openAngles = (spread = 6): HandAngles => ({
  mcp: [2, 4, 6, 8],
  pip: [1, 2, 3, 4],
  dip: [0, 1, 2, 3],
  fan: [spread * 0.55, spread * 0.1, -spread * 0.35, -spread * 0.9],
  thumb: [-12, 10, -8, 6, 4],
})

/** Power fist: every finger closed on the palm; the thumb is placed by the caller's thumb style. */
export const fistAngles = (): HandAngles => ({
  mcp: [88, 90, 92, 94],
  pip: [104, 106, 108, 108],
  dip: [68, 70, 72, 70],
  fan: [0, 0, 0, 0],
  thumb: [32, 24, 28, 36, 26],
})

export type ThumbStyle = 'across' | 'up' | 'down' | 'tucked'

/** World point and facing for the thumb pad resting across the middle phalanges. */
function thumbOver(r: MovementRig, s: Side, finger: number) {
  const names = ['Index', 'Middle', 'Ring', 'Little'] as const
  const c = fingerCapsules(r, s, names[finger])[1]
  const next = fingerCapsules(r, s, names[Math.min(3, finger + 1)])[1]
  const dorsal = c.palmar.clone().negate()
  const centre = c.a.clone().lerp(c.b, 0.5).lerp(next.a.clone().lerp(next.b, 0.5), 0.22)
  return {
    point: centre.addScaledVector(dorsal, c.radius + thumbCapsules(r, s)[1].radius * 0.72),
    facing: c.palmar.clone(),
  }
}

const FIST_THUMB_LIMITS: [number, number][] = [
  [20, 48],
  [6, 36],
  [10, 42],
  [25, 58],
  [24, 58],
]

/** Close the hand into a fist and place the thumb in the given style. */
export function fist(r: MovementRig, s: Side, style: ThumbStyle = 'across'): HandAngles {
  const a = fistAngles()
  if (style === 'up' || style === 'down') {
    // Thumb extended radially along the plane of the palm: negative CMC flex pulls the 1st
    // metacarpal radially; negative abduct/rotate keep it out of palmar abduction.
    a.thumb = [-42, -12, -36, 3, 3]
  }
  applyAngles(r, s, a)
  if (style === 'across') {
    const goal = thumbOver(r, s, 1)
    placeThumb(r, s, a, {
      point: goal.point,
      facing: goal.facing,
      pad: 1,
      along: 0.7,
      prefer: [36, 14, 30, 42, 34],
      limits: FIST_THUMB_LIMITS,
    })
  } else if (style === 'tucked') {
    const goal = thumbOver(r, s, 0)
    placeThumb(r, s, a, {
      point: goal.point,
      facing: goal.facing,
      pad: 1,
      along: 0.7,
      prefer: [30, 14, 26, 36, 30],
      limits: FIST_THUMB_LIMITS,
    })
  }
  return a
}

/** Index extended, other fingers closed, thumb resting across the middle finger. */
export function pointing(r: MovementRig, s: Side): HandAngles {
  const a = fistAngles()
  a.mcp[0] = 4
  a.pip[0] = 2
  a.dip[0] = 1
  a.fan[0] = 3
  applyAngles(r, s, a)
  const goal = thumbOver(r, s, 1)
  placeThumb(r, s, a, {
    point: goal.point,
    facing: goal.facing,
    pad: 1,
    along: 0.7,
    prefer: [36, 14, 30, 42, 34],
    limits: FIST_THUMB_LIMITS,
  })
  return a
}

const PAD_PINCH_LIMITS: [number, number][] = [
  HAND_RANGES.thumbCmcFlex.active as [number, number],
  [16, 60],
  [-15, 45],
  [14, 55],
  [18, 55],
]

/**
 * Pad to pad: the thumb pad on the pad of a finger, with the pads facing each other. The finger's
 * knuckle and middle joint close a little more or less (DIP following) until the thumb can reach
 * with natural rounded MCP/IP curvature instead of a stiff straight thumb.
 */
export function padToPad(r: MovementRig, s: Side, a: HandAngles, finger: 0 | 1 | 2 | 3) {
  const names = ['Index', 'Middle', 'Ring', 'Little'] as const
  const base = { mcp: a.mcp[finger], pip: a.pip[finger], dip: a.dip[finger] }
  let best = { gap: Infinity, extra: 0, thumb: [...a.thumb] as HandAngles['thumb'] }
  for (let extra = -12; extra <= 28; extra += 3) {
    a.mcp[finger] = base.mcp + extra * 0.8
    a.pip[finger] = base.pip + extra
    a.dip[finger] = base.dip + extra * coupledDip(1)
    applyAngles(r, s, a)
    const tip = fingerCapsules(r, s, names[finger])[2]
    const gap = placeThumb(r, s, a, {
      point: padPoint(tip, 0.72),
      facing: tip.palmar.clone(),
      pad: 1,
      along: 0.6,
      avoid: capsuleSurface(tip),
      prefer: [26, 36, 26, 20, 28],
      limits: PAD_PINCH_LIMITS,
    })
    if (gap < best.gap) best = { gap, extra, thumb: [...a.thumb] as HandAngles['thumb'] }
  }
  a.mcp[finger] = base.mcp + best.extra * 0.8
  a.pip[finger] = base.pip + best.extra
  a.dip[finger] = base.dip + best.extra * coupledDip(1)
  a.thumb = best.thumb
  applyAngles(r, s, a)
  return best.gap
}

export function okSign(r: MovementRig, s: Side): HandAngles {
  const a: HandAngles = {
    mcp: [38, 12, 16, 20],
    pip: [50, 8, 10, 12],
    dip: [26, 4, 5, 6],
    fan: [8, 0, -5, -11],
    thumb: [26, 36, 26, 20, 28],
  }
  padToPad(r, s, a, 0)
  return a
}

export function pinch(r: MovementRig, s: Side): HandAngles {
  const a: HandAngles = {
    mcp: [34, 48, 58, 66],
    pip: [42, 58, 66, 70],
    dip: [24, 32, 36, 38],
    fan: [2, 0, -2, -4],
    thumb: [26, 36, 26, 20, 28],
  }
  padToPad(r, s, a, 0)
  return a
}

/** The palm surface point of a hand, in the world. */
export function palmPoint(r: MovementRig, s: Side) {
  return r.bones[limb(s).hand].localToWorld(palmPad(s))
}
/** The direction the palm faces. */
export function palmNormal(r: MovementRig, s: Side) {
  return armFrame(s)
    .palmar.clone()
    .applyQuaternion(r.bones[limb(s).hand].getWorldQuaternion(new Quaternion()))
}

/** Gap in metres between the thumb pad's skin and a finger pad's skin (negative: pressed in). */
export function padGap(r: MovementRig, s: Side, finger: 0 | 1 | 2 | 3 = 0) {
  const names = ['Index', 'Middle', 'Ring', 'Little'] as const
  const tip = fingerCapsules(r, s, names[finger])[2],
    thumb = thumbCapsules(r, s)[1]
  let best = Infinity
  for (let i = 0; i <= 10; i++)
    for (let j = 0; j <= 10; j++)
      best = Math.min(
        best,
        tip.a
          .clone()
          .lerp(tip.b, i / 10)
          .distanceTo(thumb.a.clone().lerp(thumb.b, j / 10)),
      )
  return best - tip.radius - thumb.radius
}
/**
 * How far each fingertip pad sits from the palm's surface in a closed hand (m, positive: clear).
 * A tight fist presses them in a few millimetres.
 */
export function tipToPalm(r: MovementRig, s: Side) {
  const n = palmNormal(r, s),
    p0 = palmPoint(r, s),
    names = ['Index', 'Middle', 'Ring', 'Little'] as const
  return names.map((d) => {
    const c = fingerCapsules(r, s, d)[2]
    return c.b.clone().sub(p0).dot(n) - 0.004
  })
}
