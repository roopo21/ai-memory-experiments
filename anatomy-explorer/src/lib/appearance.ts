import { structureByMesh, systemById, type Structure, type SystemId } from '../data/anatomy'
import type { LayerState } from '../store/useAnatomyStore'

export const GHOST_OPACITY = 0.1
export const GHOST_COLOR = '#7b8aa3'
/** With nothing selected: skin is a translucent shell, everything else is shown at rest. */
export const SKIN_REST_OPACITY = 0.3
export const REST_OPACITY = 0.9

export interface Target {
  color: string
  opacity: number
  emissive: number
  visible: boolean
  /** Whether the mesh should respond to hover/click. */
  pickable: boolean
}

const mix = (a: string, b: string, t: number) => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16)
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t)
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)
}

/**
 * Pure function: given a structure and UI state, what should its material look like?
 * Kept separate from three.js so the ghosting rules are easy to read and test.
 */
export function computeTarget(
  st: Structure | undefined,
  active: SystemId[],
  layers: Record<SystemId, LayerState>,
  hovered: boolean,
  selected: boolean,
): Target {
  if (!st) return { color: GHOST_COLOR, opacity: GHOST_OPACITY, emissive: 0, visible: true, pickable: false }

  // Layer panel: hidden only if every owning system is hidden; opacity follows the most-visible owner.
  const owners = st.systems.map((id) => layers[id])
  const visible = owners.some((l) => l.visible)
  const layerOpacity = Math.max(...owners.map((l) => (l.visible ? l.opacity : 0)))

  const activeOwner = st.systems.find((id) => active.includes(id))
  const isSkin = st.systems.length === 1 && st.systems[0] === 'integumentary'
  const primary = systemById.get(activeOwner ?? st.systems[0])!.color

  let color: string, base: number
  if (active.length === 0) {
    color = mix(primary, '#8d96a6', 0.35) // muted so the overview doesn't look garish
    base = isSkin ? SKIN_REST_OPACITY : REST_OPACITY
  } else if (activeOwner) {
    color = primary
    base = 1
  } else {
    color = GHOST_COLOR
    base = GHOST_OPACITY
  }

  const opacity = base * layerOpacity
  return {
    color,
    opacity,
    emissive: selected ? 0.55 : hovered ? 0.32 : activeOwner ? 0.08 : 0,
    visible: visible && opacity > 0.002,
    // Ghosted / faint meshes must not steal pointer events from the organs inside them.
    pickable: visible && (selected || opacity >= 0.5 || (!isSkin && opacity >= 0.25)),
  }
}

export const isKnown = (meshName: string) => structureByMesh.has(meshName)
