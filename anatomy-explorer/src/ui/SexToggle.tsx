import { useRef } from 'react'
import type { Sex } from '../data/anatomy'
import { useAnatomyStore } from '../store/useAnatomyStore'

const OPTIONS: { value: Sex; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
]

export default function SexToggle() {
  const sex = useAnatomyStore((s) => s.sex)
  const setSex = useAnatomyStore((s) => s.setSex)
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return
    e.preventDefault()
    const next = (i + 1) % OPTIONS.length
    setSex(OPTIONS[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div role="radiogroup" aria-label="Body model" className="glass flex rounded-full p-1 text-sm">
      {OPTIONS.map((o, i) => {
        const on = sex === o.value
        return (
          <button
            key={o.value}
            ref={(el) => { refs.current[i] = el }}
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => setSex(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`rounded-full px-4 py-1.5 font-medium transition-colors ${on ? 'bg-white/15 text-white' : 'text-[var(--muted)] hover:text-white'}`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
