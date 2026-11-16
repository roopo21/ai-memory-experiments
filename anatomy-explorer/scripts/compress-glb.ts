import { NodeIO } from '@gltf-transform/core'
import { KHRDracoMeshCompression } from '@gltf-transform/extensions'
import { MeshoptSimplifier } from 'meshoptimizer'
import { draco, simplify } from '@gltf-transform/functions'
import draco3d from 'draco3dgltf'
const io = new NodeIO().registerExtensions([KHRDracoMeshCompression]).registerDependencies({
  'draco3d.encoder': await draco3d.createEncoderModule(),
})
export async function compressGlb(buffer: ArrayBuffer, overview = false): Promise<Uint8Array> {
  const doc = await io.readBinary(new Uint8Array(buffer))
  if (overview) {
    await MeshoptSimplifier.ready
    await doc.transform(simplify({ simplifier: MeshoptSimplifier, ratio: 0.12, error: 0.001 }))
  }
  await doc.transform(
    draco({
      method: 'edgebreaker',
      quantizePosition: 16,
      quantizeNormal: 12,
      encodeSpeed: 5,
      decodeSpeed: 5,
    }),
  )
  return io.writeBinary(doc)
}
