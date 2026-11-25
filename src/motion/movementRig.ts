import {
  Box3,
  Bone,
  Skeleton,
  Vector3,
  Quaternion,
  Matrix4,
  BufferGeometry,
  Uint16BufferAttribute,
  Float32BufferAttribute,
  SkinnedMesh,
  Sphere,
  Mesh,
} from 'three'
import { distalBindings, digitTips } from './distalJoints'
import { joints } from './joints'
import type { Structure } from '../anatomy/catalogue'

export type BodyAction = 'idle' | 'wheel' | 'moonwalk' | 'cartwheel'
export const CARTWHEEL_SECONDS = 3.7
const V = (x: number, y: number, z: number) => new Vector3(x, y, z)
const defs = joints.map(([name, parent, point]) => [name, parent, new Vector3(...point)] as const)
const ends = [
  defs[1][2],
  defs[2][2],
  defs[3][2],
  defs[4][2],
  defs[5][2],
  V(0, 1.65, 0.1),
  defs[7][2],
  defs[8][2],
  V(0.28, 0.65, 0.1),
  defs[10][2],
  defs[11][2],
  V(-0.28, 0.65, 0.1),
  defs[13][2],
  defs[14][2],
  V(0.08, 0.025, 0.23),
  defs[16][2],
  defs[17][2],
  V(-0.08, 0.025, 0.23),
  defs[6][2],
  defs[9][2],
]

const handDigits = defs
  .map(([name], i) =>
    /Thumb|Index|Middle|Ring|Little/.test(name) && !name.includes('Toe') ? i : -1,
  )
  .filter((i) => i >= 0)
const feetDigits = defs.map(([name], i) => (name.includes('Toe') ? i : -1)).filter((i) => i >= 0)
for (let i = 20; i < defs.length; i++) {
  const [name, , at] = defs[i],
    child = defs.find(([, parent]) => parent === i),
    tip = digitTips[name.slice(0, -1) as keyof typeof digitTips]
  ends[i] = child?.[2] ?? (tip ? new Vector3(...tip) : at.clone().add(V(0, -0.04, 0.04)))
}

