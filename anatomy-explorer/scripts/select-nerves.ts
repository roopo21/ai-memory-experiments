/**
 * Select the Z-Anatomy nervous-system nodes that extend the BodyParts3D nervous layer:
 * spinal cord, cranial nerves and peripheral nerves. Brain, sense-organ and
 * non-commercial (inner ear) nodes are excluded; the brain stays sourced from BodyParts3D.
 * Writes scripts/nerves-selection.json (pinned by source node name) and nerves-excluded.json.
 */
import { readFileSync, writeFileSync } from 'node:fs'

interface Node {
  name?: string
  mesh?: number
  children?: number[]
}
const buffer = readFileSync('assets-src/nerves/nervous.glb')
const length = buffer.readUInt32LE(12)
const document = JSON.parse(buffer.subarray(20, 20 + length).toString('utf8')) as {
  nodes: Node[]
  meshes: { primitives: { indices: number }[] }[]
  accessors: { count: number }[]
}
const parentOf = new Map<number, number>()
document.nodes.forEach((node, index) =>
  node.children?.forEach((child) => parentOf.set(child, index)),
)
const nameOf = (index: number) => document.nodes[index].name ?? ''
const ancestors = (index: number): string[] => {
  const names: string[] = []
  for (let p = parentOf.get(index); p !== undefined; p = parentOf.get(p)) names.push(nameOf(p))
  return names
}

export type NerveRegion =
  | 'Spinal cord'
  | 'Cranial nerves'
  | 'Upper limb nerves'
  | 'Trunk and pelvic nerves'
  | 'Lower limb nerves'

const CRANIAL = /\((I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)\)/
const RULES: [NerveRegion, RegExp][] = [
  [
    'Spinal cord',
    /spinal cord|spinal nerve|spinal ganglion|spinal dura|cauda equina|^central canal$|tract$|fasciculus|intermediate substance|nucleus proprius|intermediolateral|intermediomedial|reticular process/i,
  ],
  [
    'Upper limb nerves',
    /brachial plexus|pectoral nerve|musculocutaneous|antebrachial|brachial cutaneous|ulnar nerve|axillary nerve|subscapular nerve|radial nerve|interosseous nerve of forearm|thoracodorsal|median nerve|dorsal scapular|long thoracic|subclavian nerve|suprascapular/i,
  ],
  [
    'Trunk and pelvic nerves',
    /sympathetic|intercostal nerves|iliohypogastric|ilio-inguinal|genitofemoral|pudendal/i,
  ],
  [
    'Lower limb nerves',
    /obturator|femoral|saphenous|sciatic|tibial|fibular|plantar|sural|gluteal|piriformis|quadratus femoris|cutaneous nerve of foot/i,
  ],
]
// Spinal grey-matter columns are part of the spinal cord and stay selected.
const SPINAL_GREY = /^(nucleus proprius|intermediolateral nucleus|intermediomedial nucleus)$/i
// Brain and brainstem nuclei, optic structures and eye/ear parts are never imported. The optic
// nerves already come from BodyParts3D, so the Z-Anatomy copies are skipped too.
const NEVER =
  /nucleus|nuclei|cochlea$|vestibule|optic tract|optic nerve|chiasm|pyramid|pyramis|choroid|caudate/i

function classify(index: number): NerveRegion | null {
  const chain = [nameOf(index), ...ancestors(index)]
  if (NEVER.test(nameOf(index)) && !SPINAL_GREY.test(nameOf(index))) return null
  if (chain.some((n) => CRANIAL.test(n))) return 'Cranial nerves'
  for (const [region, pattern] of RULES) if (chain.some((n) => pattern.test(n))) return region
  return null
}

const slug = (name: string) =>
  'ZA_' +
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

function displayName(source: string, parent: string | null): string {
  const own = /\.(l|r)$/.exec(source)
  const parentSide = parent ? /\.(l|r)$/.exec(parent) : null
  const side = own ? own[1] : parentSide ? parentSide[1] : null
  let base = source.replace(/\.(l|r)$/, '')
  if (base.startsWith('(') && base.endsWith(')')) base = base.slice(1, -1)
  if (!side) return base
  return `${side === 'l' ? 'Left' : 'Right'} ${base[0].toLowerCase()}${base.slice(1)}`
}

const selection: {
  id: string
  source: string
  name: string
  region: NerveRegion
  parent: string | null
  triangles: number
}[] = []
const excluded: { source: string; triangles: number }[] = []
document.nodes.forEach((node, index) => {
  if (node.mesh === undefined) return
  const source = node.name ?? ''
  const triangles = document.meshes[node.mesh].primitives.reduce(
    (n, p) => n + document.accessors[p.indices].count / 3,
    0,
  )
  const region = classify(index)
  if (!region) {
    excluded.push({ source, triangles })
    return
  }
  const parentIndex = parentOf.get(index)
  const parent = parentIndex === undefined ? null : nameOf(parentIndex)
  selection.push({
    id: slug(source),
    source,
    name: displayName(source, parent),
    region,
    parent,
    triangles,
  })
})
const ids = new Set<string>()
const sources = new Set<string>()
for (const row of selection) {
  if (ids.has(row.id) || sources.has(row.source))
    throw new Error(`Duplicate selection: ${row.source}`)
  ids.add(row.id)
  sources.add(row.source)
}
selection.sort((a, b) => a.region.localeCompare(b.region) || a.name.localeCompare(b.name))
writeFileSync('scripts/nerves-selection.json', JSON.stringify(selection, null, 2) + '\n')
writeFileSync('scripts/nerves-excluded.json', JSON.stringify(excluded, null, 2) + '\n')
const byRegion = new Map<string, number>()
for (const row of selection) byRegion.set(row.region, (byRegion.get(row.region) ?? 0) + 1)
console.log(
  `Selected ${selection.length} nerve structures (${selection.reduce((n, r) => n + r.triangles, 0).toLocaleString('en-US')} triangles); excluded ${excluded.length}.`,
  Object.fromEntries(byRegion),
)
