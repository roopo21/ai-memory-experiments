import raw from './systems.json'
import skeleton from './generated/skeleton.json'
import muscles from './generated/muscles.json'
import organs from './generated/organs.json'
import nerves from './generated/nerves.json'
export const organReport = organs.report
export const nerveReport = nerves.report
/** Every on-demand system layer: BodyParts3D organ selections plus the Z-Anatomy nerve layer. */
export const systemChunks = [...organs.chunks, ...nerves.chunks]

export const skeletonReport = skeleton.report
export const muscleReport = muscles.report
export const muscleChunks = muscles.chunks
export type Sex = 'male' | 'female'
export type SystemId = 'skeletal' | 'muscular' | 'nervous'

export interface System {
  id: SystemId
  name: string
  color: string
  icon: string
  description: string
}

export interface Structure {
  meshName: string
  region: string
  source: string
  detailUrl?: string
  displayName: string
  systems: SystemId[]
  sex: Sex
  description: string
  facts: string[]
}

/** Only shipped source anatomy belongs in the runtime catalogue. */
export const systems = raw.systems as System[]
export const structures = [
  ...skeleton.structures,
  ...muscles.structures,
  ...organs.structures,
  ...nerves.structures,
] as Structure[]
export const systemById = new Map(systems.map((s) => [s.id, s]))
export const structureByMesh = new Map(structures.map((s) => [s.meshName, s]))
export const skeletonNames = skeleton.structures.map((s) => s.meshName)
export const skeletonUrl = '/models/male-skeleton.glb'

/** Systems shown when the viewer opens; their layers are preloaded from index.html. */
export const DEFAULT_VISIBLE_SYSTEMS: readonly SystemId[] = ['skeletal', 'muscular']

/** One GLB that renders a whole layer (or one region of it), as opposed to a per-structure detail file. */
export interface LayerSource {
  url: string
  region: string
  systems: SystemId[]
  meshes: string[]
}

export const layerSources: LayerSource[] = [
  { url: skeletonUrl, region: 'Skeleton', systems: ['skeletal'], meshes: skeletonNames },
  ...muscleChunks.map((c) => ({
    url: c.url,
    region: c.region,
    systems: ['muscular'] as SystemId[],
    meshes: c.meshes,
  })),
  ...systemChunks.map((c) => ({
    url: c.url,
    region: c.region,
    systems: c.systems as SystemId[],
    meshes: c.meshes,
  })),
]

/**
 * Layer GLBs the viewer mounts for a visibility state. Bones stay mounted (their layer fades),
 * muscles follow the region filter, and other systems load on demand.
 */
export function mountedLayerSources(
  visible: (id: SystemId) => boolean,
  muscleRegion: string | null = null,
) {
  return layerSources.filter((layer) => {
    if (layer.systems.includes('skeletal')) return true
    if (layer.systems.includes('muscular'))
      return visible('muscular') && (!muscleRegion || layer.region === muscleRegion)
    return layer.systems.some(visible)
  })
}
