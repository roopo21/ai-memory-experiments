/** Keep the extremal target-tissue vertices that extend beyond the skeleton and costume. */
import { writeFile } from 'node:fs/promises'
import { from } from './geometry'
import previews from '../../src/anatomy/generated/previews.json'
import { scores, type AuthoredId } from '../../src/studio/choreography'
import { selectSurfaces } from '../../src/motion/studio/figure'
import { sampleStudio } from '../../src/motion/studio/sample'
import { createMovementRig } from '../../src/motion/movementRig'
import { joints, indexOfJoint, type Joint } from '../../src/motion/joints'
import { lowestBody } from '../../src/motion/studio/guides/ground'
import { newProject } from '../../src/studio/project'
import { format } from 'prettier'
const handJoints = new Set(
  joints
    .map(([name], i) => [name, i] as const)
    .filter(([name]) => /Hand|Thumb|Index|Middle|Ring|Little/.test(name) && !name.includes('Toe'))
    .map(([, i]) => i),
)
const rig = createMovementRig(),
  p = newProject(),
  pairs = joints.map(([name], i) =>
    name.startsWith('left')
      ? indexOfJoint[name.replace('left', 'right') as Joint]
      : name.startsWith('right')
        ? indexOfJoint[name.replace('right', 'left') as Joint]
        : i,
  )
const performer = await from('src/motion/studio/assets/performer.glb', true)
const result: Record<string, number[][]> = {},
  pv = previews.previews as Record<string, { url: string }>
for (const id of Object.keys(scores) as AuthoredId[]) {
  const score = scores[id],
    witness = new Map<string, number[]>()
  for (const side of (score.both ? ['left'] : ['left', 'right']) as ('left' | 'right')[]) {
    const selection = selectSurfaces(id, 'anatomy', side)
    const files = new Set(selection.urls.slice(1).flatMap((url) => [url, pv[url]?.url ?? url]))
    // The performer's skin blends between bones, so near a bent neck it reaches below any rigid
    // bone; its vertices are witnesses too.
    const meshes = [
      ...(await Promise.all([...files].map((url) => from('public' + url))))
        .flat()
        .filter((m) => m.name && selection.selected.has(m.name)),
      ...performer,
    ]
    const times = score.frames.flatMap((f, i) =>
      i
        ? [0.25, 0.5, 0.75, 1].map(
            (t) => score.frames[i - 1].time + (f.time - score.frames[i - 1].time) * t,
          )
        : [0],
    )
    for (const t of times) {
      sampleStudio(rig, id, t, side, p)
      const m = rig.skeleton.boneMatrices!,
        // Grounding measures the body without the hands, so witnesses are sought against it too.
        bound = lowestBody(rig)
      for (const { coords, indices, weights } of meshes) {
        let best = bound + 0.002,
          row = -1
        for (let n = 0, k = 0; n < coords.length; n += 3, k += 4) {
          // Hands rest where their contacts put them; their tissue never lifts the body.
          let largest = k
          for (let j = k; j < k + 4; j++) if (weights[j] > weights[largest]) largest = j
          if (handJoints.has(indices[largest])) continue
          const x = coords[n],
            y = coords[n + 1],
            z = coords[n + 2]
          let height = 0
          for (let j = k; j < k + 4; j++) {
            const w = weights[j]
            if (!w) continue
            const o = indices[j] * 16
            height += w * (x * m[o + 1] + y * m[o + 5] + z * m[o + 9] + m[o + 13])
          }
          if (height < best) {
            row = k
            best = height
          }
        }
        if (row < 0) continue
        const pt = Array.from(coords.slice(row * 0.75, row * 0.75 + 3)),
          packed: number[] = []
        for (let j = row; j < row + 4; j++) {
          if (!weights[j]) continue
          const idx = indices[j],
            loc = joints[idx][2]
          packed.push(
            side === 'left' ? idx : pairs[idx],
            Math.round(weights[j] * 10000),
            ...pt.map((n, axis) =>
              Math.round((n - loc[axis]) * (side === 'right' && axis === 0 ? -10000 : 10000)),
            ),
          )
        }
        witness.set(packed.join(','), packed)
      }
    }
  }
  if (witness.size)
    result[id] = [...witness.values()].sort((a, b) => a.join(',').localeCompare(b.join(',')))
}
await writeFile(
  'src/motion/studio/guides/tissue-contacts.json',
  await format(JSON.stringify(result), { parser: 'json', printWidth: 100 }),
)
console.log(
  Object.values(result).reduce((n, a) => n + a.length, 0) +
    ' weighted surface witnesses for ' +
    Object.keys(result).length +
    ' guides.',
)
