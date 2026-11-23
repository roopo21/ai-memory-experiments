import { useEffect, useId, useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { searchStructures, autoPick } from '../anatomy/search'
import { useAnatomyStore } from '../state/useAnatomyStore'
import { SystemIcon } from './icons'
import { systemById, type Structure } from '../anatomy/catalogue'

export default function SearchBox() {
  const select = useAnatomyStore((s) => s.selectStructure)
  const collapse = useAnatomyStore((s) => s.setPanelExpanded)
  const [q, setQ] = useState('')
  const [cursor, setCursor] = useState(0)
  const [open, setOpen] = useState(false)
  const listId = useId()

  const results = useMemo(() => searchStructures(q, 8), [q])

  const pick = (s: Structure) => {
    select(s.meshName, { focus: true, activate: true })
    setQ(s.displayName)
    setOpen(false)
    collapse(false) // on mobile, get the sheet out of the way so the structure is visible
  }

  // Exact or unique names select automatically after a short pause.
  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => {
      const p = autoPick(q, results)
      if (p) pick(p)
    }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, results, open])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setCursor((c) => Math.max(0, Math.min(c + 1, results.length - 1)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => Math.max(c - 1, 0))
    } else if (e.key === 'Enter' && results[cursor]) {
      e.preventDefault()
      pick(results[cursor])
    } else if (e.key === 'Escape') {
      setOpen(false)
      if (!q) (e.target as HTMLElement).blur()
    }
  }

  const showList = open && results.length > 0
  return (
    <div>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
          aria-hidden
        />
        <input
          type="text"
          role="combobox"
          aria-label="Search anatomy"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={showList ? `${listId}-${cursor}` : undefined}
          aria-autocomplete="list"
          placeholder="Find a bone or muscle…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setCursor(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-9 text-sm placeholder:text-[var(--muted)] focus:border-[var(--accent)]/60 focus:outline-none"
        />
        {q && (
          <button
            aria-label="Clear search"
            onClick={() => {
              setQ('')
              setOpen(false)
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--muted)] hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Search results"
          className="mt-1 max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-black/30 p-1"
        >
          {results.map((r, i) => (
            <li
              key={r.meshName}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === cursor}
              onMouseEnter={() => setCursor(i)}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(r)
              }}
              className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-1.5 text-sm ${i === cursor ? 'bg-white/10' : ''}`}
            >
              <span>{r.displayName}</span>
              <span className="flex gap-1">
                {r.systems.map((id) => (
                  <span key={id} style={{ color: systemById.get(id)!.color }}>
                    <SystemIcon id={id} className="h-3.5 w-3.5" />
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
