import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { areas, groupById, groups, GUIDE_LABEL } from '../library/groups'
import { referenceById } from '../library/references'
import type { ExerciseType, Group, GuideKind, Position } from '../library/types'
import { GUIDE_PALETTE } from '../../viewer/appearance'
import { library, POSITION_LABEL, rankExercises, TYPE_LABEL, type Match } from '../exercises'
import { useAnatomyStore } from '../../state/useAnatomyStore'

const TYPES: Record<GuideKind, ExerciseType[]> = {
  stretch: ['static', 'dynamic'],
  glide: ['slider', 'tensioner', 'sequence'],
}
const POSITIONS = Object.keys(POSITION_LABEL) as Position[]

/** Exercises that reach each group at all, aimed at it or not. */
const reach = Object.fromEntries(
  (['stretch', 'glide'] as const).map((kind) => {
    const counts = new Map<string, number>()
    for (const e of library[kind])
      for (const id of new Set([...e.primary, ...e.secondary]))
        counts.set(id, (counts.get(id) ?? 0) + 1)
    return [kind, counts]
  }),
) as Record<GuideKind, Map<string, number>>

const INTRO: Record<GuideKind, string> = {
  stretch:
    'Pick muscles on the body or by area. Stretches that lengthen them are listed best match first. Stretch to mild tension, never pain, and do not bounce.',
  glide:
    'Pick nerves on the body or by area. Glides that move them are listed best match first. Start with sliders.',
}