export function createMovementRig() {
  const bones = defs.map(([name]) => {
    const b = new Bone()
    b.name = name
    return b
  })
  defs.forEach(([, parent, point], i) => {
    bones[i].position.copy(point)
    const parentIndex: number = parent
    if (parentIndex >= 0) {
      bones[i].position.sub(defs[parentIndex][2])
      bones[parentIndex].add(bones[i])
    }
  })
  const root = bones[0]
  root.updateMatrixWorld(true)
  const skeleton = new Skeleton(bones)
  const rest = bones.map((b) => b.position.clone())
  const target = createPoseBuffers(bones)
  return { root, bones, skeleton, rest, target }
}
export type MovementRig = ReturnType<typeof createMovementRig>
function createPoseBuffers(bones: Bone[]) {
  return {
    positions: bones.map((b) => b.position.clone()),
    rotations: bones.map(() => new Quaternion()),
  }
}
export function restPose(rig: MovementRig) {
  rig.bones.forEach((b, i) => {
    b.position.copy(rig.rest[i])
    b.quaternion.identity()
  })
}
export function worldRotation(bone: Bone, rotation: Quaternion) {
  const parent = bone.parent?.getWorldQuaternion(new Quaternion()) ?? new Quaternion()
  bone.quaternion.copy(parent.invert().multiply(rotation))
  bone.updateWorldMatrix(false, true)
}
function aim(bone: Bone, localDirection: Vector3, worldDirection: Vector3) {
  worldRotation(
    bone,
    new Quaternion().setFromUnitVectors(
      localDirection.clone().normalize(),
      worldDirection.clone().normalize(),
    ),
  )
}
/** Two-link IK with a pole vector; lengths come from the bind pose, so bones never stretch. */
export function solveLimb(
  rig: MovementRig,
  upper: number,
  lower: number,
  end: number,
  goal: Vector3,
  pole: Vector3,
) {
  const [a, b] = [rig.bones[upper], rig.bones[lower]]
  const origin = a.getWorldPosition(new Vector3())
  const direction = goal.clone().sub(origin)
  const l1 = rig.rest[lower].length(),
    l2 = rig.rest[end].length()
  const length = direction.length()
  const distance = Math.max(Math.abs(l1 - l2) + 1e-5, Math.min(length, l1 + l2 - 1e-5))
  if (length < 1e-8) direction.copy(rig.rest[lower])
  direction.normalize()
  const projected = origin.clone().addScaledVector(direction, distance)
  const across = pole.clone().sub(origin)
  across.addScaledVector(direction, -across.dot(direction))
  if (across.lengthSq() < 1e-12) {
    across.set(0, 0, 1)
    if (Math.abs(direction.z) > 0.9) across.set(0, 1, 0)
    across.addScaledVector(direction, -across.dot(direction))
  }
  across.normalize()
  const along = (l1 * l1 - l2 * l2 + distance * distance) / (2 * distance)
  const joint = origin
    .clone()
    .addScaledVector(direction, along)
    .addScaledVector(across, Math.sqrt(Math.max(0, l1 * l1 - along * along)))
  aim(a, rig.rest[lower], joint.clone().sub(origin))
  aim(b, rig.rest[end], projected.sub(b.getWorldPosition(new Vector3())))
}
const qx = (angle: number) => new Quaternion().setFromAxisAngle(V(1, 0, 0), angle)
const qy = (angle: number) => new Quaternion().setFromAxisAngle(V(0, 1, 0), angle)
const plantedHand = (yaw: number) => qy(yaw).multiply(qx(Math.PI / 2))
/** Share pronation with the forearm instead of putting the entire turn at the wrist. */
function orientHand(rig: MovementRig, forearm: number, hand: number, target: Quaternion) {
  const lower = rig.bones[forearm],
    end = rig.bones[hand]
  const current = lower.getWorldQuaternion(new Quaternion())
  const axis = end
    .getWorldPosition(new Vector3())
    .sub(lower.getWorldPosition(new Vector3()))
    .normalize()
  const delta = target.clone().multiply(current.clone().invert())
  const projection = delta.x * axis.x + delta.y * axis.y + delta.z * axis.z
  const twist = new Quaternion(
    axis.x * projection,
    axis.y * projection,
    axis.z * projection,
    delta.w,
  ).normalize()
  const shared = new Quaternion().slerp(twist, 0.55).multiply(current)
  worldRotation(lower, shared)
  worldRotation(end, target)
}

const ease = (t: number) => {
  const u = Math.max(0, Math.min(1, t))
  return u * u * (3 - 2 * u)
}

