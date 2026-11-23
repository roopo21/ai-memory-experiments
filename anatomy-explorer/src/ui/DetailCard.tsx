import { useEffect } from 'react'
import { Crosshair, X } from 'lucide-react'
import { structureByMesh } from '../data/anatomy'
import { useAnatomyStore } from '../store/useAnatomyStore'
import Badges from './Badges'
import GuideLinks from './guide/GuideLinks'

export default function DetailCard() {
  const hide = useAnatomyStore((s) => s.hideStructure)
  const selected = useAnatomyStore((s) => s.selectedMesh)
  const clear = useAnatomyStore((s) => s.clearSelection)
  const select = useAnatomyStore((s) => s.selectStructure)
  const st = selected ? structureByMesh.get(selected) : null

  useEffect(() => {
    if (!selected) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clear()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected, clear])

  if (!st) return null
  return (
    <section
      key={st.meshName}
      aria-label={`${st.displayName} details`}
      className="card-in glass pointer-events-auto absolute left-3 right-3 top-16 z-30 max-h-[40dvh] overflow-y-auto rounded-2xl p-4 shadow-2xl md:left-auto md:right-4 md:top-4 md:max-h-[calc(100dvh-2rem)] md:w-[22rem]"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold leading-tight">{st.displayName}</h2>
        <div className="flex shrink-0 gap-1">
          <button
            aria-label={`Focus camera on ${st.displayName}`}
            onClick={() => select(st.meshName, { focus: true })}
            className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-white/10 hover:text-white"
          >
            <Crosshair className="h-4 w-4" aria-hidden />
          </button>
          <button
            aria-label="Close details"
            onClick={clear}
            className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
      <button
        onClick={() => hide(st.meshName)}
        className="mt-2 rounded-lg border border-white/20 px-3 py-1.5 text-xs hover:bg-white/10"
      >
        Hide this structure
      </button>
      <div className="mt-2">
        <Badges ids={st.systems} />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-[var(--text)]/90">{st.description}</p>
      {st.source && (
        <a
          href={st.source}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block text-xs text-[var(--muted)] underline"
        >
          View original source mesh
        </a>
      )}
      <GuideLinks structure={st} />
      <h3 className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        Key facts
      </h3>
      <ul className="mt-1.5 space-y-1.5 text-sm text-[var(--text)]/85">
        {st.facts.map((f) => (
          <li key={f} className="flex gap-2">
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" />
            {f}
          </li>
        ))}
      </ul>
    </section>
  )
}
