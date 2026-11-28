import type { Gesture } from '../types'
import { grips } from './grips'
import { rest } from './rest'
import { signs } from './signs'
import { sports } from './sports'

export const gestures: Gesture[] = [...rest, ...signs, ...grips, ...sports]
export const gestureById = new Map(gestures.map((g) => [g.id, g]))
