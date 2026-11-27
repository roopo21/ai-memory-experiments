/** Each recipe is authored in the performer's frame. A is the working side and B is the opposite side. */
export type Posture =
  | 'stand'
  | 'chair'
  | 'floorSeat'
  | 'supine'
  | 'prone'
  | 'side'
  | 'kneel'
  | 'halfKneel'
  | 'lunge'
  | 'allFours'
  | 'heelSit'
  | 'straddle'
  | 'butterfly'
  | 'figureFour'
  | 'longSit'
  | 'split'
  | 'pigeon'
  | 'squat'
  | 'bridgeBall'
  | 'dog'
export type Focus = 'body' | 'hand' | 'foot' | 'face'
export type Gear =
  | 'chair'
  | 'table'
  | 'lowBench'
  | 'door'
  | 'wall'
  | 'backWall'
  | 'sideWall'
  | 'step'
  | 'bed'
  | 'bar'
  | 'pole'
  | 'stick'
  | 'towel'
  | 'footStrap'
  | 'quadStrap'
  | 'longRoll'
  | 'crossRoll'
  | 'pillow'
  | 'kneePillow'
  | 'ball'
  | 'smallBall'
export type Mark =
  | 'free'
  | 'seat'
  | 'nape'
  | 'crown'
  | 'occiput'
  | 'collar'
  | 'jaw'
  | 'ear'
  | 'eye'
  | 'shoulder'
  | 'chest'
  | 'belly'
  | 'backHip'
  | 'back'
  | 'Aelbow'
  | 'Awrist'
  | 'Apalm'
  | 'Aback'
  | 'Athumb'
  | 'Afingers'
  | 'Athigh'
  | 'Ashin'
  | 'Aheel'
  | 'Ainstep'
  | 'Atoe'
  | 'Bthigh'
  | 'Bshin'
  | 'Bheel'
  | 'Aknee'
  | 'ownKnee'
  | 'ownThigh'
  | 'ownShin'
  | 'ownToe'
  | 'floor'
  | 'table'
  | 'door'
  | 'wall'
  | 'post'
  | 'bar'
  | 'prayer'
  | 'handsBehind'
  | 'gripFront'
  | 'innerFoot'
export type Point = readonly [number, number, number]
export type Reach = Mark | readonly [Mark, number, number, number] | Point
/** Frames a contact hand can be aimed in. `A…` is the working side. */
export type AimFrame =
  'world' | 'chest' | 'pelvis' | 'head' | 'Ahand' | 'Aforearm' | 'Athigh' | 'Ashin' | 'Afoot'
/**
 * Where a hand in contact points its fingers and which way its palm faces, in a frame, and which
 * part of the hand touches: the palm (default), the back of the hand, or the fingertips.
 */
export type Aim = readonly [
  fingers: Point,
  palm: Point,
  frame?: AimFrame,
  touch?: 'palm' | 'back' | 'tips',
]
export type Arm = readonly [
  forward?: number,
  out?: number,
  elbow?: number,
  forearmTurn?: number,
  wristBack?: number,
  humeralRoll?: number,
  wristSide?: number,
]
export type Leg = readonly [
  hipFlex?: number,
  out?: number,
  knee?: number,
  plantarFlex?: number,
  hipRoll?: number,
  soleOut?: number,
]
/**
 * Absolute finger angles in degrees: MCP, PIP and DIP flexion for the four fingers, spread, thumb
 * opposition, thumb opening and an optional index-only curl. Unset joints keep a relaxed cascade.
 * A full hand shape (per-finger angles and an explicit thumb) can be given instead.
 */
import type { HandShape } from '../../motion/anatomy'
export type Fingers =
  | readonly [
      mcp?: number,
      pip?: number,
      dip?: number,
      spread?: number,
      opposition?: number,
      thumbOpen?: number,
      indexCurl?: number,
    ]
  | HandShape
export type Pose = {
  a?: Arm
  b?: Arm
  leg?: Leg
  other?: Leg
  spine?: Point
  neck?: Point
  pelvis?: Point
  shift?: Point
  ga?: Reach
  gb?: Reach
  /** Hand orientation for the contact in `ga` / `gb`. Without it each mark has a default. */
  ha?: Aim
  hb?: Aim
  /** Direction the elbow points from the shoulder, in the chest's frame, for a contact hand. */
  ea?: Point
  eb?: Point
  /** Upper neck (head on the atlas) separately from the lower neck, for a chin tuck. */
  head?: Point
  f?: Fingers
  g?: Fingers
  toes?: Point
  otherToes?: Point
  jaw?: readonly [open: number, side?: number]
  shoulders?: readonly [elevate: number, retract?: number]
  breath?: number
}
export type Beat = readonly [string, Pose]
export interface Options {
  both?: boolean
  focus?: Focus
  /** Direction from the subject to the teaching camera, when the default framing would hide the movement. */
  view?: Point
  gear?: Gear[]
  cycle?:
    | 'alphabet'
    | 'walk'
    | 'pendulum'
    | 'armCircles'
    | 'headRolls'
    | 'shoulderRolls'
    | 'hipCircles'
    | 'wristCircles'
    | 'scorpion'
    | 'rollBall'
    | 'ulnarCircle'
}
export interface Recipe extends Options {
  posture: Posture
  setup: Pose
  beats: Beat[]
  hold: boolean
}
export function stretch(
  posture: Posture,
  setup: Pose,
  label: string,
  pose: Pose,
  options: Options = {},
): Recipe {
  return { posture, setup, beats: [[label, pose]], hold: true, ...options }
}
export function sequence(
  posture: Posture,
  setup: Pose,
  beats: Beat[],
  options: Options = {},
): Recipe {
  return { posture, setup, beats, hold: false, ...options }
}
export const both = { both: true } as const
export const hands = { focus: 'hand' } as const
export const feet = { focus: 'foot' } as const
/** Fingers straight and slightly spread, the thumb resting open. */
/**
 * A quadriceps hold behind the body: with the knee deeply bent the front of the ankle faces back,
 * so the arm reaches straight back and takes it palm forward, fingers down and a little inward.
 */
