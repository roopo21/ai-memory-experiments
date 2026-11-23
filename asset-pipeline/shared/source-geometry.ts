import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { Mesh, MeshStandardMaterial, type Object3D } from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import transform from '../data/source-transform.json'

class NodeFileReader {
  result: ArrayBuffer | null = null
  onloadend: (() => void) | null = null
  readAsArrayBuffer(blob: Blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = buffer
      this.onloadend?.()
    })
  }
}
;(globalThis as unknown as { FileReader: unknown }).FileReader = NodeFileReader

export interface SourceFile {
  id: string
  name: string
  sha256: string
  url: string
  triangles: number
  kind: string
}

const loader = new STLLoader()

/** Every system uses this same rigid transform. Never center structures independently. */
export function loadSourceMesh(directory: string, source: SourceFile, color: string): Mesh {
  const bytes = readFileSync(`${directory}/${source.id}.stl`)
  if (createHash('sha256').update(bytes).digest('hex') !== source.sha256)
    throw new Error(`Checksum mismatch: ${source.id}`)
  let geometry = loader.parse(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  )
  geometry.rotateX(transform.rotationX)
  geometry.scale(transform.scale, transform.scale, transform.scale)
  geometry.translate(0, transform.groundOffsetMetres, 0)
  geometry.deleteAttribute('normal')
  geometry = mergeVertices(geometry, 1e-7)
  geometry.computeVertexNormals()
  const mesh = new Mesh(geometry, new MeshStandardMaterial({ color, roughness: 0.7 }))
  mesh.name = source.id
  return mesh
}

export async function exportGlb(scene: Object3D): Promise<ArrayBuffer> {
  return (await new GLTFExporter().parseAsync(scene, { binary: true })) as ArrayBuffer
}