export default function GuidePanel({ kind }: { kind: GuideKind }) {
  const selected = useAnatomyStore((s) => s.guideGroups)
  const active = useAnatomyStore((s) => s.activeExercise)
  const toggle = useAnatomyStore((s) => s.toggleGuideGroup)
  const clear = useAnatomyStore((s) => s.clearGuideGroups)
  const open = useAnatomyStore((s) => s.openExercise)
  const collapse = useAnatomyStore((s) => s.setPanelExpanded)
  const skeleton = useAnatomyStore((s) => s.layers.skeletal.visible)
  const setLayerVisible = useAnatomyStore((s) => s.setLayerVisible)
  const [area, setArea] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [position, setPosition] = useState<Position | 'any'>('any')
  const [type, setType] = useState<ExerciseType | 'any'>('any')
  const [noEquipment, setNoEquipment] = useState(false)

  const label = GUIDE_LABEL[kind]
  const q = query.trim().toLowerCase()
  const matches = useMemo(
    () => rankExercises(kind, selected, { position, type, noEquipment, query: q }),
    [kind, selected, position, type, noEquipment, q],
  )
  const positions = POSITIONS.filter((p) => library[kind].some((e) => e.position === p))
  const groupHits = q
    ? groups[kind].filter(
        (g) =>
          g.name.toLowerCase().includes(q) || g.members.some((m) => m.toLowerCase().includes(q)),
      )
    : []
  const nameOf = (id: string) => groupById[kind].get(id)?.name ?? id
  const style = { '--hl': GUIDE_PALETTE[kind].primary } as React.CSSProperties

  const chip = (g: Group) => {
    const on = selected.includes(g.id)
    return (
      <button
        key={g.id}
        aria-pressed={on}
        title={g.members.join(', ')}
        onClick={() => toggle(g.id)}
        className={`rounded-full border px-2.5 py-1 text-left text-xs transition-colors ${
          on
            ? 'border-[color:var(--hl)] bg-[color:var(--hl)]/20 text-white'
            : 'border-white/15 text-[var(--text)] hover:bg-white/10'
        }`}
      >
        {g.name}
        <span className="ml-1 text-[var(--muted)]">{reach[kind].get(g.id) ?? 0}</span>
      </button>
    )
  }

  const heading = selected.length
    ? `${matches.length} ${matches.length === 1 ? label.one : label.many} for ${selected.map(nameOf).join(', ')}`
    : q
      ? `${matches.length} ${matches.length === 1 ? label.one : label.many} matching “${query.trim()}”`
      : `All ${matches.length} ${label.many}, head to toe`

  return (
    <div className="space-y-3 px-1 pb-4" style={style}>
      <p className="text-xs leading-relaxed text-[var(--muted)]">{INTRO[kind]}</p>
      {kind === 'glide' && <GlideSafety />}

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
          aria-hidden
        />
        <input
          type="search"
          aria-label={`Search ${label.many} and ${label.target}s`}
          placeholder={`Find a ${label.target} or ${label.one}…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm placeholder:text-[var(--muted)] focus:border-[var(--accent)]/60 focus:outline-none"
        />
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Selected body parts">
          {selected.map((id) => (
            <button
              key={id}
              onClick={() => toggle(id)}
              aria-label={`Remove ${nameOf(id)}`}
              className="flex items-center gap-1 rounded-full bg-[color:var(--hl)]/20 px-2.5 py-1 text-xs text-white ring-1 ring-[color:var(--hl)]/60 hover:bg-[color:var(--hl)]/30"
            >
              {nameOf(id)}
              <X className="h-3 w-3" aria-hidden />
            </button>
          ))}
          <button onClick={clear} className="px-1 text-xs text-[var(--muted)] underline">
            Clear
          </button>
        </div>
      )}

      {q ? (
        groupHits.length > 0 && (
          <div>
            <SectionLabel>{`Matching ${label.target}s`}</SectionLabel>
            <div className="flex flex-wrap gap-1.5">{groupHits.map(chip)}</div>
          </div>
        )
      ) : (
        <div>
          <SectionLabel>Body areas</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {areas[kind].map((a) => {
              const picked = groups[kind].filter((g) => g.area === a && selected.includes(g.id))
              return (
                <button
                  key={a}
                  aria-expanded={area === a}
                  onClick={() => setArea(area === a ? null : a)}
                  className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs transition-colors ${
                    area === a
                      ? 'border-white/40 bg-white/15 text-white'
                      : 'border-white/10 bg-white/5 text-[var(--text)] hover:bg-white/10'
                  }`}
                >
                  {a}
                  {picked.length > 0 && (
                    <span className="rounded-full bg-[color:var(--hl)] px-1.5 text-[10px] font-semibold text-slate-900">
                      {picked.length}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          {area && (
            <div className="mt-2 flex flex-wrap gap-1.5 rounded-xl border border-white/10 bg-white/5 p-2">
              {groups[kind].filter((g) => g.area === area).map(chip)}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <select
          aria-label="Position"
          value={position}
          onChange={(e) => setPosition(e.target.value as Position | 'any')}
          className="rounded-lg border border-white/15 bg-slate-900 px-2 py-1.5"
        >
          <option value="any">Any position</option>
          {positions.map((p) => (
            <option key={p} value={p}>
              {POSITION_LABEL[p]}
            </option>
          ))}
        </select>
        <select
          aria-label="Type"
          value={type}
          onChange={(e) => setType(e.target.value as ExerciseType | 'any')}
          className="rounded-lg border border-white/15 bg-slate-900 px-2 py-1.5"
        >
          <option value="any">Any type</option>
          {TYPES[kind].map((t) => (
            <option key={t} value={t}>
              {TYPE_LABEL[t]}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5">
          <input
            type="checkbox"
            checked={noEquipment}
            onChange={(e) => setNoEquipment(e.target.checked)}
          />
          No equipment
        </label>
        <label className="flex items-center gap-1.5 text-[var(--muted)]">
          <input
            type="checkbox"
            checked={skeleton}
            onChange={(e) => setLayerVisible('skeletal', e.target.checked)}
          />
          Skeleton
        </label>
      </div>

      <div>
        <SectionLabel>{heading}</SectionLabel>
        {matches.length === 0 ? (
          <p className="text-xs text-[var(--muted)]">
            No {label.many} match. Clear a filter or pick another {label.target}.
          </p>
        ) : (
          <ul className="space-y-1">
            {matches.map((m) => (
              <li key={m.exercise.id}>
                <ResultRow
                  match={m}
                  kind={kind}
                  active={active === m.exercise.id}
                  hasSelection={selected.length > 0}
                  onOpen={() => {
                    open(m.exercise.id)
                    collapse(false) // on mobile, get the sheet out of the way of the body
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
      {children}
    </p>
  )
}

function ResultRow({
  match,
  kind,
  active,
  hasSelection,
  onOpen,
}: {
  match: Match
  kind: GuideKind
  active: boolean
  hasSelection: boolean
  onOpen: () => void
}) {
  const { exercise, primaryHits, secondaryHits } = match
  const name = (id: string) => groupById[kind].get(id)?.name ?? id
  const aimed = hasSelection ? primaryHits : exercise.primary
  const also = hasSelection ? secondaryHits : []
  return (
    <button
      aria-pressed={active}
      onClick={onOpen}
      className={`w-full rounded-lg border p-2 text-left transition-colors hover:bg-white/10 ${
        active ? 'border-[color:var(--hl)] bg-white/10' : 'border-white/10'
      }`}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium leading-snug">{exercise.name}</span>
        <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-[var(--muted)]">
          {TYPE_LABEL[exercise.type]}
        </span>
      </span>
      <span className="mt-0.5 block text-[11px] leading-snug text-[var(--muted)]">
        {aimed.map(name).join(', ')}
        {also.length > 0 && <span className="italic"> · also {also.map(name).join(', ')}</span>}
        {' · '}
        {POSITION_LABEL[exercise.position]}
        {exercise.equipment.length ? ` · ${exercise.equipment.join(', ')}` : ''}
        {exercise.ref ? ` · ${shortSource(exercise.ref)}` : ''}
      </span>
    </button>
  )
}

/** Publisher name for the result row, e.g. "AAOS" or "NHS". */
function shortSource(ref: string) {
  const label = referenceById.get(ref)?.label ?? ''
  if (label.startsWith('AAOS')) return 'AAOS'
  if (label.includes('NHS')) return 'NHS'
  return label.split(':')[0]
}

function GlideSafety() {
  const coppieters = referenceById.get('coppieters-2008')!
  const basson = referenceById.get('basson-2017')!
  const median = referenceById.get('coppieters-2009')!
  const sciatic = referenceById.get('coppieters-2015')!
  return (
    <details className="rounded-xl border border-amber-300/25 bg-amber-300/5 p-3 text-xs leading-relaxed">
      <summary className="cursor-pointer font-semibold text-amber-100">
        Before you try a nerve glide
      </summary>
      <ul className="mt-2 list-disc space-y-1.5 pl-4 text-[var(--text)]/85">
        <li>
          A glide should feel like a gentle pull or a brief tingle that settles as soon as you stop.
        </li>
        <li>Stop if numbness, tingling or pain spreads, gets stronger or lasts after you stop.</li>
        <li>
          See a clinician first for new weakness, numbness in both legs, or bladder or bowel
          changes.
        </li>
        <li>
          Sliders move a nerve with little strain. Tensioners strain it more, so they come later (
          <a className="underline" href={coppieters.url} target="_blank" rel="noreferrer">
            Coppieters and Butler, 2008
          </a>
          ).
        </li>
        <li>
          Ultrasound studies in people confirm that different glides move the{' '}
          <a className="underline" href={median.url} target="_blank" rel="noreferrer">
            median
          </a>{' '}
          and{' '}
          <a className="underline" href={sciatic.url} target="_blank" rel="noreferrer">
            sciatic
          </a>{' '}
          nerves by very different amounts.
        </li>
        <li>
          A 2017 review found benefit for back and neck pain. For other conditions the effect is
          still unclear (
          <a className="underline" href={basson.url} target="_blank" rel="noreferrer">
            Basson et al.
          </a>
          ).
        </li>
      </ul>
    </details>
  )
}
