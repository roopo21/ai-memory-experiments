import { structureByMesh, structuresForSex, type Sex, type ModelMode } from '../data/anatomy'

export interface MeshAudit {
  /** Meshes present in the model that have no entry in systems.json. */
  unmatchedMeshes: string[]
  /** systems.json entries (applicable to this sex) with no mesh in the model. */
  missingMeshes: string[]
}

/** Pure diff between a model's mesh names and the data file. */
export function diffMeshNames(meshNames: Iterable<string>, sex: Sex, mode: ModelMode = 'overview'): MeshAudit {
  const present = new Set(meshNames)
  return {
    unmatchedMeshes: [...present].filter((n) => !structureByMesh.has(n)).sort(),
    missingMeshes: structuresForSex(sex, mode)
      .map((s) => s.meshName)
      .filter((n) => !present.has(n))
      .sort(),
  }
}

/** Runs the diff and logs findings to the console. Returns the audit for tests/UI. */
export function auditMeshes(meshNames: Iterable<string>, sex: Sex, label: string = sex, mode: ModelMode = 'overview'): MeshAudit {
  const audit = diffMeshNames(meshNames, sex, mode)
  const { unmatchedMeshes, missingMeshes } = audit
  if (!unmatchedMeshes.length && !missingMeshes.length) {
    console.info(`[mesh-audit:${label}] OK: every mesh has an entry and every entry has a mesh.`)
    return audit
  }
  console.groupCollapsed(
    `[mesh-audit:${label}] ${unmatchedMeshes.length} unmatched mesh(es), ${missingMeshes.length} entry(ies) without a mesh`,
  )
  if (unmatchedMeshes.length) console.warn('Meshes with NO entry in systems.json:', unmatchedMeshes)
  if (missingMeshes.length) console.warn('systems.json entries with NO mesh in the model:', missingMeshes)
  console.groupEnd()
  return audit
}
