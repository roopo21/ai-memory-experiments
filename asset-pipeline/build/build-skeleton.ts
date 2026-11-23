import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { Scene, Box3, Vector3 } from 'three'
import transform from '../data/source-transform.json'
import { compressGlb } from '../shared/compress-glb'
import { loadSourceMesh, exportGlb, type SourceFile } from '../shared/source-geometry'
const dir = 'assets-src/skeleton'
const manifest = JSON.parse(readFileSync(`${dir}/manifest.json`, 'utf8'))
const scene = new Scene()
const regions: [RegExp, string][] = [
  [/tooth/, 'Teeth'],
  [/rib|sternum|manubrium|xiphoid/, 'Thorax'],
  [/vertebra|atlas|axis|sacrum/, 'Spine'],
  [/hip bone/, 'Pelvis'],
  [/toe|foot|metatarsal|talus|calcaneus|cuneiform|cuboid/, 'Feet'],
  [/finger|thumb|metacarpal|scaphoid|lunate|triquetral|pisiform|trapez|capitate|hamate/, 'Hands'],
  [/clavicle|scapula|humerus|radius|ulna/, 'Shoulders and arms'],
  [/femur|tibia|fibula|patella/, 'Legs'],
]
const region = (name: string) =>
  regions.find(([pattern]) => pattern.test(name))?.[1] ?? 'Skull and hyoid'
let triangles = 0
const structures = manifest.files.map((r: SourceFile) => {
  scene.add(loadSourceMesh(dir, r, '#e5d5b5'))
  triangles += r.triangles
  return {
    meshName: r.id,
    displayName: r.name[0].toUpperCase() + r.name.slice(1),
    systems: ['skeletal'],
    sex: 'male',
    region: region(r.name),
    source: r.url,
    description: `${r.name[0].toUpperCase() + r.name.slice(1)}, as represented in the BodyParts3D adult male dataset. This source-derived surface is provided for anatomical exploration; individual landmarks have not been clinically reviewed.`,
    facts: [
      `Source identifier: ${r.id}`,
      `Region: ${region(r.name)}`,
      `Source surface: ${r.triangles.toLocaleString('en-US')} triangles`,
      'BodyParts3D release 3.0 (95% polygon reduction).',
    ],
    ...r,
  }
})
scene.updateMatrixWorld(true)
const size = new Box3().setFromObject(scene).getSize(new Vector3()).toArray()
mkdirSync('public/models', { recursive: true })
const raw = await exportGlb(scene)
const glb = await compressGlb(raw)
writeFileSync('public/models/male-skeleton.glb', Buffer.from(glb))
const report = {
  transform,
  compression: 'Draco, 16-bit position / 12-bit normal quantization',
  source: 'BodyParts3D 3.0, 95% polygon reduction; Kevin-Mattheus-Moerman STL mirror',
  commit: manifest.commit,
  structures: structures.length,
  triangles,
  bytes: glb.byteLength,
  sizeMetres: size,
  standardBonesRepresented: 199,
  teeth: 28,
  missing: [
    'Coccyx as a separate structure',
    'Six auditory ossicles (left/right malleus, incus, stapes)',
    'Four third molars',
  ],
  notes: [
    '200 bone concepts include two foot sesamoid groups outside the standard 206 count.',
    'Sternum is represented by three selectable parts.',
    'No extra subdivision, invented geometry, or anatomical repair applied.',
  ],
}
writeFileSync(
  'src/anatomy/generated/skeleton.json',
  JSON.stringify({ structures, report }, null, 2) + '\n',
)
writeFileSync(
  'public/models/skeleton-manifest.json',
  JSON.stringify({ ...report, files: manifest.files }, null, 2) + '\n',
)
console.log(report)
