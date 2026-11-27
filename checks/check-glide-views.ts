import assert from 'node:assert/strict'
import { layerSources, structures } from '../src/anatomy/catalogue'
import { glides } from '../src/guides/library/glides'
import { groupById } from '../src/guides/library/groups'
import { selectSurfaces } from '../src/motion/studio/figure'
import { clipInfo, guideClip } from '../src/studio/clips'
import { glideViews } from '../src/studio/glideViews'

assert.deepEqual(new Set(glideViews.keys()), new Set(glides.map((g) => g.id)))
for (const guide of glides) {
  const { id } = guide
  assert(guideClip(id))
  const view = glideViews.get(id)!
  for (const side of ['left', 'right'] as const) {
    const selection = selectSurfaces(id, 'anatomy', side)
    for (const group of view.primary) {
      const candidates = groupById.glide.get(group)!.meshes
      assert(
        candidates.some(
          (mesh) =>
            selection.roleFor(mesh) === 'primary' &&
            layerSources.some((l) => selection.urls.includes(l.url) && l.meshes.includes(mesh)),
        ),
        id + ' loses primary nerve ' + group + ' on the ' + side,
      )
    }
    const faded = structures.filter((s) => selection.roleFor(s.meshName) === 'faded')
    assert(faded.length > 0, id + ' has no local exposure')
    if (clipInfo(id).unilateral)
      assert(
        faded.every(
          (s) => !s.displayName.toLowerCase().includes(side === 'left' ? 'right' : 'left'),
        ),
      )
    const remote = view.region.startsWith('arm') ? 'Lower limbs' : 'Upper limbs'
    assert(
      structures
        .filter((s) => s.systems.includes('muscular') && s.region === remote)
        .every((s) => selection.roleFor(s.meshName) === 'muscle'),
      id + ' faded remote tissue',
    )
    const muscles = selectSurfaces(id, 'muscles', side)
    assert(faded.every((s) => muscles.roleFor(s.meshName) === 'muscle'))
    assert(
      muscles.urls.every((url) =>
        layerSources.find((l) => l.url === url)!.systems.includes('muscular'),
      ),
    )
  }
}
console.log(
  'Regional nerve targets and muscle exposure verified on both sides for ' +
    glides.length +
    ' glides.',
)
