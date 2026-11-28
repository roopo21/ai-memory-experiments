import { flatPalmOrientation, palmOrientation } from '../handOrientation'
import { Quaternion, Vector3 } from 'three'
import { grip, onFloor } from '../../../studio/choreography/types'
import type { Aim, AimFrame, Fingers, Mark, Point, Reach } from '../../../studio/choreography/types'
import type { AuthoredId } from '../../../studio/choreography'
import { scores } from '../../../studio/choreography'
import { indexOfJoint, joints, local, type Joint } from '../../joints'
import { digitTips } from '../../distalJoints'
import { oldLocal } from '../../oldPivots'
import { reachPalm, vec, type Side } from '../../anatomy'
import { limbFrames } from '../../limbFrames'
import type { MovementRig } from '../../movementRig'
import { gripPoint, palmPad } from '../anchors'
const V = (x = 0, y = 0, z = 0) => new Vector3(x, y, z)
// Mark offsets were authored against the earlier joint origins; convert them so each mark keeps
// its place on the body.
const point = (r: MovementRig, i: number, x = 0, y = 0, z = 0) =>
  r.bones[i].localToWorld(oldLocal(i, x, y, z))
const worldQ = (r: MovementRig, i: number) => r.bones[i].getWorldQuaternion(new Quaternion())
export function fixturePoint(id: AuthoredId, mark: Mark, s: number) {
  const { posture, gear } = scores[id],
    seated = posture === 'chair' || posture === 'figureFour'
  switch (mark) {
    case 'floor':
      // On all fours and in pigeon the hands sit under the shoulders, so a flat palm needs no
      // more wrist extension than the wrist has.
      return V(
        s * 0.2,
        0.009,
        posture === 'prone'
          ? 0.4
          : posture === 'pigeon'
            ? 0.46
            : posture === 'allFours'
              ? 0.55
              : 0.49,
      )
    case 'seat':
      // The side edge of the seat, beside the hip.
      return V(s * 0.235, 0.395, -0.16)
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
        id === 'deep-squat-hold' ? 0.92 : 1.14,
        id === 'deep-squat-hold' ? 0.27 : 0.12,
      )
    case 'bar':
      return V(s * 0.255, 1.89, 0.09)
    default:
      return V()
  }
}
const FRAME_BONE: Record<AimFrame, number> = {
  world: -1,
  chest: 3,
  pelvis: 0,
  head: 5,
  Ahand: 8,
  Aforearm: 7,
  Athigh: 12,
  Ashin: 13,
  Afoot: 14,
}
export function aimOrientation(r: MovementRig, s: number, aim: Aim, flat = false) {
  const frame = aim[2] ?? 'world',
    q = frame === 'world' ? new Quaternion() : worldQ(r, FRAME_BONE[frame]),
    orient = flat ? flatPalmOrientation : palmOrientation
  return orient(s, V(...aim[0]).applyQuaternion(q), V(...aim[1]).applyQuaternion(q))
}
type Part = 'head' | 'jaw' | 'trunk' | 'back' | 'limb' | 'hand' | 'foot' | 'surface'
/** Body part touched by each mark, and the bone whose surface the palm rests on. */
function partOf(mark: Mark): Part {
  if (['nape', 'crown', 'occiput', 'ear', 'eye'].includes(mark)) return 'head'
  if (mark === 'jaw') return 'jaw'
  if (['collar', 'shoulder', 'chest', 'belly', 'prayer', 'gripFront'].includes(mark)) return 'trunk'
  if (['back', 'backHip', 'handsBehind'].includes(mark)) return 'back'
  if (['Apalm', 'Aback', 'Athumb', 'Afingers'].includes(mark)) return 'hand'
  if (['Aheel', 'Ainstep', 'Bheel', 'Atoe', 'ownToe', 'innerFoot'].includes(mark)) return 'foot'
  if (['floor', 'table', 'seat', 'wall', 'door', 'post', 'bar', 'free'].includes(mark))
    return 'surface'
  return 'limb'
}
/** The finger shape a hand takes for a contact, unless the guide gives one. */
export const FLAT_ON_SURFACE = onFloor
/** A bare point at floor height: a hand put down on the floor rather than held in the air. */
const onTheFloor = (reach: Reach | undefined) =>
  Array.isArray(reach) && typeof reach[0] === 'number' && reach[1] < 0.12
