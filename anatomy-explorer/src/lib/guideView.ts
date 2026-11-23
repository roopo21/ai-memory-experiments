import { groupById, groupsByMesh } from '../data/guides/groups'
import type { GuideKind, GuideMode } from '../data/guides/types'
import { exerciseById } from './guides'

/**
 * How a mesh is drawn in a guide mode. `context` is any other system (bones, organs),
 * `other` is a mesh of the guide system that no current target covers.
 */
export type GuideRole =
  'primary' | 'secondary' | 'selected' | 'hover' | 'member' | 'other' | 'context'

export interface GuideScene {
  kind: GuideKind
  roles: Map<string, GuideRole>
  /** At least one group is selected. */
  selection: boolean
  /** An exercise card is open. */
  exercise: boolean
}

interface Inputs {
  mode: GuideMode
  guideGroups: string[]
  activeExercise: string | null
  hoveredMesh: string | null
}

let lastInputs: Inputs | null = null
let lastScene: GuideScene | null = null

/** Roles for every mesh, recomputed only when the guide state changes (all layers share it). */
export function guideScene(state: Inputs): GuideScene | null {
  if (state.mode === 'explore') return null
  const prev = lastInputs
  if (
    prev &&
    prev.mode === state.mode &&
    prev.guideGroups === state.guideGroups &&
    prev.activeExercise === state.activeExercise &&
    prev.hoveredMesh === state.hoveredMesh
  )
    return lastScene
  const kind = state.mode
  const roles = new Map<string, GuideRole>()
  const paint = (ids: string[], role: GuideRole) => {
    for (const id of ids)
      for (const mesh of groupById[kind].get(id)?.meshes ?? []) roles.set(mesh, role)
  }
  const exercise = state.activeExercise ? exerciseById[kind].get(state.activeExercise) : undefined
  if (exercise) {
    paint(exercise.secondary, 'secondary')
    paint(exercise.primary, 'primary')
  } else {
    for (const mesh of groupsByMesh[kind].keys()) roles.set(mesh, 'member')
    if (state.hoveredMesh) paint(groupsByMesh[kind].get(state.hoveredMesh) ?? [], 'hover')
    paint(state.guideGroups, 'selected')
  }
  lastInputs = {
    mode: state.mode,
    guideGroups: state.guideGroups,
    activeExercise: state.activeExercise,
    hoveredMesh: state.hoveredMesh,
  }
  lastScene = { kind, roles, selection: state.guideGroups.length > 0, exercise: !!exercise }
  return lastScene
}
