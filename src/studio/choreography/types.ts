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
  | 'Athumb'
  | 'Afingers'
  | 'Athigh'
  | 'Ashin'
  | 'Aheel'
  | 'Atoe'
  | 'Bthigh'
  | 'Bshin'
  | 'Bheel'
  | 'Aknee'
  | 'ownKnee'
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
/** MCP, PIP, DIP, finger spread, thumb opposition, thumb opening, optional index-only curl. */
export type Fingers = readonly [
  mcp?: number,
  pip?: number,
  dip?: number,
  spread?: number,
  opposition?: number,
  thumbOpen?: number,
  indexCurl?: number,
]
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
export const open: Fingers = [0, 0, 0, 4, 0, 6],
  fist: Fingers = [72, 80, 55, 0, 45],
  hook: Fingers = [0, 86, 61, 0, 5],
  tabletop: Fingers = [82, 0, 0, 0, 4]
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
