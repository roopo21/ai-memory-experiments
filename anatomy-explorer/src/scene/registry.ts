import type { Object3D } from 'three'

/**
 * Several meshes can share a structure name while assets stream in: a quick preview, the layer's
 * overview surface and, once selected, the structure's detail surface. The highest tier wins.
 */
export const TIER = { preview: 0, overview: 1, detail: 2 } as const
export type Tier = (typeof TIER)[keyof typeof TIER]

export const meshRegistry = new Map<string, Object3D>()
const entries = new Map<string, Object3D[]>()
let revision = 0
const listeners = new Set<() => void>()
export const registrySnapshot = () => revision
export const subscribeRegistry = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
const notify = () => {
  revision++
  listeners.forEach((fn) => fn())
}
/** `true`/`false` keep the original detail/overview meaning. */
export function registerMeshes(meshes: Object3D[], tier: Tier | boolean = TIER.overview) {
  const rank: Tier = tier === true ? TIER.detail : tier === false ? TIER.overview : tier
  for (const mesh of meshes) {
    mesh.userData.tier = rank
    const list = [...(entries.get(mesh.name) ?? []), mesh].sort(
      (a, b) => a.userData.tier - b.userData.tier,
    )
    entries.set(mesh.name, list)
    meshRegistry.set(mesh.name, list[list.length - 1])
  }
  notify()
  return () => {
    for (const mesh of meshes) {
      const list = (entries.get(mesh.name) ?? []).filter((item) => item !== mesh)
      if (list.length) {
        entries.set(mesh.name, list)
        meshRegistry.set(mesh.name, list[list.length - 1])
      } else {
        entries.delete(mesh.name)
        meshRegistry.delete(mesh.name)
      }
    }
    notify()
  }
}