/** Mutates the rig into the desired clip frame; all clips use the same bind skeleton. */
export function sampleMovement(rig: MovementRig, action: BodyAction, time: number) {
  restPose(rig)
  const b = rig.bones
  if (action === 'wheel') {
    b[0].position.set(0, 0.53, 0.3)
    b[0].rotation.x = -0.6
    b[1].rotation.x = -0.7
    b[2].rotation.x = -0.7
    b[3].rotation.x = -0.7
    b[4].rotation.x = 0.4
    b[18].rotation.z = 0.25
    b[19].rotation.z = -0.25
    rig.root.updateMatrixWorld(true)
    for (const side of [1, -1]) {
      const arm = side === 1 ? 6 : 9,
        leg = side === 1 ? 12 : 15
      solveLimb(rig, leg, leg + 1, leg + 2, V(side * 0.11, 0.065, 0.65), V(side * 0.13, 0.55, 0.85))
      worldRotation(b[leg + 2], new Quaternion())
      solveLimb(
        rig,
        arm,
        arm + 1,
        arm + 2,
        V(side * 0.22, 0.035, -0.21),
        V(side * 0.27, 0.26, -0.3),
      )
      orientHand(rig, arm + 1, arm + 2, plantedHand(Math.PI - side * 0.18))
    }
  } else if (action === 'moonwalk') {
    const t = time / 1.65
    const groove = Math.sin(t * Math.PI * 2)
    b[0].position.y -= 0.033 + 0.006 * Math.cos(t * Math.PI * 4)
    b[0].position.x = 0.026 * groove
    b[1].rotation.x = 0.045
    b[3].rotation.y = 0.09 * groove
    b[4].rotation.x = -0.025
    b[18].rotation.z = 0.045 * groove
    b[19].rotation.z = -0.045 * groove
    rig.root.updateMatrixWorld(true)
    for (const side of [1, -1]) {
      const p = (((t + (side === 1 ? 0 : 0.5)) % 1) + 1) % 1
      const recovery = p >= 0.5
      const u = recovery ? (p - 0.5) * 2 : p * 2
      const toe = recovery ? Math.sin(Math.PI * u) ** 0.7 : 0
      // The supporting foot glides at a steady speed; the raised heel resets quickly.
      const z = recovery ? -0.19 + 0.38 * ease(u) : 0.19 - 0.38 * u
      const leg = side === 1 ? 12 : 15,
        arm = side === 1 ? 6 : 9
      solveLimb(
        rig,
        leg,
        leg + 1,
        leg + 2,
        V(side * 0.09, 0.065 + 0.065 * toe, 0.075 + z),
        V(side * 0.1, 0.4, 0.48),
      )
      worldRotation(b[leg + 2], qx(0.55 * toe))
      b[arm].rotation.x = side * 0.25 * groove
      b[arm].rotation.z = side * 0.06
      b[arm + 1].rotation.x = -0.22 - side * 0.07 * groove
      b[arm + 2].rotation.y = -side * 0.25
    }
  } else if (action === 'cartwheel') {
    const p = Math.max(0, Math.min(1, time / CARTWHEEL_SECONDS))
    const travel = ease((p - 0.12) / 0.76)
    const leftLift = ease(p / 0.17) * (1 - ease((p - 0.76) / 0.23))
    const rightLift = ease((p - 0.045) / 0.19) * (1 - ease((p - 0.81) / 0.19))
    b[0].position.x =
      p < 0.12
        ? -0.6 * ease(p / 0.12)
        : p > 0.88
          ? 0.6 * (1 - ease((p - 0.88) / 0.12))
          : -0.6 + 1.2 * travel
    b[0].rotation.z = -Math.PI * 2 * travel
    b[3].rotation.y = 0.07 * Math.sin(Math.PI * travel)
    // Scapular rotation shares the lift instead of driving the humerus through the shoulder.
    b[18].rotation.z = 0.65 * leftLift
    b[19].rotation.z = -0.65 * rightLift
    b[6].rotation.z = 2.13 * leftLift
    b[9].rotation.z = -2.13 * rightLift
    // Lead and trailing legs kick and land in sequence rather than making a symmetric star.
    b[12].rotation.z = 1.05 * Math.sin(Math.PI * Math.max(0, Math.min(1, (travel - 0.025) / 0.82)))
    b[15].rotation.z = -0.95 * Math.sin(Math.PI * Math.max(0, Math.min(1, (travel - 0.15) / 0.85)))
    const settle = Math.sin(Math.PI * ease((p - 0.83) / 0.17))
    b[13].rotation.x = 0.2 * settle
    b[16].rotation.x = 0.27 * settle
    rig.root.updateMatrixWorld(true)
    for (const side of [1, -1]) {
      const hand = side === 1 ? 8 : 11
      const contact =
        side === 1
          ? ease((travel - 0.1) / 0.16) * (1 - ease((travel - 0.49) / 0.18))
          : ease((travel - 0.27) / 0.16) * (1 - ease((travel - 0.7) / 0.18))
      if (contact > 0) {
        // During the full revolution a shortest-path slerp can change direction halfway
        // through a planted hand. Compose the authored local quaternions in their
        // continuous hemisphere, then follow the same arc throughout this contact.
        const inherited = new Quaternion()
        for (let i: number = hand; i >= 0; i = joints[i][1]) inherited.premultiply(b[i].quaternion)
        const target = plantedHand((-side * Math.PI) / 2)
        const sign = side === 1 ? 1 : -1
        const angle = Math.acos(Math.max(-1, Math.min(1, inherited.dot(target) * sign)))
        const a = angle < 1e-7 ? 1 - contact : Math.sin((1 - contact) * angle) / Math.sin(angle)
        const d = sign * (angle < 1e-7 ? contact : Math.sin(contact * angle) / Math.sin(angle))
        worldRotation(
          b[hand],
          new Quaternion(
            a * inherited.x + d * target.x,
            a * inherited.y + d * target.y,
            a * inherited.z + d * target.z,
            a * inherited.w + d * target.w,
          ).normalize(),
        )
      }
    }
    plantCartwheel(rig)
  }
  rig.root.updateMatrixWorld(true)
}

