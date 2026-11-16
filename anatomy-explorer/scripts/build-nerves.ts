/**
 * Build the Z-Anatomy nerve layer: spinal cord, cranial and peripheral nerves registered onto
 * the BodyParts3D body with the single similarity transform in zanatomy-registration.json.
 * Full-resolution surfaces are shipped per region (no simplification: nerves are thin tubes).
 */
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { NodeIO, type Node } from '@gltf-transform/core'
import { KHRDracoMeshCompression } from '@gltf-transform/extensions'
import draco3d from 'draco3dgltf'
import {
  Box3,
  BufferAttribute,
  BufferGeometry,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Scene,
  Vector3,
} from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { compressGlb } from './compress-glb'
import { readGlb, triangleCount } from './glb'
import { exportGlb } from './source-geometry'
import selection from './nerves-selection.json'
import excluded from './nerves-excluded.json'
import registration from './zanatomy-registration.json'

const sourceManifest = JSON.parse(readFileSync('assets-src/nerves/manifest.json', 'utf8')) as {
  repository: string
  commit: string
  files: { path: string; url: string; sha256: string; bytes: number }[]
}
const nervousFile = sourceManifest.files.find((f) => f.path === 'models/nervous.glb')!
const bytes = readFileSync('assets-src/nerves/nervous.glb')
if (createHash('sha256').update(bytes).digest('hex') !== nervousFile.sha256)
  throw new Error('Checksum mismatch: models/nervous.glb')
const skeletalFile = sourceManifest.files.find((f) => f.path === 'models/skeletal.glb')!
if (skeletalFile.sha256 !== registration.source.sha256)
  throw new Error('Registration was fitted against a different skeletal export')

const io = new NodeIO().registerExtensions([KHRDracoMeshCompression]).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
})
const document = await io.readBinary(new Uint8Array(bytes))
const nodesByName = new Map<string, Node[]>()
for (const node of document.getRoot().listNodes()) {
  if (!node.getMesh()) continue
  nodesByName.set(node.getName(), [...(nodesByName.get(node.getName()) ?? []), node])
}

const { scale, translation } = registration
const sourceUrl = `https://github.com/${sourceManifest.repository}/blob/${sourceManifest.commit}/public/models/nervous.glb`

/** Node geometry in viewer space: node world matrix, then the shared similarity transform. */
function geometryOf(node: Node): BufferGeometry {
  const world = new Matrix4().fromArray(node.getWorldMatrix())
  const positions: number[] = []
  const indices: number[] = []
  const v = new Vector3()
  for (const primitive of node.getMesh()!.listPrimitives()) {
    const offset = positions.length / 3
    const array = primitive.getAttribute('POSITION')!.getArray()!
    for (let i = 0; i < array.length; i += 3) {
      v.set(array[i], array[i + 1], array[i + 2]).applyMatrix4(world)
      positions.push(
        v.x * scale + translation[0],
        v.y * scale + translation[1],
        v.z * scale + translation[2],
      )
    }
    const index = primitive.getIndices()!.getArray()!
    for (let i = 0; i < index.length; i++) indices.push(index[i] + offset)
  }
  let geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.setIndex(indices)
  geometry = mergeVertices(geometry, 1e-7)
  geometry.computeVertexNormals()
  return geometry
}

