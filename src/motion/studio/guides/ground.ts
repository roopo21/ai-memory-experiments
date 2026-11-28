import tissues from './tissue-contacts.json'
import cloud from './contact-cloud.json'
import { Vector3 } from 'three'
import { indexOfJoint, joints, local, type Joint } from '../../joints'
import { digitTips } from '../../distalJoints'
import type { MovementRig } from '../../movementRig'
import { scores, type AuthoredId } from '../../../studio/choreography'
import { carriedByProp, propSurface, type Surface } from '../../physics/props'
const samples = cloud.map((row, i) =>
  Float32Array.from(row, (n, k) => n / 1000 - joints[i][2][k % 3]),
)
function lowestOn(r: MovementRig, indices: readonly number[]) {
  let low = Infinity
  for (const i of indices) {
    const m = r.bones[i].matrixWorld.elements,
      a = samples[i],
      x = m[1],
      y = m[5],
      z = m[9],
      h = m[13]
    for (let k = 0; k < a.length; k += 3)
      low = Math.min(low, h + x * a[k] + y * a[k + 1] + z * a[k + 2])
  }
  return low
}
/** Like `lowestOn`, but heights are measured above a prop's top surface where one is below. */
function lowestOver(r: MovementRig, indices: readonly number[], surface: Surface) {
  let low = Infinity
  for (const i of indices) {
    const m = r.bones[i].matrixWorld.elements,
      a = samples[i]
    for (let k = 0; k < a.length; k += 3) {
      const x = m[0] * a[k] + m[4] * a[k + 1] + m[8] * a[k + 2] + m[12],
        z = m[2] * a[k] + m[6] * a[k + 1] + m[10] * a[k + 2] + m[14],
        y = m[13] + m[1] * a[k] + m[5] * a[k + 1] + m[9] * a[k + 2]
      low = Math.min(low, y - Math.max(0, surface(x, z)))
    }
  }
  return low
}
const all = joints.map((_, i) => i)
const base = all.filter((i) => !((i >= 6 && i <= 11) || (i >= 18 && !/Toe/.test(joints[i][0]))))
const hands = ['left', 'right'].map((side) =>
  all.filter(
    (i) =>
      joints[i][0].startsWith(side) &&
      /Hand|Thumb|Index|Middle|Ring|Little/.test(joints[i][0]) &&
      !joints[i][0].includes('Toe'),
  ),
)
// Everything but the hands: hands on a surface are put there by their contacts, and their skin
// near a deeply extended wrist must not lift the whole body.
const body = all.filter((i) => !hands[0].includes(i) && !hands[1].includes(i))
export const lowestHand = (r: MovementRig, s: number) => lowestOn(r, hands[s === 1 ? 0 : 1])
// The contact cloud follows the performer's coarse hands, whose fingers rest curled. The skeleton's
// fingers are measured here instead: the carpus, each knuckle and the pad beyond every fingertip.
const CARPUS = 0.025,
  KNUCKLE = 0.016,
  FINGER_PAD = 0.005
/** Height of the lowest point of a hand's bones: carpus, knuckles and fingertip pads. */
export function lowestHandBone(r: MovementRig, s: 1 | -1) {
  const side = s === 1 ? 'left' : 'right',
    at = new Vector3()
  let low = r.bones[indexOfJoint[(side + 'Hand') as Joint]].getWorldPosition(at).y - CARPUS
  for (const digit of ['Thumb', 'Index', 'Middle', 'Ring', 'Little']) {
    const count = digit === 'Thumb' ? 2 : 3
    for (let k = 1; k <= count; k++)
      low = Math.min(
        low,
        r.bones[indexOfJoint[(side + digit + k) as Joint]].getWorldPosition(at).y - KNUCKLE,
      )
    const distal = indexOfJoint[(side + digit + count) as Joint],
      tip = digitTips[(side + digit) as keyof typeof digitTips]
    low = Math.min(
      low,
      r.bones[distal].localToWorld(local(distal, tip[0], tip[1], tip[2])).y - FINGER_PAD,
    )
  }
  return low
}
/** The lowest point of everything but the hands, which grounding leaves to their contacts. */
export const lowestBody = (r: MovementRig) => lowestOn(r, body)
/**
 * Postures that sit on the floor rest on the pelvis and thighs, whatever the legs do. A body that
 * rested on its lowest point instead would perch on its heels with the sit bones in the air.
 * Feet that this leaves below the floor are lifted by `clearFloorFeet`.
 */
