import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { structureByMesh, structures } from '../src/anatomy/catalogue'
import {
  areas,
  groupById,
  groups,
  groupsByMesh,
  GUIDE_SYSTEM,
  guidePool,
} from '../src/guides/library/groups'
import { referenceById, references } from '../src/guides/library/references'
import type { GuideKind } from '../src/guides/library/types'
import { computeTarget } from '../src/viewer/appearance'
import { guideScene } from '../src/guides/highlight'
import { library, rankExercises, viewFor } from '../src/guides/exercises'
import { useAnatomyStore as store } from '../src/state/useAnatomyStore'

const KINDS: GuideKind[] = ['stretch', 'glide']
const TYPES: Record<GuideKind, string[]> = {
  stretch: ['static', 'dynamic'],
  glide: ['slider', 'tensioner', 'sequence'],
}
/** Groups that only appear as an "also reaches" target, by design. */
const SECONDARY_ONLY: Record<GuideKind, string[]> = { stretch: [], glide: ['lfcn'] }
/** A dose that names a source must cite that source. */
const DOSE_SOURCE: [RegExp, RegExp][] = [
  [/\(AAOS\)/, /^aaos-/],
  [/\(NHS\)/, /^nhs-/],
  [/\(HealthLinkBC\)/, /^healthlink-/],
  [/East Kent/, /^ekhuft-/],
  [/South Tees/, /^southtees-/],
]

for (const kind of KINDS) {
  const system = GUIDE_SYSTEM[kind]
  const groupIds = new Set<string>()
  for (const g of groups[kind]) {
    assert(!groupIds.has(g.id), `duplicate ${kind} group ${g.id}`)
    groupIds.add(g.id)
    assert(areas[kind].includes(g.area))
    assert(g.meshes.length > 0, `${kind} group ${g.id} resolves no meshes`)
    for (const mesh of g.meshes)
      assert(
        structureByMesh.get(mesh)?.systems.includes(system),
        `${g.id}: ${mesh} is not ${system}`,
      )
    const names = g.meshes.map((m) => structureByMesh.get(m)!.displayName)
    const left = names.filter((n) => /\bleft\b/i.test(n)).length
    const right = names.filter((n) => /\bright\b/i.test(n)).length
    assert.equal(left, right, `${g.id}: ${left} left and ${right} right meshes`)
  }
  for (const [mesh, ids] of groupsByMesh[kind])
    for (const id of ids) assert(groupById[kind].get(id)!.meshes.includes(mesh))

  const exerciseIds = new Set<string>()
  for (const e of library[kind]) {
    assert(/^[a-z0-9-]+$/.test(e.id), `bad id ${e.id}`)
    assert(!exerciseIds.has(e.id), `duplicate ${kind} ${e.id}`)
    exerciseIds.add(e.id)
    assert(e.primary.length > 0, `${e.id} has no primary target`)
    for (const id of [...e.primary, ...e.secondary])
      assert(groupById[kind].has(id), `${e.id}: unknown ${kind} group ${id}`)
    assert(!e.primary.some((id) => e.secondary.includes(id)), `${e.id}: target listed twice`)
    assert.equal(new Set(e.primary).size, e.primary.length, `${e.id}: repeated primary target`)
    assert.equal(
      new Set(e.secondary).size,
      e.secondary.length,
      `${e.id}: repeated secondary target`,
    )
    assert(TYPES[kind].includes(e.type), `${e.id}: type ${e.type} is not a ${kind} type`)
    assert(e.steps.length >= 2, `${e.id}: needs at least two steps`)
    for (const text of [...e.steps, e.feel, e.tip ?? '.', e.caution ?? '.'])
      assert(/[.!?]$/.test(text.trim()), `${e.id}: "${text}" is not a full sentence`)
    assert(e.dose.trim(), `${e.id}: missing dose`)
    if (e.ref) assert(referenceById.has(e.ref), `${e.id}: unknown reference ${e.ref}`)
    for (const [mention, ref] of DOSE_SOURCE)
      if (mention.test(e.dose))
        assert(ref.test(e.ref ?? ''), `${e.id}: dose cites a source it does not reference`)
  }

  for (const g of groups[kind]) {
    const aimed = library[kind].filter((e) => e.primary.includes(g.id)).length
    const reached = library[kind].filter((e) => e.secondary.includes(g.id)).length
    if (SECONDARY_ONLY[kind].includes(g.id))
      assert(aimed === 0 && reached > 0, `${g.id} should only be a secondary target`)
    else assert(aimed > 0, `no ${kind} is aimed at ${g.id}`)
    const ranked = rankExercises(kind, [g.id])
    assert(ranked.length === aimed + reached)
    const firstAlso = ranked.findIndex((m) => !m.primaryHits.length)
    if (firstAlso >= 0)
      assert(
        ranked.slice(firstAlso).every((m) => !m.primaryHits.length),
        `${g.id}: tiers mixed`,
      )
  }
  assert.equal(rankExercises(kind, []).length, library[kind].length)
  const pooled = guidePool(kind).filter((s) => groupsByMesh[kind].has(s.meshName)).length
  console.log(
    `${kind}: ${library[kind].length} exercises, ${groups[kind].length} groups covering ${pooled}/${guidePool(kind).length} ${system} structures`,
  )
}

