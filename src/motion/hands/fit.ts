/**
 * Fitting the hand to things: finger and thumb capsules measured from the performer's skin, a
 * closure solver that wraps fingers onto any signed-distance surface, and a thumb solver that
 * brings the thumb pad to a goal. Shared by the Hand Lab and Motion Lab grips.
 */
import { Quaternion, Vector3 } from 'three'
import { bindFlexion, clamp, limb, prefixOf, setHand, turn, vec, type Side } from '../anatomy'
import type { HandShape } from '../anatomy'
import { digitAxes, digitTips } from '../distalJoints'
import { indexOfJoint, pivot, type Joint } from '../joints'
import type { MovementRig } from '../movementRig'
import { HAND_RANGES } from './ranges'

export const DIGITS = ['Index', 'Middle', 'Ring', 'Little'] as const
export type Digit = (typeof DIGITS)[number]
/** Skin radius around each phalanx (m), proximal to distal, measured on `performer.glb`. */
export const SKIN_RADIUS = {
  Index: [0.0094, 0.0085, 0.0062],
  Middle: [0.0097, 0.0087, 0.0064],
  Ring: [0.0091, 0.0082, 0.006],
  Little: [0.0079, 0.0072, 0.0052],
  Thumb: [0.0108, 0.0079],
} as const

type Four = readonly [number, number, number, number]
/** Every hand angle in anatomical degrees, always with a per-finger fan. */
export interface HandAngles {
  mcp: [number, number, number, number]
  pip: [number, number, number, number]
  dip: [number, number, number, number]
  fan: [number, number, number, number]
  /** Thumb CMC flexion, CMC abduction, CMC axial rotation, MCP, IP. */
  thumb: [number, number, number, number, number]
}
export const copyAngles = (a: HandAngles): HandAngles => ({
  mcp: [...a.mcp],
  pip: [...a.pip],
  dip: [...a.dip],
  fan: [...a.fan],
  thumb: [...a.thumb],
})
export function anglesOf(shape: HandShape): HandAngles {
  const fan = (shape.fan ?? [0.9, 0.25, -0.4, -1].map((f) => f * shape.spread * 0.5)) as Four
  return {
    mcp: [...shape.mcp],
    pip: [...shape.pip],
    dip: [...shape.dip],
    fan: [...fan],
    thumb: [...shape.thumb],
  }
}
const shapeOf = (a: HandAngles): HandShape => ({
  mcp: a.mcp,
  pip: a.pip,
  dip: a.dip,
  spread: 0,
  fan: a.fan,
  thumb: a.thumb,
})
/** Write the angles to the bones and refresh the hand's world matrices. */
export function applyAngles(r: MovementRig, s: Side, a: HandAngles) {
  setHand(r, s, shapeOf(a))
  r.bones[limb(s).hand].updateMatrixWorld(true)
}

export interface Capsule {
  a: Vector3
  b: Vector3
  radius: number
  /** Unit vector from the bone toward the skin that curls onto an object (the pad side). */
  palmar: Vector3
}
const V = () => new Vector3()
function boneIndex(s: Side, name: string) {
  return indexOfJoint[(prefixOf(s) + name) as Joint]
}
function capsuleOf(r: MovementRig, s: Side, name: string, last: boolean, radius: number): Capsule {
  const i = boneIndex(s, name),
    joint = r.bones[i]
  const a = joint.getWorldPosition(V())
  const child = r.bones.find((b, k) => k > 0 && (b.parent === joint) && k !== i)
  const digit = prefixOf(s) + name.replace(/\d$/, '')
  const tipName = name.startsWith('Thumb') ? prefixOf(s) + 'Thumb' : digit
  const b =
    !last && child
      ? child.getWorldPosition(V())
      : joint.localToWorld(vec(digitTips[tipName as keyof typeof digitTips]).sub(pivot(i)))
  const axis = vec(digitAxes[prefixOf(s) + name].flex).applyQuaternion(
    joint.parent!.getWorldQuaternion(new Quaternion()),
  )
  const palmar = axis.cross(b.clone().sub(a).normalize()).normalize()
  return { a, b, radius, palmar }
}
export function fingerCapsules(r: MovementRig, s: Side, digit: Digit): Capsule[] {
  return [1, 2, 3].map((k) => capsuleOf(r, s, digit + k, k === 3, SKIN_RADIUS[digit][k - 1]))
}
export function thumbCapsules(r: MovementRig, s: Side): Capsule[] {
  return [1, 2].map((k) => capsuleOf(r, s, 'Thumb' + k, k === 2, SKIN_RADIUS.Thumb[k - 1]))
}
/** Centre of a finger pad: along the distal phalanx, pushed out to the skin on the pad side. */
export function padPoint(c: Capsule, along = 0.6) {
  return c.a.clone().lerp(c.b, along).addScaledVector(c.palmar, c.radius)
}

