import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { from } from '../asset-pipeline/motion/geometry'
import previews from '../src/anatomy/generated/previews.json'
import { createMovementRig } from '../src/motion/movementRig'
import { clips, type ClipId, type Side } from '../src/studio/clips'
import { scores } from '../src/studio/choreography'
import { selectSurfaces } from '../src/motion/studio/figure'
import { sampleStudio } from '../src/motion/studio/sample'
import { newProject } from '../src/studio/project'
const rig = createMovementRig(),
  proj = newProject(),
  pv = previews.previews as Record<string, { url: string }>,
  records: { id: string; t: number; side: Side; tier: string; y: number; mesh: string }[] = []
let count = 0,
  worst = 0
for (const tier of ['human', 'preview', 'full']) {
  for (const name of Object.keys(scores)) {
    const id = name as ClipId,
      info = clips[id]
    for (const side of (info.unilateral ? ['left', 'right'] : ['left']) as Side[]) {
      const sel = selectSurfaces(id, 'anatomy', side)
      const surfaces =
        tier === 'human'
          ? await from('src/motion/studio/assets/performer.glb', true)
          : (
              await Promise.all(
                sel.urls.map(async (url, i) => {
                  const list = await from(
                    'public' + (tier === 'preview' ? (pv[url]?.url ?? url) : url),
                  )
                  return i ? list.filter((s) => s.name && sel.selected.has(s.name)) : list
                }),
              )
            ).flat()
      const times = [
        ...new Set([
          ...info.phases.map((p) => p[0]),
          ...info.phases.slice(1).map((p, i) => (p[0] + info.phases[i][0]) * 0.5),
        ]),
      ]
      let low = Infinity,
        mesh = '',
        when = 0
      for (const t of times) {
        sampleStudio(rig, id, t, side, proj)
        const matrices = rig.skeleton.boneMatrices!
        for (const { coords, indices, weights, name } of surfaces) {
          let m = Infinity
          for (let i = 0, k = 0; i < coords.length; i += 3, k += 4) {
            const x = coords[i],
              y = coords[i + 1],
              z = coords[i + 2]
            let h = 0
            for (let j = k; j < k + 4; j++) {
              if (!weights[j]) continue
              const b = indices[j] * 16
              h +=
                weights[j] *
                (matrices[b + 1] * x + matrices[b + 5] * y + matrices[b + 9] * z + matrices[b + 13])
            }
            m = Math.min(m, h)
          }
          if (m < low) {
            low = m
            mesh = name ?? 'performer'
            when = t
          }
        }
        count++
      }
      assert(Number.isFinite(low), id + ' has no decoded surface')
      worst = Math.min(worst, low)
      if (low < -0.005)
        records.push({ id, side, tier, y: Math.round(low * 10000) / 10, t: when, mesh })
    }
  }
  console.log(
    tier + ' library surface sweep finished with ' + records.length + ' cumulative floor failures',
  )
}
if (process.env.GUIDE_GROUND_REPORT)
  await writeFile(process.env.GUIDE_GROUND_REPORT, JSON.stringify(records, null, 2))
assert.equal(records.length, 0, 'Floor penetrations (mm) ' + JSON.stringify(records.slice(0, 12)))
console.log(
  count + ' guide surface poses, deepest penetration ' + (-worst * 1000).toFixed(2) + ' mm.',
)
