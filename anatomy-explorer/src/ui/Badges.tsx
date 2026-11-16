import { systemById, type SystemId } from '../data/anatomy'
import { SystemIcon } from './icons'

export default function Badges({ ids, size = 'md' }: { ids: SystemId[]; size?: 'sm' | 'md' }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {ids.map((id) => {
        const s = systemById.get(id)!
        return (
          <span
            key={id}
            data-testid="system-badge"
            className={`inline-flex items-center gap-1 rounded-full font-medium ${size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'}`}
            style={{
              background: `${s.color}22`,
              color: s.color,
              boxShadow: `inset 0 0 0 1px ${s.color}55`,
            }}
          >
            <SystemIcon id={id} className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
            {s.name}
          </span>
        )
      })}
    </span>
  )
}