export function contactShape(reach: Reach | undefined): Fingers | undefined {
  if (onTheFloor(reach)) return FLAT_ON_SURFACE
  const mark = markOf(reach)
  if (!mark || mark === 'free') return undefined
  // A hand resting on the thigh drapes rather than grips.
  if (mark === 'seat') return grip
  if (mark === 'ownThigh' || mark === 'ownKnee') return [12, 16, 8, 4, 10, 8]
  switch (partOf(mark)) {
    case 'head':
      return mark === 'eye' ? undefined : [12, 18, 10, 6, 10, 8]
    case 'jaw':
      return [35, 30, 15, 0, 20]
    case 'trunk':
      return mark === 'prayer' ? [0, 4, 2, 0, 0, 4] : [18, 22, 10, 4, 10, 6]
    case 'back':
      return [10, 14, 6, 0, 6, 4]
    case 'limb':
    case 'foot':
      return [45, 58, 30, 0, 45]
    case 'hand':
      return [6, 10, 6, 0, 10, 6]
    case 'surface':
      return mark === 'bar' ? [62, 72, 40, 0, 55] : FLAT_ON_SURFACE
  }
}
/** Fixtures a palm presses flat against; a bar is gripped instead. */
const flatOn = (mark: Mark | undefined) => !!mark && partOf(mark) === 'surface' && mark !== 'bar'
export const markOf = (reach: Reach | undefined): Mark | undefined =>
  reach === undefined
    ? undefined
    : typeof reach === 'string'
      ? reach
      : typeof reach[0] === 'string'
        ? reach[0]
        : undefined
/** Nearest point on a bone, from its pivot toward its first child. */
function boneAxisPoint(r: MovementRig, i: number, at: Vector3) {
  const a = r.bones[i].getWorldPosition(V()),
    child = joints.findIndex(([, parent], k) => parent === i && k < 20 && k !== 18 && k !== 19)
  const b = child >= 0 ? r.bones[child].getWorldPosition(V()) : a.clone(),
    ab = b.clone().sub(a),
    t =
      ab.lengthSq() > 1e-9 ? Math.min(1, Math.max(0, at.clone().sub(a).dot(ab) / ab.lengthSq())) : 0
  return a.addScaledVector(ab, t)
}
/** A natural hand orientation for a mark: palm on the surface it touches, fingers sensibly laid. */
function defaultOrientation(r: MovementRig, mark: Mark, bone: number, s: number, goal: Vector3) {
  const part = partOf(mark)
  if (part === 'surface') {
    if (mark === 'seat') return flatPalmOrientation(s, V(s, 0, 0), V(0, -1, 0))
    if (mark === 'floor' || mark === 'table')
      return flatPalmOrientation(s, V(s * 0.06, 0, 1), V(0, -1, 0))
    if (mark === 'post') return flatPalmOrientation(s, V(0, 1, 0), V(s, 0, 0))
    if (mark === 'bar') return palmOrientation(s, V(0, 1, 0), V(0, 0, 1))
    return flatPalmOrientation(s, V(s * 0.05, 1, 0), V(0, 0, 1))
  }
  const frame = worldQ(r, bone)
  let centre: Vector3
  if (part === 'head') centre = point(r, 5, 0, 0.085, 0.02)
  else if (part === 'jaw') centre = point(r, 20, 0, -0.01, 0.02)
  else if (part === 'trunk') centre = point(r, mark === 'belly' ? 1 : 3, 0, 0, 0.03)
  else if (part === 'back') centre = point(r, 0, 0, 0.05, 0.06)
  else centre = boneAxisPoint(r, bone, goal)
  const palm = centre.sub(goal)
  if (palm.lengthSq() < 1e-8) palm.set(0, 0, -1)
  palm.normalize()
  let fingers: Vector3
  // On the chest the hand lies flat, fingers up and in; on the head they point toward the midline.
  if (part === 'trunk') fingers = V(-s * 0.9, 1, 0.15)
  else if (part === 'head') fingers = V(-s, 0.25, 0)
  else if (part === 'jaw') fingers = V(-s * 0.3, 0.4, 0.6)
  else if (part === 'back') {
    // An arm behind the back rests the back of its hand on the body, palm turned out.
    if (mark !== 'handsBehind')
      return palmOrientation(
        s,
        V(-s * 0.8, 0.5, 0).applyQuaternion(frame),
        V(0, 0, -1).applyQuaternion(frame),
      )
    fingers = V(-s * 0.4, -1, 0)
  } else if (part === 'hand') fingers = V(0, 1, 0)
  else {
    // Wrap the fingers round the limb.
    const axis = r.bones[bone].getWorldPosition(V()).sub(boneAxisPoint(r, bone, goal))
    fingers = axis.lengthSq() > 1e-8 ? axis.normalize().cross(palm).multiplyScalar(s) : V(-s, 0, 0)
    return palmOrientation(s, fingers, palm)
  }
  return palmOrientation(s, fingers.applyQuaternion(frame), palm)
}
const L = limbFrames.left
const lerp = (a: readonly number[], b: readonly number[], t: number) => vec(a).lerp(vec(b), t)
/**
 * Contacts on the working arm and hand, as points on the skin in bind coordinates with the joint
 * they move with. An assisting palm meets a palm or finger pad; a gripping hand wraps the wrist or
 * the back of the arm above the elbow.
 */
