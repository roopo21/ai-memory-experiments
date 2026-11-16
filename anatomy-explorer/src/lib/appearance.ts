import type { Structure, SystemId } from '../data/anatomy'
import type { LayerState } from '../store/useAnatomyStore'

export interface Target {
  color: string
  opacity: number
  emissive: number
  visible: boolean
  pickable: boolean
}

/** Visibility and picking share the same opacity rule, including selected meshes. */
export function computeTarget(
  structure: Structure | undefined,
  layers: Record<SystemId, LayerState>,
  hovered: boolean,
  selected: boolean,
): Target {
  const owners = structure?.systems.map((id) => layers[id]) ?? []
  const opacity = Math.max(0, ...owners.map((layer) => (layer.visible ? layer.opacity : 0)))
  const muscle = structure?.systems.includes('muscular')
  return {
    color: muscle ? (selected ? '#e7a57d' : '#a6534c') : selected ? '#c4ad82' : '#d6c6a6',
    opacity,
    emissive: hovered ? 0.06 : 0,
    visible: opacity > 0.002,
    pickable: opacity >= 0.25,
  }
}
