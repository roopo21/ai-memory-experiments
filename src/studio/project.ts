import { isClip, type ClipId, type Side } from './clips'
import { readPins, type Pin } from './pins'
import { groupById } from '../guides/library/groups'
import type { GuideKind } from '../guides/library/types'
import { indexOfJoint, type Joint, type Triple } from '../motion/joints'

export interface KeyPose {
  time: number
  label: string
  root: Triple
  angles: Partial<Record<Joint, Triple>>
}
export interface Project {
  version: 1
  name: string
  frames: KeyPose[]
  plantFeet: boolean
  target?: { kind: GuideKind; id: string } | null
  base?: { id: Exclude<ClipId, 'custom'>; side: Side }
  prop?: 'chair' | 'mat'
  pins?: Pin[]
}
const neutral = (time: number, label: string): KeyPose => ({
  time,
  label,
  root: [0, 0, 0],
  angles: {},
})
export const newProject = (): Project => ({
  version: 1,
  name: 'My movement',
  plantFeet: false,
  frames: [neutral(0, 'Start'), neutral(2, 'Pose'), neutral(4, 'Return')],
})
const object = (v: unknown): v is Record<string, unknown> =>
  Boolean(v && typeof v === 'object' && !Array.isArray(v))
const finite = (v: unknown, bound: number): v is number =>
  typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= bound
function triple(v: unknown, bound: number): Triple {
  if (!Array.isArray(v) || v.length !== 3 || !v.every((n) => finite(n, bound)))
    throw Error('Expected three finite coordinates within range.')
  return [v[0], v[1], v[2]]
}
function label(v: unknown) {
  if (typeof v !== 'string' || !v.trim() || v.length > 80)
    throw Error('Names must contain 1–80 characters.')
  return v.trim()
}
export const maxProjectBytes = 1_600_000
export function readProject(input: string): Project {
  if (input.length > maxProjectBytes) throw Error('The motion file exceeds 1.6 MB.')
  let v: unknown
  try {
    v = JSON.parse(input)
  } catch {
    throw Error('The motion file must contain valid JSON.')
  }
  if (
    !object(v) ||
    v.version !== 1 ||
    typeof v.plantFeet !== 'boolean' ||
    !Array.isArray(v.frames) ||
    v.frames.length < 2 ||
    v.frames.length > 512
  )
    throw Error('Use a version 1 motion with 2–512 keyframes.')
  let previous = -1
  const frames = v.frames.map((f: unknown, i: number): KeyPose => {
    if (
      !object(f) ||
      !finite(f.time, 60) ||
      f.time < 0 ||
      (i === 0 && f.time !== 0) ||
      f.time - previous < 0.049999 ||
      !object(f.angles)
    )
      throw Error('Start at 0 s, separate keyframes by at least 0.05 s, and end within 60 s.')
    previous = f.time
    const angles: KeyPose['angles'] = {}
    for (const [key, a] of Object.entries(f.angles)) {
      if (!Object.hasOwn(indexOfJoint, key)) throw Error('Unknown joint ' + key)
      angles[key as Joint] = triple(a, 180)
    }
    return { time: f.time, label: label(f.label), root: triple(f.root, 2), angles }
  })
  let target: Project['target']
  if (v.target === null) target = null
  else if (v.target !== undefined) {
    if (
      !object(v.target) ||
      (v.target.kind !== 'stretch' && v.target.kind !== 'glide') ||
      typeof v.target.id !== 'string' ||
      !groupById[v.target.kind].has(v.target.id)
    )
      throw Error('Unknown highlight group.')
    target = { kind: v.target.kind, id: v.target.id }
  }
  let base: Project['base']
  if (v.base !== undefined) {
    if (
      !object(v.base) ||
      !isClip(v.base.id) ||
      v.base.id === 'custom' ||
      (v.base.side !== 'left' && v.base.side !== 'right')
    )
      throw Error('Unknown original movement or side.')
    base = { id: v.base.id, side: v.base.side }
  }
  const pins = readPins(v.pins, frames.at(-1)!.time)
  if (v.plantFeet && pins?.some((p) => p.limb.endsWith('Foot')))
    throw Error('Choose foot anchors or standing marks for the feet.')
  if (v.prop !== undefined && v.prop !== 'chair' && v.prop !== 'mat')
    throw Error('Unknown support prop.')
  return {
    ...(base ? { base } : {}),
    ...(pins?.length ? { pins } : {}),
    ...(v.prop ? { prop: v.prop } : {}),
    version: 1,
    name: label(v.name),
    plantFeet: v.plantFeet,
    frames,
    ...(target !== undefined ? { target } : {}),
  }
}
export function putPose(p: Project, pose: KeyPose) {
  const frames = p.frames
    .filter((f) => f.time !== pose.time)
    .concat(pose)
    .sort((a, b) => a.time - b.time)
  return readProject(JSON.stringify({ ...p, frames }))
}
/** A small, explicit motion language. Unsupported requests leave the previous project intact. */
export function applyCue(p: Project, text: string): { project: Project; time: number } {
  const match = /^at\s+(\d+(?:\.\d+)?)\s*s?\s*[, :]?\s*(.+)$/i.exec(text.trim())
  if (!match) throw Error('Start the cue with a time, for example “At 2s bend both elbows 85”.')
  const time = Number(match[1]),
    instruction = match[2].trim().replace(/[.!]$/, '')
  const previous = p.frames.filter((f) => f.time <= time).at(-1) ?? p.frames[0]
  const pose = structuredClone(/^return to start$/i.test(instruction) ? p.frames[0] : previous)
  pose.time = time
  pose.label = instruction
  if (!/^(return to start|hold)$/i.test(instruction)) {
    const bend =
      /^bend (left|right|both) (elbows?|knees?|hips?)\s+(\d+(?:\.\d+)?)\s*(?:°|degrees?)?$/i.exec(
        instruction,
      )
    const rotate = /^rotate\s+(\w+)\s+([xyz])\s+(-?\d+(?:\.\d+)?)\s*(?:°|degrees?)?$/i.exec(
      instruction,
    )
    const move = /^move root\s+(-?[\d.]+)\s+(-?[\d.]+)\s+(-?[\d.]+)$/i.exec(instruction)
    if (bend) {
      const requested = bend[1].toLowerCase(),
        joint = bend[2].toLowerCase()
      const suffix = joint.startsWith('elbow')
        ? 'Forearm'
        : joint.startsWith('knee')
          ? 'Shin'
          : 'Thigh'
      for (const side of requested === 'both' ? ['left', 'right'] : [requested]) {
        const key = (side + suffix) as Joint
        const a: Triple = [...(pose.angles[key] ?? [0, 0, 0])]
        a[0] = (suffix === 'Shin' ? 1 : -1) * Number(bend[3])
        pose.angles[key] = a
      }
    } else if (rotate) {
      const key = Object.keys(indexOfJoint).find(
        (j) => j.toLowerCase() === rotate[1].toLowerCase(),
      ) as Joint | undefined
      if (!key) throw Error('Unknown joint ' + rotate[1])
      const a: Triple = [...(pose.angles[key] ?? [0, 0, 0])]
      a['xyz'.indexOf(rotate[2].toLowerCase())] = Number(rotate[3])
      pose.angles[key] = a
    } else if (move) pose.root = [Number(move[1]), Number(move[2]), Number(move[3])]
    else throw Error('Supported cues are bend, rotate, move root, hold and return to start.')
  }
  return { project: putPose(p, pose), time }
}