const structures: object[] = []
const chunks: {
  region: string
  url: string
  systems: string[]
  meshes: string[]
  triangles: number
  overviewTriangles: number
  bytes: number
}[] = []
const bounds: Record<string, { min: number[]; max: number[] }> = {}
mkdirSync('public/models/nerves', { recursive: true })
const residual = registration.residualMm.median.toFixed(1)
for (const region of [...new Set(selection.map((row) => row.region))]) {
  const scene = new Scene()
  const rows = selection.filter((row) => row.region === region)
  let triangles = 0
  for (const row of rows) {
    const nodes = nodesByName.get(row.source) ?? []
    if (nodes.length !== 1)
      throw new Error(`Expected one node named ${row.source}, found ${nodes.length}`)
    const geometry = geometryOf(nodes[0])
    const sourceTriangles = nodes[0]
      .getMesh()!
      .listPrimitives()
      .reduce((n, p) => n + p.getIndices()!.getCount() / 3, 0)
    if (sourceTriangles !== row.triangles) throw new Error(`Triangle count changed: ${row.source}`)
    triangles += sourceTriangles
    const mesh = new Mesh(geometry, new MeshStandardMaterial({ color: '#e8cf72', roughness: 0.7 }))
    mesh.name = row.id
    scene.add(mesh)
    const box = new Box3().setFromObject(mesh)
    bounds[row.id] = { min: box.min.toArray(), max: box.max.toArray() }
    const cranial = region === 'Cranial nerves'
    structures.push({
      meshName: row.id,
      displayName: row.name,
      systems: ['nervous'],
      sex: 'male',
      region,
      source: sourceUrl,
      kind: region === 'Spinal cord' ? 'spinal cord structure' : 'nerve',
      description: `${row.name}, represented by the Z-Anatomy surface "${row.source}" (a derivative of BodyParts3D). It is placed on this body by one uniform similarity transform fitted to ${registration.pairs} bone landmarks (median residual ${residual} mm). Its course relative to muscles and vessels has not been independently reviewed.`,
      facts: [
        `Z-Anatomy structure: ${row.source}`,
        `Region: ${region}`,
        `Surface: ${sourceTriangles.toLocaleString('en-US')} triangles`,
        `Z-Anatomy glTF export (CC BY-SA 4.0), pinned commit ${sourceManifest.commit.slice(0, 7)}.`,
        ...(cranial
          ? [
              'Cranial nerve geometry adapted by Z-Anatomy from "Cranial Nerves and Foramina", University of Dundee CAHID (CC BY 4.0).',
            ]
          : []),
      ],
    })
  }
  const size = new Box3().setFromObject(scene).getSize(new Vector3())
  if (!Number.isFinite(size.length()) || size.y > 2.2) throw new Error('Invalid geometry bounds')
  const raw = await exportGlb(scene)
  const glb = await compressGlb(raw)
  const url = `/models/nerves/${region.toLowerCase().replaceAll(' ', '-')}.glb`
  writeFileSync(`public${url}`, Buffer.from(glb))
  chunks.push({
    region,
    url,
    systems: ['nervous'],
    meshes: rows.map((row) => row.id),
    triangles,
    overviewTriangles: triangleCount(readGlb(`public${url}`)),
    bytes: glb.byteLength,
  })
  for (const child of scene.children) {
    const mesh = child as Mesh
    mesh.geometry.dispose()
    ;(mesh.material as MeshStandardMaterial).dispose()
  }
  console.log(
    `Built ${region}: ${rows.length} structures, ${triangles.toLocaleString('en-US')} triangles, ${glb.byteLength.toLocaleString('en-US')} bytes`,
  )
}
const report = {
  structures: structures.length,
  triangles: chunks.reduce((n, c) => n + c.triangles, 0),
  exportedTriangles: chunks.reduce((n, c) => n + c.overviewTriangles, 0),
  bytes: chunks.reduce((n, c) => n + c.bytes, 0),
  compression: 'Draco 16-bit position / 12-bit normal quantization; no simplification',
  source: 'Z-Anatomy per-system glTF export (nqwrc/3d-anatomy), derived from BodyParts3D',
  repository: sourceManifest.repository,
  commit: sourceManifest.commit,
  registration,
  coverage:
    'Spinal cord with grey-matter columns and white-matter tracts, spinal roots and ganglia, cauda equina, cranial nerves I and III to XII with major branches, brachial plexus and upper limb nerves, sympathetic trunk, intercostal and lumbosacral nerves, lower limb nerves. Brain structures and the optic nerves remain the BodyParts3D selection.',
  limitations: [
    'Registered by one similarity transform fitted to bone centres; nerve courses relative to muscles and vessels are not independently reviewed.',
    'Z-Anatomy groups some nerves (for example all intercostal nerves per side) into one surface; no synthetic splitting.',
    `${excluded.length} source nodes (brain, brainstem, eye and inner-ear structures) are intentionally not imported.`,
  ],
}
writeFileSync(
  'src/data/nerves.json',
  JSON.stringify({ structures, chunks, report }, null, 2) + '\n',
)
writeFileSync(
  'public/models/nerves-manifest.json',
  JSON.stringify(
    { ...report, chunks, sourceFiles: sourceManifest.files, selection, excluded, bounds },
    null,
    2,
  ) + '\n',
)
console.log(report)