/** Signed distance: negative inside the object. */
export type Surface = (p: Vector3) => number
export const sphere = (centre: Vector3, radius: number): Surface => (p) =>
  p.distanceTo(centre) - radius
export const halfSpace = (point: Vector3, normal: Vector3): Surface => (p) =>
  p.clone().sub(point).dot(normal)
/** An infinite cylinder. */
export const cylinder = (point: Vector3, axis: Vector3, radius: number): Surface => (p) => {
  const d = p.clone().sub(point)
  d.addScaledVector(axis, -d.dot(axis))
  return d.length() - radius
}
/** A cylinder of finite length with flat ends (rounded by `round`). */
export const finiteCylinder = (
  point: Vector3,
  axis: Vector3,
  radius: number,
  half: number,
): Surface => (p) => {
  const d = p.clone().sub(point),
    along = d.dot(axis)
  d.addScaledVector(axis, -along)
  const q = [d.length() - radius, Math.abs(along) - half]
  return Math.min(Math.max(q[0], q[1]), 0) + Math.hypot(Math.max(q[0], 0), Math.max(q[1], 0))
}
/** An axis-aligned or oriented rounded box (for seat rails, table edges, blocks). */
export const roundedBox = (
  centre: Vector3,
  halfExtents: readonly [number, number, number],
  radius = 0,
  orientation?: Quaternion,
): Surface => {
  const inv = orientation ? orientation.clone().invert() : null
  return (p) => {
    const q = p.clone().sub(centre)
    if (inv) q.applyQuaternion(inv)
    const dx = Math.abs(q.x) - halfExtents[0] + radius
    const dy = Math.abs(q.y) - halfExtents[1] + radius
    const dz = Math.abs(q.z) - halfExtents[2] + radius
    const out = Math.hypot(Math.max(dx, 0), Math.max(dy, 0), Math.max(dz, 0))
    const inside = Math.min(Math.max(dx, dy, dz), 0)
    return out + inside - radius
  }
}
/** The solid of a capsule, so a finger can be something the thumb must stay out of. */
export const capsuleSurface =
  (c: Capsule): Surface =>
  (p) => {
    const ab = c.b.clone().sub(c.a),
      t = clamp(p.clone().sub(c.a).dot(ab) / Math.max(1e-12, ab.lengthSq()), 0, 1)
    return p.distanceTo(c.a.clone().addScaledVector(ab, t)) - c.radius
  }
export const union =
  (...surfaces: Surface[]): Surface =>
  (p) =>
    Math.min(...surfaces.map((f) => f(p)))

/** Smallest clearance (m) between a capsule's skin and a surface; negative means penetration. */
export function clearance(c: Capsule, surface: Surface, samples = 9) {
  let best = Infinity
  const p = V()
  for (let i = 0; i < samples; i++) {
    p.lerpVectors(c.a, c.b, i / (samples - 1))
    best = Math.min(best, surface(p) - c.radius)
  }
  return best
}
export function handClearance(r: MovementRig, s: Side, surface: Surface) {
  const out: Record<string, number> = {}
  for (const d of DIGITS)
    fingerCapsules(r, s, d).forEach((c, k) => (out[d + (k + 1)] = clearance(c, surface)))
  thumbCapsules(r, s).forEach((c, k) => (out['Thumb' + (k + 1)] = clearance(c, surface)))
  return out
}

export interface CloseOptions {
  /** Digits to close, default all four fingers. */
  digits?: number[]
  /** Pad compression: stop this far inside the surface (m, default 0.0008). */
  press?: number
  /** Furthest each joint may flex while closing. */
  limit?: { mcp: number; pip: number; dip: number }
  /** Hold DIP at this fraction of the PIP angle once the PIP has closed (the coupling). */
  coupling?: number
}
const CLOSE_LIMIT = { mcp: 92, pip: 108, dip: 75 }
const OPEN_LIMIT = { mcp: -25, pip: 0, dip: 0 }
/**
 * Close the fingers onto `surface`, joint by joint from the knuckle outward. If a phalanx starts
 * inside the surface, it opens toward `OPEN_LIMIT` until clear; otherwise it flexes until the
 * phalanx meets `surface` (within `press`). The DIP follows the PIP by `coupling` unless the
 * surface stops it first.
 */
