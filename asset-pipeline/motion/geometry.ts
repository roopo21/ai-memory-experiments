import assert from 'node:assert/strict'
import { NodeIO } from '@gltf-transform/core'
import { KHRDracoMeshCompression } from '@gltf-transform/extensions'
import draco from 'draco3dgltf'
import { BufferGeometry, Float32BufferAttribute, Mesh } from 'three'
import { createMovementRig, skinAnatomyMesh } from '../../src/motion/movementRig'
import { structureByMesh } from '../../src/anatomy/catalogue'
import { joints } from '../../src/motion/joints'
const io = new NodeIO()
  .registerExtensions([KHRDracoMeshCompression])
  .registerDependencies({ 'draco3d.decoder': await draco.createDecoderModule() })
const rig = createMovementRig()
interface Surface {
  name?: string
  coords: Float32Array
  weights: Float32Array
  indices: Uint16Array
}
async function vertices(file: string, human: boolean): Promise<Surface[]> {
  const doc = (await io.read(file)).getRoot(),
    out: Surface[] = []
  if (human) {
    assert.deepEqual(
      doc
        .listSkins()[0]
        .listJoints()
        .map((j) => j.getName()),
      joints.map((j) => j[0]),
    )
    const prim = doc.listMeshes()[0].listPrimitives()[0]
    const coords = prim.getAttribute('POSITION')!.getArray() as Float32Array,
      weights = prim.getAttribute('WEIGHTS_0')!.getArray() as Float32Array,
      indices = prim.getAttribute('JOINTS_0')!.getArray() as Uint16Array
    for (let i = 0; i < weights.length; i += 4) {
      const ws = weights.slice(i, i + 4)
      assert(Math.abs(ws.reduce((a, b) => a + b, 0) - 1) < 0.00001)
      assert(ws.every((v) => Number.isFinite(v) && v >= 0))
      assert(indices.slice(i, i + 4).every((v) => v < joints.length))
    }
    out.push({ coords, weights, indices })
  } else
    for (const n of doc.listNodes()) {
      const prim = n.getMesh()?.listPrimitives()[0]
      if (!prim) continue
      const pos = prim.getAttribute('POSITION')!,
        coords = pos.getArray() as Float32Array
      const geo = new BufferGeometry().setAttribute(
          'position',
          new Float32BufferAttribute(coords, 3),
        ),
        mesh = skinAnatomyMesh(new Mesh(geo), structureByMesh.get(n.getName()), rig)
      out.push({
        name: n.getName(),
        coords,
        weights: mesh.geometry.getAttribute('skinWeight').array as Float32Array,
        indices: mesh.geometry.getAttribute('skinIndex').array as Uint16Array,
      })
      geo.dispose()
      mesh.geometry.dispose()
    }
  return out
}

const files = new Map<string, Surface[]>()
export async function from(file: string, human = false) {
  let cached = files.get(file)
  if (!cached) {
    cached = await vertices(file, human)
    files.set(file, cached)
  }
  return cached
}
