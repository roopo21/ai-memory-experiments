import { theme } from '../theme'
import { systemById, type Structure, type SystemId } from '../anatomy/catalogue'
import type { GuideKind } from '../guides/library/types'
import type { LayerState } from '../state/useAnatomyStore'
import type { GuideRole } from '../guides/highlight'

export interface Target {
  color: string
  opacity: number
  emissive: number
  visible: boolean
  pickable: boolean
}

export interface GuideStyle {
  kind: GuideKind
  role: GuideRole
  selection: boolean
  exercise: boolean
}

/** Highlight colours per guide: warm on red muscle, cool on yellow nerves. */
export const GUIDE_PALETTE: Record<
  GuideKind,
  { base: string; primary: string; secondary: string; hover: string }
> = {
  stretch: { base: '#a6534c', primary: theme.muscle, secondary: '#f07a5a', hover: '#d4806a' },
  glide: { base: '#e8cf72', primary: theme.nerve, secondary: '#7c9dff', hover: '#fff2b0' },
}

const MUSCLE = '#a6534c'

/** Visibility and picking share the same opacity rule, including selected meshes. */
export function computeTarget(
  structure: Structure | undefined,
  layers: Record<SystemId, LayerState>,
  hovered: boolean,
  selected: boolean,
  guide?: GuideStyle,
): Target {
  const owners = structure?.systems.map((id) => layers[id]) ?? []
  const opacity = Math.max(0, ...owners.map((layer) => (layer.visible ? layer.opacity : 0)))
  const primary = structure?.systems[0]
  const base = primary ? systemById.get(primary)!.color : '#d6c6a6'
  const muscle = structure?.systems.includes('muscular')
  const target: Target = {
    color: selected ? '#e7c59b' : muscle ? MUSCLE : base,
    opacity,
    emissive: hovered ? 0.06 : 0,
    visible: opacity > 0.002,
    pickable: opacity >= 0.25,
  }
  return guide ? guideTarget(target, guide) : target
}

function guideTarget(t: Target, guide: GuideStyle): Target {
  const palette = GUIDE_PALETTE[guide.kind]
  const shown = (color: string, opacity: number, emissive: number): Target => ({
    color,
    opacity,
    emissive,
    visible: opacity > 0.002,
    pickable: opacity >= 0.25,
  })
  switch (guide.role) {
    // Other systems stay as context but never take a click meant for a muscle or nerve.
    case 'context':
      return { ...t, emissive: 0, pickable: false }
    case 'primary':
      return shown(palette.primary, t.opacity, 0.35)
    case 'secondary':
      return shown(palette.secondary, t.opacity * 0.9, 0.1)
    case 'selected':
      return shown(palette.primary, t.opacity, 0.25)
    case 'hover':
      return shown(palette.hover, t.opacity, 0.12)
    case 'member':
      return shown(palette.base, guide.selection ? t.opacity * 0.45 : t.opacity, 0)
    case 'other':
      return {
        ...shown(palette.base, t.opacity * (guide.exercise ? 0.06 : 0.12), 0),
        pickable: false,
      }
  }
}
