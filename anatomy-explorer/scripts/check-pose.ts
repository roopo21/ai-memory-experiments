import assert from 'node:assert/strict'
import {
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  Matrix4,
  Vector3,
} from 'three'
import {
  advanceMovement,
  CARTWHEEL_SECONDS,
  createMovementRig,
  sampleMovement,
  skinAnatomyMesh,
  updateSkinBounds,
  trunkInfluences,
} from '../src/scene/movementRig'
import { structures } from '../src/data/anatomy'
import { useAnatomyStore as store } from '../src/store/useAnatomyStore'

const rig = createMovementRig()
const world = (i: number) => rig.bones[i].getWorldPosition(new Vector3())
sampleMovement(rig, 'wheel', 0)
for (const i of [8, 11])
  assert.ok(world(i).y < 0.09, `Wheel wrist ${i} must reach the floor: ${world(i).toArray()}`)
for (const i of [14, 17])
  assert.ok(Math.abs(world(i).y - 0.065) < 0.015, 'Wheel feet stay grounded')
assert.ok(world(2).y > world(4).y, 'Spine must arch above shoulders')
assert.ok(world(5).y > 0.15, 'Head stays above the floor')
for (const [hand, side] of [
  [8, 1],
  [11, -1],
]) {
  const orientation = rig.bones[hand].getWorldQuaternion(rig.bones[hand].quaternion.clone())
  const fingers = new Vector3(0, -1, 0).applyQuaternion(orientation)
  const palm = new Vector3(0, 0, 1).applyQuaternion(orientation)
  assert.ok(fingers.z > 0.95 && fingers.x * side < 0, 'Wheel fingers turn inward toward the feet')
  assert.ok(palm.y < -0.95, 'Supporting palms remain face down')
}
for (const boundary of [0.92, 1, 1.05, 1.1, 1.38, 1.46, 1.51]) {
  const weightVector = (y: number) => {
    const [a, b, t] = trunkInfluences(y)
    const w = new Array(20).fill(0)
    w[a] += 1 - t
    w[b] += t
    return w
  }
  const before = weightVector(boundary - 1e-5),
    after = weightVector(boundary + 1e-5)
  assert.ok(
    before.every((w, i) => Math.abs(w - after[i]) < 0.001),
    'Trunk attachments remain continuous across joint boundaries',
  )
}
const endpoints = rig.bones.map((b) => b.position.length())
for (const action of ['idle', 'wheel', 'moonwalk', 'cartwheel'] as const) {
  for (const time of [0, 0.7, 1.5, 3, 4.5, 6]) {
    sampleMovement(rig, action, time)
    rig.bones.forEach((b, i) => {
      assert.ok(b.position.toArray().every(Number.isFinite))
      if (i)
        assert.ok(
          Math.abs(b.position.length() - endpoints[i]) < 1e-7,
          'Joint animation preserves limb length',
        )
    })
  }
}
sampleMovement(rig, 'moonwalk', 0)
const first = world(14)
sampleMovement(rig, 'moonwalk', 0.7)
assert.ok(first.distanceTo(world(14)) > 0.08, 'Moonwalk feet must slide')
sampleMovement(rig, 'cartwheel', CARTWHEEL_SECONDS / 2)
assert.ok(world(5).y < world(0).y, 'Cartwheel inverts the torso')
const leftKnee = rig.root.worldToLocal(world(13)),
  rightKnee = rig.root.worldToLocal(world(16))
assert.ok(
  leftKnee.x > 0.12 && rightKnee.x < -0.12,
  'Cartwheel split opens outward without crossing the thighs',
)
sampleMovement(rig, 'cartwheel', CARTWHEEL_SECONDS)
assert.ok(world(5).y > world(0).y, 'Cartwheel lands upright')

const source = new BufferGeometry()
source.setAttribute(
  'position',
  new Float32BufferAttribute([0.17, 1.3, 0.075, 0.2, 1.2, 0.08, 0.225, 1.06, 0.08], 3),
)
const mesh = new Mesh(source, new MeshBasicMaterial())
const anatomy = structures.find((s) => s.displayName === 'Left humerus')!
sampleMovement(rig, 'idle', 0)
const skinned = skinAnatomyMesh(mesh, anatomy, rig)
rig.skeleton.update()
const rest = skinned.getVertexPosition(0, new Vector3())
assert.ok(
  rest.distanceTo(new Vector3(0.17, 1.3, 0.075)) < 1e-6,
  'Bind pose preserves source coordinates',
)
const length = skinned
  .getVertexPosition(0, new Vector3())
  .distanceTo(skinned.getVertexPosition(2, new Vector3()))
sampleMovement(rig, 'wheel', 0)
rig.skeleton.update()
assert.ok(
  Math.abs(
    skinned
      .getVertexPosition(0, new Vector3())
      .distanceTo(skinned.getVertexPosition(2, new Vector3())) - length,
  ) < 1e-6,
  'Each source bone remains rigid',
)
for (const action of ['wheel', 'moonwalk', 'cartwheel'] as const) {
  sampleMovement(rig, action, 2.7)
  rig.skeleton.update()
  updateSkinBounds(skinned)
  for (let i = 0; i < 3; i++)
    assert.ok(
      skinned.boundingSphere.containsPoint(skinned.getVertexPosition(i, new Vector3())),
      'Moving bounds contain every posed vertex',
    )
}
assert.equal(source.getAttribute('skinIndex'), undefined, 'Cached source geometry is unchanged')
for (const action of ['wheel', 'moonwalk', 'cartwheel'] as const) {
  store.getState().setBodyAction(action)
  assert.equal(store.getState().cameraRequest.kind, 'performance')
  store.getState().reset()
  assert.equal(store.getState().bodyAction, 'idle')
}
store.getState().setBodyAction('moonwalk')
const serial = store.getState().actionSerial
store.getState().setBodyAction('moonwalk')
assert.ok(store.getState().actionSerial > serial, 'Repeated clip requests restart')
store.getState().setMode('glide')
assert.equal(store.getState().bodyAction, 'idle')
store.getState().setMode('explore')
advanceMovement(rig, 'idle', 0, 0.1, true)
const chestSource = new BufferGeometry()
chestSource.setAttribute(
  'position',
  new Float32BufferAttribute([0.04, 1.3, 0.12, 0.1, 1.3, 0.12, 0.2, 1.3, 0.12], 3),
)
const chestMuscle = structures.find(
  (s) => s.displayName === 'Clavicular part of left pectoralis major',
)!
sampleMovement(rig, 'idle', 0)
const chest = skinAnatomyMesh(new Mesh(chestSource, new MeshBasicMaterial()), chestMuscle, rig)
sampleMovement(rig, 'cartwheel', CARTWHEEL_SECONDS / 2)
rig.skeleton.update()
const origin = new Vector3(0.04, 1.3, 0.12).applyMatrix4(
  new Matrix4().multiplyMatrices(rig.bones[3].matrixWorld, rig.skeleton.boneInverses[3]),
)
assert.ok(
  chest.getVertexPosition(0, new Vector3()).distanceTo(origin) < 1e-6,
  'Pectoral origin stays attached to the rib cage while arms lift',
)
chest.geometry.dispose()
chestSource.dispose()
skinned.geometry.dispose()
source.dispose()
rig.skeleton.dispose()
console.log(
  'Movement checks passed: wheel contacts, head clearance, rigid bones, bind pose, sliding feet, cartwheel inversion and landing, source isolation and reset.',
)
