import raw from './systems.json'
import skeleton from './skeleton.json'
export type ModelMode = 'overview' | 'skeleton'
export const skeletonReport = skeleton.report

export type Sex = 'male' | 'female'
export type SystemId =
  | 'integumentary' | 'skeletal' | 'muscular' | 'nervous' | 'endocrine' | 'cardiovascular'
  | 'lymphatic' | 'immune' | 'respiratory' | 'digestive' | 'urinary' | 'reproductive'

type Vec3 = [number, number, number]

export interface System {
  id: SystemId
  name: string
  color: string
  icon: string
  description: string
  camera: { position: Vec3; target: Vec3 }
  meshNames: string[]
}

export interface Structure {
  meshName: string
  model?: ModelMode
  region?: string
  source?: string
  displayName: string
  systems: SystemId[]
  /** Present only for sex-specific anatomy; omitted = both. */
  sex?: Sex
  description: string
  facts: string[]
}

export const systems = raw.systems as System[]
export const structures = [...raw.structures, ...skeleton.structures] as Structure[]

export const systemById = new Map(systems.map((s) => [s.id, s]))
export const structureByMesh = new Map(structures.map((s) => [s.meshName, s]))

export const structuresForSex = (sex: Sex, mode: ModelMode = 'overview') => structures.filter((s) => (!s.sex || s.sex === sex) && (s.model ?? 'overview') === mode)
