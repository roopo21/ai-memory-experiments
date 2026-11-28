import { Quaternion, Vector3 } from 'three'
import type { Pose, Leg } from '../../../studio/choreography/types'
import { scores, type AuthoredId } from '../../../studio/choreography'
import { solveLimb, worldRotation, type MovementRig } from '../../movementRig'
import { legFrame, turn, type Side } from '../../anatomy'
import { ANKLE_Y } from '../../joints'
import { flatPalmOrientation, palmOrientation } from '../handOrientation'
import { lowestHand } from './ground'
import { palmPad } from '../anchors'
import { placeHand } from './contacts'
const rad = Math.PI / 180,
  V = (x = 0, y = 0, z = 0) => new Vector3(x, y, z),
  X = V(1, 0, 0)
const rot = (degrees: number) => new Quaternion().setFromAxisAngle(X, degrees * rad)
const at = (r: MovementRig, i: number) => r.bones[i].getWorldPosition(V())
const swing = (r: MovementRig, i: number, dir: Vector3) => {
  const a = r.bones[i],
    b = r.bones[i + 1],
    q = a.getWorldQuaternion(new Quaternion()),
    from = at(r, i + 1).sub(at(r, i))
  worldRotation(
    a,
    new Quaternion().setFromUnitVectors(from.normalize(), dir.normalize()).multiply(q),
  )
  b.updateWorldMatrix(false, true)
}
function supportFoot(r: MovementRig, i: number, level = 0) {
  const sign = i === 12 ? 1 : -1,
    ankle = at(r, i + 2)
  const goal = V(ankle.x, level + ANKLE_Y, ankle.z)
  const pole = at(r, i + 1).add(V(sign * 0.015, 0.03, 0.25))
  solveLimb(r, i, i + 1, i + 2, goal, pole)
  worldRotation(r.bones[i + 2], rot(0))
}
const singleLeg = new Set<AuthoredId>([
  'leg-swings-front',
  'leg-swings-side',
  'hip-circles',
  'standing-quad',
  'standing-figure-four',
  'standing-hamstring-step',
  'standing-shin',
  'wall-toes-up-calf',
  'toes-on-wall',
])
function kneel(r: MovementRig, p: Pose, id: AuthoredId) {
  const posture = scores[id].posture,
    legs = posture === 'split' ? [15] : posture === 'halfKneel' ? [12] : [12, 15]
  let low = Infinity
  for (const i of legs) {
    const sign = i === 12 ? 1 : -1,
      l: Leg = (i === 12 ? p.leg : p.other) ?? [],
      hip = l[0] ?? 0,
      spread = l[1] ?? 0
    const direction = V(
      sign * Math.sin(spread * rad),
      -Math.cos(hip * rad) * Math.cos(spread * rad),
      Math.sin(hip * rad) * Math.cos(spread * rad),
    )
    // On hands and knees the thigh descends from an already horizontal pelvis.
    if (posture === 'allFours')
      direction.set(
        sign * Math.sin(spread * rad),
        -Math.cos((hip - 90) * rad) * Math.cos(spread * rad),
        Math.sin((hip - 90) * rad) * Math.cos(spread * rad),
      )
    swing(r, i, direction)
    const uprightShin = id === 'couch-stretch' || id === 'half-kneeling-quad'
    if (uprightShin)
      swing(
        r,
        i + 1,
        V(0, Math.sin(((l[2] ?? 120) - 90) * rad), -Math.cos(((l[2] ?? 120) - 90) * rad)),
      )
    else swing(r, i + 1, V(sign * Math.sin((l[4] ?? 0) * rad) * 0.55, 0.032, -1))
    // The ankle points the foot: about 50 degrees with the instep on the floor, less against a
    // wall, and dorsiflexed with the toes turned under.
    const foot = r.bones[i + 2],
      side = sign as Side
    foot.quaternion.copy(
      turn(legFrame(side).ankleAxis, uprightShin ? 38 : id === 'toes-tucked-kneel' ? -12 : 50),
    )
    foot.updateMatrixWorld(true)
    low = Math.min(low, at(r, i + 1).y)
  }
  r.root.position.y += 0.052 - low
  r.root.updateMatrixWorld(true)
  if (legs.length === 1) supportFoot(r, legs[0] === 12 ? 15 : 12)
}
function forearms(r: MovementRig, id: AuthoredId) {
  for (const arm of [6, 9]) {
    const s = arm === 6 ? 1 : -1,
      origin = at(r, arm),
      length = r.rest[arm + 1].length()
    const y = Math.max(-length + 0.0001, 0.04 - origin.y),
      z = Math.sqrt(Math.max(0, length * length - y * y))
    // Elbows under or just ahead of the shoulders.
    // Elbows a hand's width outside the shoulders, which keeps the humerus inside its range.
    swing(r, arm, V(s * (id === 'frog' ? 0.018 : 0.05), y, z * (id === 'frog' ? 0.7 : 0.12)))
    swing(r, arm + 1, V(s * -0.08, -0.035, 1))
    worldRotation(r.bones[arm + 2], flatPalmOrientation(s, V(0, 0, 1), V(0, -1, 0)))
  }
}
const hookFeet = new Set<AuthoredId>([
  'suboccipital-nod',
  'supine-hip-internal-rotation',
  'pelvic-tilts',
  'knee-rolls',
  'reclined-butterfly',
  'roller-chest-opener',
  'thoracic-extension-roller',
  'supine-overhead-stick',
])
export function prepareSupports(r: MovementRig, id: AuthoredId, p: Pose) {
  const posture = scores[id].posture
  if (id === 'childs-pose' || id === 'childs-pose-side-reach') {
    const lean = p.pelvis?.[0] ?? 0
    r.root.quaternion.premultiply(rot(lean * 0.45))
    r.root.updateMatrixWorld(true)
  }
  if (id === 'scorpion' || id === 'prone-chest-stretch') {
    // Pelvic rotation lifts the working hip. Supporting arms stay on the ground.
    if (id === 'scorpion') {
      worldRotation(r.bones[3], rot(90))
      r.root.updateMatrixWorld(true)
    }
    for (const arm of id === 'scorpion' ? [6, 9] : [6]) {
      const s = arm === 6 ? 1 : -1
      swing(r, arm, V(s, -0.12, 0))
      swing(r, arm + 1, V(s, -0.1, 0.02))
      worldRotation(r.bones[arm + 2], flatPalmOrientation(s, V(s, 0, 0.03), V(0, -1, 0)))
    }
  }
  if (id === 'frog' || id === 'puppy-pose') {
    // The puppy pose starts on all fours with the chest high and sinks the chest as the hips
    // tip; its pitch follows the pelvis tilt of the beat.
    const sink = id === 'frog' ? 24 + (p.pelvis?.[0] ?? 0) * -0.9 : ((p.pelvis?.[0] ?? 0) / 17) * 25
    r.root.quaternion.premultiply(rot(sink))
    r.root.updateMatrixWorld(true)
  }
  if (id === 'downward-dog') {
    const lift = Math.min(1, (p.shift?.[1] ?? 0) / 0.28)
    r.root.quaternion.copy(rot(86 + 48 * lift))
    r.root.position.set(0, 0.48 + 0.31 * lift, 0.02 - 0.17 * lift)
    r.root.updateMatrixWorld(true)
    for (const i of [12, 15]) {
      const s = i === 12 ? 1 : -1,
        goal = V(s * 0.105, 0.088 - 0.024 * lift, -0.4)
      solveLimb(r, i, i + 1, i + 2, goal, V(s * 0.13, 0.05 + lift * 0.42, 0.16))
      worldRotation(r.bones[i + 2], rot((1 - lift) * 143))
    }
  } else if (id === 'adductor-rock-back') {
    const hip = at(r, 12)
    swing(r, 12, V(0.74, -0.62, 0.15))
    swing(r, 13, V(0.78, -0.58, 0.1))
    worldRotation(r.bones[14], rot(0))
    swing(r, 15, V(-0.04, -0.95, 0.16))
    swing(r, 16, V(0, 0.035, -1))
    worldRotation(r.bones[17], rot(160))
    r.root.position.y += 0.052 - at(r, 16).y
    r.root.position.x += hip.x - at(r, 12).x
    r.root.updateMatrixWorld(true)
  } else if (['halfKneel', 'split', 'kneel', 'heelSit', 'allFours'].includes(posture))
    kneel(r, p, id)
  else if (posture === 'pigeon') {
    // The legs are posed in the pelvis frame by the guide. The pelvis tips well forward so the
    // back thigh lies along the floor with only about 35 degrees of hip extension; the lumbar
    // spine extends to bring the chest back up over the hands.
    r.root.quaternion.premultiply(rot(40))
    r.root.updateMatrixWorld(true)
  } else if (posture === 'stand' || posture === 'lunge' || posture === 'squat') {
    if (id === 'inchworm' || id === 'step-heel-drop' || id === 'bar-hang') return
    const planted = singleLeg.has(id) ? [15] : [12, 15]
    // Plant flat soles first, then bend the supporting knee to accept the weight shift.
    for (const i of planted) worldRotation(r.bones[i + 2], rot(0))
    const drop = Math.max(...planted.map((i) => at(r, i + 2).y))
    r.root.position.y += ANKLE_Y - drop
    r.root.updateMatrixWorld(true)
    for (const i of planted) supportFoot(r, i)
    if (id === 'standing-hamstring-step') supportFoot(r, 12, 0.16)
  } else if (posture === 'supine') {
    if (hookFeet.has(id) || (id === 'supine-figure-four' && (p.other?.[0] ?? 0) < 70)) {
      const legs = id === 'supine-figure-four' && (p.leg?.[4] ?? 0) > 0 ? [15] : [12, 15]
      for (const i of legs) supportFoot(r, i)
    }
  } else if (posture === 'chair' || posture === 'figureFour') {
    for (const i of [12, 15]) {
      const l = i === 12 ? p.leg : p.other
      if ((l?.[2] ?? 82) > 73 && Math.abs(l?.[1] ?? 0) < 15 && Math.abs(l?.[3] ?? 0) < 9)
        supportFoot(r, i)
    }
  }
  if (id === 'seated-reverse-reach') {
    r.root.position.y = 0.145
    r.root.updateMatrixWorld(true)
    for (const i of [12, 15]) {
      const s = i === 12 ? 1 : -1
      solveLimb(r, i, i + 1, i + 2, V(s * 0.12, ANKLE_Y, 0.58), V(s * 0.13, 0.54, 0.34))
      worldRotation(r.bones[i + 2], rot(0))
    }
  }
  if (id === 'kneeling-lat-bench') {
    for (const arm of [6, 9]) {
      const s = arm === 6 ? 1 : -1,
        origin = at(r, arm),
        len = r.rest[arm + 1].length(),
        dy = Math.max(-len + 0.0001, Math.min(len - 0.0001, 0.419 - origin.y))
      const upper = V(s * 0.012, dy, Math.sqrt(Math.max(0.00001, len * len - dy * dy)))
      swing(r, arm, upper.clone())
      // The forearms rise from the elbows; bending them further brings the hands to the neck.
      const bend = ((p.a?.[2] ?? 90) * Math.PI) / 180
      swing(r, arm + 1, upper.normalize().applyAxisAngle(V(-1, 0, 0), bend))
      // Hands together above the elbows, palms facing.
      worldRotation(r.bones[arm + 2], palmOrientation(s, V(-s * 0.15, 1, -0.2), V(-s, 0, 0)))
    }
  }
  if (id === 'frog' || id === 'sphinx') forearms(r, id)
}
// When the torso rolls or lies down, free fingers and elbows can meet the floor
// before the pelvis. Reposition the arm so the body's weight stays on its support.
export function clearFloorArms(r: MovementRig, id: AuthoredId) {
  if (
    ![
      'supine',
      'side',
      'prone',
      'floorSeat',
      'longSit',
      'straddle',
      'butterfly',
      'heelSit',
      'pigeon',
    ].includes(scores[id].posture)
  )
    return
  for (const s of [1, -1]) {
    const arm = s === 1 ? 6 : 9
    for (let pass = 0; pass < 2; pass++) {
      r.root.updateMatrixWorld(true)
      const below = 0.002 - lowestHand(r, s),
        elbow = at(r, arm + 1)
      if (below < 0.001 && elbow.y >= 0.036) break
      const palm = r.bones[arm + 2].localToWorld(palmPad(s))
      palm.y += Math.max(0, below)
      // Lift the hand as it is: a bare point near the floor would otherwise lay it flat.
      placeHand(
        r,
        id,
        palm.toArray(),
        s,
        r.bones[arm + 2].getWorldQuaternion(new Quaternion()),
        undefined,
        false,
        undefined,
        true,
      )
    }
  }
}
export function floorHands(r: MovementRig, id: AuthoredId, p: Pose) {
  if (id === 'frog' || id === 'sphinx') return
  const { posture } = scores[id]
  if (id === 'downward-dog') {
    placeHand(r, id, ['floor', 0.005, -0.007, 0.09], 1)
    placeHand(r, id, ['floor', -0.005, -0.007, 0.09], -1)
  } else if (id === 'childs-pose' && p.pelvis) {
    const goal = (s: number) => {
      const hand = at(r, s === 1 ? 8 : 11)
      return ['floor', hand.x - s * 0.2, -0.006, hand.z + 0.06 - 0.49] as const
    }
    placeHand(r, id, goal(1), 1)
    placeHand(r, id, goal(-1), -1)
  } else if (posture === 'allFours') {
    for (const s of [1, -1])
      if ((s === 1 ? p.ga : p.gb) === 'floor') placeHand(r, id, 'floor', s, s === 1 ? p.ha : p.hb)
  }
}

