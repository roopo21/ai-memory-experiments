import { scores, type AuthoredId } from '../../../studio/choreography'
import type { Reach } from '../../../studio/choreography/types'
import { fixturePoint, markOf } from './contacts'
import { Quaternion, Vector3 } from 'three'
import {
  armFrame,
  reachPalm,
  limb,
  bindFlexion,
  clamp,
  prefixOf,
  turn,
  vec,
  type Side,
} from '../../anatomy'
import { digitAxes, digitTips } from '../../distalJoints'
import { indexOfJoint, pivot, type Joint } from '../../joints'
import type { MovementRig } from '../../movementRig'

import { gripPoint, worldGrip } from '../anchors'

/** Close each phalanx up to the surface of a circular handle. The pad is a capsule
 * around its bone. Stopping one hinge still lets the next hinge wrap around. */
function wrapHandle(
  r: MovementRig,
  s: Side,
  start: Vector3,
  line: Vector3,
  radius: number,
  thumb = true,
) {
  const side = prefixOf(s)
  for (const [d, digit] of ['Index', 'Middle', 'Ring', 'Little'].entries()) {
    const count = 3
    for (let k = 1; k <= count; k++) {
      const name = side + digit + k
      const i = indexOfJoint[name as Joint]
      const joint = r.bones[i]
      const origin = joint.getWorldPosition(new Vector3())
      const parent = joint.parent!.getWorldQuaternion(new Quaternion())
      const axis = vec(digitAxes[name].flex)
      const bind = bindFlexion(name)
      const segment =
        k < count
          ? r.rest[i + 1]
          : vec(digitTips[(side + digit) as keyof typeof digitTips]).sub(pivot(i))
      const a = origin.sub(start)
      a.addScaledVector(line, -a.dot(line))
      const pad = 0.009 - 0.0008 * (k - 1) - (d === 3 ? 0.001 : 0)
      const limit = [75 + d * 3, 94 + d * 2, 61 + d * 2][k - 1]
      const gap = (angle: number) => {
        const v = segment
          .clone()
          .applyQuaternion(turn(axis, angle - bind))
          .applyQuaternion(parent)
        v.addScaledVector(line, -line.dot(v))
        const t = clamp(-a.dot(v) / Math.max(1e-12, v.lengthSq()), 0, 1)
        return a.clone().addScaledVector(v, t).length() - radius - pad
      }
      let angle = limit
      // Search outward from a straight finger so the segment stops at the near
      // surface even if its fully flexed position would clear the far surface.
      for (let lo = 0; lo < limit; lo += 8) {
        let low = lo,
          high = Math.min(limit, lo + 8)
        if (gap(high) > 0) continue
        for (let n = 0; n < 6; n++) {
          const mid = (low + high) / 2
          if (gap(mid) > 0) low = mid
          else high = mid
        }
        angle = low
        break
      }
      joint.quaternion.copy(turn(axis, angle - bind))
      joint.updateWorldMatrix(false, false)
    }
  }
  if (thumb && radius > 0.005) opposeThumb(r, s, start, line, radius)
}

/** Turn both hands across a rigid shaft, keeping their grip centres where the arms reached. */
function alignShaft(r: MovementRig) {
  const along = worldGrip(r, 1).sub(worldGrip(r, -1)).normalize()
  for (const s of [1, -1] as const) {
    const j = limb(s),
      center = worldGrip(r, s)
    const across = worldGrip(r, s, 0.03).sub(center).normalize()
    const target = along.clone().multiplyScalar(across.dot(along) < 0 ? -1 : 1)
    const turn = new Quaternion().setFromUnitVectors(across, target)
    const q = turn.multiply(r.bones[j.hand].getWorldQuaternion(new Quaternion()))
    reachPalm(r, s, center, q, gripPoint(s), r.bones[j.fore].getWorldPosition(new Vector3()))
  }
}

/** Oppose the thumb from its saddle joint. Fit its pad on the wrist side of a
 * handle while keeping both phalanges clear of the handle's surface. */
