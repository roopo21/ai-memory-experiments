import { useEffect, useRef } from 'react'
import { structureByMesh } from '../anatomy/catalogue'
import { groupById } from '../guides/library/groups'
import { groupsOfMesh } from '../guides/exercises'
import { useAnatomyStore } from '../state/useAnatomyStore'
import Badges from './Badges'

/** Follows the pointer via direct DOM writes (no React re-render per mousemove). */
export default function Tooltip() {
  const hovered = useAnatomyStore((s) => s.hoveredMesh)
  const mode = useAnatomyStore((s) => s.mode)
  const picked = useAnatomyStore((s) => s.guideGroups)
  const exerciseOpen = useAnatomyStore((s) => s.activeExercise !== null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = ref.current
      if (!el) return
      const x = Math.min(e.clientX + 16, window.innerWidth - el.offsetWidth - 8)
      const y = Math.min(e.clientY + 16, window.innerHeight - el.offsetHeight - 8)
      el.style.transform = `translate(${x}px, ${y}px)`
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  const st = hovered ? structureByMesh.get(hovered) : null
  if (!st) return null
  const ids = mode === 'explore' ? [] : groupsOfMesh(mode, st.meshName)
  const allPicked = ids.length > 0 && ids.every((id) => picked.includes(id))
  return (
    <div
      ref={ref}
      role="tooltip"
      className="glass pointer-events-none fixed left-0 top-0 z-40 max-w-[16rem] rounded-xl px-3 py-2 shadow-xl"
      style={{ transform: 'translate(-999px,-999px)' }}
    >
      {mode !== 'explore' && ids.length > 0 ? (
        <>
          <div className="text-sm font-semibold">
            {ids.map((id) => groupById[mode].get(id)!.name).join(' · ')}
          </div>
          <div className="text-xs text-[var(--muted)]">{st.displayName}</div>
          {!exerciseOpen && (
            <div className="mt-1 text-[11px] text-[var(--accent)]">
              {allPicked ? 'Click to remove' : 'Click to add'} · double-click to frame
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mb-1 text-sm font-semibold">{st.displayName}</div>
          <Badges ids={st.systems} size="sm" />
        </>
      )}
    </div>
  )
}
