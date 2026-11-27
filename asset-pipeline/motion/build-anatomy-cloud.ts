/**
 * Contact witnesses of the anatomy tier alone: the skeleton and every muscle, which are what the
 * atlas figure draws. The performer's costume and skin are left out, so grounding the atlas can
 * tell how far its bare tissue sits from the floor (the clothed performer rests lower because skin
 * and fat sit below the muscle). Same extremal-vertex method as `build-contact-cloud.ts`; the
 * result is stored in bind coordinates in millimetres.
 *
 *   npx tsx asset-pipeline/motion/build-anatomy-cloud.ts
 */
import { writeFile } from 'node:fs/promises'
import { format, resolveConfig } from 'prettier'
import previews from '../../src/anatomy/generated/previews.json'
import { layerSources, skeletonUrl } from '../../src/anatomy/catalogue'
import { from } from './geometry'
import { joints } from '../../src/motion/joints'

const pv = previews.previews as Record<string, { url: string }>
const directions = Array.from({ length: 64 }, (_, i) => {
  const y = 1 - (2 * (i + 0.5)) / 64,
    r = Math.sqrt(1 - y * y),
    a = i * Math.PI * (3 - Math.sqrt(5))
  return [Math.cos(a) * r, y, Math.sin(a) * r]
})
directions.push([1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1])
const maxima = joints.map(() => directions.map(() => -Infinity)),
  chosen = joints.map(() => directions.map(() => [] as number[]))
const urls = layerSources
  .filter((l) => l.url === skeletonUrl || l.systems.includes('muscular'))
  .map((l) => 'public' + (pv[l.url]?.url ?? l.url))
for (const url of [...new Set(urls)])
  for (const { coords, indices, weights } of await from(url)) {
    for (let i = 0, k = 0; i < coords.length; i += 3, k += 4) {
      const j = weights[k + 1] > weights[k] ? indices[k + 1] : indices[k]
      const x = coords[i],
        y = coords[i + 1],
        z = coords[i + 2]
      for (let d = 0; d < directions.length; d++) {
        const dot = directions[d][0] * x + directions[d][1] * y + directions[d][2] * z
        if (dot > maxima[j][d]) {
          maxima[j][d] = dot
          chosen[j][d] = [x, y, z].map((n) => Math.round(n * 1000))
        }
      }
    }
  }
const groups = chosen.map((list) => {
  const seen = new Set<string>()
  return list.filter((p) => p.length && !seen.has(p.join()) && seen.add(p.join())).flat()
})
const output = 'src/motion/studio/guides/anatomy-cloud.json'
await writeFile(
  output,
  await format(JSON.stringify(groups), { ...(await resolveConfig(output)), filepath: output }),
)
console.log(groups.reduce((n, g) => n + g.length / 3, 0) + ' anatomy witnesses.')
