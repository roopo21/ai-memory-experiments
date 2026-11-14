import { useRef } from 'react'
import { Check } from 'lucide-react'
import { systems } from '../data/anatomy'
import { useAnatomyStore } from '../store/useAnatomyStore'
import { SystemIcon } from './icons'

/** Multi-select list with a roving tabindex: one tab stop, arrow keys move, Space/Enter toggle. */
export default function SystemList() {
  const active = useAnatomyStore((s) => s.activeSystems)
  const toggle = useAnatomyStore((s) => s.toggleSystem)
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const focusIdx = useRef(0)

  const move = (i: number) => {
    const n = (i + systems.length) % systems.length
    focusIdx.current = n
    refs.current[n]?.focus()
  }
  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    const map: Record<string, number> = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: systems.length - 1 }
    if (e.key in map) { e.preventDefault(); move(map[e.key]) }
  }

  return (
    <ul role="group" aria-label="Body systems" className="flex flex-col gap-1">
      {systems.map((s, i) => {
        const on = active.includes(s.id)
        return (
          <li key={s.id}>
            <button
              ref={(el) => { refs.current[i] = el }}
              aria-label={`${s.name} system`}
              aria-pressed={on}
              tabIndex={i === focusIdx.current ? 0 : -1}
              onFocus={() => { focusIdx.current = i }}
              onKeyDown={(e) => onKeyDown(e, i)}
              onClick={() => toggle(s.id)}
              title={s.description}
              style={{ '--c': s.color } as React.CSSProperties}
              className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm transition-all ${
                on ? 'border-[color:var(--c)]/60 bg-[color:var(--c)]/12 text-white' : 'border-transparent text-[var(--text)] hover:bg-white/5'
              }`}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors"
                style={{ background: on ? s.color : `${s.color}26`, color: on ? '#0b0f17' : s.color }}
              >
                <SystemIcon id={s.id} />
              </span>
              <span className="flex-1 font-medium">{s.name}</span>
              {on && <Check className="h-4 w-4" style={{ color: s.color }} aria-hidden />}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
