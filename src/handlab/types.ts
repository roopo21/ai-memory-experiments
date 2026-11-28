import type { Quaternion, Vector3 } from 'three'
import type { Side } from '../motion/anatomy'
import type { MovementRig } from '../motion/movementRig'

/** A simple prop the lab draws. Everything is world metres, y up, the body faces +z. */
export type PropSpec =
  | {
      kind: 'ball'
      name: string
      centre: Vector3
      radius: number
      look: 'basketball' | 'cricket'
      quaternion?: Quaternion
    }
  | {
      kind: 'cylinder'
      name: string
      centre: Vector3
      axis: Vector3
      radius: number
      length: number
      color: string
    }
  | {
      kind: 'box'
      name: string
      centre: Vector3
      size: [number, number, number]
      color: string
      quaternion?: Quaternion
    }

export interface Built {
  props: PropSpec[]
  /** Where the camera looks. */
  focus: Vector3
  /** Half the width of the scene to frame, in metres. */
  span: number
  /** Numbers the checks and the HUD report for this instant. */
  notes?: Record<string, number | string>
}
export interface LabContext {
  r: MovementRig
  side: Side
  t: number
}
export interface KeyMoment {
  t: number
  label: string
}
export interface Gesture {
  id: string
  name: string
  group: 'rest' | 'gesture' | 'grip' | 'sport'
  /** The real form, written first: what touches what, where the weight is, joint angles, timing. */
  form: string
  duration: number
  moments: KeyMoment[]
  build: (c: LabContext) => Built
  /** Camera views worth rendering in the contact sheet, in order. */
  views?: string[]
}
