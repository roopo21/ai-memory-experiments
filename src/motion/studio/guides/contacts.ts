import { palmOrientation } from '../handOrientation'
import { Quaternion, Vector3 } from 'three'
import type { Mark, Reach } from '../../../studio/choreography/types'
import type { AuthoredId } from '../../../studio/choreography'
import { scores } from '../../../studio/choreography'
import { indexOfJoint, type Joint } from '../../joints'
import { solveLimb, worldRotation, type MovementRig } from '../../movementRig'
import { palmPad } from '../anchors'
const V = (x = 0, y = 0, z = 0) => new Vector3(x, y, z)
const point = (r: MovementRig, i: number, x = 0, y = 0, z = 0) =>
  r.bones[i].localToWorld(V(x, y, z))
export function fixturePoint(id: AuthoredId, mark: Mark, s: number) {
  const { posture, gear } = scores[id],
    seated = posture === 'chair' || posture === 'figureFour'
  switch (mark) {
    case 'floor':
      return V(s * 0.2, 0.009, posture === 'prone' ? 0.4 : posture === 'pigeon' ? 0.33 : 0.49)
    case 'seat':
      return V(s * 0.21, 0.405, -0.13)
    case 'table':
      return id === 'standing-quad'
        ? V(s * 0.28, 0.86, 0.18)
        : V(s * 0.23, seated ? 0.73 : 0.86, seated ? 0.27 : 0.44)
    case 'door':
      return V(s * 0.41, id === 'doorway-external-rotation' ? 1.04 : 1.36, 0.27)
    case 'wall':
      return V(s * 0.23, 1.26, id === 'wall-toes-up-calf' ? 0.37 : 0.48)
    case 'post':
      return V(
        s * (gear?.includes('door') ? 0.41 : 0.45),
        id === 'deep-squat-hold' ? 0.9 : 1.14,
        0.12,
      )
    case 'bar':
      return V(s * 0.255, 1.89, 0.09)
    default:
      return V()
  }
}
export function placeHand(r: MovementRig, id: AuthoredId, reach: Reach | undefined, s: number) {
  if (!reach || reach === 'free') return
  const arm = s === 1 ? 6 : 9,
    leg = s === 1 ? 12 : 15,
    hand = r.bones[arm + 2],
    root = r.root
  const mark: Mark | undefined =
    typeof reach === 'string' ? reach : typeof reach[0] === 'string' ? reach[0] : undefined
  const markOffsets: Partial<Record<Mark, [number, number, number, number]>> = {
    nape: [4, s * 0.045, 0.005, -0.032],
    crown: [5, s * 0.05, 0.152, 0.016],
    collar: [3, s * 0.027, 0.077, 0.092],
    jaw: [20, s * 0.026, -0.046, 0.071],
    ear: [5, 0.079, 0.048, 0.015],
    eye: [5, 0.038, 0.071, 0.097],
    shoulder: [18, 0.071, 0.005, 0.003],
    chest: [3, s * 0.046, 0.006, 0.11],
    belly: [1, s * 0.057, 0.072, 0.114],
    backHip: [0, s * 0.102, 0.004, -0.087],
    back: [1, 0, 0.039, -0.071],
    Aelbow: [7, 0, 0.012, 0.005],
    Awrist: [8, 0, 0.014, 0.004],
    Apalm: [8, 0.014, -0.05, 0.046],
    Athumb: [indexOfJoint.leftThumb2, 0, 0, 0.003],
    Afingers: [indexOfJoint.leftMiddle2, 0, 0, 0.003],
    Athigh: [12, s * 0.032, -0.245, -0.044],
    Ashin: [13, s * 0.026, -0.074, 0.027],
    Aheel: [14, 0, -0.018, -0.036],
    Atoe: [indexOfJoint.leftToeBig1, -0.005, 0, 0.008],
    Aknee: [13, s * 0.012, 0, 0.043],
    Bthigh: [15, s * 0.031, -0.23, -0.046],
    Bshin: [16, s * 0.026, -0.055, 0.022],
    Bheel: [17, 0, -0.015, -0.028],
    ownKnee: [leg + 1, 0, 0.015, 0.036],
    ownShin: [leg + 1, 0, -0.19, 0.032],
    ownToe: [leg + 2, 0, -0.028, 0.145],
    innerFoot: [leg + 2, -s * 0.04, 0, 0.09],
    prayer: [3, s * 0.012, -0.028, 0.225],
    handsBehind: [0, s * 0.018, -0.042, -0.147],
    gripFront: [1, s * 0.036, 0.026, 0.257],
  }
  const rel = mark && markOffsets[mark]
  let goal = rel
    ? point(r, ...rel)
    : mark
      ? fixturePoint(id, mark, s)
      : new Vector3(...(reach as readonly [number, number, number]))
  if (Array.isArray(reach) && typeof reach[0] === 'string')
    goal = goal.add(V(reach[1], reach[2], reach[3]))
  const q = hand.getWorldQuaternion(new Quaternion()),
    fore = r.bones[arm + 1]
  if (mark === 'floor' || mark === 'table' || mark === 'seat') {
    // Palm normal points down. The fingers point forwards except in the reversed wrist stretches.
    const reverse = id === 'all-fours-wrist-flexor'
    q.copy(
      palmOrientation(
        s,
        V(s * 0.06, 0, reverse || id === 'all-fours-wrist-extensor' ? -1 : 1),
        V(0, id === 'all-fours-wrist-extensor' ? 1 : -1, 0),
      ),
    )
  }
  if (mark === 'wall' || mark === 'door') q.copy(palmOrientation(s, V(s * 0.05, 1, 0), V(0, 0, 1)))
  const posture = scores[id].posture
  if (posture === 'supine' && mark === 'nape')
    q.copy(palmOrientation(s, V(-s, 0.08, -0.12), V(0, 1, 0)))
  const end = hand.getWorldPosition(V()),
    elbow = fore.getWorldPosition(V()),
    shoulder = r.bones[arm].getWorldPosition(V())
  const preferred = elbow.clone().add(V(s * 0.12, -0.035, -0.035).applyQuaternion(root.quaternion))
  // A hand under the head needs a lateral elbow, not an elbow below the floor.
  if (
    [
      'supine',
      'prone',
      'side',
      'floorSeat',
      'longSit',
      'straddle',
      'butterfly',
      'heelSit',
      'pigeon',
    ].includes(posture)
  ) {
    preferred.y = Math.max(0.155, preferred.y)
    if (posture === 'supine' && mark === 'nape') preferred.copy(V(s * 0.35, 0.17, goal.z + 0.12))
  }
  const qs = [r.bones[arm], fore].map((b) => b.getWorldQuaternion(new Quaternion()))
  const offset = id === 'ulnar-tensioner' && mark === 'eye' ? V(0.043, -0.081, 0.077) : palmPad(s)
  const aim = goal.clone().sub(offset.applyQuaternion(q))
  solveLimb(r, arm, arm + 1, arm + 2, aim, preferred)
  const newElbow = fore.getWorldPosition(V()),
    newEnd = hand.getWorldPosition(V())
  const swing = (from: Vector3, to: Vector3, rot: Quaternion) =>
    new Quaternion().setFromUnitVectors(from.normalize(), to.normalize()).multiply(rot)
  worldRotation(
    r.bones[arm],
    swing(elbow.clone().sub(shoulder), newElbow.clone().sub(shoulder), qs[0]),
  )
  worldRotation(fore, swing(end.sub(elbow), newEnd.sub(newElbow), qs[1]))
  worldRotation(hand, q)
}
export const digit = (name: string) => indexOfJoint[name as Joint]
