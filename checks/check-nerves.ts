import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import nerves from '../src/anatomy/generated/nerves.json'
import selection from '../asset-pipeline/data/nerves-selection.json'
import registration from '../asset-pipeline/data/zanatomy-registration.json'
import { readGlb, meshNames, triangleCount } from '../asset-pipeline/shared/glb'
import { diffMeshNames } from '../src/viewer/auditMeshes'
import { structures, systems } from '../src/anatomy/catalogue'
import { searchStructures } from '../src/anatomy/search'
import { useAnatomyStore as store } from '../src/state/useAnatomyStore'

const manifest = JSON.parse(readFileSync('public/models/nerves-manifest.json', 'utf8')) as {
  registration: typeof registration
  bounds: Record<string, { min: number[]; max: number[] }>
  chunks: typeof nerves.chunks
}
assert.deepEqual(manifest.registration, registration)
assert(registration.pairs >= 90 && registration.residualMm.median < 2, 'Registration gate')
const ids = selection.map((s) => s.id).sort()
assert.deepEqual(nerves.structures.map((s) => s.meshName).sort(), ids)
assert.deepEqual(nerves.chunks.flatMap((c) => c.meshes).sort(), ids)
assert.equal(new Set(ids).size, ids.length)
assert(
  nerves.structures.every((s) => !structures.some((o) => o !== s && o.meshName === s.meshName)),
  'Nerve IDs must not collide with other catalogues',
)
let exported = 0
for (const chunk of nerves.chunks) {
  const doc = readGlb(`public${chunk.url}`)
  assert.deepEqual(diffMeshNames(meshNames(doc), chunk.meshes), {
    unmatchedMeshes: [],
    missingMeshes: [],
    duplicateMeshes: [],
  })
  assert.equal(triangleCount(doc), chunk.overviewTriangles)
  assert(
    chunk.overviewTriangles <= chunk.triangles &&
      chunk.overviewTriangles >= chunk.triangles * 0.999,
  )
  assert.equal(statSync(`public${chunk.url}`).size, chunk.bytes)
  exported += chunk.overviewTriangles
  for (const node of doc.nodes) {
    if (node.mesh === undefined) continue
    const { min, max } = doc.accessors[doc.meshes[node.mesh].primitives[0].attributes.POSITION]
    assert([...min, ...max].every(Number.isFinite))
    assert(min[1] >= -0.02 && max[1] < 2.2, `Metre-scale bounds: ${node.name}`)
  }
}
assert.equal(exported, nerves.report.exportedTriangles)
// Laterality in viewer space: patient-left is +X, matching the skeleton check. A sided nerve must
// reach its own side; a few (the right vagus with its abdominal branches) legitimately cross the midline.
for (const s of nerves.structures) {
  const b = manifest.bounds[s.meshName]
  if (s.displayName.startsWith('Left '))
    assert(b.max[0] > 0.005, `Left structure on +X: ${s.displayName}`)
  if (s.displayName.startsWith('Right '))
    assert(b.min[0] < -0.005, `Right structure on -X: ${s.displayName}`)
}
// Spinal cord sits on the midline inside the vertebral column; the sciatic nerve runs the thigh.
const cord = manifest.bounds.ZA_white_matter_of_spinal_cord
assert(Math.abs((cord.min[0] + cord.max[0]) / 2) < 0.01 && cord.min[1] > 0.95 && cord.max[1] < 1.6)
const sciatic = manifest.bounds.ZA_sciatic_nerve_l
assert(sciatic.min[1] < 0.6 && sciatic.max[1] > 0.85 && sciatic.min[0] > 0)
assert.equal(searchStructures('sciatic nerve')[0].meshName, 'ZA_sciatic_nerve_l')
assert(searchStructures('spinal cord').some((s) => s.meshName === 'ZA_white_matter_of_spinal_cord'))
store.getState().reset()
store.getState().showSystem('nervous')
assert.deepEqual(
  systems.filter((s) => store.getState().layers[s.id].visible).map((s) => s.id),
  ['nervous'],
)
store.getState().selectStructure('ZA_median_nerve_r', { activate: true, focus: true })
assert.equal(store.getState().selectedMesh, 'ZA_median_nerve_r')
assert.equal(store.getState().cameraRequest.kind, 'focus')
store.getState().hideStructure('ZA_median_nerve_r')
assert.equal(store.getState().selectedMesh, null)
store.getState().reset()
console.log(
  `Nerve checks passed: ${nerves.structures.length} Z-Anatomy structures in ${nerves.chunks.length} regions, registration (${registration.pairs} bones, median ${registration.residualMm.median.toFixed(2)} mm), bounds, laterality, search and state.`,
)
