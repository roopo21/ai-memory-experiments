import type { AnchorSpace, EndJoint, Pin } from './pins'
import { create } from 'zustand'
import { clipInfo, isClip, type Angle, type ClipId, type Figure, type Side } from './clips'
import { newProject, readProject, type Project } from './project'

interface Session {
  author?: {
    copy: () => Project
    check: (p: Project) => string
    pin: (p: Project, t: number, limb: EndJoint, space: AnchorSpace, point: Pin['point']) => Pin
  }
  clip: ClipId
  side: Side
  figure: Figure
  angle: Angle
  detail: boolean
  time: number
  playing: boolean
  speed: number
  loop: boolean
  ready: boolean
  clean: boolean
  project: Project
  error: string
  resetCamera: number
}
export const storageKey = 'anatomy-explorer.motion.v1'
export function loadProject() {
  try {
    const json = localStorage.getItem(storageKey)
    return { project: json ? readProject(json) : newProject(), error: '' }
  } catch {
    return {
      project: newProject(),
      error: 'Saved motion could not be read. Import a backup or start a new motion.',
    }
  }
}
export function initialSession(params: URLSearchParams): Session {
  const id = params.get('studio'),
    figure = params.get('figure')
  return {
    clip: isClip(id) ? id : 'push-up',
    side: params.get('side') === 'right' ? 'right' : 'left',
    figure: figure === 'human' || figure === 'bones' || figure === 'pair' ? figure : 'anatomy',
    angle:
      (['Teaching', 'Side', 'Front', 'Back', 'Overhead'] as Angle[]).find(
        (a) => a === params.get('angle'),
      ) ?? 'Teaching',
    detail: params.get('detail') === '1',
    time: 0,
    playing: false,
    speed: 1,
    loop: false,
    ready: false,
    clean: params.get('capture') === '1' && params.get('clean') === '1',
    resetCamera: 0,
    ...loadProject(),
  }
}
const initial =
  typeof window === 'undefined'
    ? { ...initialSession(new URLSearchParams()), error: '' }
    : initialSession(new URLSearchParams(location.search))
export const useStudio = create<Session>(() => initial)
const state = useStudio.getState,
  set = useStudio.setState
export const lengthOf = (s: Session) =>
  s.clip === 'custom' ? s.project.frames.at(-1)!.time : clipInfo(s.clip).seconds
function saveUrl(s: Session) {
  if (typeof window === 'undefined') return
  const url = new URL(location.href)
  url.searchParams.set('studio', s.clip)
  url.searchParams.set('figure', s.figure)
  if (clipInfo(s.clip).unilateral) url.searchParams.set('side', s.side)
  else url.searchParams.delete('side')
  history.replaceState(history.state, '', url)
}
export function chooseClip(clip: ClipId) {
  if (clip === state().clip) return
  set({
    clip,
    side: 'left',
    time: 0,
    playing: false,
    ready: false,
    angle: 'Teaching',
    loop: false,
    error: '',
  })
  saveUrl(state())
}
export function chooseFigure(figure: Figure) {
  if (figure === state().figure) return
  set({ figure, ready: false, error: '' })
  saveUrl(state())
}
export function chooseSide(side: Side) {
  if (side === state().side) return
  set({ side, time: 0, ready: false, playing: false, error: '' })
  saveUrl(state())
}
export function seek(time: number) {
  if (Number.isFinite(time))
    set({ time: Math.max(0, Math.min(time, lengthOf(state()))), playing: false })
}
export function togglePlay() {
  const s = state()
  if (s.playing) {
    set({ playing: false })
    return
  }
  if (s.ready) set({ playing: true, time: s.time >= lengthOf(s) ? 0 : s.time })
}
export function tick(seconds: number) {
  const s = state()
  if (!s.playing || !s.ready || seconds <= 0 || !Number.isFinite(seconds)) return
  const end = lengthOf(s),
    next = s.time + seconds * s.speed
  if (next >= end && !s.loop) set({ time: end, playing: false })
  else set({ time: s.loop ? next % end : next })
}
export function saveProject(project: Project, time: number) {
  const clipChanged = state().clip !== 'custom'
  let error = ''
  try {
    localStorage.setItem(storageKey, JSON.stringify(project))
  } catch {
    error = 'This browser could not save the motion. Use Download motion to keep a copy.'
  }
  set({
    project,
    clip: 'custom',
    time: Math.min(time, project.frames.at(-1)!.time),
    playing: false,
    loop: false,
    error,
    ...(clipChanged ? { ready: false, angle: 'Teaching' as const } : {}),
  })
  saveUrl(state())
}
