import { readFileSync } from 'node:fs'

export interface GlbDocument {
  nodes: { name?: string; mesh?: number }[]
  meshes: { primitives: { indices: number; attributes: { POSITION: number } }[] }[]
  accessors: { count: number; min: number[]; max: number[] }[]
}

/** Read metadata without decoding geometry, including Draco-compressed assets. */
export function readGlb(path: string): GlbDocument {
  return parseGlb(readFileSync(path), path)
}

export function parseGlb(buffer: Buffer, path = 'GLB'): GlbDocument {
  if (
    buffer.readUInt32LE(0) !== 0x46546c67 ||
    buffer.readUInt32LE(4) !== 2 ||
    buffer.readUInt32LE(8) !== buffer.length
  ) {
    throw new Error(`Invalid GLB header: ${path}`)
  }
  const length = buffer.readUInt32LE(12)
  if (buffer.readUInt32LE(16) !== 0x4e4f534a || length + 20 > buffer.length)
    throw new Error(`Invalid GLB JSON: ${path}`)
  return JSON.parse(buffer.subarray(20, 20 + length).toString('utf8'))
}

export function meshNames(document: GlbDocument): string[] {
  // Match GLTFLoader's node-name sanitization.
  return document.nodes
    .filter((node) => node.mesh !== undefined)
    .map((node) => (node.name ?? '').replace(/\s/g, '_').replace(/[[\].:/]/g, ''))
}

export function triangleCount(document: GlbDocument): number {
  return document.meshes.reduce(
    (sum, mesh) =>
      sum +
      mesh.primitives.reduce(
        (count, primitive) => count + document.accessors[primitive.indices].count / 3,
        0,
      ),
    0,
  )
}
