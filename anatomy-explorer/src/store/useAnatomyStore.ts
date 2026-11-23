import type { BodyAction } from '../scene/movementRig'
import { create } from 'zustand'
import { DEFAULT_VISIBLE_SYSTEMS, structureByMesh, systems, type SystemId } from '../data/anatomy'
import { groupById, groupsByMesh, meshesOf } from '../data/guides/groups'
import type { GroupView, GuideKind, GuideMode } from '../data/guides/types'
import { exerciseById, exerciseMeshes, viewFor } from '../lib/guides'

export interface LayerState {
  visible: boolean
  opacity: number
}
export type CameraRequest =
  | { kind: 'performance'; action: BodyAction; nonce: number }
  | { kind: 'system'; nonce: number; system: SystemId }
  | { kind: 'home'; nonce: number }
  | { kind: 'focus'; nonce: number; meshName: string }
  | { kind: 'meshes'; nonce: number; meshNames: string[]; view: GroupView }

const defaultLayers = () =>
  Object.fromEntries(
    systems.map((s) => [s.id, { visible: DEFAULT_VISIBLE_SYSTEMS.includes(s.id), opacity: 1 }]),
  ) as Record<SystemId, LayerState>

/** Stretches show muscle over bone. Glides show nerves inside a ghosted skeleton. */
export const guideLayers = (kind: GuideKind) =>
  Object.fromEntries(
    systems.map((s) => {
      if (s.id === 'skeletal') return [s.id, { visible: true, opacity: kind === 'glide' ? 0.3 : 1 }]
      const own = kind === 'stretch' ? 'muscular' : 'nervous'
      return [s.id, { visible: s.id === own, opacity: 1 }]
    }),
  ) as Record<SystemId, LayerState>

interface State {
  bodyAction: BodyAction
  actionSerial: number
  setBodyAction: (action: BodyAction) => void
  hiddenMeshes: string[]
  muscleRegion: string | null
  isolated: boolean
  layers: Record<SystemId, LayerState>
  hoveredMesh: string | null
  selectedMesh: string | null
  cameraRequest: CameraRequest
  panelExpanded: boolean
  /** Explore the anatomy, or find stretches or nerve glides for chosen body parts. */
  mode: GuideMode
  /** Selected stretch or glide groups, in the order they were picked. */
  guideGroups: string[]
  activeExercise: string | null
  setMode: (mode: GuideMode) => void
  toggleGuideGroup: (id: string) => void
  /** Click on the body: add every group the mesh belongs to, or remove them if all are selected. */
  toggleGuideMesh: (meshName: string) => void
  /** Double-click on the body: make sure the mesh's groups are selected and frame them. */
  frameGuideMesh: (meshName: string) => void
  clearGuideGroups: () => void
  openExercise: (id: string | null) => void
  /** Jump into a guide from elsewhere (detail card, shared link). */
  startGuide: (kind: GuideKind, groups: string[], exercise?: string) => void
  setMuscleRegion: (region: string | null) => void
  hideStructure: (name: string) => void
  restoreStructures: () => void
  setIsolated: (value: boolean) => void
  showSystem: (id: SystemId) => void
  toggleSystem: (id: SystemId) => void
  setLayerVisible: (id: SystemId, visible: boolean) => void
  setLayerOpacity: (id: SystemId, opacity: number) => void
  hover: (meshName: string | null) => void
  selectStructure: (meshName: string, opts?: { focus?: boolean; activate?: boolean }) => void
  clearSelection: () => void
  recenter: () => void
  reset: () => void
  setPanelExpanded: (value: boolean) => void
}

let nonce = 0
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never
const req = (request: DistributiveOmit<CameraRequest, 'nonce'>): CameraRequest =>
  ({ ...request, nonce: ++nonce }) as CameraRequest

