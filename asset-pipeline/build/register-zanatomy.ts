/**
 * Fit the Z-Anatomy body onto the shipped BodyParts3D skeleton with one uniform similarity
 * transform (scale + translation; both exports are metre-scale and Y-up). Correspondences are
 * bounding-box centres of bones present in both catalogues. Writes asset-pipeline/data/zanatomy-registration.json.
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { NodeIO, getBounds } from '@gltf-transform/core'
import { KHRDracoMeshCompression } from '@gltf-transform/extensions'
import draco3d from 'draco3dgltf'
import skeleton from '../../src/anatomy/generated/skeleton.json'
import { readGlb } from '../shared/glb'

const io = new NodeIO().registerExtensions([KHRDracoMeshCompression]).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
})
const sourcePath = 'assets-src/nerves/skeletal.glb'
const sourceBytes = readFileSync(sourcePath)
const document = await io.readBinary(new Uint8Array(sourceBytes))
const sourceCentres = new Map<string, number[]>()
for (const node of document.getRoot().listNodes()) {
  if (!node.getMesh()) continue
  const { min, max } = getBounds(node)
  const side = /\.(l|r)$/.exec(node.getName())
  const base = node.getName().replace(/\.(l|r)$/, '')
  const name = side
    ? `${side[1] === 'l' ? 'left' : 'right'} ${base.toLowerCase()}`
    : base.toLowerCase()
  sourceCentres.set(
    name,
    [0, 1, 2].map((i) => (min[i] + max[i]) / 2),
  )
}

const target = readGlb('public/models/male-skeleton.glb')
const nameById = new Map(skeleton.structures.map((s) => [s.meshName, s.displayName.toLowerCase()]))
const pairs: { name: string; source: number[]; target: number[] }[] = []
for (const node of target.nodes) {
  if (node.mesh === undefined || !node.name) continue
  const name = nameById.get(node.name)
  const source = name && sourceCentres.get(name)
  if (!source) continue
  const { min, max } = target.accessors[target.meshes[node.mesh].primitives[0].attributes.POSITION]
  pairs.push({ name, source, target: [0, 1, 2].map((i) => (min[i] + max[i]) / 2) })
}
if (pairs.length < 50) throw new Error(`Only ${pairs.length} bone correspondences`)

const mean = (rows: number[][]) =>
  [0, 1, 2].map((i) => rows.reduce((n, r) => n + r[i], 0) / rows.length)
const ms = mean(pairs.map((p) => p.source))
const mt = mean(pairs.map((p) => p.target))
let numerator = 0
let denominator = 0
for (const p of pairs)
  for (const i of [0, 1, 2]) {
    numerator += (p.source[i] - ms[i]) * (p.target[i] - mt[i])
    denominator += (p.source[i] - ms[i]) ** 2
  }
const scale = numerator / denominator
const translation = [0, 1, 2].map((i) => mt[i] - scale * ms[i])
const residuals = pairs
  .map((p) => ({
    name: p.name,
    mm:
      Math.hypot(...[0, 1, 2].map((i) => scale * p.source[i] + translation[i] - p.target[i])) *
      1000,
  }))
  .sort((a, b) => a.mm - b.mm)
const at = (q: number) =>
  residuals[Math.min(residuals.length - 1, Math.floor(residuals.length * q))].mm
const registration = {
  method:
    'Uniform scale and translation fitted by least squares to bounding-box centres of bones present in both the Z-Anatomy skeletal export and the shipped BodyParts3D skeleton. No rotation (both are Y-up metre exports) and no per-structure adjustment.',
  source: {
    file: 'models/skeletal.glb',
    sha256: createHash('sha256').update(sourceBytes).digest('hex'),
  },
  target: 'public/models/male-skeleton.glb',
  scale,
  translation,
  pairs: pairs.length,
  residualMm: { median: at(0.5), p90: at(0.9), max: residuals[residuals.length - 1].mm },
  worst: residuals.slice(-5).reverse(),
}
if (registration.residualMm.median > 2 || registration.residualMm.p90 > 8)
  throw new Error(`Registration residuals too large: ${JSON.stringify(registration.residualMm)}`)
writeFileSync(
  'asset-pipeline/data/zanatomy-registration.json',
  JSON.stringify(registration, null, 2) + '\n',
)
console.log(
  `Registered Z-Anatomy to BodyParts3D: scale ${scale.toFixed(5)}, translation ${translation.map((v) => v.toFixed(4)).join(', ')}; ${pairs.length} bones, median ${at(0.5).toFixed(2)} mm, p90 ${at(0.9).toFixed(2)} mm, max ${registration.residualMm.max.toFixed(1)} mm (${registration.worst[0].name}).`,
)
