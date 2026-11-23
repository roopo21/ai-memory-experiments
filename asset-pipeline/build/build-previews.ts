// Builds lightweight preview copies of every layer GLB. The viewer paints these first and swaps in
// the full-quality layer when it arrives, so first paint costs ~1.7 MB instead of ~19 MB.
// Previews keep every mesh name and the shared source transform, so picking, selection, hiding
// and camera framing behave identically; only surface resolution differs.
//
//   npm run build:previews            write public/models/preview/** and src/anatomy/generated/previews.json
//   npm run build:previews -- --dry   report sizes without writing
//
// Previews are derived from the shipped GLBs, so they never need the raw source download.
// Re-run after rebuilding any layer; `npm run check:previews` fails while a preview is stale.
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { NodeIO, type Document, type Primitive } from '@gltf-transform/core'
import { KHRDracoMeshCompression } from '@gltf-transform/extensions'
import { draco, prune, simplifyPrimitive, weld } from '@gltf-transform/functions'
import draco3d from 'draco3dgltf'
import { MeshoptSimplifier } from 'meshoptimizer'
import { layerSources } from '../../src/anatomy/catalogue'
import { meshNames, parseGlb, triangleCount } from '../shared/glb'
import { preloadSets } from '../shared/preload-sets'

/**
 * Simplification is tried per surface from most to least aggressive (ratio = share of triangles
 * to aim for, error = ceiling as a fraction of the surface's radius). A level is rejected when it
 * moves the surface's extent by more than PREVIEW_MAX_DRIFT: quadric simplification can slide
 * vertices along long thin tubes (spinal tracts, tendons) and shorten them without much surface
 * error. If every level fails, the surface ships unsimplified.
 */
const PREVIEW_SETTINGS = {
  levels: [
    { ratio: 0.06, error: 0.01 },
    { ratio: 0.2, error: 0.003 },
    { ratio: 0.5, error: 0.001 },
  ],
  maxDrift: { metres: 0.002, ofSize: 0.02 },
  quantizePosition: 14,
  quantizeNormal: 8,
}
const previewUrlFor = (url: string) => url.replace(/^\/models\//, '/models/preview/')
const dry = process.argv.includes('--dry')

await MeshoptSimplifier.ready
const io = new NodeIO().registerExtensions([KHRDracoMeshCompression]).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(),
  'draco3d.encoder': await draco3d.createEncoderModule(),
})

const extentOf = (prim: Primitive) => {
  const position = prim.getAttribute('POSITION')!
  return { min: position.getMin([]), max: position.getMax([]) }
}
const levelUse = PREVIEW_SETTINGS.levels.map(() => 0)
let keptOriginal = 0

function simplifyWithinDrift(doc: Document, prim: Primitive) {
  // simplifyPrimitive disposes the accessors it replaces, so keep copies to roll back from.
  const indices = prim.getIndices()!.getArray()!.slice()
  const attributes = prim.listSemantics().map((semantic) => {
    const accessor = prim.getAttribute(semantic)!
    return {
      semantic,
      type: accessor.getType(),
      normalized: accessor.getNormalized(),
      array: accessor.getArray()!.slice(),
    }
  })
  const restore = () => {
    const buffer = doc.getRoot().listBuffers()[0]
    prim.setIndices(
      doc.createAccessor().setType('SCALAR').setArray(indices.slice()).setBuffer(buffer),
    )
    for (const a of attributes)
      prim.setAttribute(
        a.semantic,
        doc
          .createAccessor()
          .setType(a.type)
          .setNormalized(a.normalized)
          .setArray(a.array.slice())
          .setBuffer(buffer),
      )
  }
  const ref = extentOf(prim)
  const size = Math.hypot(...ref.max.map((v, k) => v - ref.min[k]))
  const limit = Math.max(PREVIEW_SETTINGS.maxDrift.metres, size * PREVIEW_SETTINGS.maxDrift.ofSize)
  for (const [i, level] of PREVIEW_SETTINGS.levels.entries()) {
    simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, lockBorder: false, ...level })
    const now = extentOf(prim)
    const drift = Math.max(
      ...[0, 1, 2].map((k) =>
        Math.max(Math.abs(now.min[k] - ref.min[k]), Math.abs(now.max[k] - ref.max[k])),
      ),
    )
    if (drift <= limit) {
      levelUse[i]++
      return
    }
    restore()
  }
  keptOriginal++
}

