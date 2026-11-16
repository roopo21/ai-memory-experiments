import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import organs from '../src/data/organs.json'
import transform from './source-transform.json'
import selection from './organs-selection.json'
import { readGlb, meshNames, triangleCount } from './glb'
import { diffMeshNames } from '../src/lib/auditMeshes'
import { systems, type SystemId } from '../src/data/anatomy'
import { useAnatomyStore as store } from '../src/store/useAnatomyStore'
const manifest = JSON.parse(readFileSync('public/models/organs-manifest.json', 'utf8'))
assert.deepEqual(manifest.transform, transform)
assert.deepEqual(organs.structures.map((s) => s.meshName).sort(), selection.map((s) => s.id).sort())
assert.deepEqual(organs.chunks.flatMap((c) => c.meshes).sort(), selection.map((s) => s.id).sort())
for (const chunk of organs.chunks) {
  const doc = readGlb(`public${chunk.url}`)
  assert.deepEqual(diffMeshNames(meshNames(doc), chunk.meshes), {
    unmatchedMeshes: [],
    missingMeshes: [],
    duplicateMeshes: [],
  })
  assert.equal(triangleCount(doc), chunk.overviewTriangles)
  assert.equal(statSync(`public${chunk.url}`).size, chunk.bytes)
}
for (const structure of organs.structures) {
  const doc = readGlb(`public${structure.detailUrl}`)
  assert.deepEqual(meshNames(doc), [structure.meshName])
  assert.equal(
    triangleCount(doc),
    manifest.detailExports.find((r: { id: string }) => r.id === structure.meshName).triangles,
  )
  for (const mesh of doc.meshes)
    for (const primitive of mesh.primitives) {
      const { min, max } = doc.accessors[primitive.attributes.POSITION]
      assert([...min, ...max].every(Number.isFinite))
      assert(min[1] >= -0.02 && max[1] < 2.2)
    }
}
for (const id of [
  'cardiovascular',
  'respiratory',
  'digestive',
  'urinary',
  'nervous',
] as SystemId[]) {
  store.getState().showSystem(id)
  assert.deepEqual(
    systems.filter((s) => store.getState().layers[s.id].visible).map((s) => s.id),
    [id],
  )
  const structure = organs.structures.find((s) => s.systems.includes(id))!
  assert(structure)
  store.getState().selectStructure(structure.meshName, { activate: true, focus: true })
  assert.equal(store.getState().selectedMesh, structure.meshName)
  store.getState().hideStructure(structure.meshName)
  assert.equal(store.getState().selectedMesh, null)
}
store.getState().reset()
console.log(
  `Additional-system checks passed: ${organs.structures.length} structures, five layers, overview/detail assets and shared transform.`,
)
