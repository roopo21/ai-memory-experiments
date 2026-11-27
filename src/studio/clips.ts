import { scores, hasScore, type AuthoredId } from './choreography'
import type { Project } from './project'
import { exerciseById } from '../guides/exercises'
import type { GuideKind } from '../guides/library/types'

export type Side = 'left' | 'right'
export type Figure = 'anatomy' | 'human' | 'bones' | 'pair' | 'muscles'
export type Angle = 'Teaching' | 'Side' | 'Front' | 'Back' | 'Overhead' | 'Focus'
export type Phase = readonly [number, string]
type Clip = {
  name: string
  seconds: number
  phases: Phase[]
  posture: 'prone' | 'supine' | 'seated' | 'standing'
  travels?: boolean
  unilateral?: boolean
  kind?: GuideKind
  primary?: string[]
  secondary?: string[]
  guide?: string
}

export const studioPresets = {
  'push-up': {
    name: 'Push-up',
    seconds: 4,
    posture: 'prone',
    primary: ['pec-major', 'triceps'],
    secondary: ['deltoid-anterior'],
    phases: [
      [0, 'High plank'],
      [1.8, 'Bottom'],
      [3.75, 'Press up'],
    ],
  },
  'supine-hamstring': {
    name: 'Supine hamstring stretch',
    seconds: 8,
    posture: 'supine',
    unilateral: true,
    guide: 'supine-hamstring',
    kind: 'stretch',
    phases: [
      [0, 'Support the thigh'],
      [2.5, 'Straighten and hold'],
      [5.5, 'Release'],
      [8, 'Return'],
    ],
  },
  'sciatic-slider-seated': {
    name: 'Seated sciatic slider',
    seconds: 6,
    posture: 'seated',
    unilateral: true,
    guide: 'sciatic-slider-seated',
    kind: 'glide',
    phases: [
      [0, 'Seated setup'],
      [2.75, 'Extend and look up'],
      [6, 'Lower and nod'],
    ],
  },
  squat: {
    name: 'Bodyweight squat',
    seconds: 4,
    posture: 'standing',
    primary: ['quadriceps', 'glute-max'],
    phases: [
      [0, 'Stand'],
      [2, 'Lower'],
      [4, 'Rise'],
    ],
  },
  curl: {
    name: 'Elbow curl',
    seconds: 4,
    posture: 'standing',
    unilateral: true,
    primary: ['biceps'],
    phases: [
      [0, 'Start'],
      [2, 'Flex elbow'],
      [4, 'Lower'],
    ],
  },
  wheel: {
    name: 'Yoga backbend hold',
    seconds: 4,
    posture: 'supine',
    phases: [[0, 'Hold the bridge']],
  },
  moonwalk: {
    name: 'Moonwalk',
    seconds: 3.3,
    posture: 'standing',
    phases: [
      [0, 'Glide'],
      [1.65, 'Repeat step'],
    ],
  },
  cartwheel: {
    name: 'Cartwheel',
    travels: true,
    seconds: 3.7,
    posture: 'standing',
    phases: [
      [0, 'Set up'],
      [1.85, 'Inversion'],
      [3.7, 'Land'],
    ],
  },
  custom: { name: 'Custom movement', seconds: 4, posture: 'standing', phases: [] },
} satisfies Record<string, Clip>
export type ClipId = keyof typeof studioPresets | AuthoredId
const entries = Object.entries(scores).map(([id, score]) => {
  const kind = exerciseById.glide.has(id) ? 'glide' : 'stretch',
    exercise = exerciseById[kind].get(id)
  if (!exercise) throw Error('Motion has no exercise ' + id)
  const posture: Clip['posture'] =
    score.posture === 'supine' || score.posture === 'side'
      ? 'supine'
      : score.posture === 'prone' || score.posture === 'allFours'
        ? 'prone'
        : ['chair', 'floorSeat', 'longSit', 'straddle', 'butterfly', 'figureFour'].includes(
              score.posture,
            )
          ? 'seated'
          : 'standing'
  return [
    id,
    {
      name: exercise.name,
      travels: id === 'inchworm',
      seconds: score.frames.at(-1)!.time,
      phases: score.frames.map((f, i) => [
        f.time,
        id === 'inchworm' && i === score.frames.length - 1 ? 'Stand at the hands' : f.label,
      ]),
      posture,
      unilateral: !score.both,
      kind,
      guide: id,
    },
  ]
})
export const clips: Record<ClipId, Clip> = {
  ...studioPresets,
  ...Object.fromEntries(entries),
} as Record<ClipId, Clip>
export const guideClip = (id: string): id is ClipId =>
  hasScore(id) || id === 'supine-hamstring' || id === 'sciatic-slider-seated'

export const isClip = (value: unknown): value is ClipId =>
  typeof value === 'string' && Object.hasOwn(clips, value)
export const clipInfo = (id: ClipId): Clip => clips[id]
export function targetsFor(id: ClipId) {
  const clip = clipInfo(id),
    kind = clip.kind ?? 'stretch'
  const guide = clip.guide ? exerciseById[kind].get(clip.guide) : undefined
  return {
    kind,
    primary: guide?.primary ?? clip.primary ?? [],
    secondary: guide?.secondary ?? clip.secondary ?? [],
  }
}

export function motionTargets(id: ClipId, target?: Project['target'], base?: Project['base']) {
  if (id !== 'custom') return targetsFor(id)
  if (target) return { kind: target.kind, primary: [target.id], secondary: [] }
  return targetsFor(target === undefined && base ? base.id : 'custom')
}
