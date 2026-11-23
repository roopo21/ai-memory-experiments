import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { NodeIO } from '@gltf-transform/core'
import { KHRDracoMeshCompression } from '@gltf-transform/extensions'
import draco3d from 'draco3dgltf'
import { layerSources } from '../src/anatomy/catalogue'
import { diffMeshNames } from '../src/viewer/auditMeshes'
import previewData from '../src/anatomy/generated/previews.json'
import { meshNames, parseGlb, triangleCount, type GlbDocument } from '../asset-pipeline/shared/glb'
import { preloadSets } from '../asset-pipeline/shared/preload-sets'

/** First paint downloads the previews of the opening mode; keep that small enough to land in about a second. */
const STARTUP_PREVIEW_BUDGET_BYTES = 2_500_000

const previews = previewData.previews as Record<
  string,
  { url: string; bytes: number; triangles: number; sourceSha256: string }
>
const sha256 = (buffer: Buffer) => createHash('sha256').update(buffer).digest('hex')
const io = new NodeIO().registerExtensions([KHRDracoMeshCompression]).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
})

/** Decode the geometry as a loader would: every surface must be a valid, lit triangle mesh. */
async function assertDecodes(bytes: Buffer, url: string) {
  const doc = await io.readBinary(new Uint8Array(bytes))
  for (const mesh of doc.getRoot().listMeshes())
    for (const prim of mesh.listPrimitives()) {
      const indices = prim.getIndices()?.getArray()
      const position = prim.getAttribute('POSITION')?.getArray()
      const normal = prim.getAttribute('NORMAL')?.getArray()
      const where = `${url} ${mesh.getName()}`
      assert(indices && position && normal, `${where}: missing indices, positions or normals`)
      assert(indices.length >= 3 && indices.length % 3 === 0, `${where}: malformed triangles`)
      assert.equal(normal.length, position.length, `${where}: normal/position count mismatch`)
      const vertices = position.length / 3
      assert(
        indices.every((i) => i < vertices),
        `${where}: index out of range`,
      )
      assert(
        position.every(Number.isFinite) && normal.every(Number.isFinite),
        `${where}: non-finite`,
      )
    }
}

function boundsByMesh(doc: GlbDocument) {
  const bounds = new Map<string, { min: number[]; max: number[] }>()
  const names = meshNames(doc)
  doc.nodes
    .filter((node) => node.mesh !== undefined)
    .forEach((node, i) => {
      const min = [Infinity, Infinity, Infinity]
      const max = [-Infinity, -Infinity, -Infinity]
      for (const primitive of doc.meshes[node.mesh!].primitives) {
        const accessor = doc.accessors[primitive.attributes.POSITION]
        for (let k = 0; k < 3; k++) {
          min[k] = Math.min(min[k], accessor.min[k])
          max[k] = Math.max(max[k], accessor.max[k])
        }
        assert(doc.accessors[primitive.indices].count >= 3, `${names[i]}: empty preview surface`)
      }
      bounds.set(names[i], { min, max })
    })
  return bounds
}

let worstDrift = 0
for (const layer of layerSources) {
  const entry = previews[layer.url]
  assert(entry, `${layer.url}: no preview. Run npm run build:previews`)
  const source = readFileSync(`public${layer.url}`)
  assert.equal(
    sha256(source),
    entry.sourceSha256,
    `${layer.url} changed since its preview was built. Run npm run build:previews`,
  )
  const bytes = readFileSync(`public${entry.url}`)
  assert.equal(bytes.byteLength, entry.bytes, entry.url)
  await assertDecodes(bytes, entry.url)
  const preview = parseGlb(bytes, entry.url)
  const full = parseGlb(source, layer.url)
  assert.deepEqual(
    diffMeshNames(meshNames(preview), layer.meshes),
    { unmatchedMeshes: [], missingMeshes: [], duplicateMeshes: [] },
    `${entry.url}: preview must carry exactly the layer's structures`,
  )
  const triangles = triangleCount(preview)
  assert.equal(triangles, entry.triangles, entry.url)
  assert(triangles > 0 && triangles < triangleCount(full), `${entry.url}: not simplified`)

  // Same placement and extent as the full surface (builder limit: 2 mm or 2%; this allows for quantization).
  const fullBounds = boundsByMesh(full)
  for (const [name, b] of boundsByMesh(preview)) {
    const f = fullBounds.get(name)!
    const diagonal = Math.hypot(...f.max.map((v, k) => v - f.min[k]))
    const tolerance = Math.max(0.003, diagonal * 0.03)
    for (let k = 0; k < 3; k++) {
      const drift = Math.max(Math.abs(b.min[k] - f.min[k]), Math.abs(b.max[k] - f.max[k]))
      worstDrift = Math.max(worstDrift, drift / tolerance)
      assert(drift <= tolerance, `${entry.url} ${name}: preview drifts ${drift.toFixed(4)} m`)
    }
  }
}

const expected = new Set(layerSources.map((l) => previews[l.url].url))
const listFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? listFiles(join(dir, e.name)) : [join(dir, e.name)],
  )
const orphans = listFiles('public/models/preview')
  .map((file) => file.replace(/^public/, ''))
  .filter((url) => !expected.has(url))
assert.deepEqual(orphans, [], 'Orphaned preview files; run npm run build:previews')

// index.html preloads the previews of whichever mode the page opens in (shared guide links included).
assert.deepEqual(
  previewData.preload,
  preloadSets(),
  'Preload sets no longer match the layers each mode shows. Run npm run build:previews',
)
const bytesOf = (urls: string[], full = false) =>
  urls.reduce((sum, url) => sum + (full ? statSync(`public${url}`).size : previews[url].bytes), 0)
for (const [mode, urls] of Object.entries(previewData.preload))
  assert(
    bytesOf(urls) <= STARTUP_PREVIEW_BUDGET_BYTES,
    `First paint in ${mode} mode needs ${bytesOf(urls)} bytes of previews; budget ${STARTUP_PREVIEW_BUDGET_BYTES}`,
  )
const mb = (bytes: number) => (bytes / 1e6).toFixed(2)
console.log(
  `Preview checks passed: ${layerSources.length} layers current, structures and placement preserved ` +
    `(worst drift ${(worstDrift * 100).toFixed(0)}% of tolerance); first paint ` +
    Object.entries(previewData.preload)
      .map(([mode, urls]) => `${mode} ${mb(bytesOf(urls))} MB (full ${mb(bytesOf(urls, true))} MB)`)
      .join(', ') +
    '.',
)
