import { Euler, Quaternion, Vector3 } from 'three'
import { createMovementRig, restPose, type MovementRig } from '../../movementRig'
import { indexOfJoint, joints, type Joint } from '../../joints'
import type { Side } from '../../../studio/clips'
import { scores, type AuthoredId } from '../../../studio/choreography'
import type { Pose, Point } from '../../../studio/choreography/types'
import { placeHand, digit } from './contacts'
import { crossedAnkle, pinch, equipmentPose, inchworm } from './precision'
import { cycleAt } from './cycles'
import { groundGuide } from './ground'
import {
  prepareSupports,
  clearFloorArms,
  floorHands,
  standingMarks,
  lockStandingFeet,
  type FootMark,
} from './supports'
import { postures } from './postures'
const rad = Math.PI / 180
const Q = (x = 0, y = 0, z = 0, order: Euler['order'] = 'XYZ') =>
  new Quaternion().setFromEuler(new Euler(x * rad, y * rad, z * rad, order))
const trunk = (v: Point | undefined, share: number) =>
  Q((v?.[0] ?? 0) * share, (v?.[1] ?? 0) * share, -(v?.[2] ?? 0) * share)
const other = joints.map(([n], i) =>
  n.startsWith('left')
    ? indexOfJoint[n.replace('left', 'right') as Joint]
    : n.startsWith('right')
      ? indexOfJoint[n.replace('right', 'left') as Joint]
      : i,
)
function poseAt(r: MovementRig, id: AuthoredId, frame: Pose, phase: number) {
  const score = scores[id],
    base = postures[score.posture],
    p = { ...base.pose, ...frame },
    offset = p.shift ?? [0, 0, 0]
  restPose(r)
  r.root.position.set(offset[0], base.y + offset[1], (base.z ?? 0.06) + offset[2])
  const pelvis = trunk(p.pelvis, 1),
    onSide = score.posture === 'side'
  r.root.quaternion
    .copy(Q(base.pitch ?? 0, 0, onSide ? (id === 'sleeper-stretch' ? -90 : 90) : 0))
    .multiply(pelvis)
  for (const [j, share] of [
    [1, 0.36],
    [2, 0.38],
    [3, 0.26],
  ])
    r.bones[j].quaternion.copy(trunk(p.spine, share))
  r.bones[4].quaternion.copy(trunk(p.neck, 0.57))
  r.bones[5].quaternion.copy(trunk(p.neck, 0.43))
  r.bones[20].quaternion.copy(Q(p.jaw?.[0], p.jaw?.[1]))
  for (const s of [1, -1]) {
    const side = s === 1 ? 'left' : 'right',
      arm = s === 1 ? 6 : 9,
      leg = s === 1 ? 12 : 15,
      sh = s === 1 ? 18 : 19,
      act = s === 1
    const a = (act ? p.a : p.b) ?? [],
      l = (act ? p.leg : p.other) ?? [],
      f = (act ? p.f : p.g) ?? [],
      toe = act ? p.toes : p.otherToes
    const shoulder = act || score.both ? p.shoulders : undefined
    r.bones[sh].quaternion.copy(Q(0, s * (shoulder?.[1] ?? 0), s * (shoulder?.[0] ?? 0)))
    r.bones[arm].quaternion
      .copy(Q(-(a[0] ?? 0), 0, s * (a[1] ?? 0), 'XYZ'))
      .multiply(Q(0, s * (a[5] ?? 0)))
    r.bones[arm + 1].quaternion.copy(Q(-(a[2] ?? 0), s * (a[3] ?? 0)))
    r.bones[arm + 2].quaternion.copy(Q(a[4] ?? 0, 0, s * (a[6] ?? 0)))
    r.bones[leg].quaternion
      .copy(Q(-(l[0] ?? 0), 0, s * (l[1] ?? 0)))
      .multiply(Q(0, s * (l[4] ?? 0)))
    // A standing hinge or a seated forward fold turns the pelvis above supporting legs.
    if (
      [
        'stand',
        'chair',
        'figureFour',
        'floorSeat',
        'longSit',
        'straddle',
        'butterfly',
        'lunge',
        'halfKneel',
        'split',
      ].includes(score.posture) &&
      id !== 'inchworm'
    )
      r.bones[leg].quaternion.premultiply(pelvis.clone().invert())
    r.bones[leg + 1].quaternion.copy(Q(l[2] ?? 0))
    r.bones[leg + 2].quaternion.copy(Q(l[3] ?? 0, 0, -s * (l[5] ?? 0)))
    for (const [i, name] of ['Index', 'Middle', 'Ring', 'Little'].entries()) {
      const curl = name === 'Index' ? f[6] : undefined
      r.bones[digit(side + name + '1')].quaternion.copy(
        Q(-(curl ?? f[0] ?? 0), 0, s * [0.9, 0.25, -0.4, -1][i] * (f[3] ?? 0)),
      )
      r.bones[digit(side + name + '2')].quaternion.copy(Q(-(curl ?? f[1] ?? 0)))
      r.bones[digit(side + name + '3')].quaternion.copy(
        Q(-(curl === undefined ? (f[2] ?? 0) : curl * 0.65)),
      )
    }
    const oppose = f[4] ?? 0,
      open = f[5] ?? 0
    r.bones[digit(side + 'Thumb0')].quaternion.copy(
      Q(-0.44 * oppose, s * (-0.62 * oppose), s * (open - oppose * 0.74)),
    )
    r.bones[digit(side + 'Thumb1')].quaternion.copy(Q(-oppose * 0.55, 0, -s * 0.35 * oppose))
    r.bones[digit(side + 'Thumb2')].quaternion.copy(Q(-oppose * 0.35))
    for (const [i, name] of ['ToeBig', 'ToeTwo', 'ToeThree', 'ToeFour', 'ToeLittle'].entries()) {
      const curl = (toe?.[0] ?? 0) + (i === 0 ? (toe?.[2] ?? 0) : 0)
      r.bones[digit(side + name + '1')].quaternion.copy(
        Q(curl, s * [-1, -0.45, 0, 0.5, 1][i] * (toe?.[1] ?? 0)),
      )
      r.bones[digit(side + name + '2')].quaternion.copy(Q(curl * 0.32))
      if (i) r.bones[digit(side + name + '3')].quaternion.copy(Q(curl * 0.14))
    }
  }
  r.root.updateMatrixWorld(true)
  if (id === 'inchworm') {
    inchworm(r, phase)
    return
  }
  prepareSupports(r, id, p)
  crossedAnkle(r, id, p)
  if (id === 'ulnar-tensioner' && p.f?.[6]) pinch(r)
  groundGuide(r, id, true)
  r.root.updateMatrixWorld(true)
  equipmentPose(r, id, p)
  placeHand(r, id, p.ga, 1)
  placeHand(r, id, p.gb, -1)
  floorHands(r, id, p)
  clearFloorArms(r, id)
}
type Key = { time: number; root: Vector3; rotations: Quaternion[] }
const cache = new Map<AuthoredId, Key[]>()
const feet = new Map<AuthoredId, FootMark[]>()
function keysFor(id: AuthoredId) {
  const cached = cache.get(id)
  if (cached) return cached
  const r = createMovementRig(),
    keys = scores[id].frames.map((f, phase) => {
      poseAt(r, id, f.pose, phase)
      if (!f.time) feet.set(id, standingMarks(r, id))
      return {
        time: f.time,
        root: r.root.position.clone(),
        rotations: r.bones.map((b) => b.quaternion.clone()),
      }
    })
  r.skeleton.dispose()
  cache.set(id, keys)
  return keys
}
export function sampleGuide(r: MovementRig, id: AuthoredId, time: number, side: Side) {
  const keys = keysFor(id),
    i = keys.findIndex((k) => k.time >= time),
    a = keys[Math.max(0, i - 1)],
    b = keys[i < 0 ? keys.length - 1 : i]
  const u = b.time === a.time ? 0 : (time - a.time) / (b.time - a.time),
    f = u * u * (3 - 2 * u)
  r.root.position.lerpVectors(a.root, b.root, f)
  for (let j = 0; j < joints.length; j++)
    r.bones[j].quaternion.slerpQuaternions(a.rotations[j], b.rotations[j], f)
  cycleAt(r, id, time)
  lockStandingFeet(r, feet.get(id)!)
  if (id === 'standing-figure-four') crossedAnkle(r, id, {})
  groundGuide(r, id)
  if (side === 'right' && !scores[id].both) {
    // Reflect the authored performance once. The tiny bilateral differences in the scanned
    // bind anatomy remain visible. Contact solves and phase timing stay on the same branch.
    r.root.position.x *= -1
    for (let j = 0; j < joints.length; j++) {
      if (other[j] < j) continue
      const q = r.bones[j].quaternion,
        v = r.bones[other[j]].quaternion
      const { x, y, z, w } = q
      q.set(v.x, -v.y, -v.z, v.w)
      if (other[j] !== j) v.set(x, -y, -z, w)
    }
  }
}
