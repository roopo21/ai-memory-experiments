import type { Object3D } from 'three'
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
export function registerMeshes(meshes: Object3D[], detail = false) {
  for (const mesh of meshes) {
    mesh.userData.detail = detail
    const list = [...(entries.get(mesh.name) ?? []), mesh].sort(
      (a, b) => Number(a.userData.detail) - Number(b.userData.detail),
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
