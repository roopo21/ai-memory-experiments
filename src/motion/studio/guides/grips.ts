import { scores, type AuthoredId } from '../../../studio/choreography'
import type { Reach } from '../../../studio/choreography/types'
import { fixturePoint, markOf } from './contacts'
import { Quaternion, Vector3 } from 'three'
import { armFrame, reachPalm, limb, type Side } from '../../anatomy'
import type { MovementRig } from '../../movementRig'
import {
  applyAngles,
  capsuleSurface,
  closeFingers,
  cylinder,
  fingerCapsules,
  placeThumb,
  union,
  type HandAngles,
} from '../../hands/fit'
import { gripPoint, worldGrip } from '../anchors'

/**
 * Close each phalanx onto a cylindrical handle using the shared Hand Lab closure and thumb
 * opposition solvers (`src/motion/hands/fit.ts`), keeping PIP-DIP coupling and avoiding handle
 * penetration.
 */
function wrapHandle(
  r: MovementRig,
  s: Side,
  start: Vector3,
  line: Vector3,
  radius: number,
  thumb = true,
) {
  const axis = line.clone().normalize()
  const surface = cylinder(start, axis, radius)
  const a: HandAngles = {
    mcp: [8, 10, 12, 14],
    pip: [10, 12, 14, 16],
    dip: [5, 6, 8, 8],
    fan: [1.5, 0, -1.5, -3],
    thumb: [28, 34, 24, 28, 20],
  }
  applyAngles(r, s, a)
  closeFingers(r, s, a, surface, {
    press: 0.0005,
    limit: { mcp: 84, pip: 100, dip: 68 },
    coupling: 0.66,
  })
  if (thumb && radius > 0.005) {
    const f = armFrame(s)
    const hand = r.bones[limb(s).hand]
    const hq = hand.getWorldQuaternion(new Quaternion())
    const wristDir = f.handLong.clone().negate().applyQuaternion(hq)
    wristDir.addScaledVector(axis, -wristDir.dot(axis)).normalize()
    const i1 = fingerCapsules(r, s, 'Index')[0]
    const proj = i1.a.clone().sub(start).dot(axis)
    const goal = start
      .clone()
      .addScaledVector(axis, proj)
      .addScaledVector(wristDir, radius + 0.011)
    const i2 = fingerCapsules(r, s, 'Index')[1]
    placeThumb(r, s, a, {
      point: goal,
      facing: i2.palmar.clone(),
      avoid: union(surface, capsuleSurface(i2)),
      pad: 1,
      along: 0.65,
      prefer: [28, 34, 24, 28, 20],
      limits: [
        [-8, 44],
        [0, 52],
        [0, 48],
        [0, 62],
        [0, 72],
      ],
    })
  }
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