export const useAnatomyStore = create<State>((set, get) => ({
  bodyAction: 'idle',
  actionSerial: 0,
  setBodyAction: (bodyAction) =>
    set((state) => ({
      bodyAction,
      actionSerial: state.actionSerial + 1,
      hoveredMesh: null,
      cameraRequest:
        bodyAction === 'idle'
          ? req({ kind: 'home' })
          : req({ kind: 'performance', action: bodyAction }),
    })),
  hiddenMeshes: [],
  muscleRegion: null,
  isolated: false,
  layers: defaultLayers(),
  hoveredMesh: null,
  selectedMesh: null,
  cameraRequest: req({ kind: 'home' }),
  panelExpanded: false,
  mode: 'explore',
  guideGroups: [],
  activeExercise: null,

  setMode: (mode) =>
    set({
      bodyAction: 'idle',
      mode,
      guideGroups: [],
      activeExercise: null,
      layers: mode === 'explore' ? defaultLayers() : guideLayers(mode),
      selectedMesh: null,
      hoveredMesh: null,
      hiddenMeshes: [],
      isolated: false,
      muscleRegion: null,
      cameraRequest: req({ kind: 'home' }),
    }),
  toggleGuideGroup: (id) => {
    const { mode, guideGroups } = get()
    if (mode === 'explore' || !groupById[mode].has(id)) return
    const next = guideGroups.includes(id)
      ? guideGroups.filter((g) => g !== id)
      : [...guideGroups, id]
    set({ guideGroups: next, activeExercise: null, cameraRequest: frameGroups(mode, next) })
  },
  toggleGuideMesh: (meshName) => {
    const { mode, guideGroups } = get()
    if (mode === 'explore') return
    const ids = groupsByMesh[mode].get(meshName)
    if (!ids) return
    const all = ids.every((id) => guideGroups.includes(id))
    set({
      guideGroups: all
        ? guideGroups.filter((g) => !ids.includes(g))
        : [...guideGroups, ...ids.filter((id) => !guideGroups.includes(id))],
      activeExercise: null,
    })
  },
  frameGuideMesh: (meshName) => {
    const { mode, guideGroups } = get()
    if (mode === 'explore') return
    const ids = groupsByMesh[mode].get(meshName)
    if (!ids) return
    set({
      guideGroups: [...guideGroups, ...ids.filter((id) => !guideGroups.includes(id))],
      activeExercise: null,
      cameraRequest: frameGroups(mode, ids),
    })
  },
  clearGuideGroups: () => set({ guideGroups: [], activeExercise: null }),
  openExercise: (id) => {
    const { mode } = get()
    if (mode === 'explore') return
    const exercise = id ? exerciseById[mode].get(id) : undefined
    if (!exercise) return set({ activeExercise: null })
    set({
      activeExercise: exercise.id,
      hoveredMesh: null,
      cameraRequest: frameExercise(mode, exercise.id),
    })
  },
  startGuide: (kind, groups, exercise) => {
    get().setMode(kind)
    const valid = [...new Set(groups)].filter((id) => groupById[kind].has(id))
    set({ guideGroups: valid, cameraRequest: frameGroups(kind, valid) })
    if (exercise) get().openExercise(exercise)
  },

  setMuscleRegion: (muscleRegion) => set({ muscleRegion, selectedMesh: null, hoveredMesh: null }),
  hideStructure: (name) => {
    if (!structureByMesh.has(name)) return
    set((state) => ({
      hiddenMeshes: [...new Set([...state.hiddenMeshes, name])],
      selectedMesh: state.selectedMesh === name ? null : state.selectedMesh,
      hoveredMesh: null,
    }))
  },
  restoreStructures: () => set({ hiddenMeshes: [] }),
  setIsolated: (isolated) => set({ isolated }),
  showSystem: (id) =>
    set({
      layers: Object.fromEntries(
        systems.map((system) => [system.id, { visible: system.id === id, opacity: 1 }]),
      ) as Record<SystemId, LayerState>,
      selectedMesh: null,
      hoveredMesh: null,
      hiddenMeshes: [],
      isolated: false,
      muscleRegion: null,
      cameraRequest: req({ kind: 'system', system: id }),
    }),
  toggleSystem: (id) => get().setLayerVisible(id, !get().layers[id].visible),
  setLayerVisible: (id, visible) =>
    set((state) => ({
      hoveredMesh: null,
      layers: { ...state.layers, [id]: { ...state.layers[id], visible } },
    })),
  setLayerOpacity: (id, opacity) => {
    if (!Number.isFinite(opacity)) return
    set((state) => ({
      hoveredMesh: null,
      layers: {
        ...state.layers,
        [id]: { ...state.layers[id], opacity: Math.max(0, Math.min(1, opacity)) },
      },
    }))
  },
  hover: (hoveredMesh) => set({ hoveredMesh }),
  selectStructure: (meshName, { focus = false, activate = false } = {}) => {
    const structure = structureByMesh.get(meshName)
    if (!structure) return
    const state = get()
    const patch: Partial<State> = {
      selectedMesh: meshName,
      hoveredMesh: null,
      hiddenMeshes: state.hiddenMeshes.filter((name) => name !== meshName),
    }
    if (activate) {
      patch.layers = { ...state.layers }
      for (const id of structure.systems) {
        patch.layers[id] = { visible: true, opacity: state.layers[id].opacity || 1 }
      }
    }
    if (
      structure.systems.includes('muscular') &&
      state.muscleRegion &&
      structure.region !== state.muscleRegion
    ) {
      patch.muscleRegion = structure.region
    }
    if (focus) patch.cameraRequest = req({ kind: 'focus', meshName })
    set(patch)
  },
  clearSelection: () => set({ selectedMesh: null }),
  recenter: () => {
    const { selectedMesh: selected, mode, activeExercise, guideGroups } = get()
    if (mode !== 'explore')
      return set({
        cameraRequest: activeExercise
          ? frameExercise(mode, activeExercise)
          : frameGroups(mode, guideGroups),
      })
    set({
      cameraRequest: selected ? req({ kind: 'focus', meshName: selected }) : req({ kind: 'home' }),
    })
  },
  reset: () => {
    const { mode } = get()
    if (mode !== 'explore') return get().setMode(mode)
    set({
      bodyAction: 'idle',
      hiddenMeshes: [],
      muscleRegion: null,
      isolated: false,
      layers: defaultLayers(),
      selectedMesh: null,
      hoveredMesh: null,
      cameraRequest: req({ kind: 'home' }),
    })
  },
  setPanelExpanded: (panelExpanded) => set({ panelExpanded }),
}))

/** Frame the given groups from the side that shows most of them, or go home when there are none. */
function frameGroups(kind: GuideKind, ids: string[]): CameraRequest {
  const meshNames = meshesOf(kind, ids)
  return meshNames.length
    ? req({ kind: 'meshes', meshNames, view: viewFor(kind, ids) })
    : req({ kind: 'home' })
}

function frameExercise(kind: GuideKind, id: string): CameraRequest {
  const exercise = exerciseById[kind].get(id)
  if (!exercise) return req({ kind: 'home' })
  return req({
    kind: 'meshes',
    meshNames: exerciseMeshes(kind, exercise),
    view: viewFor(kind, exercise.primary),
  })
}
