import { Compass, PersonStanding, Waves, type LucideIcon } from 'lucide-react'
import type { GuideMode } from '../library/types'
import { useAnatomyStore } from '../../state/useAnatomyStore'

const MODES: { id: GuideMode; label: string; icon: LucideIcon; hint: string }[] = [
  { id: 'explore', label: 'Explore', icon: Compass, hint: 'Browse every system and structure' },
  { id: 'stretch', label: 'Stretches', icon: PersonStanding, hint: 'Pick muscles, get stretches' },
  { id: 'glide', label: 'Nerve glides', icon: Waves, hint: 'Pick nerves, get nerve glides' },
]

export default function ModeSwitch() {
  const mode = useAnatomyStore((s) => s.mode)
  const setMode = useAnatomyStore((s) => s.setMode)
  return (
    <div
      role="group"
      aria-label="Mode"
      className="grid grid-cols-3 gap-1 rounded-xl border border-white/10 bg-white/5 p-1"
    >
      {MODES.map(({ id, label, icon: Icon, hint }) => {
        const on = mode === id
        return (
          <button
            key={id}
            aria-pressed={on}
            title={hint}
            onClick={() => !on && setMode(id)}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1.5 text-xs font-medium transition-colors ${
              on
                ? 'bg-[var(--accent)]/15 text-white ring-1 ring-[var(--accent)]/50'
                : 'text-[var(--muted)] hover:bg-white/10 hover:text-white'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="whitespace-nowrap">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
