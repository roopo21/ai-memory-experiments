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

export const MUSCLE = '#84868b'
export const GLIDE_MUSCLE_OPACITY = 0.22

/** Target colours are shared by atlas guides and the motion studio. */
export const GUIDE_PALETTE: Record<
  GuideKind,
  { base: string; primary: string; secondary: string; hover: string }
> = {
  stretch: { base: MUSCLE, primary: '#ffbb38', secondary: '#cf6b47', hover: '#b3b5b9' },
  glide: { base: '#a1a4aa', primary: '#42dada', secondary: '#a4adee', hover: '#bddfe3' },
}

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
      return shown(
        palette.base,
        guide.kind === 'glide' && guide.selection ? t.opacity * 0.45 : t.opacity,
        0,
      )
    case 'other':
      return {
        ...shown(
          palette.base,
          guide.kind === 'stretch' ? t.opacity : t.opacity * (guide.exercise ? 0.06 : 0.12),
          0,
        ),
        pickable: false,
      }
  }
}