const SIT_POSTURES = new Set(['floorSeat', 'longSit', 'straddle', 'butterfly'])
export const sitsOnFloor = (posture: string) => SIT_POSTURES.has(posture)
const seat = [0, 1, 12, 15]
const upper = all.filter(
  (i) => !hands[0].includes(i) && !hands[1].includes(i) && !/Shin|Foot|Toe/.test(joints[i][0]),
)
const legs = ['left', 'right'].map((side) =>
  all.filter((i) => joints[i][0].startsWith(side) && /Shin|Foot|Toe/.test(joints[i][0])),
)
/** The lowest point of one shin, foot and toes, with where it is. */
export function lowestLegPoint(r: MovementRig, s: number) {
  let low = { y: Infinity, x: 0, z: 0 }
  for (const i of legs[s === 1 ? 0 : 1]) {
    const m = r.bones[i].matrixWorld.elements,
      a = samples[i]
    for (let k = 0; k < a.length; k += 3) {
      const y = m[13] + m[1] * a[k] + m[5] * a[k + 1] + m[9] * a[k + 2]
      if (y < low.y)
        low = {
          y,
          x: m[12] + m[0] * a[k] + m[4] * a[k + 1] + m[8] * a[k + 2],
          z: m[14] + m[2] * a[k] + m[6] * a[k + 1] + m[10] * a[k + 2],
        }
    }
  }
  return low
}
export const lowestSurface = (r: MovementRig, lowerOnly = false) =>
  lowestOn(r, lowerOnly ? base : all)
/**
 * Rest the body on the floor. A hand planted on a surface is placed by its contact and does not
 * lift the body; any other hand still keeps the body clear of the floor.
 */
export function groundGuide(
  r: MovementRig,
  id: AuthoredId,
  lowerOnly = false,
  planted: readonly boolean[] = [true, true],
) {
  const score = scores[id],
    p = score.posture,
    gear = score.gear ?? []
  r.root.updateMatrixWorld(true)
  let low = lowerOnly ? lowestSurface(r, true) : lowestBody(r)
  if (
    sitsOnFloor(p) &&
    !gear.some((g) => ['bed', 'step', 'longRoll', 'crossRoll', 'pillow', 'ball'].includes(g))
  ) {
    // Never let the trunk or thighs sink either, nor the target tissue of the guide; the bones of
    // the legs below the knee are lifted separately.
    let rest = Math.min(lowestOn(r, seat), lowestOn(r, upper))
    for (const point of (tissues as Partial<Record<AuthoredId, number[][]>>)[id] ?? []) {
      let h = 0
      for (let j = 0; j < point.length; j += 5) {
        const m = r.bones[point[j]].matrixWorld.elements
        h +=
          ((m[13] + (m[1] * point[j + 2] + m[5] * point[j + 3] + m[9] * point[j + 4]) / 10000) *
            point[j + 1]) /
          10000
      }
      rest = Math.min(rest, h)
    }
    r.root.position.y += 0.001 - rest
    return
  }
  if (!lowerOnly)
    planted.forEach((down, n) => {
      if (!down) low = Math.min(low, lowestOn(r, hands[n]))
    })
  const points = (tissues as Partial<Record<AuthoredId, number[][]>>)[id]
  if (points && !lowerOnly)
    for (const point of points) {
      let h = 0
      for (let j = 0; j < point.length; j += 5) {
        const m = r.bones[point[j]].matrixWorld.elements
        h +=
          ((m[13] + (m[1] * point[j + 2] + m[5] * point[j + 3] + m[9] * point[j + 4]) / 10000) *
            point[j + 1]) /
          10000
      }
      low = Math.min(low, h)
    }
  if (id === 'step-heel-drop' && !lowerOnly) {
    r.root.position.y += Math.max(0, 0.001 - low)
    return
  }
  if (gear.includes('bed') || gear.includes('ball')) {
    // The back and pelvis rest on the bed or ball wherever they are over it; the legs hang beyond
    // the edge or stand on the floor.
    const surface = propSurface(id, gear, 1)!
    const carried = body.filter((i) => carriedByProp(gear, i))
    r.root.position.y += Math.max(0.001 - low, 0.006 - lowestOver(r, carried, surface))
  } else if (p === 'chair' || p === 'figureFour' || p === 'bridgeBall')
    r.root.position.y += Math.max(0, 0.001 - low)
  else {
    const step = id === 'step-heel-drop' ? 0.15 : 0
    const support =
      gear.includes('longRoll') || gear.includes('crossRoll')
        ? 0.104
        : gear.includes('pillow')
          ? 0.125
          : 0
    const onEquipment = gear.includes('crossRoll')
      ? [2, 3]
      : gear.includes('pillow')
        ? [0, 1, 2]
        : [0, 1, 2, 3, 4, 5]
    r.root.position.y += Math.max(
      step + 0.001 - low,
      support ? support - lowestOn(r, onEquipment) : -Infinity,
    )
  }
}

/**
 * Rest a freely authored pose on its support, so the root height comes from contact rather than a
 * number someone typed. Whichever of the body, hands or feet is lowest ends up within `contact`
 * of the floor and no deeper than `sink` into it. A pose already inside that band is left alone,
 * so a copy of a grounded guide replays exactly, and the correction is continuous as a root is
 * dragged, never a jump. `level` raises the floor for a mat.
 */
export function restOnFloor(r: MovementRig, level = 0, contact = 0.015, sink = 0.02) {
  r.root.updateMatrixWorld(true)
  const gap = Math.min(lowestBody(r), lowestHandBone(r, 1), lowestHandBone(r, -1)) - level
  r.root.position.y += gap > contact ? contact - gap : gap < -sink ? -sink - gap : 0
  r.root.updateMatrixWorld(true)
}