const ARM_MARKS: Partial<Record<Mark, () => [number, Vector3]>> = {
  Apalm: () => [8, vec(L.palmCentre).addScaledVector(vec(L.palmar), 0.004)],
  Aback: () => [8, lerp(L.wrist, L.palmCentre, 1.3).addScaledVector(vec(L.palmar), -0.032)],
  Afingers: () => {
    const i = indexOfJoint.leftMiddle1
    return [i, lerp(joints[i][2], joints[i + 1][2], 0.6).addScaledVector(vec(L.palmar), 0.011)]
  },
  Athumb: () => {
    const tip = digitTips.leftThumb,
      i = indexOfJoint.leftThumb2
    return [i, lerp(joints[i][2], tip, 0.5).add(new Vector3(-0.006, 0, 0.008))]
  },
  Awrist: () => [7, lerp(L.elbow, L.wrist, 0.9).addScaledVector(vec(L.palmar), -0.018)],
  Aelbow: () => [6, lerp(L.shoulder, L.elbow, 0.86).add(new Vector3(0.004, 0, -0.03))],
}
/** `exact` keeps a bare point where it is; otherwise one at floor height is put palm-down on it. */
function goalOf(r: MovementRig, id: AuthoredId, reach: Reach, s: number, exact = false) {
  const leg = s === 1 ? 12 : 15,
    mark = markOf(reach)
  const armMark = mark && ARM_MARKS[mark]?.()
  if (armMark) {
    const [bone, at] = armMark,
      goal = r.bones[bone].localToWorld(at.sub(new Vector3(...joints[bone][2])))
    if (!mark && onTheFloor(reach) && !exact) goal.y = 0.009
    if (Array.isArray(reach) && typeof reach[0] === 'string')
      goal.add(V(reach[1], reach[2], reach[3]))
    return { goal, mark, bone }
  }
  const markOffsets: Partial<Record<Mark, [number, number, number, number]>> = {
    nape: [4, s * 0.045, 0.005, -0.032],
    crown: [5, s * 0.05, 0.152, 0.016],
    occiput: [5, s * 0.045, 0.045, -0.105],
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
    // The front of the ankle, where a quadriceps stretch holds the foot, on the performer's skin.
    Ainstep: [14, -0.005, 0.006, 0.024],
    Atoe: [indexOfJoint.leftToeBig1, -0.005, 0, 0.008],
    Aknee: [13, s * 0.012, 0, 0.043],
    Bthigh: [15, s * 0.031, -0.23, -0.046],
    Bshin: [16, s * 0.026, -0.055, 0.022],
    Bheel: [17, 0, -0.015, -0.028],
    ownKnee: [leg + 1, 0, 0.015, 0.036],
    // The front of the upper thigh, where a hanging hand rests, measured on the performer's skin.
    ownThigh: [leg, -s * 0.012, -0.12, 0.072],
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
  if (!mark && onTheFloor(reach) && !exact) goal.y = 0.009
  if (Array.isArray(reach) && typeof reach[0] === 'string')
    goal = goal.add(V(reach[1], reach[2], reach[3]))
  return { goal, mark, bone: rel ? rel[0] : 0 }
}
/** World orientation of a hand on its contact: the guide's aim, or the mark's natural default. */
export function contactOrientation(
  r: MovementRig,
  id: AuthoredId,
  reach: Reach,
  s: number,
  aim?: Aim,
) {
  const { goal, mark, bone } = goalOf(r, id, reach, s)
  // A palm pressed on a floor, seat, table or wall lies flat whatever way it is aimed.
  if (aim) return aimOrientation(r, s, aim, flatOn(mark) && aim[3] !== 'back' && aim[3] !== 'tips')
  if (mark) return defaultOrientation(r, mark, bone, s, goal)
  // A hand put down on the floor lies flat, fingers forward, whatever it hung like before.
  if (onTheFloor(reach)) return flatPalmOrientation(s, V(s * 0.06, 0, 1), V(0, -1, 0))
  return worldQ(r, s === 1 ? 8 : 11)
}
/** The point of the hand that touches: fingertips for light touches, otherwise the palm. */
function touchPoint(
  r: MovementRig,
  id: AuthoredId,
  mark: Mark | undefined,
  s: number,
  touch?: 'palm' | 'back' | 'tips',
) {
  const hand = s === 1 ? 8 : 11
  if (id === 'ulnar-tensioner' && mark === 'eye') return oldLocal(hand, 0.043, -0.081, 0.077)
  if (touch === 'back') {
    // The back of the hand over the third metacarpal, through the same skin depth as the palm.
    const f = s === 1 ? limbFrames.left : limbFrames.right,
      p = vec(f.wrist).lerp(vec(f.palmCentre), 1.15).addScaledVector(vec(f.palmar), -0.03)
    return local(hand, p.x, p.y, p.z)
  }
  if (touch === 'tips' || (!touch && (mark === 'collar' || mark === 'jaw'))) {
    const tip = indexOfJoint[(s === 1 ? 'leftMiddle3' : 'rightMiddle3') as Joint],
      end = digitTips[s === 1 ? 'leftMiddle' : 'rightMiddle']
    r.bones[tip].updateWorldMatrix(true, false)
    return r.bones[hand].worldToLocal(r.bones[tip].localToWorld(local(tip, end[0], end[1], end[2])))
  }
  if (mark === 'bar' || mark === 'seat') return gripPoint(s)
  return palmPad(s)
}
export function placeHand(
  r: MovementRig,
  id: AuthoredId,
  reach: Reach | undefined,
  s: number,
  aim?: Aim | Quaternion,
  elbowAim?: Point,
  local = false,
  before?: Quaternion,
  exact = false,
  touch?: 'palm' | 'back' | 'tips',
) {
  if (!reach || reach === 'free') return
  const arm = s === 1 ? 6 : 9,
    root = r.root
  const { goal, mark } = goalOf(r, id, reach, s, exact)
  let q = aim instanceof Quaternion ? aim.clone() : contactOrientation(r, id, reach, s, aim)
  const posture = scores[id].posture
  const elbow = r.bones[arm + 1].getWorldPosition(V()),
    shoulder = r.bones[arm].getWorldPosition(V()),
    part = mark ? partOf(mark) : 'surface'
  // Where the elbow naturally points for each kind of contact, in the body's own frame: down and a
  // little out for the face and chest, out to the side behind the head, back for behind the back.
  const away =
    part === 'head'
      ? mark === 'ear' || mark === 'eye'
        ? V(s * 0.4, 0, -0.02)
        : V(s * 0.35, 0.04, 0.08)
      : part === 'jaw' || part === 'trunk'
        ? V(s * 0.18, -0.3, 0.06)
        : part === 'back'
          ? V(s * 0.24, -0.22, -0.2)
          : undefined
  const chest = r.bones[3].getWorldQuaternion(new Quaternion())
  // Between beats the elbow stays where the interpolated pose has it.
  const preferred = local
    ? elbow.clone()
    : elbowAim
      ? shoulder.clone().add(
          V(...elbowAim)
            .multiplyScalar(0.3)
            .applyQuaternion(chest),
        )
      : away
        ? shoulder.clone().add(away.applyQuaternion(chest))
        : elbow.clone().add(V(s * 0.12, -0.035, -0.035).applyQuaternion(root.quaternion))
  // A hand under the head needs a lateral elbow, not an elbow below the floor.
  if (
    !local &&
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
  const backOfHand = mark === 'back' || mark === 'backHip' ? 'back' : undefined
  const offset = touchPoint(
    r,
    id,
    mark,
    s,
    (Array.isArray(aim) ? aim[3] : undefined) ?? touch ?? backOfHand,
  )
  // A palm resting on the body may lie at any angle about its own normal. Without an authored
  // aim, keep the turn that the arm reaches most comfortably. An authored elbow direction chooses
  // the route, so only search near it.
  // `before` is how the hand sat on this contact in the previous beat, on the contact's bone.
  const bone = contactBone(r, id, reach, s),
    prefer = before && (bone < 0 ? before : worldQ(r, bone).multiply(before))
  reachPalm(r, (s === 1 ? 1 : -1) as Side, goal, q, offset, preferred, {
    spin: !local && !aim && mark && part !== 'surface' && mark !== 'eye' ? 90 : 0,
    search: local ? undefined : elbowAim ? 50 : 150,
    local,
    prefer,
  })
}
/** How far the touching point of the hand lies from its contact, in metres; 0 for a free hand. */
export function contactGap(
  r: MovementRig,
  id: AuthoredId,
  reach: Reach | undefined,
  s: number,
  aim?: Aim,
) {
  const points = contactPoints(r, id, reach, s, aim)
  return points ? points[0].distanceTo(points[1]) : 0
}
/** The contact's goal and the hand's touching point, or nothing for a free hand. */
export function contactPoints(
  r: MovementRig,
  id: AuthoredId,
  reach: Reach | undefined,
  s: number,
  aim?: Aim,
) {
  if (!reach || reach === 'free') return
  const { goal, mark } = goalOf(r, id, reach, s)
  const backOfHand = mark === 'back' || mark === 'backHip' ? 'back' : undefined
  const offset = touchPoint(r, id, mark, s, aim?.[3] ?? backOfHand)
  return [goal, r.bones[s === 1 ? 8 : 11].localToWorld(offset)] as const
}
/** The bone a contact moves with, or −1 for a fixture in the world. */
export function contactBone(r: MovementRig, id: AuthoredId, reach: Reach | undefined, s: number) {
  if (!reach || reach === 'free') return -1
  const mark = markOf(reach)
  if (!mark || partOf(mark) === 'surface') return -1
  return goalOf(r, id, reach, s).bone
}
export const digit = (name: string) => indexOfJoint[name as Joint]
