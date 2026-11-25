import { useEffect } from 'react'
import type { ClipId } from '../../studio/clips'
import { enterStudio } from '../../studio/navigation'
import { Crosshair, Lightbulb, TriangleAlert, X } from 'lucide-react'
import { groupById, GUIDE_LABEL } from '../library/groups'
import { referenceById } from '../library/references'
import type { GuideKind } from '../library/types'
import { GUIDE_PALETTE } from '../../viewer/appearance'
import { exerciseById, POSITION_LABEL, TYPE_LABEL } from '../exercises'
import { useAnatomyStore } from '../../state/useAnatomyStore'

const TYPE_HINT = {
  static: 'Ease into the position and hold it still.',
  dynamic: 'Move slowly through the range without bouncing.',
  slider: 'Keep moving. One end of the nerve tightens while the other end relaxes.',
  tensioner: 'Both ends of the nerve tighten together, so stop at a mild pull.',
  sequence: 'Move through each position in order.',
} as const

/** Used when an exercise has no handout of its own. */
const GENERAL: Record<GuideKind, { ref: string; text: string }> = {
  stretch: { ref: 'acsm-2011', text: 'Written for this guide. The default dose follows' },
  glide: {
    ref: 'coppieters-2008',
    text: 'Written for this guide on the slider and tensioner model in',
  },
}

export default function ExerciseCard() {
  const mode = useAnatomyStore((s) => s.mode)
  const id = useAnatomyStore((s) => s.activeExercise)
  const open = useAnatomyStore((s) => s.openExercise)
  const recenter = useAnatomyStore((s) => s.recenter)

  useEffect(() => {
    if (!id) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') open(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [id, open])

  if (mode === 'explore' || !id) return null
  const exercise = exerciseById[mode].get(id)
  if (!exercise) return null
  const palette = GUIDE_PALETTE[mode]
  const source = exercise.ref ? referenceById.get(exercise.ref) : undefined
  const general = referenceById.get(GENERAL[mode].ref)!
  const name = (gid: string) => groupById[mode].get(gid)?.name ?? gid
  const members = (gid: string) => groupById[mode].get(gid)?.members.join(', ') ?? ''

  return (
    <section
      key={exercise.id}
      aria-label={`${exercise.name} instructions`}
      className="card-in glass pointer-events-auto absolute left-3 right-3 top-16 z-30 max-h-[45dvh] overflow-y-auto rounded-2xl p-4 shadow-2xl md:left-auto md:right-4 md:top-4 md:max-h-[calc(100dvh-2rem)] md:w-[22rem]"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold leading-tight">{exercise.name}</h2>
        <div className="flex shrink-0 gap-1">
          <button
            aria-label="Frame the target on the body"
            onClick={recenter}
            className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-white/10 hover:text-white"
          >
            <Crosshair className="h-4 w-4" aria-hidden />
          </button>
          <button
            aria-label={`Close ${GUIDE_LABEL[mode].one}`}
            onClick={() => open(null)}
            className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
        <span className="rounded-full bg-white/10 px-2 py-0.5" title={TYPE_HINT[exercise.type]}>
          {TYPE_LABEL[exercise.type]}
        </span>
        <span className="rounded-full bg-white/10 px-2 py-0.5">
          {POSITION_LABEL[exercise.position]}
        </span>
        <span className="rounded-full bg-white/10 px-2 py-0.5">
          {exercise.equipment.length ? exercise.equipment.join(', ') : 'No equipment'}
        </span>
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">{TYPE_HINT[exercise.type]}</p>

      <div className="mt-3 space-y-1.5 text-xs">
        <TargetRow
          color={palette.primary}
          label="Aimed at"
          ids={exercise.primary}
          name={name}
          members={members}
        />
        {exercise.secondary.length > 0 && (
          <TargetRow
            color={palette.secondary}
            label="Also reaches"
            ids={exercise.secondary}
            name={name}
            members={members}
          />
        )}
      </div>

      <button
        type="button"
        className="mt-3 rounded-lg border border-white/20 px-3 py-2 text-xs"
        onClick={() => enterStudio(id as ClipId)}
      >
        Preview in Motion Lab
      </button>
      <h3 className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        How to do it
      </h3>
      <ol className="mt-1.5 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-[var(--text)]/90">
        {exercise.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <dl className="mt-4 space-y-2 text-sm">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Where you should feel it
          </dt>
          <dd className="mt-0.5 text-[var(--text)]/90">{exercise.feel}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            How much
          </dt>
          <dd className="mt-0.5 text-[var(--text)]/90">{exercise.dose}</dd>
        </div>
      </dl>

      {exercise.tip && (
        <p className="mt-3 flex gap-2 rounded-lg bg-white/5 p-2 text-xs leading-relaxed text-[var(--text)]/85">
          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent)]" aria-hidden />
          {exercise.tip}
        </p>
      )}
      {exercise.caution && (
        <p className="mt-2 flex gap-2 rounded-lg bg-amber-300/10 p-2 text-xs leading-relaxed text-amber-100">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {exercise.caution}
        </p>
      )}

      <p className="mt-4 border-t border-white/10 pt-3 text-[11px] leading-relaxed text-[var(--muted)]">
        {source ? (
          <>
            Described in{' '}
            <a className="underline" href={source.url} target="_blank" rel="noreferrer">
              {source.label}
            </a>
            .
          </>
        ) : (
          <>
            {GENERAL[mode].text}{' '}
            <a className="underline" href={general.url} target="_blank" rel="noreferrer">
              {general.label}
            </a>
            .
          </>
        )}{' '}
        For education only. Stop if it hurts, and check with a clinician if symptoms persist.
      </p>
    </section>
  )
}

function TargetRow({
  color,
  label,
  ids,
  name,
  members,
}: {
  color: string
  label: string
  ids: string[]
  name: (id: string) => string
  members: (id: string) => string
}) {
  return (
    <div className="flex items-start gap-2">
      <span
        className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ background: color }}
        aria-hidden
      />
      <span>
        <span className="text-[var(--muted)]">{label}: </span>
        {ids.map((id, i) => (
          <span key={id} title={members(id)}>
            {i > 0 && ', '}
            {name(id)}
          </span>
        ))}
      </span>
    </div>
  )
}