/** Supporting palms and soles share the same floor during the roll and its transition. */
function plantCartwheel(rig: MovementRig) {
  rig.root.updateMatrixWorld(true)
  const b = rig.bones
  const tips = [
    b[8].localToWorld(V(0.03, -0.18, 0.01)),
    b[11].localToWorld(V(-0.03, -0.18, 0.01)),
    b[14].localToWorld(V(0, -0.06, 0.04)),
    b[17].localToWorld(V(0, -0.06, 0.04)),
  ]
  b[0].position.y -= Math.min(...tips.map((p) => p.y))
  rig.root.updateMatrixWorld(true)
}

/** Blend joint transforms (not vertices) for smooth, rigid-limbed pose changes. */
export function advanceMovement(
  rig: MovementRig,
  action: BodyAction,
  time: number,
  dt: number,
  instant = false,
) {
  const currentP = rig.bones.map((b) => b.position.clone()),
    currentQ = rig.bones.map((b) => b.quaternion.clone())
  sampleMovement(rig, action, time)
  const response = action === 'cartwheel' || action === 'moonwalk' ? 0.045 : 0.18
  const blend = instant ? 1 : 1 - Math.exp(-Math.min(dt, 0.1) / response)
  let moving = false
  rig.bones.forEach((b, i) => {
    rig.target.positions[i].copy(b.position)
    rig.target.rotations[i].copy(b.quaternion)
    b.position.copy(currentP[i]).lerp(rig.target.positions[i], blend)
    b.quaternion.copy(currentQ[i]).slerp(rig.target.rotations[i], blend)
    if (
      b.position.distanceToSquared(rig.target.positions[i]) > 1e-8 ||
      b.quaternion.angleTo(rig.target.rotations[i]) > 0.0005
    )
      moving = true
  })
  rig.root.updateMatrixWorld(true)
  if (action === 'cartwheel') plantCartwheel(rig)
  return moving
}

function rigidJoint(s: Structure, center: Vector3) {
  if (distalBindings[s.meshName] !== undefined) return distalBindings[s.meshName]
  const name = s.displayName.toLowerCase(),
    left = name.includes('left') || (!name.includes('right') && center.x >= 0)
  if (s.region === 'Feet') return left ? 14 : 17
  if (s.region === 'Legs') return name.includes('femur') ? (left ? 12 : 15) : left ? 13 : 16
  if (s.region === 'Hands') return left ? 8 : 11
  if (s.region === 'Shoulders and arms') {
    if (name.includes('humerus')) return left ? 6 : 9
    if (name.includes('radius') || name.includes('ulna')) return left ? 7 : 10
    return left ? 18 : 19
  }
  if (s.region === 'Skull and hyoid' || s.region === 'Teeth') return 5
  if (s.region === 'Thorax') return /tenth rib|eleventh rib|twelfth rib/.test(name) ? 2 : 3
  if (s.region === 'Pelvis' || name === 'sacrum') return 0
  return center.y > 1.4 ? 4 : center.y > 1.16 ? 3 : center.y > 1.04 ? 2 : center.y > 0.94 ? 1 : 0
}
function candidates(s: Structure | undefined, x: number) {
  const left = x >= 0
  if (s?.region === 'Upper limbs' || s?.region === 'Upper limb nerves')
    return left ? [3, 18, 6, 7, 8] : [3, 19, 9, 10, 11]
  if (s?.region === 'Lower limbs' || s?.region === 'Lower limb nerves')
    return left ? [0, 12, 13, 14] : [0, 15, 16, 17]
  if (s?.region === 'Head' || s?.region === 'Cranial nerves') return [4, 5]
  return [0, 1, 2, 3, 4, 5]
}
function segmentDistance(x: number, y: number, z: number, i: number) {
  const a = defs[i][2],
    b = ends[i],
    dx = b.x - a.x,
    dy = b.y - a.y,
    dz = b.z - a.z
  const t = Math.max(
    0,
    Math.min(1, ((x - a.x) * dx + (y - a.y) * dy + (z - a.z) * dz) / (dx * dx + dy * dy + dz * dz)),
  )
  return (x - a.x - t * dx) ** 2 + (y - a.y - t * dy) ** 2 + (z - a.z - t * dz) ** 2
}

