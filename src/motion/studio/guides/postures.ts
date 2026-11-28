import type { Leg, Pose, Posture } from '../../../studio/choreography/types'
const sit: Leg = [82, 0, 82],
  long: Leg = [93, 1, 5],
  // Seated on the floor with an upright pelvis the hips sit 10 cm up, so a folded leg keeps its
  // knee low and its ankle on the floor: these were solved from the foot placements.
  // An easy cross-legged seat: one foot tucked near the midline, the other just in front of it.
  folded: Leg = [89, 42, 140, 48, 72, -9],
  foldedFront: Leg = [108, 36, 124, 60, 54, -27],
  // Soles together a forearm's length in front of the hips, knees out and low.
  butterflyLeg: Leg = [94, 55, 133, 35, 69, 4],
  rear: Leg = [-5, 2, 89, 28],
  front: Leg = [78, 2, 83]
type Base = { y: number; z?: number; pitch?: number; pose: Pose }
export const postures: Record<Posture, Base> = {
  stand: { y: 0.88, pose: {} },
  lunge: { y: 0.84, pose: { leg: [-16, 2, 8, 8], other: [28, 2, 36] } },
  chair: { y: 0.535, z: -0.2, pose: { leg: sit, other: sit } },
  // Leaning forward a little brings the crossed foot within reach of the hands, and the pelvis
  // rolls a few degrees toward the supporting hip, which carries the weight when a leg is crossed.
  figureFour: {
    y: 0.535,
    z: -0.2,
    pose: { leg: [87, 31, 99, 0, 56], other: sit, spine: [12, 0, 0], pelvis: [0, 0, 4] },
  },
  floorSeat: { y: 0.16, pose: { leg: folded, other: foldedFront } },
  longSit: { y: 0.16, pose: { leg: long, other: long } },
  // Knees a touch soft, as straddle cues allow, so the legs keep a clear hinge.
  straddle: { y: 0.16, pose: { leg: [86, 36, 5], other: [86, 36, 5] } },
  butterfly: { y: 0.16, pose: { leg: butterflyLeg, other: butterflyLeg } },
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
  pigeon: { y: 0.24, pose: { leg: [108, 30, 125, 0, 72], other: [-30, -14, 6, 48] } },
  allFours: {
    y: 0.5,
    // Shoulders over the hands with straight arms sit a little higher than the hips over the knees.
    pitch: 79,
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
