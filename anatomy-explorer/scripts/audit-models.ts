/**
 * Offline mesh audit: compares mesh-bearing node names in each GLB against systems.json.
 * Works on Draco-compressed files too (only the JSON chunk is read).
 * Run: npm run audit:models
 */
import { readFileSync, existsSync } from 'node:fs'
import { diffMeshNames } from '../src/lib/auditMeshes'
import type { Sex } from '../src/data/anatomy'

// three's GLTFLoader sanitises node names; mirror it so names compare equal to runtime.
const sanitize = (n: string) => n.replace(/\s/g, '_').replace(/[[\].:/]/g, '')

function meshNames(path: string): string[] {
  const buf = readFileSync(path)
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error(`${path} is not a GLB`)
  const jsonLen = buf.readUInt32LE(12)
  const json = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'))
  return (json.nodes ?? []).filter((n: { mesh?: number; name?: string }) => n.mesh !== undefined && n.name).map((n: { name: string }) => sanitize(n.name))
}

let bad = 0
for (const sex of ['male', 'female'] as Sex[]) {
  const path = `public/models/${sex}.glb`
  if (!existsSync(path)) { console.warn(`${path}: missing`); bad++; continue }
  const names = meshNames(path)
  const { unmatchedMeshes, missingMeshes } = diffMeshNames(names, sex)
  console.log(`\n${sex}: ${names.length} meshes`)
  if (unmatchedMeshes.length) console.log('  no entry in systems.json:', unmatchedMeshes.join(', '))
  if (missingMeshes.length) console.log('  entry with no mesh:      ', missingMeshes.join(', '))
  if (!unmatchedMeshes.length && !missingMeshes.length) console.log('  OK')
  bad += unmatchedMeshes.length + missingMeshes.length
}
const skeletonNames = meshNames('public/models/male-skeleton.glb')
const skeletonDiff = diffMeshNames(skeletonNames, 'male', 'skeleton')
const duplicateCount = skeletonNames.length - new Set(skeletonNames).size
bad += skeletonDiff.unmatchedMeshes.length + skeletonDiff.missingMeshes.length + duplicateCount
console.log('Skeleton:', skeletonNames.length, 'structures;', skeletonDiff, 'duplicates:', duplicateCount)
process.exit(bad ? 1 : 0)
