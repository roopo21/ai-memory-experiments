import type { Leg, Pose, Posture } from '../../../studio/choreography/types'
const sit: Leg = [82, 0, 82],
  long: Leg = [88, 1, 3],
  folded: Leg = [76, 42, 108, 0, 54],
  rear: Leg = [-5, 2, 89, 28],
  front: Leg = [78, 2, 83]
type Base = { y: number; z?: number; pitch?: number; pose: Pose }
export const postures: Record<Posture, Base> = {
  stand: { y: 0.88, pose: {} },
  lunge: { y: 0.84, pose: { leg: [-16, 2, 8, 8], other: [28, 2, 36] } },
  chair: { y: 0.535, z: -0.2, pose: { leg: sit, other: sit } },
  figureFour: { y: 0.535, z: -0.2, pose: { leg: [87, 31, 99, 0, 56], other: sit } },
  floorSeat: { y: 0.16, pose: { leg: folded, other: folded } },
  longSit: { y: 0.16, pose: { leg: long, other: long } },
  straddle: { y: 0.16, pose: { leg: [86, 36, 3], other: [86, 36, 3] } },
  butterfly: { y: 0.16, pose: { leg: folded, other: folded } },
  supine: { y: 0.125, z: -0.06, pitch: -90, pose: { a: [0, 12, 3], b: [0, 12, 3] } },
  prone: {
    y: 0.16,
    pitch: 90,
    pose: { leg: [0, 0, 3, 30], other: [0, 0, 3, 30], neck: [0, 55, 0] },
  },
  side: { y: 0.18, pose: { b: [135, 4, 94], other: [26, 0, 39] } },
  kneel: { y: 0.51, pose: { leg: [0, 4, 90, 34], other: [0, 4, 90, 34] } },
  halfKneel: { y: 0.5, pose: { leg: rear, other: front } },
  split: { y: 0.5, pose: { leg: front, other: rear } },
  squat: { y: 0.78, pose: { leg: [25, 12, 35], other: [25, 12, 35] } },
  pigeon: { y: 0.32, pose: { leg: [92, 26, 101, 0, 43], other: [-30, 3, 8, 37] } },
  allFours: {
    y: 0.5,
    pitch: 85,
    pose: { leg: [88, 2, 90, 25], other: [88, 2, 90, 25], a: [81, 2, 5], b: [81, 2, 5] },
  },
  heelSit: { y: 0.23, pose: { leg: [62, 3, 140, 34], other: [62, 3, 140, 34] } },
  bridgeBall: { y: 0.72, z: -0.06, pose: { leg: [68, 10, 85], other: [68, 10, 85] } },
  dog: {
    y: 0.83,
    pitch: 55,
    pose: { leg: [100, 2, 5], other: [100, 2, 5], a: [153, 5, 4], b: [153, 5, 4] },
  },
}
