import assert from 'node:assert/strict'
import { Object3D } from 'three'
import { structures, muscleReport } from '../src/data/anatomy'
import { computeTarget } from '../src/lib/appearance'
import { searchStructures } from '../src/lib/search'
import { meshRegistry, registerMeshes } from '../src/scene/registry'
import { useAnatomyStore as store } from '../src/store/useAnatomyStore'

const muscles = structures.filter((s) => s.systems.includes('muscular'))
assert.equal(muscles.length, 435)
assert.equal(muscles.length, muscleReport.structures)
assert(structures.every((s) => s.sex === 'male'))
assert.equal(searchStructures('liver').length, 0, 'Do not expose nonexistent anatomy')
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
console.log(
  'Viewer checks passed: layer visibility, search, region selection, hidden structures, reset, picking, asynchronous detail replacement.',
)