function opposeThumb(r: MovementRig, s: Side, center: Vector3, line: Vector3, radius: number) {
  const hand = r.bones[limb(s).hand],
    side = prefixOf(s)
  const base = indexOfJoint[(side + 'Thumb0') as Joint]
  const frame = armFrame(s)
  const c = hand.worldToLocal(center.clone()),
    axis = line.clone().applyQuaternion(hand.getWorldQuaternion(new Quaternion()).invert())
  const along = frame.handLong.clone().negate()
  along.addScaledVector(axis, -along.dot(axis)).normalize()
  const index = r.rest[indexOfJoint[(side + 'Index1') as Joint]]
  const goal = c
    .clone()
    .addScaledVector(axis, index.clone().sub(c).dot(axis))
    .addScaledVector(along, radius + 0.008)
  const angles = [28, 35, 24, 28, 20],
    limits = [
      [-8, 44],
      [0, 50],
      [0, 48],
      [0, 62],
      [0, 72],
    ]
  const axes = digitAxes[side + 'Thumb0']
  const tip = vec(digitTips[(side + 'Thumb') as keyof typeof digitTips]).sub(pivot(base + 2))
  function apply() {
    r.bones[base].quaternion
      .copy(turn(vec(axes.flex), angles[0]))
      .multiply(turn(vec(axes.spread!), angles[1]))
      .multiply(turn(vec(axes.twist!), angles[2]))
    for (let k = 1; k <= 2; k++) {
      const name = side + 'Thumb' + k
      r.bones[base + k].quaternion.copy(
        turn(vec(digitAxes[name].flex), angles[k + 2] - bindFlexion(name)),
      )
    }
  }
  function cost() {
    apply()
    const q = r.bones[base].quaternion.clone()
    const mcp = r.rest[base + 1].clone().applyQuaternion(q).add(r.rest[base])
    const ip = r.rest[base + 2]
      .clone()
      .applyQuaternion(q.multiply(r.bones[base + 1].quaternion))
      .add(mcp)
    const end = tip
      .clone()
      .applyQuaternion(q.multiply(r.bones[base + 2].quaternion))
      .add(ip)
    let penalty = 0
    for (const [a, b] of [
      [r.rest[base], mcp],
      [mcp, ip],
      [ip, end],
    ]) {
      const start = a.clone().sub(c),
        dir = b.clone().sub(a)
      start.addScaledVector(axis, -axis.dot(start))
      dir.addScaledVector(axis, -axis.dot(dir))
      const dist = start
        .clone()
        .addScaledVector(dir, clamp(-start.dot(dir) / Math.max(1e-12, dir.lengthSq()), 0, 1))
        .length()
      penalty += Math.max(0, radius + 0.008 - dist) ** 2
    }
    return end.distanceToSquared(goal) + penalty * 20
  }
  let best = cost()
  for (const step of [12, 6, 3, 1])
    for (let sweep = 0; sweep < 3; sweep++)
      for (let k = 0; k < angles.length; k++) {
        const old = angles[k]
        let kept = old
        for (const sign of [-1, 1]) {
          angles[k] = clamp(old + sign * step, limits[k][0], limits[k][1])
          const v = cost()
          if (v < best) {
            best = v
            kept = angles[k]
          }
        }
        angles[k] = kept
      }
  apply()
}

/** The final shaft passes through both hands even between the authored beats. */
export function refitCarriedShaft(r: MovementRig, id: AuthoredId, thumb = false) {
  const gear = scores[id].gear
  if (!gear?.includes('stick') && !gear?.includes('towel')) return
  const axis = worldGrip(r, 1).sub(worldGrip(r, -1)).normalize()
  for (const s of [1, -1] as const)
    wrapHandle(r, s, worldGrip(r, s), axis, gear.includes('stick') ? 0.011 : 0.015, thumb)
}

export function fitGuideGrips(r: MovementRig, id: AuthoredId, reaches: (Reach | undefined)[]) {
  const gear = scores[id].gear ?? []
  if (gear.includes('stick') || gear.includes('towel')) {
    alignShaft(r)
    refitCarriedShaft(r, id, true)
    return
  }
  for (const s of [1, -1] as const) {
    const mark = markOf(reaches[s === 1 ? 0 : 1])
    if (mark === 'seat' || mark === 'bar') {
      const seat = mark === 'seat'
      wrapHandle(
        r,
        s,
        fixturePoint(id, mark, s),
        seat ? new Vector3(0, 0, 1) : new Vector3(1, 0, 0),
        seat ? 0.009 : 0.016,
      )
    } else if (
      (gear.includes('footStrap') || gear.includes('quadStrap')) &&
      (id !== 'strap-itb' || s === -1)
    ) {
      const hook = id !== 'tibial-tensioner-strap'
      const center = worldGrip(r, s, 0, hook)
      const axis = worldGrip(r, s, 0.02, hook).sub(center).normalize()
      wrapHandle(r, s, center, axis, hook ? 0.004 : 0.012)
    }
  }
}