// Every reference is cited by an exercise or by the guide UI.
const ui = ['GuidePanel', 'ExerciseCard']
  .map((f) => readFileSync(new URL(`../src/guides/ui/${f}.tsx`, import.meta.url), 'utf8'))
  .join('\n')
for (const ref of references) {
  const cited =
    KINDS.some((k) => library[k].some((e) => e.ref === ref.id)) || ui.includes(`'${ref.id}'`)
  assert(cited, `reference ${ref.id} is never cited`)
  assert(/^https:\/\//.test(ref.url))
}

// Ranking and camera side.
assert.equal(viewFor('stretch', ['hamstrings']), 'back')
assert.equal(viewFor('stretch', ['quadriceps']), 'front')
const hamTop = rankExercises('stretch', ['hamstrings'])
assert(hamTop[0].exercise.primary.includes('hamstrings'))
const filtered = rankExercises('stretch', ['hamstrings'], { noEquipment: true, position: 'lying' })
assert(filtered.every((m) => !m.exercise.equipment.length && m.exercise.position === 'lying'))
assert(
  rankExercises('stretch', [], { query: 'piriformis' }).some((m) => m.exercise.id === 'pigeon'),
)

// Store: modes, picking on the body, opening an exercise, links and reset.
const s = () => store.getState()
s().setMode('stretch')
assert.equal(s().mode, 'stretch')
assert(s().layers.muscular.visible && s().layers.skeletal.visible && !s().layers.nervous.visible)
const hamstrings = groupById.stretch.get('hamstrings')!
s().toggleGuideMesh(hamstrings.meshes[0])
assert.deepEqual(s().guideGroups, ['hamstrings'])
s().toggleGuideMesh(hamstrings.meshes[0])
assert.deepEqual(s().guideGroups, [])
const rectusFemoris = groupById.stretch
  .get('quadriceps')!
  .meshes.find((m) => groupsByMesh.stretch.get(m)!.length === 2)!
s().toggleGuideMesh(rectusFemoris)
assert.deepEqual([...s().guideGroups].sort(), ['hip-flexors', 'quadriceps'])
s().toggleGuideMesh(rectusFemoris)
assert.deepEqual(s().guideGroups, [])
s().toggleGuideGroup('hamstrings')
const frame = s().cameraRequest
assert(
  frame.kind === 'meshes' &&
    frame.view === 'back' &&
    frame.meshNames.length === hamstrings.meshes.length,
)
s().toggleGuideMesh('not-a-mesh')
assert.deepEqual(s().guideGroups, ['hamstrings'])

s().openExercise(hamTop[0].exercise.id)
assert.equal(s().activeExercise, hamTop[0].exercise.id)
const scene = guideScene(s())!
assert.equal(scene.roles.get(hamstrings.meshes[0]), 'primary')
const jaw = groupById.stretch.get('jaw')!.meshes[0]
const style = (role: Parameters<typeof computeTarget>[4]) => role
const ghost = computeTarget(
  structureByMesh.get(jaw),
  s().layers,
  false,
  false,
  style({
    kind: 'stretch',
    role: scene.roles.get(jaw) ?? 'other',
    selection: true,
    exercise: true,
  }),
)
assert.equal(
  ghost.pickable,
  false,
  'Untargeted muscles must not take clicks while an exercise is open',
)
const bone = structures.find((x) => x.systems.includes('skeletal'))!
const context = computeTarget(
  bone,
  s().layers,
  false,
  false,
  style({ kind: 'stretch', role: 'context', selection: true, exercise: true }),
)
assert(context.visible && !context.pickable, 'Bones stay visible as context but never take clicks')
const lit = computeTarget(
  structureByMesh.get(hamstrings.meshes[0]),
  s().layers,
  false,
  false,
  style({ kind: 'stretch', role: 'primary', selection: true, exercise: true }),
)
assert(lit.pickable && lit.emissive > 0)
s().openExercise('no-such-exercise')
assert.equal(s().activeExercise, null)

const face = guidePool('stretch').find((x) => !groupsByMesh.stretch.has(x.meshName))!
s().clearGuideGroups()
const idle = guideScene(s())!
assert.equal(
  idle.roles.get(face.meshName),
  undefined,
  'Muscles without a stretch are not selectable',
)

s().reset()
assert.equal(s().mode, 'stretch', 'Reset inside a guide keeps the guide')
s().startGuide('glide', ['sciatic', 'unknown-nerve'], 'sciatic-slider-seated')
assert.equal(s().mode, 'glide')
assert.deepEqual(s().guideGroups, ['sciatic'])
assert.equal(s().activeExercise, 'sciatic-slider-seated')
assert(
  s().layers.nervous.visible && !s().layers.muscular.visible && s().layers.skeletal.opacity < 1,
)
s().setMode('explore')
assert.equal(s().mode, 'explore')
assert.deepEqual(s().guideGroups, [])
assert(s().layers.muscular.visible && !s().layers.nervous.visible)
s().toggleGuideGroup('hamstrings')
assert.deepEqual(s().guideGroups, [], 'Explore mode ignores guide actions')

console.log(
  `Guide checks passed: ${library.stretch.length} stretches and ${library.glide.length} nerve glides, targets, sources, ranking, picking and modes.`,
)
