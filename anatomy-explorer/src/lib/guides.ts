import { glides } from '../data/guides/glides'
import { groupById, groupsByMesh, meshesOf } from '../data/guides/groups'
import { stretches } from '../data/guides/stretches'
import type { Exercise, ExerciseType, GroupView, GuideKind, Position } from '../data/guides/types'

export const library: Record<GuideKind, Exercise[]> = { stretch: stretches, glide: glides }

export const exerciseById: Record<GuideKind, Map<string, Exercise>> = {
  stretch: new Map(stretches.map((e) => [e.id, e])),
  glide: new Map(glides.map((e) => [e.id, e])),
}

export interface Filters {
  position?: Position | 'any'
  type?: ExerciseType | 'any'
  noEquipment?: boolean
  /** Lower-cased text matched against the exercise name and its target groups. */
  query?: string
}

export interface Match {
  exercise: Exercise
  /** Selected groups the exercise is aimed at. */
  primaryHits: string[]
  /** Selected groups the exercise also lengthens or moves. */
  secondaryHits: string[]
}

function textOf(kind: GuideKind, exercise: Exercise) {
  const names = [...exercise.primary, ...exercise.secondary].flatMap((id) => {
    const group = groupById[kind].get(id)
    return group ? [group.name, ...group.members] : []
  })
  return [exercise.name, ...names].join(' ').toLowerCase()
}

const searchText: Record<GuideKind, Map<string, string>> = {
  stretch: new Map(stretches.map((e) => [e.id, textOf('stretch', e)])),
  glide: new Map(glides.map((e) => [e.id, textOf('glide', e)])),
}

function passes(kind: GuideKind, exercise: Exercise, filters: Filters) {
  if (filters.position && filters.position !== 'any' && exercise.position !== filters.position)
    return false
  if (filters.type && filters.type !== 'any' && exercise.type !== filters.type) return false
  if (filters.noEquipment && exercise.equipment.length) return false
  const q = filters.query?.trim().toLowerCase()
  if (q && !q.split(/\s+/).every((word) => searchText[kind].get(exercise.id)!.includes(word)))
    return false
  return true
}

/**
 * Exercises for the selected groups. Anything aimed at a selected group comes first, then
 * exercises that only also reach it. Within a tier, more selected groups and a narrower focus win.
 * With nothing selected the whole library is returned in head-to-toe order.
 */
export function rankExercises(kind: GuideKind, selected: string[], filters: Filters = {}): Match[] {
  const chosen = new Set(selected)
  const out: (Match & { order: number })[] = []
  library[kind].forEach((exercise, order) => {
    if (!passes(kind, exercise, filters)) return
    const primaryHits = exercise.primary.filter((id) => chosen.has(id))
    const secondaryHits = exercise.secondary.filter((id) => chosen.has(id))
    if (chosen.size && !primaryHits.length && !secondaryHits.length) return
    out.push({ exercise, primaryHits, secondaryHits, order })
  })
  if (!chosen.size) return out
  return out.sort(
    (a, b) =>
      Number(b.primaryHits.length > 0) - Number(a.primaryHits.length > 0) ||
      b.primaryHits.length * 2 +
        b.secondaryHits.length -
        (a.primaryHits.length * 2 + a.secondaryHits.length) ||
      a.exercise.primary.length - b.exercise.primary.length ||
      a.order - b.order,
  )
}

/** How many exercises are aimed at each group. */
export const primaryCount: Record<GuideKind, Map<string, number>> = {
  stretch: countPrimary(stretches),
  glide: countPrimary(glides),
}
function countPrimary(list: Exercise[]) {
  const counts = new Map<string, number>()
  for (const e of list) for (const id of e.primary) counts.set(id, (counts.get(id) ?? 0) + 1)
  return counts
}

/** Camera side that shows most of the given groups; ties face the front. */
export function viewFor(kind: GuideKind, ids: string[]): GroupView {
  const votes = { front: 0, back: 0, side: 0 }
  for (const id of ids) {
    const view = groupById[kind].get(id)?.view
    if (view) votes[view]++
  }
  if (votes.back > votes.front && votes.back >= votes.side) return 'back'
  if (votes.side > votes.front && votes.side > votes.back) return 'side'
  return 'front'
}

/** Meshes an exercise works on: everything it aims at plus what it also reaches. */
export function exerciseMeshes(kind: GuideKind, exercise: Exercise) {
  return meshesOf(kind, [...exercise.primary, ...exercise.secondary])
}

export const groupsOfMesh = (kind: GuideKind, meshName: string) =>
  groupsByMesh[kind].get(meshName) ?? []

export const TYPE_LABEL: Record<ExerciseType, string> = {
  static: 'Static hold',
  dynamic: 'Moving stretch',
  slider: 'Slider',
  tensioner: 'Tensioner',
  sequence: 'Sequence',
}

export const POSITION_LABEL: Record<Position, string> = {
  standing: 'Standing',
  seated: 'Seated',
  kneeling: 'Kneeling',
  floor: 'On the floor',
  lying: 'Lying',
}