export type FootMark = { joint: number; ankle: Vector3 }
export function standingMarks(r: MovementRig, id: AuthoredId) {
  const marks: FootMark[] = [],
    posture = scores[id].posture
  if (
    !['stand', 'squat', 'lunge'].includes(posture) ||
    ['inchworm', 'step-heel-drop', 'bar-hang'].includes(id)
  )
    return marks
  for (const i of singleLeg.has(id) ? [15] : [12, 15]) {
    const ankle = at(r, i + 2)
    ankle.y = ANKLE_Y
    marks.push({ joint: i, ankle })
  }
  if (id === 'standing-hamstring-step') {
    const ankle = at(r, 14)
    ankle.y = 0.16 + ANKLE_Y
    marks.push({ joint: 12, ankle })
  }
  return marks
}
/** Degrees the toes turn out in a stance, where the guide asks for it. */
const TOE_OUT: Partial<Record<AuthoredId, number>> = { 'deep-squat-hold': 20 }
export const toeOut = (id: AuthoredId) => TOE_OUT[id] ?? 0
export function lockStandingFeet(r: MovementRig, marks: FootMark[], out = 0) {
  if (!marks.length) return
  r.root.updateMatrixWorld(true)
  let lower = 0
  for (const { joint: i, ankle } of marks) {
    const hip = at(r, i),
      range = r.rest[i + 1].length() + r.rest[i + 2].length() - 0.0001
    const span = Math.hypot(hip.x - ankle.x, hip.z - ankle.z)
    const cap = ankle.y + Math.sqrt(Math.max(0, range * range - span * span))
    lower = Math.min(lower, cap - hip.y)
  }
  r.root.position.y += lower
  r.root.updateMatrixWorld(true)
  for (const { joint: i, ankle } of marks) {
    const sign = i === 12 ? 1 : -1,
      yaw = out * rad,
      // The knee points where the foot does.
      pole = at(r, i + 1).add(V(sign * (0.016 + 0.36 * Math.sin(yaw)), 0, 0.36 * Math.cos(yaw)))
    solveLimb(r, i, i + 1, i + 2, ankle, pole)
    worldRotation(r.bones[i + 2], new Quaternion().setFromAxisAngle(V(0, 1, 0), sign * yaw))
  }
}
