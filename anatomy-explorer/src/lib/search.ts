import { structures, systemById, type Structure } from '../data/anatomy'

export function searchStructures(query: string, limit = 6): Structure[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const scored: [number, Structure][] = []
  for (const s of structures) {
    const name = s.displayName.toLowerCase()
    const mesh = s.meshName.toLowerCase().replace(/_/g, ' ')
    const sys = s.systems.map((id) => systemById.get(id)!.name.toLowerCase())
    let score = 0
    if (name === q) score = 100
    else if (name.startsWith(q)) score = 80
    else if (name.split(' ').some((w) => w.startsWith(q))) score = 70
    else if (name.includes(q) || mesh.includes(q)) score = 50
    else if (sys.some((n) => n.startsWith(q))) score = 20
    if (score) scored.push([score, s])
  }
  return scored
    .sort((a, b) => b[0] - a[0] || a[1].displayName.localeCompare(b[1].displayName))
    .slice(0, limit)
    .map((x) => x[1])
}

/** The structure to auto-select while typing: an exact name match, or the only candidate. */
export function autoPick(query: string, results: Structure[]): Structure | null {
  const q = query.trim().toLowerCase()
  if (q.length < 3 || !results.length) return null
  const exact = results.find((r) => r.displayName.toLowerCase() === q)
  if (exact) return exact
  return results.length === 1 ? results[0] : null
}
