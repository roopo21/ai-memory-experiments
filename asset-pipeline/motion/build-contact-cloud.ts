import { format, resolveConfig } from 'prettier'
/** Store support vertices in bind coordinates (mm). Both costumes share one stage and root. */
import { writeFile } from 'node:fs/promises'
import { NodeIO } from '@gltf-transform/core'
import { KHRDracoMeshCompression } from '@gltf-transform/extensions'
import draco from 'draco3dgltf'
import { BufferGeometry, Float32BufferAttribute, Mesh } from 'three'
import { structureByMesh } from '../../src/anatomy/catalogue'
import { createMovementRig, skinAnatomyMesh } from '../../src/motion/movementRig'
import { joints } from '../../src/motion/joints'
const rig = createMovementRig(),
  io = new NodeIO()
    .registerExtensions([KHRDracoMeshCompression])
    .registerDependencies({ 'draco3d.decoder': await draco.createDecoderModule() })
const directions = Array.from({ length: 64 }, (_, i) => {
  const y = 1 - (2 * (i + 0.5)) / 64,
    r = Math.sqrt(1 - y * y),
    a = i * Math.PI * (3 - Math.sqrt(5))
  return [Math.cos(a) * r, y, Math.sin(a) * r]
})
directions.push([1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1])
const points = joints.map(() => new Map<string, number[]>()),
  maxima = joints.map(() => directions.map(() => -Infinity)),
  selected = joints.map(() => directions.map(() => ''))
for (const [file, human] of [
  ['public/models/male-skeleton.glb', false],
  ['public/models/preview/male-skeleton.glb', false],
  ['src/motion/studio/assets/performer.glb', true],
] as const) {
  const doc = (await io.read(file)).getRoot()
  for (const n of doc.listNodes()) {
    const prim = n.getMesh()?.listPrimitives()[0]
    if (!prim) continue
    const pos = prim.getAttribute('POSITION')!
    const geo = new BufferGeometry().setAttribute(
      'position',
      new Float32BufferAttribute(pos.getArray()!, 3),
    )
    const mesh = human
      ? null
      : skinAnatomyMesh(new Mesh(geo), structureByMesh.get(n.getName()), rig)
    const ids = human
      ? prim.getAttribute('JOINTS_0')!.getArray()!
      : mesh!.geometry.getAttribute('skinIndex').array
    const ws = human
      ? prim.getAttribute('WEIGHTS_0')!.getArray()!
      : mesh!.geometry.getAttribute('skinWeight').array
    for (let i = 0; i < pos.getCount(); i++) {
      const k = i * 4,
        p = pos.getElement(i, []),
        j = ws[k + 1] > ws[k] ? ids[k + 1] : ids[k],
        best = maxima[j],
        sel = selected[j]
      for (let d = 0; d < directions.length; d++) {
        const v = directions[d],
          dot = v[0] * p[0] + v[1] * p[1] + v[2] * p[2]
        if (dot > best[d]) {
          best[d] = dot
          const packed = p.map((x) => Math.round(x * 1000))
          const key = packed.join(',')
          sel[d] = key
          points[j].set(key, packed)
        }
      }
    }
    geo.dispose()
    mesh?.geometry.dispose()
  }
}
const groups = selected.map((keys, j) =>
  [...new Set(keys)].filter(Boolean).flatMap((k) => points[j].get(k)!),
)
const output = 'src/motion/studio/guides/contact-cloud.json'
await writeFile(
  output,
  await format(JSON.stringify(groups), { ...(await resolveConfig(output)), filepath: output }),
)
console.log(
  groups.reduce((n, g) => n + g.length / 3, 0) +
    ' surface witnesses across ' +
    groups.length +
    ' joints.',
)
