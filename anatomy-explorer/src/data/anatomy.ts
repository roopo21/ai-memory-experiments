import raw from './systems.json'
import skeleton from './skeleton.json'
import muscles from './muscles.json'

export const skeletonReport = skeleton.report
export const muscleReport = muscles.report
export const muscleChunks = muscles.chunks
export type Sex = 'male' | 'female'
export type SystemId = 'skeletal' | 'muscular'

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
export const structures = [...skeleton.structures, ...muscles.structures] as Structure[]
export const systemById = new Map(systems.map((s) => [s.id, s]))
export const structureByMesh = new Map(structures.map((s) => [s.meshName, s]))
export const skeletonNames = skeleton.structures.map((s) => s.meshName)
