import tissues from './tissue-contacts.json'
import cloud from './contact-cloud.json'
import { joints } from '../../joints'
import type { MovementRig } from '../../movementRig'
import { scores, type AuthoredId } from '../../../studio/choreography'
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
export const lowestHand = (r: MovementRig, s: number) => lowestOn(r, hands[s === 1 ? 0 : 1])
export const lowestSurface = (r: MovementRig, lowerOnly = false) =>
  lowestOn(r, lowerOnly ? base : all)
export function groundGuide(r: MovementRig, id: AuthoredId, lowerOnly = false) {
  const score = scores[id],
    p = score.posture,
    gear = score.gear ?? []
  r.root.updateMatrixWorld(true)
  let low = lowestSurface(r, lowerOnly)
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
  if (gear.includes('bed')) {
    // The leg hangs beyond the edge. Only the supported pelvis and torso rest on the bed.
    const pelvis = r.root.position
    r.root.position.y += Math.max(0.001 - low, 0.67 - pelvis.y)
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
