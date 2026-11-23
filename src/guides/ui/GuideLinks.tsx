import { ArrowRight } from 'lucide-react'
import type { Structure } from '../../anatomy/catalogue'
import { groupById, GUIDE_LABEL } from '../library/groups'
import type { GuideKind } from '../library/types'
import { groupsOfMesh, rankExercises } from '../exercises'
import { useAnatomyStore } from '../../state/useAnatomyStore'

/** Detail-card section that links a muscle or nerve to its stretches or glides. */
export default function GuideLinks({ structure }: { structure: Structure }) {
  const startGuide = useAnatomyStore((s) => s.startGuide)
  const kind: GuideKind | null = structure.systems.includes('muscular')
    ? 'stretch'
    : structure.systems.includes('nervous')
      ? 'glide'
      : null
  if (!kind) return null
  const ids = groupsOfMesh(kind, structure.meshName)
  if (!ids.length) return null
  const all = rankExercises(kind, ids)
  const top = all.filter((m) => m.primaryHits.length).slice(0, 3)
  const label = GUIDE_LABEL[kind]
  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        {kind === 'stretch' ? 'Stretches for this muscle' : 'Nerve glides for this nerve'}
      </h3>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Part of {ids.map((id) => groupById[kind].get(id)!.name).join(' and ')}
      </p>
      <ul className="mt-2 space-y-1">
        {top.map((m) => (
          <li key={m.exercise.id}>
            <button
              onClick={() => startGuide(kind, ids, m.exercise.id)}
              className="w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/10"
            >
              {m.exercise.name}
            </button>
          </li>
        ))}
      </ul>
      <button
        onClick={() => startGuide(kind, ids)}
        className="mt-1 flex items-center gap-1 px-2 text-xs text-[var(--accent)] hover:underline"
      >
        See all {all.length} {all.length === 1 ? label.one : label.many}
        <ArrowRight className="h-3 w-3" aria-hidden />
      </button>
    </div>
  )
}
