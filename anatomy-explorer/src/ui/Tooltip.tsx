import { useEffect, useRef } from 'react'
import { structureByMesh } from '../data/anatomy'
import { useAnatomyStore } from '../store/useAnatomyStore'
import Badges from './Badges'

/** Follows the pointer via direct DOM writes (no React re-render per mousemove). */
export default function Tooltip() {
  const hovered = useAnatomyStore((s) => s.hoveredMesh)
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
  return (
    <div ref={ref} role="tooltip" className="glass pointer-events-none fixed left-0 top-0 z-40 max-w-[16rem] rounded-xl px-3 py-2 shadow-xl" style={{ transform: 'translate(-999px,-999px)' }}>
      <div className="mb-1 text-sm font-semibold">{st.displayName}</div>
      <Badges ids={st.systems} size="sm" />
    </div>
  )
}
