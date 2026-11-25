import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { Scene, Mesh, MeshStandardMaterial, Box3, Vector3 } from 'three'
import transform from '../data/source-transform.json'
import { compressGlb } from '../shared/compress-glb'
import { readGlb, triangleCount } from '../shared/glb'
import { loadSourceMesh, exportGlb, type SourceFile } from '../shared/source-geometry'
const manifest = JSON.parse(readFileSync('assets-src/organs/manifest.json', 'utf8'))
const files = manifest.files as (SourceFile & { region: string; systems: string[] })[]
if (
  !files.length ||
  files.some((row) => row.systems.length !== 1 || row.systems[0] !== 'nervous')
) {
  throw new Error('Refresh the nervous system sources with npm run fetch:organs before building.')
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
const exports: { id: string; triangles: number; bytes: number }[] = []
rmSync('public/models/organs', { recursive: true, force: true })
mkdirSync('public/models/organs/detail', { recursive: true })
for (const region of [...new Set(files.map((f) => f.region))]) {
  const scene = new Scene()
  const selected = files.filter((f) => f.region === region)
  for (const r of selected) {
    const mesh = loadSourceMesh('assets-src/organs', r, '#a6514d')
    const single = new Scene()
    single.add(mesh)
    const detailRaw = await exportGlb(single)
    const detail = await compressGlb(detailRaw)
    writeFileSync(`public/models/organs/detail/${r.id}.glb`, Buffer.from(detail))
    exports.push({
      id: r.id,
      triangles: triangleCount(readGlb(`public/models/organs/detail/${r.id}.glb`)),
      bytes: detail.byteLength,
    })
    scene.add(mesh)
    const displayName = r.name[0].toUpperCase() + r.name.slice(1)
    structures.push({
      meshName: r.id,
      displayName,
      systems: r.systems,
      sex: 'male',
      region,
      source: r.url,
      detailUrl: `/models/organs/detail/${r.id}.glb`,
      kind: r.kind,
      description: `${displayName}, represented by the BodyParts3D adult male source surface. Its original position is preserved relative to the skeleton; organ relationships and anatomical landmarks have not been independently reviewed.`,
      facts: [
        `Source identifier: ${r.id}`,
        `Region: ${region}`,
        `Source surface: ${r.triangles.toLocaleString('en-US')} triangles`,
        'BodyParts3D 3.0 (95% polygon reduction).',
      ],
    })
  }
  const size = new Box3().setFromObject(scene).getSize(new Vector3())
  if (!Number.isFinite(size.length()) || size.y > 2.2) throw new Error('Invalid geometry bounds')
  const raw = await exportGlb(scene)
  const glb = await compressGlb(raw, true)
  const url = `/models/organs/${region.toLowerCase().replaceAll(' ', '-')}.glb`
  writeFileSync(`public${url}`, Buffer.from(glb))
  chunks.push({
    region,
    url,
    systems: [...new Set(selected.flatMap((f) => f.systems))],
    meshes: selected.map((f) => f.id),
    triangles: selected.reduce((n, f) => n + f.triangles, 0),
    overviewTriangles: triangleCount(readGlb(`public${url}`)),
    bytes: glb.byteLength,
  })
  for (const child of scene.children) {
    const mesh = child as Mesh
    mesh.geometry.dispose()
    ;(mesh.material as MeshStandardMaterial).dispose()
  }
  console.log(`Built ${region}: ${selected.length} structures, ${glb.byteLength} overview bytes`)
}
const report = {
  detailTriangles: exports.reduce((n, e) => n + e.triangles, 0),
  detailBytes: exports.reduce((n, e) => n + e.bytes, 0),
  overviewTriangles: chunks.reduce((n, c) => n + c.overviewTriangles, 0),
  compression: 'Draco 16-bit position / 12-bit normal quantization',
  overview:
    '12% target triangle ratio, error limit 0.001; source-resolution detail loaded separately on selection',
  source: 'BodyParts3D 3.0, 95% reduction',
  commit: manifest.commit,
  structures: structures.length,
  triangles: files.reduce((n, f) => n + f.triangles, 0),
  bytes: chunks.reduce((n, c) => n + c.bytes, 0),
  transform,
  coverage:
    'Available terminal source structures from the nervous system. Supporting bones and skeletal muscles remain in their existing layers.',
  limitations: [
    'No independent review of organ relationships or anatomical accuracy.',
    'Source groups may contain more than one structure; no synthetic splitting.',
    'Coverage is limited to available source surfaces; peripheral nerves are imported separately.',
  ],
}
writeFileSync(
  'src/anatomy/generated/organs.json',
  JSON.stringify({ structures, chunks, report }, null, 2) + '\n',
)
writeFileSync(
  'public/models/organs-manifest.json',
  JSON.stringify({ ...report, chunks, files, detailExports: exports }, null, 2) + '\n',
)
console.log(report)
