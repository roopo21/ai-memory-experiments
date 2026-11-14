import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { Scene, Mesh, MeshStandardMaterial, Box3, Vector3 } from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
class NodeFileReader {
  result: ArrayBuffer | null = null
  onloadend: null | (() => void) = null
  readAsArrayBuffer(blob: Blob) { blob.arrayBuffer().then(b => { this.result = b; this.onloadend?.() }) }
}
;(globalThis as unknown as { FileReader: unknown }).FileReader = NodeFileReader
const dir = 'assets-src/skeleton'
const manifest = JSON.parse(readFileSync(`${dir}/manifest.json`, 'utf8'))
const scene = new Scene(), loader = new STLLoader()
const region = (n: string) => /tooth/.test(n) ? 'Teeth' : /rib|sternum|manubrium|xiphoid/.test(n) ? 'Thorax' : /vertebra|atlas|axis|sacrum/.test(n) ? 'Spine' : /hip bone/.test(n) ? 'Pelvis' : /toe|foot|metatarsal|talus|calcaneus|cuneiform|cuboid/.test(n) ? 'Feet' : /finger|thumb|metacarpal|scaphoid|lunate|triquetral|pisiform|trapez|capitate|hamate/.test(n) ? 'Hands' : /clavicle|scapula|humerus|radius|ulna/.test(n) ? 'Shoulders and arms' : /femur|tibia|fibula|patella/.test(n) ? 'Legs' : 'Skull and hyoid'
let triangles = 0
const structures = manifest.files.map((r: { id: string; name: string; sha256: string; url: string; triangles: number; kind: string }) => {
  const bytes = readFileSync(`${dir}/${r.id}.stl`)
  if (createHash('sha256').update(bytes).digest('hex') !== r.sha256) throw new Error(`Checksum mismatch: ${r.id}`)
  let g = loader.parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
  // Source: mm, Z superior, X patient-left, Y posterior. A rigid rotation preserves handedness.
  g.rotateX(-Math.PI / 2); g.scale(0.001, 0.001, 0.001)
  g.deleteAttribute('normal'); g = mergeVertices(g, 1e-7); g.computeVertexNormals()
  const m = new Mesh(g, new MeshStandardMaterial({ color: '#e5d5b5', roughness: 0.65 }))
  m.name = r.id; scene.add(m); triangles += r.triangles
  return { meshName: r.id, displayName: r.name[0].toUpperCase() + r.name.slice(1), systems: ['skeletal'], sex: 'male', model: 'skeleton', region: region(r.name), source: r.url, description: `${r.name[0].toUpperCase() + r.name.slice(1)}, as represented in the BodyParts3D adult male dataset. This source-derived surface is provided for anatomical exploration; individual landmarks have not been clinically reviewed.`, facts: [`Source identifier: ${r.id}`, `Region: ${region(r.name)}`, `Source surface: ${r.triangles.toLocaleString('en-US')} triangles`, 'BodyParts3D release 3.0 (95% polygon reduction).'], ...r }
})
const bounds = new Box3().setFromObject(scene)
for (const m of scene.children) { (m as Mesh).geometry.translate(0, -bounds.min.y, 0) }
scene.updateMatrixWorld(true)
const size = new Box3().setFromObject(scene).getSize(new Vector3()).toArray()
mkdirSync('public/models', { recursive: true })
const glb = await new GLTFExporter().parseAsync(scene, { binary: true }) as ArrayBuffer
writeFileSync('public/models/male-skeleton.glb', Buffer.from(glb))
const report = { source: 'BodyParts3D 3.0, 95% polygon reduction; Kevin-Mattheus-Moerman STL mirror', commit: manifest.commit, structures: structures.length, triangles, bytes: glb.byteLength, sizeMetres: size, standardBonesRepresented: 199, teeth: 28, missing: ['Coccyx as a separate structure', 'Six auditory ossicles (left/right malleus, incus, stapes)', 'Four third molars'], notes: ['200 bone concepts include two foot sesamoid groups outside the standard 206 count.', 'Sternum is represented by three selectable parts.', 'No extra subdivision, invented geometry, or anatomical repair applied.'] }
writeFileSync('src/data/skeleton.json', JSON.stringify({ structures, report }, null, 2)+'\n')
writeFileSync('public/models/skeleton-manifest.json', JSON.stringify({ ...report, files: manifest.files }, null, 2)+'\n')
console.log(report)
