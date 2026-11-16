import { structureByMesh } from '../data/anatomy'

export interface MeshAudit {
  unmatchedMeshes: string[]
  missingMeshes: string[]
  duplicateMeshes: string[]
}

export function diffMeshNames(meshNames: Iterable<string>, expected: string[]): MeshAudit {
  const names = [...meshNames]
  const present = new Set(names)
  const wanted = new Set(expected)
  return {
    unmatchedMeshes: [...present]
      .filter((name) => !structureByMesh.has(name) || !wanted.has(name))
      .sort(),
    missingMeshes: expected.filter((name) => !present.has(name)).sort(),
    duplicateMeshes: [...present]
      .filter((name) => names.indexOf(name) !== names.lastIndexOf(name))
      .sort(),
  }
}

export function auditMeshes(
  meshNames: Iterable<string>,
  expected: string[],
  label: string,
): MeshAudit {
  const audit = diffMeshNames(meshNames, expected)
  if (Object.values(audit).some((names) => names.length))
    console.warn(`[mesh-audit:${label}]`, audit)
  else console.info(`[mesh-audit:${label}] OK`)
  return audit
}