/** Continuous attachments prevent a triangle from crossing an abrupt skin-weight boundary. */
export function trunkInfluences(y: number): [number, number, number] {
  if (y <= 0.92) return [0, 0, 0]
  if (y < 1.0) return [0, 1, ease((y - 0.92) / 0.08)]
  if (y < 1.05) return [1, 2, ease((y - 1.0) / 0.05)]
  if (y < 1.1) return [2, 3, ease((y - 1.05) / 0.05)]
  if (y < 1.38) return [3, 3, 0]
  if (y < 1.46) return [3, 4, ease((y - 1.38) / 0.08)]
  if (y < 1.51) return [4, 5, ease((y - 1.46) / 0.05)]
  return [5, 5, 0]
}

/** Skinning also drives Three's raycaster; each source bone gets one rigid influence. */
export function skinAnatomyMesh(mesh: Mesh, structure: Structure | undefined, rig: MovementRig) {
  const geometry: BufferGeometry = mesh.geometry.clone(),
    p = geometry.getAttribute('position')
  geometry.computeBoundingBox()
  const center = geometry.boundingBox!.getCenter(new Vector3())
  const rigid = structure?.systems.includes('skeletal') ? rigidJoint(structure, center) : undefined
  const indices = new Uint16Array(p.count * 4),
    weights = new Float32Array(p.count * 4)
  const name = structure?.displayName.toLowerCase() ?? ''
  const shoulderAttachment = /pectoralis major/.test(name)
    ? 'chest-arm'
    : /serratus anterior|pectoralis minor/.test(name)
      ? 'chest-scapula'
      : /subclavius/.test(name)
        ? 'scapula'
        : /deltoid|subscapularis|supraspinatus|infraspinatus|teres major|teres minor/.test(name)
          ? 'scapula-arm'
          : undefined
  const trunk = !['Upper limbs', 'Upper limb nerves', 'Lower limbs', 'Lower limb nerves'].includes(
    structure?.region ?? '',
  )
  const positive = candidates(structure, 1),
    negative = candidates(structure, -1)
  const upperLimb = positive.includes(8),
    digits = upperLimb ? handDigits : feetDigits
  const leftDistal = [...positive, ...digits.filter((i) => defs[i][0].startsWith('left'))]
  const rightDistal = [...negative, ...digits.filter((i) => defs[i][0].startsWith('right'))]
  const nearest = new Int16Array(4),
    distances = new Float64Array(4),
    influence = new Float64Array(4)
  for (let i = 0; i < p.count; i++) {
    if (rigid !== undefined) {
      indices[i * 4] = rigid
      weights[i * 4] = 1
      continue
    }
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i)
    if (shoulderAttachment) {
      const side = center.x >= 0,
        girdle = side ? 18 : 19,
        arm = side ? 6 : 9
      const lateral = Math.abs(x)
      const from =
        shoulderAttachment === 'scapula-arm' || shoulderAttachment === 'scapula' ? girdle : 3
      const to =
        shoulderAttachment === 'chest-scapula' || shoulderAttachment === 'scapula' ? girdle : arm
      const blend =
        shoulderAttachment === 'chest-arm'
          ? ease((lateral - 0.13) / 0.09) * ease((y - 1.14) / 0.12)
          : shoulderAttachment === 'chest-scapula'
            ? 0.7 * ease((lateral - 0.1) / 0.08) * ease((y - 1.1) / 0.16)
            : shoulderAttachment === 'scapula-arm'
              ? ease((lateral - 0.11) / 0.1)
              : 1
      indices[i * 4] = from
      indices[i * 4 + 1] = to
      weights[i * 4] = 1 - blend
      weights[i * 4 + 1] = blend
      continue
    }
    if (trunk) {
      const region = structure?.region
      if (region === 'Head' || region === 'Cranial nerves') {
        const jaw = /masseter|pterygoid|temporalis|digastric|mylohyoid/.test(name)
          ? 0.9 * ease((1.54 - y) / 0.075)
          : 0
        indices[i * 4] = 5
        indices[i * 4 + 1] = 20
        weights[i * 4] = 1 - jaw
        weights[i * 4 + 1] = jaw
        continue
      }
      const [first, second, blend] = trunkInfluences(y)
      indices[i * 4] = first
      indices[i * 4 + 1] = second
      weights[i * 4] = 1 - blend
      weights[i * 4 + 1] = blend
      // Thorax and upper-back muscles share their shoulder-girdle attachment laterally.
      if ((region === 'Back' || region === 'Neck') && y > 1.18 && y < 1.42) {
        const shoulder = 0.85 * ease((Math.abs(x) - 0.065) / 0.095) * ease((y - 1.18) / 0.12)
        indices[i * 4 + 2] = name.includes('latissimus') ? (x >= 0 ? 6 : 9) : x >= 0 ? 18 : 19
        weights[i * 4] *= 1 - shoulder
        weights[i * 4 + 1] *= 1 - shoulder
        weights[i * 4 + 2] = shoulder
      }
      continue
    }
    distances.fill(Infinity)
    const atDigits = upperLimb ? y < 0.815 : y < 0.08 && z > 0.13
    const branch = atDigits ? (x >= 0 ? leftDistal : rightDistal) : x >= 0 ? positive : negative
    for (const bone of branch) {
      const distance = segmentDistance(x, y, z, bone)
      for (let j = 0; j < 4; j++)
        if (distance < distances[j]) {
          for (let k = 3; k > j; k--) {
            distances[k] = distances[k - 1]
            nearest[k] = nearest[k - 1]
          }
          distances[j] = distance
          nearest[j] = bone
          break
        }
    }
    let total = 0
    for (let j = 0; j < 4; j++) {
      influence[j] = Number.isFinite(distances[j])
        ? 1 / (distances[j] + (atDigits ? 0.00007 : 0.0006)) ** 2
        : 0
      total += influence[j]
    }
    for (let j = 0; j < 4; j++) {
      indices[i * 4 + j] = nearest[j]
      weights[i * 4 + j] = influence[j] / total
    }
  }
  const boxes: (Box3 | undefined)[] = []
  const point = new Vector3()
  for (let i = 0; i < p.count; i++) {
    point.fromBufferAttribute(p, i)
    for (let j = 0; j < 4; j++)
      if (weights[i * 4 + j] > 0) {
        const index = indices[i * 4 + j]
        ;(boxes[index] ??= new Box3()).expandByPoint(point)
      }
  }
  geometry.setAttribute('skinIndex', new Uint16BufferAttribute(indices, 4))
  geometry.setAttribute('skinWeight', new Float32BufferAttribute(weights, 4))
  const skinned = new SkinnedMesh(geometry, mesh.material)
  skinned.name = mesh.name
  skinned.userData = { ...mesh.userData }
  skinned.renderOrder = mesh.renderOrder
  skinned.bind(rig.skeleton, new Matrix4())
  skinned.frustumCulled = false
  skinned.boundingSphere = new Sphere()
  skinned.userData.skinBounds = boxes.flatMap((box, bone) =>
    box ? [{ bone, sphere: box.getBoundingSphere(new Sphere()) }] : [],
  )
  updateSkinBounds(skinned)
  mesh.parent?.add(skinned)
  mesh.removeFromParent()
  return skinned
}

const boundsMatrix = new Matrix4()
const boundsSphere = new Sphere()
/** Conservative per-joint bounds keep picking fast as the body moves. */
export function updateSkinBounds(mesh: SkinnedMesh) {
  const bounds = mesh.userData.skinBounds as { bone: number; sphere: Sphere }[]
  mesh.boundingSphere.makeEmpty()
  for (const bound of bounds) {
    boundsMatrix
      .multiplyMatrices(
        mesh.skeleton.bones[bound.bone].matrixWorld,
        mesh.skeleton.boneInverses[bound.bone],
      )
      .premultiply(mesh.bindMatrixInverse)
    boundsSphere.copy(bound.sphere).applyMatrix4(boundsMatrix)
    mesh.boundingSphere.union(boundsSphere)
  }
  mesh.boundingSphere.radius += 0.002 // Cover float32 skin-matrix rounding at the surface.
}