export const instep: Aim = [[-0.3, -1, 0], [0, 0, 1], 'chest']
/**
 * Fingers spread on a floor, seat or wall: the metacarpals dip toward the knuckles, so the fingers
 * extend a little at the knuckles to lie along the surface, with the tips pressing lightly. The
 * thumb stays in the plane of the palm; opening it away from the palm would push it into the floor.
 */
export const onFloor: Fingers = {
  // The ulnar knuckles sit lower in the palm's arch, so those fingers extend a little more.
  mcp: [-8, -8, -10, -12],
  pip: [4, 4, 4, 4],
  dip: [2, 2, 2, 2],
  spread: 10,
  // Drawn back level with the palm and out to the side, measured against the palm's contact plane.
  thumb: [-10, -22, 0, 5, 5],
}
export const open: Fingers = [0, 0, 0, 4, 0, 6],
  /** Palm and fingers flat on a surface. */
  flat: Fingers = [0, 4, 2, 6, 0, 14],
  /** Full fist with the thumb wrapped over the middle phalanges. */
  fist: Fingers = {
    mcp: [82, 86, 88, 90],
    pip: [98, 100, 100, 98],
    dip: [55, 58, 60, 60],
    spread: 0,
    thumb: [30, 34, 30, 45, 30],
  },
  /** A loose fist. */
  softFist: Fingers = {
    mcp: [62, 66, 70, 74],
    pip: [80, 84, 86, 86],
    dip: [40, 42, 44, 44],
    spread: 0,
    thumb: [24, 30, 24, 30, 24],
  },
  /** Thumb folded into the palm with the fingers wrapped over it. */
  thumbInFist: Fingers = {
    mcp: [70, 74, 78, 80],
    pip: [92, 96, 96, 94],
    dip: [50, 52, 54, 54],
    spread: 0,
    thumb: [48, 18, 40, 62, 58],
  },
  /** Knuckles straight, middle and end joints bent: the hook fist of tendon glides. */
  hook: Fingers = {
    mcp: [0, 0, 2, 4],
    pip: [96, 98, 98, 96],
    dip: [72, 74, 74, 72],
    spread: 0,
    thumb: [6, 10, 6, 14, 14],
  },
  /** Knuckles bent, fingers straight: the tabletop. */
  tabletop: Fingers = {
    mcp: [84, 86, 88, 88],
    pip: [2, 2, 4, 4],
    dip: [0, 0, 2, 2],
    spread: 0,
    thumb: [6, 12, 6, 14, 10],
  },
  /** Knuckles and middle joints bent, end joints straight: fingertips on the palm. */
  straightFist: Fingers = {
    mcp: [80, 82, 84, 84],
    pip: [100, 102, 102, 100],
    dip: [4, 4, 6, 6],
    spread: 0,
    thumb: [10, 18, 10, 20, 14],
  },
  /** A fabric loop bears inside the middle joints. The thumb steadies the outside. */
  loopGrip: Fingers = {
    mcp: [26, 30, 34, 38],
    pip: [89, 92, 94, 96],
    dip: [54, 58, 62, 64],
    spread: 1,
    thumb: [20, 22, 18, 23, 18],
  },
  /** Fingers wrapped round a towel, stick or bar. */
  grip: Fingers = {
    mcp: [55, 60, 64, 68],
    pip: [78, 82, 84, 84],
    dip: [40, 42, 44, 44],
    spread: 0,
    thumb: [28, 40, 30, 30, 26],
  }
export function framesFor(r: Recipe) {
  const frames: { time: number; label: string; pose: Pose }[] = [
    { time: 0, label: 'Set up', pose: r.setup },
  ]
  let pose = r.setup,
    time = 0
  for (const [label, changes] of r.beats) {
    pose = { ...pose, ...changes }
    time += r.beats.length > 4 ? 1.25 : 1.7
    frames.push({ time, label, pose })
  }
  if (r.hold) {
    time += 1.5
    frames.push({ time, label: 'Hold', pose })
  }
  time += 1.8
  frames.push({ time, label: 'Return', pose: r.setup })
  return frames
}
