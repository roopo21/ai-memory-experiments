import { create } from 'zustand'
import { structureByMesh, systems, type SystemId } from '../data/anatomy'

export interface LayerState {
  visible: boolean
  opacity: number
}
export type CameraRequest =
  | { kind: 'system'; nonce: number; system: SystemId }
  | { kind: 'home'; nonce: number }
  | { kind: 'focus'; nonce: number; meshName: string }

const defaultLayers = () =>
  Object.fromEntries(
    systems.map((s) => [s.id, { visible: s.id === 'skeletal' || s.id === 'muscular', opacity: 1 }]),
  ) as Record<SystemId, LayerState>

interface State {
  hiddenMeshes: string[]
  muscleRegion: string | null
  isolated: boolean
  layers: Record<SystemId, LayerState>
  hoveredMesh: string | null
  selectedMesh: string | null
  cameraRequest: CameraRequest
  panelExpanded: boolean
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
  hiddenMeshes: [],
  muscleRegion: null,
  isolated: false,
  layers: defaultLayers(),
  hoveredMesh: null,
  selectedMesh: null,
  cameraRequest: req({ kind: 'home' }),
  panelExpanded: false,

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
    const selected = get().selectedMesh
    set({
      cameraRequest: selected ? req({ kind: 'focus', meshName: selected }) : req({ kind: 'home' }),
    })
  },
  reset: () =>
    set({
      hiddenMeshes: [],
      muscleRegion: null,
      isolated: false,
      layers: defaultLayers(),
      selectedMesh: null,
      hoveredMesh: null,
      cameraRequest: req({ kind: 'home' }),
    }),
  setPanelExpanded: (panelExpanded) => set({ panelExpanded }),
}))
