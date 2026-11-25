import assert from 'node:assert/strict'
import { createMovementRig } from '../src/motion/movementRig'
import { from } from '../asset-pipeline/motion/geometry'
import previews from '../src/anatomy/generated/previews.json'
import { structureByMesh } from '../src/anatomy/catalogue'
import { joints } from '../src/motion/joints'
import { selectSurfaces } from '../src/motion/studio/figure'
import { clipInfo, type ClipId, type Side } from '../src/studio/clips'
import { sampleStudio, supports } from '../src/motion/studio/sample'
import { newProject } from '../src/studio/project'

const rig = createMovementRig(),
  proj = newProject()
// The full sweep evaluates every decoded vertex on every frame. The default check
// also decodes all vertices, at phase boundaries and regular samples through each pilot.
const dense = process.argv.includes('--dense')
const pv = previews.previews as Record<string, { url: string }>
const pilots: ClipId[] = ['push-up', 'supine-hamstring', 'sciatic-slider-seated']
let evaluated = 0,
  worstFloor = 0,
  worstSupport = 0
for (const tier of ['preview', 'full', 'human']) {
  const human = tier === 'human',
    h = supports(human)
  for (const id of pilots)
    for (const side of (clipInfo(id).unilateral ? ['left', 'right'] : ['left']) as Side[]) {
      const selection = selectSurfaces(id, 'anatomy', side)
      const surfaces = human
        ? await from('src/motion/studio/assets/performer.glb', true)
        : (
            await Promise.all(
              selection.urls.map(async (url, i) => {
                const list = await from(
                  'public' + (tier === 'preview' ? (pv[url]?.url ?? url) : url),
                )
                return i === 0 ? list : list.filter((g) => g.name && selection.selected.has(g.name))
              }),
            )
          ).flat()
      const info = clipInfo(id),
        times = new Set(info.phases.map((p) => p[0])),
        hz = dense ? 60 : 2
      for (let n = 0; n <= Math.ceil(info.seconds * hz); n++)
        times.add(Math.min(info.seconds, n / hz))
      for (const t of times) {
        sampleStudio(rig, id, t, side, proj)
        let lowestSeat = ''
        const props = [Infinity, Infinity, Infinity, Infinity],
          mins = Array<number>(joints.length).fill(Infinity),
          m = rig.skeleton.boneMatrices!
        for (const { name, coords, indices, weights } of surfaces)
          for (let k = 0, j = 0; j < coords.length; j += 3, k += 4) {
            const ox = coords[j],
              oy = coords[j + 1],
              oz = coords[j + 2]
            let x = 0,
              y = 0,
              z = 0,
              largest = k
            for (let a = k; a < k + 4; a++) {
              const w = weights[a]
              if (w === 0) continue
              const b = indices[a] * 16
              x += w * (m[b] * ox + m[b + 4] * oy + m[b + 8] * oz + m[b + 12])
              z += w * (m[b + 2] * ox + m[b + 6] * oy + m[b + 10] * oz + m[b + 14])
              y += w * (m[b + 1] * ox + m[b + 5] * oy + m[b + 9] * oz + m[b + 13])
              if (w > weights[largest]) largest = a
            }
            if (Math.abs(x) < 0.23 && z >= -0.335 && z <= 0.035 && y < props[0]) {
              props[0] = y
              lowestSeat =
                (structureByMesh.get(name ?? '')?.displayName ?? 'performer') +
                ' at ' +
                [x, y, z].map((v) => v.toFixed(3)).join(',')
            }
            if (Math.abs(x) < 0.3 && z >= -0.61 && z <= 0.13) props[1] = Math.min(y, props[1])
            if (Math.abs(x) < 0.17 && z >= -0.91 && z <= -0.61) props[2] = Math.min(y, props[2])
            if (Math.abs(x) < 0.06 && z >= -0.233 && z <= -0.167) props[3] = Math.min(props[3], y)
            const joint = indices[largest]
            // The performer's hands are rigid mittens with the fingers curled as scanned, so a
            // flat palm presses its baked fingertips into the floor. The anatomy tiers, whose
            // fingers articulate, carry the hand-contact checks.
            if (human && (joint === 8 || joint === 11)) continue
            mins[joint] = Math.min(mins[joint], y)
          }
        // Contact patches include every articulated finger or toe descending from the wrist or ankle.
        for (let i = joints.length - 1; i >= 20; i--) {
          const parent = joints[i][1]
          mins[parent] = Math.min(mins[parent], mins[i])
        }
        const floor = Math.min(...mins),
          which = tier + ' ' + id + ' ' + side + ' at ' + t.toFixed(3) + ' s'
        assert(
          Number.isFinite(floor) && floor >= -0.005,
          which + ' crosses floor by ' + (-floor * 1000).toFixed(1) + ' mm',
        )
        worstFloor = Math.max(worstFloor, -floor)
        const contact = (actual: number, expected: number, label: string) => {
          const error = Math.abs(actual - expected)
          worstSupport = Math.max(worstSupport, error)
          assert(
            error <= 0.005,
            which +
              ' ' +
              label +
              ' misses support by ' +
              ((actual - expected) * 1000).toFixed(1) +
              ' mm',
          )
        }
        if (id === 'push-up')
          for (const i of human ? [14, 17] : [8, 11, 14, 17]) contact(mins[i], 0, joints[i][0])
        if (id === 'supine-hamstring') {
          contact(props[1], h.mat, 'back')
          contact(props[2], h.head, 'head')
          contact(mins[side === 'left' ? 17 : 14], 0, 'resting foot')
        }
        if (id === 'sciatic-slider-seated') {
          assert(props[0] >= 0.351, which + ' intersects the chair base')
          contact(human ? props[0] : props[3], h.seat, 'chair seat (' + lowestSeat + ')')
          contact(mins[side === 'left' ? 17 : 14], 0, 'supporting foot')
        }
        evaluated++
      }
    }
  console.log('Decoded ' + tier + ' surfaces passed.')
}
console.log(
  evaluated +
    ' surface poses; maximum floor penetration ' +
    (worstFloor * 1000).toFixed(2) +
    ' mm; maximum support distance ' +
    (worstSupport * 1000).toFixed(2) +
    ' mm.',
)
