/**
 * Tolerances and documented exceptions for the physics checks and solvers. Keep every number here
 * so a skill, a check and a solver quote the same one. All lengths are metres, angles radians.
 */
import type { AuthoredId } from '../../studio/choreography'
import type { Posture } from '../../studio/choreography/types'

export const TOL = {
  /** A resting surface is a contact when its lowest point is within this of the support. */
  contact: 0.015,
  /** Deepest a surface may sink into a support. Soft tissue compresses a little; bone never. */
  penetration: 0.005,
  /** The segments a posture rests on touch within this of their support (skin over bone). */
  rest: 0.04,
  /** Deepest the body may sink into a seat cushion. */
  seatPenetration: 0.02,
  /** The part of the body inside the seat footprint that counts as seated. */
  seatBand: 0.02,
  /** A planted foot or hand may drift this far from where it landed. */
  slide: 0.015,
  /** The centre of mass may sit this far outside the support polygon, for modelling error. */
  balance: 0.02,
  /**
   * Gripping a fixed frame, bar or post with straight arms lets the centre of mass sit this much
   * further outside the feet, which is how a supported squat or a wall lean works. Hands alone
   * never replace feet: the body must still stand on them.
   */
  heldBalance: 0.12,
  /** Soft tissue that the bare atlas figure cannot show: bone and muscle rest this far up. */
  tissueRest: 0.012,
  /** A hand's contact mark must lie this close to the hand at every beat. */
  reach: 0.03,
  /** Most a point may accelerate between frames before the motion reads as a pop (m/s²), about 11 mm of one-frame jump at 60 Hz. */
  pointAccel: 40,
  /** Most a joint may accelerate in rotation (rad/s²). */
  jointAccel: 400,
  /** The most any tracked point may move in a held pose, per second (m/s). */
  holdSpeed: 0.03,
} as const

/**
 * Which body segments must touch the support for each posture, as joint indices (0 pelvis, 1-3
 * spine, 12/15 thighs, 13/16 shins). At least one of them must rest within `TOL.rest` of the
 * floor, or of the seat for a chair. A seated body whose heels touch the floor but whose sit
 * bones hover is not seated; neither is a kneeling body held up by its toes.
 */
export const RESTS_ON: Partial<Record<Posture, readonly number[]>> = {
  floorSeat: [0, 12, 15],
  longSit: [0, 12, 15],
  straddle: [0, 12, 15],
  butterfly: [0, 12, 15],
  figureFour: [0, 12, 15],
  chair: [0, 12, 15],
  supine: [0, 1, 2, 3],
  prone: [0, 1, 2, 3],
  side: [0, 1, 2, 12, 15],
  kneel: [13, 16],
  halfKneel: [13, 16],
  split: [13, 16],
  heelSit: [13, 16],
  allFours: [13, 16],
  pigeon: [0, 12, 15, 13, 16],
}
/** Gear that carries weight, so the floor is not the only support. Their contact is gear-specific. */
export const WEIGHT_BEARING_GEAR = new Set([
  'bed',
  'step',
  'longRoll',
  'crossRoll',
  'pillow',
  'ball',
])
/** Postures whose weight is carried by hands and feet together, which `RESTS_ON` cannot express. */
export const BRIDGED = new Set<AuthoredId>(['downward-dog'])
/** Hung from a bar: no ground contact by design. */
export const HANGING = new Set<AuthoredId>(['bar-hang'])
/** Feet or hands travel along the floor on purpose, so sliding is part of the movement. */
export const TRAVELLING = new Set<AuthoredId>(['inchworm', 'wall-walk', 'ninety-ninety'])
