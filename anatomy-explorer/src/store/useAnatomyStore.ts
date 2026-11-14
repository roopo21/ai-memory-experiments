import { create } from 'zustand'
import { structureByMesh, systems, type Sex, type SystemId, type ModelMode } from '../data/anatomy'

export interface LayerState { visible: boolean; opacity: number }

/** A one-shot instruction for the camera rig. `nonce` makes repeats of the same request distinct. */
export type CameraRequest =
  | { kind: 'home'; nonce: number }
  | { kind: 'systems'; nonce: number }
  | { kind: 'focus'; nonce: number; meshName: string }

const defaultLayers = () =>
  Object.fromEntries(systems.map((s) => [s.id, { visible: true, opacity: 1 }])) as Record<SystemId, LayerState>

interface State {
  mode: ModelMode
  isolated: boolean
  setMode: (mode: ModelMode) => void
  setIsolated: (value: boolean) => void
  sex: Sex
  activeSystems: SystemId[]
  layers: Record<SystemId, LayerState>
  hoveredMesh: string | null
  selectedMesh: string | null
  cameraRequest: CameraRequest
  panelExpanded: boolean // mobile bottom sheet

  setSex: (sex: Sex) => void
  toggleSystem: (id: SystemId) => void
  setLayerVisible: (id: SystemId, visible: boolean) => void
  setLayerOpacity: (id: SystemId, opacity: number) => void
  hover: (meshName: string | null) => void
  /** Select a structure: opens its card, activates its systems and (optionally) flies to it. */
  selectStructure: (meshName: string, opts?: { focus?: boolean; activate?: boolean }) => void
  clearSelection: () => void
  recenter: () => void
  reset: () => void
  setPanelExpanded: (v: boolean) => void
}

let nonce = 0
type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never
const req = (r: DistributiveOmit<CameraRequest, 'nonce'>): CameraRequest => ({ ...r, nonce: ++nonce }) as CameraRequest

export const useAnatomyStore = create<State>((set, get) => ({
  mode: 'skeleton',
  isolated: false,
  setIsolated: (isolated) => set({ isolated }),
  setMode: (mode) => set({ mode, layers: defaultLayers(), sex: mode === 'skeleton' ? 'male' : get().sex, isolated: false, selectedMesh: null, hoveredMesh: null, activeSystems: mode === 'skeleton' ? ['skeletal'] : [], cameraRequest: req({ kind: 'home' }) }),
  sex: 'male',
  activeSystems: ['skeletal'],
  layers: defaultLayers(),
  hoveredMesh: null,
  selectedMesh: null,
  cameraRequest: req({ kind: 'home' }),
  panelExpanded: false,

  // Sex swap touches nothing but `sex`: camera + selection survive by construction.
  setSex: (sex) => {
    // A sex-specific structure (e.g. Uterus) doesn't exist in the other model, so close its card.
    const st = structureByMesh.get(get().selectedMesh ?? '')
    if (sex === 'female' && get().mode === 'skeleton') get().setMode('overview')
    set({ sex, hoveredMesh: null, ...(st?.sex && st.sex !== sex ? { selectedMesh: null } : {}) })
  },

  toggleSystem: (id) => {
    const cur = get().activeSystems
    const activeSystems = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    set({
      hoveredMesh: null, // what's under a stationary pointer may no longer be pickable
      activeSystems,
      // Turning a system on should never leave it hidden by the layer panel.
      layers: cur.includes(id) ? get().layers : { ...get().layers, [id]: { ...get().layers[id], visible: true } },
      cameraRequest: activeSystems.length ? req({ kind: 'systems' }) : req({ kind: 'home' }),
    })
  },

  setLayerVisible: (id, visible) => set({ hoveredMesh: null, layers: { ...get().layers, [id]: { ...get().layers[id], visible } } }),
  setLayerOpacity: (id, opacity) => set({ layers: { ...get().layers, [id]: { ...get().layers[id], opacity } } }),

  hover: (meshName) => set({ hoveredMesh: meshName }),

  selectStructure: (meshName, { focus = false, activate = false } = {}) => {
    const st = structureByMesh.get(meshName)
    if (!st) return
    const patch: Partial<State> = { selectedMesh: meshName, hoveredMesh: null }
    if (activate) {
      patch.activeSystems = [...st.systems]
      patch.layers = { ...get().layers, ...Object.fromEntries(st.systems.map((id) => [id, { ...get().layers[id], visible: true }])) }
    }
    if (focus) patch.cameraRequest = req({ kind: 'focus', meshName })
    set(patch)
  },

  clearSelection: () => set({ selectedMesh: null }),
  recenter: () => {
    const { selectedMesh, activeSystems } = get()
    set({ cameraRequest: selectedMesh ? req({ kind: 'focus', meshName: selectedMesh }) : activeSystems.length ? req({ kind: 'systems' }) : req({ kind: 'home' }) })
  },
  reset: () => set({ isolated: false, activeSystems: get().mode === 'skeleton' ? ['skeletal'] : [], layers: defaultLayers(), selectedMesh: null, hoveredMesh: null, cameraRequest: req({ kind: 'home' }) }),
  setPanelExpanded: (panelExpanded) => set({ panelExpanded }),
}))