async function buildPreview(source: Buffer): Promise<Buffer> {
  const doc = await io.readBinary(new Uint8Array(source))
  await doc.transform(weld())
  for (const mesh of doc.getRoot().listMeshes())
    for (const prim of mesh.listPrimitives()) simplifyWithinDrift(doc, prim)
  await doc.transform(
    prune(),
    draco({
      method: 'edgebreaker',
      quantizePosition: PREVIEW_SETTINGS.quantizePosition,
      quantizeNormal: PREVIEW_SETTINGS.quantizeNormal,
      encodeSpeed: 5,
      decodeSpeed: 5,
    }),
  )
  return Buffer.from(await io.writeBinary(doc))
}

const sha256 = (buffer: Buffer) => createHash('sha256').update(buffer).digest('hex')

const previews: Record<
  string,
  {
    url: string
    bytes: number
    triangles: number
    sourceBytes: number
    sourceTriangles: number
    sourceSha256: string
  }
> = {}
if (!dry) rmSync('public/models/preview', { recursive: true, force: true })
for (const layer of layerSources) {
  const source = readFileSync(`public${layer.url}`)
  const preview = await buildPreview(source)
  const sourceDoc = parseGlb(source, layer.url)
  const previewDoc = parseGlb(preview, previewUrlFor(layer.url))
  const kept = new Set(meshNames(previewDoc))
  const lost = meshNames(sourceDoc).filter((name) => !kept.has(name))
  if (lost.length) throw new Error(`${layer.url}: simplification removed ${lost.join(', ')}`)
  const url = previewUrlFor(layer.url)
  previews[layer.url] = {
    url,
    bytes: preview.byteLength,
    triangles: triangleCount(previewDoc),
    sourceBytes: source.byteLength,
    sourceTriangles: triangleCount(sourceDoc),
    sourceSha256: sha256(source),
  }
  if (!dry) {
    mkdirSync(dirname(`public${url}`), { recursive: true })
    writeFileSync(`public${url}`, preview)
  }
  const p = previews[layer.url]
  console.log(
    `${layer.url.padEnd(46)} ${(p.sourceBytes / 1e6).toFixed(2).padStart(5)} MB -> ${(p.bytes / 1e3).toFixed(0).padStart(4)} kB` +
      `  ${p.sourceTriangles.toLocaleString().padStart(9)} -> ${p.triangles.toLocaleString().padStart(7)} triangles`,
  )
}

const total = (urls: string[], key: 'bytes' | 'sourceBytes') =>
  urls.reduce((sum, url) => sum + previews[url][key], 0) / 1e6
const preload = preloadSets()
const all = layerSources.map((l) => l.url)
console.log(
  `\nSurfaces per simplification level: ${levelUse.join(' / ')}; kept unsimplified: ${keptOriginal}`,
)
for (const [mode, urls] of Object.entries(preload))
  console.log(
    `First paint, ${mode.padEnd(7)}: ${total(urls, 'sourceBytes').toFixed(2)} MB full -> ${total(urls, 'bytes').toFixed(2)} MB preview`,
  )
console.log(
  `All layers:            ${total(all, 'sourceBytes').toFixed(2)} MB full -> ${total(all, 'bytes').toFixed(2)} MB preview`,
)
if (!dry)
  writeFileSync(
    'src/anatomy/generated/previews.json',
    JSON.stringify({ settings: PREVIEW_SETTINGS, preload, previews }, null, 2) + '\n',
  )
