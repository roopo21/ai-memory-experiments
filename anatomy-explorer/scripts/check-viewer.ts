import assert from 'node:assert/strict'
import { Object3D } from 'three'
import { structures, muscleReport } from '../src/data/anatomy'
import { computeTarget } from '../src/lib/appearance'
import { searchStructures } from '../src/lib/search'
import { meshRegistry, registerMeshes, TIER } from '../src/scene/registry'
import {
  fullFailed,
  fullLoaded,
  isFullAdmitted,
  isFullLoaded,
  loadState,
  previewSettled,
  previewStarted,
  releaseFull,
  requestFull,
  resetLoadQueue,
} from '../src/scene/loadQueue'
import { useAnatomyStore as store } from '../src/store/useAnatomyStore'

const muscles = structures.filter((s) => s.systems.includes('muscular'))
assert.equal(muscles.length, 435)
assert.equal(muscles.length, muscleReport.structures)
assert(structures.every((s) => s.sex === 'male'))
assert.equal(searchStructures('liver')[0].meshName, 'FMA7197')
const muscle = muscles.find((s) => s.displayName === 'Left rectus abdominis')!
assert(muscle)
assert.equal(searchStructures(muscle.displayName)[0].meshName, muscle.meshName)
store.getState().reset()
store.getState().setMuscleRegion('Head')
store.getState().setLayerVisible('muscular', false)
store.getState().setLayerOpacity('muscular', 0)
store.getState().hideStructure(muscle.meshName)
store.getState().selectStructure(muscle.meshName, { activate: true, focus: true })
assert.deepEqual(store.getState().layers.muscular, { visible: true, opacity: 1 })
assert.equal(store.getState().layers.skeletal.visible, true, 'Selecting a muscle preserves bones')
assert.equal(store.getState().muscleRegion, muscle.region)
assert.equal(store.getState().hiddenMeshes.length, 0)
assert.equal(store.getState().cameraRequest.kind, 'focus')
store.getState().setLayerOpacity('muscular', 0)
assert.equal(
  computeTarget(muscle, store.getState().layers, false, true).pickable,
  false,
  'Transparent selection must not block picking',
)
store.getState().toggleSystem('muscular')
assert.equal(store.getState().layers.muscular.visible, false)
store.getState().hideStructure(muscle.meshName)
assert.equal(store.getState().selectedMesh, null)
store.getState().restoreStructures()
assert.equal(store.getState().hiddenMeshes.length, 0)
store.getState().setIsolated(true)
store.getState().reset()
assert.equal(store.getState().isolated, false)
assert.equal(store.getState().muscleRegion, null)
assert.deepEqual(store.getState().layers.muscular, { visible: true, opacity: 1 })

// Detail must take precedence regardless of which async load finishes first.
for (const detailFirst of [false, true]) {
  const overview = new Object3D()
  overview.name = 'test-muscle'
  const detail = new Object3D()
  detail.name = overview.name
  const unregister = detailFirst ? registerMeshes([detail], true) : registerMeshes([overview])
  const unregisterOther = detailFirst ? registerMeshes([overview]) : registerMeshes([detail], true)
  assert.equal(meshRegistry.get(overview.name), detail)
  const removeDetail = detailFirst ? unregister : unregisterOther
  const removeOverview = detailFirst ? unregisterOther : unregister
  removeDetail()
  assert.equal(meshRegistry.get(overview.name), overview)
  removeOverview()
  assert.equal(meshRegistry.has(overview.name), false)
}
// Preview < overview < detail, whatever order the three tiers arrive in.
const tiers = [TIER.preview, TIER.overview, TIER.detail]
for (const order of [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
]) {
  const meshes = tiers.map(() => Object.assign(new Object3D(), { name: 'tiered' }))
  const unregister = new Map(order.map((i) => [i, registerMeshes([meshes[i]], tiers[i])]))
  assert.equal(meshRegistry.get('tiered'), meshes[2], `detail wins (order ${order})`)
  unregister.get(2)!()
  assert.equal(meshRegistry.get('tiered'), meshes[1], `overview beats preview (order ${order})`)
  unregister.get(1)!()
  assert.equal(meshRegistry.get('tiered'), meshes[0])
  unregister.get(0)!()
  assert.equal(meshRegistry.has('tiered'), false)
}

// Progressive loading: previews download first, then visible layers together, then the skeleton.
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))
resetLoadQueue()
requestFull('/skeleton.glb', 1) // effect order must not matter within one commit
previewStarted('/preview/skeleton.glb')
const muscleUrls = Array.from({ length: 5 }, (_, i) => `/muscle-${i}.glb`)
for (const url of muscleUrls) requestFull(url, 0)
await settle()
assert.equal(loadState().fullActive, 0, 'Full layers wait while a preview is downloading')
previewSettled('/preview/skeleton.glb')
await settle()
assert(muscleUrls.every(isFullAdmitted), 'Visible layers download together')
assert(!isFullAdmitted('/skeleton.glb'), 'The skeleton waits for the visible layers')
for (const url of muscleUrls.slice(0, 3)) fullLoaded(url)
fullFailed(muscleUrls[3])
await settle()
assert(isFullAdmitted(muscleUrls[3]), 'A failed layer stays admitted so its error stays visible')
assert(!isFullAdmitted('/skeleton.glb'), 'One visible layer is still downloading')
previewStarted('/preview/nerves.glb') // a newly shown layer's preview pauses new admissions
fullLoaded(muscleUrls[4])
await settle()
assert(!isFullAdmitted('/skeleton.glb'), 'No new admissions while a preview downloads')
requestFull('/nerves.glb', 0)
previewSettled('/preview/nerves.glb')
await settle()
assert(isFullAdmitted('/nerves.glb'), 'A layer the user just showed starts at once')
assert(!isFullAdmitted('/skeleton.glb'), 'User-shown layers go ahead of the skeleton')
fullLoaded('/nerves.glb')
await settle()
assert(isFullAdmitted('/skeleton.glb'))
releaseFull('/skeleton.glb') // unmounted mid-download: slot freed, request forgotten
assert(!isFullAdmitted('/skeleton.glb'))
releaseFull(muscleUrls[0]) // unmounting a loaded layer keeps it loaded
assert(isFullLoaded(muscleUrls[0]) && isFullAdmitted(muscleUrls[0]))
resetLoadQueue()

console.log(
  'Viewer checks passed: layer visibility, search, region selection, hidden structures, reset, picking, asynchronous detail replacement, preview/overview/detail precedence, progressive load ordering.',
)
