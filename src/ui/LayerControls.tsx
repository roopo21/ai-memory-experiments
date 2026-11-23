import { Eye, EyeOff } from 'lucide-react'
import { systems } from '../anatomy/catalogue'
import { useAnatomyStore } from '../state/useAnatomyStore'
import { SystemIcon } from './icons'

export default function LayerControls() {
  const layers = useAnatomyStore((s) => s.layers)
  const setVisible = useAnatomyStore((s) => s.setLayerVisible)
  const setOpacity = useAnatomyStore((s) => s.setLayerOpacity)

  return (
    <ul aria-label="Layer controls" className="flex flex-col gap-1">
      {systems.map((s) => {
        const l = layers[s.id]
        return (
          <li
            key={s.id}
            className="flex items-center gap-2 rounded-lg px-1 py-0.5"
            style={{ '--c': s.color } as React.CSSProperties}
          >
            <button
              onClick={() => setVisible(s.id, !l.visible)}
              aria-pressed={l.visible}
              aria-label={`${l.visible ? 'Hide' : 'Show'} ${s.name} layer`}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-white/10"
              style={{ color: l.visible ? s.color : 'var(--muted)' }}
            >
              {l.visible ? (
                <Eye className="h-4 w-4" aria-hidden />
              ) : (
                <EyeOff className="h-4 w-4" aria-hidden />
              )}
            </button>
            <span
              className={`flex w-[7rem] shrink-0 items-center gap-1.5 truncate text-xs ${l.visible ? '' : 'text-[var(--muted)]'}`}
            >
              <SystemIcon id={s.id} className="h-3 w-3 shrink-0" />
              {s.name}
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(l.opacity * 100)}
              disabled={!l.visible}
              aria-label={`${s.name} opacity`}
              onChange={(e) => setOpacity(s.id, +e.target.value / 100)}
              className="min-w-0 flex-1 disabled:opacity-40"
            />
            <span className="w-8 text-right text-[11px] tabular-nums text-[var(--muted)]">
              {Math.round(l.opacity * 100)}%
            </span>
          </li>
        )
      })}
    </ul>
  )
}