export function closeFingers(
  r: MovementRig,
  s: Side,
  a: HandAngles,
  surface: Surface,
  opt: CloseOptions = {},
) {
  const press = opt.press ?? 0.0008,
    limit = opt.limit ?? CLOSE_LIMIT,
    digits = opt.digits ?? [0, 1, 2, 3],
    coupling = opt.coupling ?? 0.66
  for (const i of digits) {
    const digit = DIGITS[i]
    const joints = ['mcp', 'pip', 'dip'] as const
    for (const [k, key] of joints.entries()) {
      const gap = (angle: number) => {
        a[key][i] = angle
        applyAngles(r, s, a)
        return clearance(fingerCapsules(r, s, digit)[k], surface) + press
      }
      const start =
        key === 'dip' && coupling > 0
          ? Math.max(a.dip[i], Math.min(limit.dip, a.pip[i] * coupling))
          : a[key][i]
      if (gap(start) <= 0) {
        // Already inside or touching: step backward toward OPEN_LIMIT if penetrating beyond tolerance.
        if (gap(start) < -0.0015) {
          let hi = start,
            lo = start
          for (let angle = start - 4; ; angle -= 4) {
            lo = Math.max(angle, OPEN_LIMIT[key])
            if (gap(lo) >= 0 || lo <= OPEN_LIMIT[key]) break
            hi = lo
          }
          if (gap(lo) < 0) {
            a[key][i] = lo
          } else {
            for (let n = 0; n < 8; n++) {
              const mid = (lo + hi) / 2
              if (gap(mid) > 0) lo = mid
              else hi = mid
            }
            a[key][i] = lo
          }
        } else {
          a[key][i] = start
        }
        continue
      }
      let lo = start,
        hi = start
      // Step until the phalanx meets the surface, then bisect the last step.
      for (let angle = start + 4; ; angle += 4) {
        hi = Math.min(angle, limit[key])
        if (gap(hi) <= 0 || hi >= limit[key]) break
        lo = hi
      }
      if (gap(hi) > 0) {
        a[key][i] = hi
        continue
      }
      for (let n = 0; n < 8; n++) {
        const mid = (lo + hi) / 2
        if (gap(mid) > 0) lo = mid
        else hi = mid
      }
      a[key][i] = lo
    }
    applyAngles(r, s, a)
  }
  void bindFlexion
  void turn
}

export interface ThumbGoal {
  /** World point the thumb pad should reach. */
  point: Vector3
  /** Unit direction the pad should face (the surface normal it presses on), if any. */
  facing?: Vector3
  /** Surface the thumb must stay outside of. */
  avoid?: Surface
  /** Capsule index on the thumb to use as the pad: 1 = distal phalanx. */
  pad?: number
  /** Point along the pad capsule (0..1, default 0.55). */
  along?: number
  /** Value to relax toward when several solutions reach the goal. */
  prefer?: HandAngles['thumb']
  /** Optional per-joint limits overriding `THUMB_LIMITS`. */
  limits?: readonly [number, number][]
}
const THUMB_LIMITS: [number, number][] = [
  HAND_RANGES.thumbCmcFlex.active as [number, number],
  HAND_RANGES.thumbCmcAbduct.active as [number, number],
  HAND_RANGES.thumbCmcRotate.active as [number, number],
  [0, HAND_RANGES.thumbMcp.passive[1]],
  [0, HAND_RANGES.thumbIp.active[1]],
]
/** Move the thumb's five joints until its pad is at the goal, keeping clear of the surface. */
export function placeThumb(r: MovementRig, s: Side, a: HandAngles, goal: ThumbGoal) {
  const limits = goal.limits ?? THUMB_LIMITS
  const cost = () => {
    applyAngles(r, s, a)
    const caps = thumbCapsules(r, s)
    const pad = caps[goal.pad ?? 1]
    const p = padPoint(pad, goal.along ?? 0.55)
    let c = p.distanceToSquared(goal.point) * 1e4
    if (goal.facing) c += (1 + pad.palmar.dot(goal.facing)) ** 2 * 3
    if (goal.avoid) for (const cap of caps) c += Math.max(0, -clearance(cap, goal.avoid)) ** 2 * 2e4
    if (goal.prefer) for (let k = 0; k < 5; k++) c += ((a.thumb[k] - goal.prefer[k]) / 90) ** 2 * 0.5
    return c
  }
  let best = cost()
  for (const step of [16, 8, 4, 2, 1, 0.5])
    for (let sweep = 0; sweep < 4; sweep++) {
      let moved = false
      for (let k = 0; k < 5; k++) {
        const old = a.thumb[k]
        let kept = old
        for (const sign of [-1, 1]) {
          a.thumb[k] = clamp(old + sign * step, limits[k][0], limits[k][1])
          const v = cost()
          if (v < best - 1e-12) {
            best = v
            kept = a.thumb[k]
            moved = true
          }
        }
        a.thumb[k] = kept
      }
      if (!moved) break
    }
  applyAngles(r, s, a)
  const p = padPoint(thumbCapsules(r, s)[goal.pad ?? 1], goal.along ?? 0.55)
  return p.distanceTo(goal.point)
}
