import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { structuresForSex, skeletonReport } from '../src/data/anatomy'
import { searchStructures } from '../src/lib/search'
import { useAnatomyStore } from '../src/store/useAnatomyStore'
const bones = structuresForSex('male', 'skeleton')
assert.equal(bones.length, 231)
assert.equal(bones.filter(b => b.region === 'Hands').length, 54)
assert.equal(bones.filter(b => b.region === 'Skull and hyoid').length, 23)
assert.equal(structuresForSex('female', 'skeleton').length, 0)
assert.equal(new Set(bones.map(b => b.meshName)).size, bones.length)
assert.equal(searchStructures('left femur', 'male', 6, 'skeleton')[0].meshName, 'FMA24475')
assert.equal(searchStructures('liver', 'male', 6, 'skeleton').length, 0)
assert.equal(searchStructures('liver', 'male', 6, 'overview')[0].meshName, 'Liver')
const store = useAnatomyStore
store.getState().selectStructure('FMA24475', { focus: true, activate: true })
assert.equal(store.getState().cameraRequest.kind, 'focus')
store.getState().setIsolated(true)
store.getState().setSex('female')
assert.equal(store.getState().mode, 'overview')
assert.equal(store.getState().selectedMesh, null)
assert.equal(store.getState().isolated, false)
store.getState().setMode('skeleton')
assert.equal(store.getState().sex, 'male')
assert.deepEqual(store.getState().activeSystems, ['skeletal'])
// Validate actual exported positions and triangle counts, including left/right orientation.
const bytes = readFileSync('public/models/male-skeleton.glb')
const len = bytes.readUInt32LE(12)
const gltf = JSON.parse(bytes.subarray(20, 20 + len).toString())
let triangles = 0
for (const node of gltf.nodes.filter((n: {mesh?:number}) => n.mesh !== undefined)) {
  const primitive = gltf.meshes[node.mesh].primitives[0]
  const pos = gltf.accessors[primitive.attributes.POSITION]
  assert(pos.min.every(Number.isFinite) && pos.max.every(Number.isFinite))
  assert(pos.min[1] >= -0.001 && pos.max[1] < 2.2)
  if (node.name === 'FMA24475') assert(pos.min[0] > 0, 'Left femur must be on patient-left (+X)')
  if (node.name === 'FMA24474') assert(pos.max[0] < 0, 'Right femur must be on patient-right (-X)')
  triangles += gltf.accessors[primitive.indices].count / 3
}
assert.equal(triangles, skeletonReport.triangles)
console.log('Skeleton checks passed: selection, search, mode transitions, geometry bounds, laterality, triangle preservation.')
