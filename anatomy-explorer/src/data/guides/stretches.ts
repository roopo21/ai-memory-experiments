import { armHandStretches } from './stretch-arm-hand'
import { hipLegStretches } from './stretch-hip-leg'
import { neckShoulderStretches } from './stretch-neck-shoulder'
import { trunkStretches } from './stretch-trunk'
import type { Exercise } from './types'

/**
 * Stretch library, ordered head to toe. Targets name what the movement lengthens, which can differ
 * from the "main muscles worked" a cited programme lists for the same exercise.
 */
export const stretches: Exercise[] = [
  ...neckShoulderStretches,
  ...trunkStretches,
  ...armHandStretches,
  ...hipLegStretches,
]
