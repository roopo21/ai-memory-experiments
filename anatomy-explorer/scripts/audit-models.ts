import assert from 'node:assert/strict'
import { readFileSync, statSync } from 'node:fs'
import { diffMeshNames } from '../src/lib/auditMeshes'
import { structures, skeletonNames, muscleChunks, muscleReport } from '../src/data/anatomy'
import { readGlb, meshNames, triangleCount } from './glb'

const check = (url: string, expected: string[]) => {
  const document = readGlb(`public${url}`)
  const diff = diffMeshNames(meshNames(document), expected)
  assert.deepEqual(diff, { unmatchedMeshes: [], missingMeshes: [], duplicateMeshes: [] }, url)
  return document
}

assert.equal(
  new Set(structures.map((s) => s.meshName)).size,
  structures.length,
  'Catalogue IDs must be unique',
)
check('/models/male-skeleton.glb', skeletonNames)
const muscleNames = structures
  .filter((s) => s.systems.includes('muscular'))
  .map((s) => s.meshName)
  .sort()
assert.deepEqual(
  muscleChunks.flatMap((chunk) => chunk.meshes).sort(),
  muscleNames,
  'Every muscle must belong to exactly one region',
)
let overviewTriangles = 0
for (const chunk of muscleChunks) {
  const document = check(chunk.url, chunk.meshes)
  const triangles = triangleCount(document)
  assert(triangles > 0 && triangles <= chunk.triangles, chunk.region)
  assert.equal(statSync(`public${chunk.url}`).size, chunk.bytes)
  overviewTriangles += triangles
}
const manifest = JSON.parse(readFileSync('public/models/muscles-manifest.json', 'utf8')) as {
  files: { id: string; triangles: number }[]
  transform: unknown
  detailExports: { id: string; triangles: number; bytes: number }[]
}
assert.deepEqual(
  manifest.transform,
  JSON.parse(readFileSync('public/models/skeleton-manifest.json', 'utf8')).transform,
)
const sourceTriangles = new Map(manifest.files.map((file) => [file.id, file.triangles]))
const exported = new Map(manifest.detailExports.map((file) => [file.id, file]))
let detailTriangles = 0
for (const structure of structures.filter((s) => s.detailUrl)) {
  const document = check(structure.detailUrl!, [structure.meshName])
  const triangles = triangleCount(document)
  assert.equal(
    triangles,
    exported.get(structure.meshName)?.triangles,
    `Detail topology: ${structure.meshName}`,
  )
  assert.equal(
    statSync(`public${structure.detailUrl}`).size,
    exported.get(structure.meshName)?.bytes,
  )
  assert(triangles > 0 && triangles <= sourceTriangles.get(structure.meshName)!, structure.meshName)
  for (const mesh of document.meshes)
    for (const primitive of mesh.primitives) {
      const { min, max } = document.accessors[primitive.attributes.POSITION]
      assert([...min, ...max].every(Number.isFinite), structure.meshName)
      assert(min[1] >= -0.02 && max[1] <= 2.2, `Metre-scale bounds: ${structure.meshName}`)
    }
  detailTriangles += triangles
}
assert.equal(detailTriangles, muscleReport.detailTriangles)
assert.equal(
  muscleReport.triangles - detailTriangles,
  26,
  'Pinned compression removes 26 source triangles; investigate any change',
)
assert.equal(overviewTriangles, muscleReport.overviewTriangles)
console.log(
  `Model audit passed: ${skeletonNames.length} skeletal + ${muscleNames.length} muscle structures; ${muscleChunks.length} regions; ${overviewTriangles.toLocaleString()} overview / ${detailTriangles.toLocaleString()} detail muscle triangles.`,
)
