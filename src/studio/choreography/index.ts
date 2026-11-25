import { neckShoulder } from './neck-shoulder'
import { trunk } from './trunk'
import { armHand } from './arm-hand'
import { hipLeg } from './hip-leg'
import { nerve } from './nerve'
import { framesFor, type Recipe } from './types'
const authored = { ...neckShoulder, ...trunk, ...armHand, ...hipLeg, ...nerve }
export type AuthoredId = keyof typeof authored
export const scores = Object.fromEntries(
  Object.entries(authored).map(([id, r]) => [id, { ...r, frames: framesFor(r) }]),
) as Record<AuthoredId, Recipe & { frames: ReturnType<typeof framesFor> }>
export const hasScore = (id: string): id is AuthoredId => Object.hasOwn(scores, id)
