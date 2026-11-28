/**
 * Anatomical joint model for the 81-joint rig.
 *
 * Every bone is at identity in the registered bind pose, so a local rotation about an axis written
 * in bind coordinates turns the bone about that anatomical axis. Angles are anatomical degrees, not
 * offsets from the scan: an elbow of 0 is straight, a pronation of 0 is the palm-forward anatomical
 * position, 90 is thumb-up neutral and about 165 is full pronation.
 *
 * The forearm joint pivots at the capitulum. The ulna joint shares that pivot but only hinges, so
 * the olecranon stays in the trochlea while the radius and hand turn about the ulnar head.
 */
import { Euler, Quaternion, Vector3 } from 'three'
import { limbFrames } from './limbFrames'
import { digitAxes, digitTips } from './distalJoints'
import { indexOfJoint, joints, pivot, ULNA, type Joint } from './joints'
import type { MovementRig } from './movementRig'

export const D2R = Math.PI / 180
const R2D = 180 / Math.PI
export type Side = 1 | -1
export const vec = (a: readonly number[]) => new Vector3(a[0], a[1], a[2])
export const turn = (axis: Vector3, degrees: number) =>
  new Quaternion().setFromAxisAngle(axis, degrees * D2R)
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const wrap = (a: number) => {
  let r = a % 360
  if (r > 180) r -= 360
  if (r <= -180) r += 360
  return r
}
export const frameOf = (s: Side) => (s === 1 ? limbFrames.left : limbFrames.right)
export const limb = (s: Side) =>
  s === 1
    ? { girdle: 18, arm: 6, fore: 7, hand: 8, ulna: ULNA.left, thigh: 12, shin: 13, foot: 14 }
    : { girdle: 19, arm: 9, fore: 10, hand: 11, ulna: ULNA.right, thigh: 15, shin: 16, foot: 17 }
export const prefixOf = (s: Side) => (s === 1 ? 'left' : 'right')
const DOWN = new Vector3(0, -1, 0)
const worldQ = (r: MovementRig, i: number) => r.bones[i].getWorldQuaternion(new Quaternion())
const worldP = (r: MovementRig, i: number) => r.bones[i].getWorldPosition(new Vector3())

/** Signed angle in degrees about `axis`, from `from` to `to`, in the plane normal to `axis`. */
export function signedAngle(from: Vector3, to: Vector3, axis: Vector3) {
  const a = from.clone().addScaledVector(axis, -from.dot(axis)),
    b = to.clone().addScaledVector(axis, -to.dot(axis))
  return Math.atan2(axis.dot(a.clone().cross(b)), a.dot(b)) * R2D
}
/** Twist of `q` about the unit `axis`, in degrees (swing-twist decomposition). */
export function twistAbout(q: Quaternion, axis: Vector3) {
  return wrap(2 * Math.atan2(q.x * axis.x + q.y * axis.y + q.z * axis.z, q.w) * R2D)
}
export const swingOf = (q: Quaternion, axis: Vector3) =>
  q.clone().multiply(turn(axis, -twistAbout(q, axis)))

// ---------------------------------------------------------------------------------------------
// Bind frames
// ---------------------------------------------------------------------------------------------
function armBindFor(s: Side) {
  const f = frameOf(s),
    shoulder = vec(f.shoulder),
    elbow = vec(f.elbow),
    wrist = vec(f.wrist)
  const humerus = elbow.clone().sub(shoulder).normalize(),
    forearm = wrist.clone().sub(elbow).normalize(),
    elbowAxis = vec(f.elbowAxis)
  return {
    humerus,
    roll: vec(f.humerusAxis),
    elbowAxis,
    pronationAxis: vec(f.pronationAxis),
    extensionAxis: vec(f.wristExtensionAxis),
    radialAxis: vec(f.wristRadialAxis),
    handLong: vec(f.handLong),
    palmar: vec(f.palmar),
    radial: vec(f.radial),
    // The scanned arm hangs with the elbow slightly bent; anatomical angles add it back.
    elbow: signedAngle(humerus, forearm, elbowAxis),
    upright: new Quaternion().setFromUnitVectors(humerus, DOWN),
  }
}
function legBindFor(s: Side) {
  const f = frameOf(s),
    hip = vec(f.hip),
    knee = vec(f.knee),
    ankle = vec(f.ankle)
  return {
    femur: knee.clone().sub(hip).normalize(),
    tibia: ankle.clone().sub(knee).normalize(),
    kneeAxis: vec(f.kneeAxis),
    ankleAxis: vec(f.ankleAxis),
    footLong: vec(f.footLong),
    // A positive turn rolls the sole outward.
    eversionAxis: vec(f.footLong).multiplyScalar(s),
  }
}
const armBind = { 1: armBindFor(1), [-1]: armBindFor(-1) } as Record<
  Side,
  ReturnType<typeof armBindFor>
>
const legBind = { 1: legBindFor(1), [-1]: legBindFor(-1) } as Record<
  Side,
  ReturnType<typeof legBindFor>
>
export const armFrame = (s: Side) => armBind[s]
export const legFrame = (s: Side) => legBind[s]
/** Wrist extension and radial deviation of a hand's local rotation: the inverse of `setArm`. */
export function wristAngles(s: Side, q: Quaternion) {
  const b = armBind[s],
    end = b.handLong.clone().applyQuaternion(q)
  const radial = Math.asin(clamp(end.dot(b.radial), -1, 1)) * R2D,
    extension = signedAngle(b.handLong, end, b.extensionAxis)
  const reference = turn(b.extensionAxis, extension).multiply(turn(b.radialAxis, radial))
  return { extension, radial, twist: twistAbout(reference.invert().multiply(q), b.handLong) }
}
/**
 * Plantarflexion and eversion of a foot's local rotation: the inverse of `setLeg`'s
 * turn(ankle, plantarflexion)·turn(eversion axis, eversion). The remainder is any turn of the foot
 * the ankle cannot make (abduction about the leg), which the knee or hip must supply.
 */
export function ankleAngles(s: Side, q: Quaternion) {
  const b = legBind[s],
    end = b.footLong.clone().applyQuaternion(q)
  const plantarflexion = signedAngle(b.footLong, end, b.ankleAxis),
    afterAnkle = turn(b.ankleAxis, plantarflexion).invert().multiply(q),
    eversion = twistAbout(afterAnkle, b.eversionAxis)
  const residual = turn(b.eversionAxis, eversion).invert().multiply(afterAnkle)
  return { plantarflexion, eversion, residual }
}
/** Axial rotation of the humerus (external positive), from its orientation in the thorax. */
export function humeralRotation(s: Side, humerus: Quaternion) {
  const b = armBind[s],
    dir = b.humerus.clone().applyQuaternion(humerus)
  const reference = new Quaternion().setFromUnitVectors(DOWN, dir).multiply(b.upright)
  return s * twistAbout(reference.invert().multiply(humerus), b.roll)
}

/** Bind flexion of each digit joint, measured between the segments either side of it. */
const bindFlex: Record<string, number> = {}
for (const [name, axes] of Object.entries(digitAxes)) {
  if (name.endsWith('Thumb0')) continue
  const i = indexOfJoint[name as Joint],
    parent = joints[i][1] as number,
    child = joints.findIndex(([, p]) => p === i)
  const next =
    child >= 0 ? pivot(child) : vec(digitTips[name.slice(0, -1) as keyof typeof digitTips])
  bindFlex[name] = signedAngle(pivot(i).sub(pivot(parent)), next.sub(pivot(i)), vec(axes.flex))
}
export const bindFlexion = (name: string) => bindFlex[name] ?? 0

// ---------------------------------------------------------------------------------------------
// Forward kinematics in anatomical angles
// ---------------------------------------------------------------------------------------------
/** Shoulder flexion, abduction, elbow flexion, pronation, wrist extension, humeral external rotation, radial deviation. */
export type ArmAngles = readonly [
  flexion?: number,
  abduction?: number,
  elbow?: number,
  pronation?: number,
  extension?: number,
  rotation?: number,
  radial?: number,
]
/** A relaxed hanging arm: slightly away from the side, elbow soft, palm toward the thigh. */
export const RELAXED_ARM = [0, 7, 12, 78, 0, 0, 0] as const

/** Humeral orientation relative to the thorax, from the vertical hanging arm. */
export function humerusRotation(s: Side, flexion: number, abduction: number, rotation: number) {
  const b = armBind[s]
  return turn(new Vector3(-1, 0, 0), flexion)
    .multiply(turn(new Vector3(0, 0, s), abduction))
    .multiply(b.upright)
    .multiply(turn(b.roll, s * rotation))
}
/** Clavicle and scapula follow arm elevation: about a fifth of it beyond the first 30 degrees. */
export const scapularRhythm = (elevation: number) => clamp((elevation - 30) * 0.2, 0, 24)
export function girdleRotation(s: Side, elevate: number, retract: number) {
  return new Quaternion().setFromEuler(new Euler(0, s * retract * D2R, s * elevate * D2R, 'XYZ'))
}
/** Pose the girdle so the humerus keeps its orientation relative to the thorax. */
function placeGirdle(
  r: MovementRig,
  s: Side,
  humerus: Quaternion,
  shoulders?: readonly [number, number?],
) {
  const j = limb(s),
    elevation = armBind[s].humerus.clone().applyQuaternion(humerus).angleTo(DOWN) * R2D
  const girdle = girdleRotation(
    s,
    (shoulders?.[0] ?? 0) + scapularRhythm(elevation),
    shoulders?.[1] ?? 0,
  )
  r.bones[j.girdle].quaternion.copy(girdle)
  r.bones[j.arm].quaternion.copy(girdle.invert().multiply(humerus))
}
export function setArm(
  r: MovementRig,
  s: Side,
  angles: ArmAngles,
  shoulders?: readonly [number, number?],
) {
  const [flexion, abduction, elbow, pronation, extension, rotation, radial] = RELAXED_ARM.map(
    (v, i) => angles[i] ?? v,
  )
  const b = armBind[s],
    j = limb(s)
  placeGirdle(r, s, humerusRotation(s, flexion, abduction, rotation), shoulders)
  const hinge = turn(b.elbowAxis, elbow - b.elbow)
  r.bones[j.ulna].quaternion.copy(hinge)
  r.bones[j.fore].quaternion.copy(hinge.multiply(turn(b.pronationAxis, pronation)))
  r.bones[j.hand].quaternion
    .copy(turn(b.extensionAxis, extension))
    .multiply(turn(b.radialAxis, radial))
}

/** Hip flexion, abduction, knee flexion, plantarflexion, hip external rotation, eversion. */
export type LegAngles = readonly [
  flexion?: number,
  abduction?: number,
  knee?: number,
  plantarflexion?: number,
  rotation?: number,
  eversion?: number,
]
export function setLeg(r: MovementRig, s: Side, angles: LegAngles) {
  const [flexion = 0, abduction = 0, knee = 0, plantar = 0, rotation = 0, eversion = 0] = angles
  const b = legBind[s],
    j = limb(s)
  r.bones[j.thigh].quaternion
    .copy(turn(new Vector3(-1, 0, 0), flexion))
    .multiply(turn(new Vector3(0, 0, s), abduction))
    .multiply(turn(b.femur.clone().negate(), s * rotation))
  r.bones[j.shin].quaternion.copy(turn(b.kneeAxis, knee))
  r.bones[j.foot].quaternion
    .copy(turn(b.ankleAxis, plantar))
    .multiply(turn(b.eversionAxis, eversion))
}

/**
 * A thigh's rotation in the joint convention guides are authored in: flexion, then abduction, then
 * rotation about the femur (the same reading `measure` reports and `setLeg` writes).
 */
export function hipAngles(s: Side, thigh: Quaternion) {
  // `setLeg` turns the thigh about the axis along the femur last, so the femur's direction fixes
  // flexion and abduction and what is left over is the rotation. Solve those two by Newton steps.
  const axis = legBind[s].femur.clone().negate(),
    target = axis.clone().applyQuaternion(thigh)
  const swing = (f: number, a: number) =>
    turn(new Vector3(-1, 0, 0), f).multiply(turn(new Vector3(0, 0, s), a))
  const miss = (f: number, a: number) => axis.clone().applyQuaternion(swing(f, a)).sub(target)
  let f = Math.atan2(-target.z, target.y) * R2D,
    a = Math.asin(clamp(-s * target.x, -1, 1)) * R2D
  for (let k = 0; k < 8; k++) {
    const e = miss(f, a),
      df = miss(f + 0.01, a)
        .sub(e)
        .divideScalar(0.01),
      da = miss(f, a + 0.01)
        .sub(e)
        .divideScalar(0.01)
    const m11 = df.dot(df),
      m12 = df.dot(da),
      m22 = da.dot(da),
      det = m11 * m22 - m12 * m12 || 1e-9,
      g1 = df.dot(e),
      g2 = da.dot(e)
    f -= (m22 * g1 - m12 * g2) / det
    a -= (m11 * g2 - m12 * g1) / det
  }
  return {
    flexion: f,
    abduction: a,
    rotation: s * twistAbout(swing(f, a).invert().multiply(thigh), axis),
  }
}
/** The thigh rotation for hip angles in degrees: the inverse of `hipAngles`. */
export function hipFromAngles(s: Side, flexion: number, abduction: number, rotation: number) {
  return turn(new Vector3(-1, 0, 0), flexion)
    .multiply(turn(new Vector3(0, 0, s), abduction))
    .multiply(turn(legBind[s].femur.clone().negate(), s * rotation))
}

/**
 * The guide tuple for a hand, read as absolute angles: MCP, PIP and DIP flexion of the four
 * fingers, spread, thumb opposition, thumb opening and an index-only curl.
 */
export type FingerAngles =
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
type Four = readonly [number, number, number, number]
/** Per-finger absolute flexion (index, middle, ring, little) and a thumb pose. */
export interface HandShape {
  mcp: Four
  pip: Four
  dip: Four
  /** Fan of the fingers in degrees, shared from index to little finger. */
  spread: number
  /** Thumb carpometacarpal flexion, abduction and axial rotation; MCP and IP flexion. */
  thumb: readonly [flex: number, abduct: number, rotate: number, mcp: number, ip: number]
}
/** The resting cascade: each finger slightly more flexed than its radial neighbour. */
export const RELAXED_HAND: HandShape = {
  mcp: [20, 25, 30, 36],
  pip: [28, 34, 38, 40],
  dip: [10, 12, 14, 15],
  spread: 2,
  thumb: [4, 4, 0, 10, 10],
}
/** Read a guide tuple over the relaxed cascade. Unset joints stay relaxed. */
export function handShape(f: FingerAngles | undefined): HandShape {
  if (!f) return RELAXED_HAND
  if (!Array.isArray(f)) return f as HandShape
  const [mcp, pip, dip, spread = 0, opposition = 0, open = 0, indexCurl] = f
  // A straight hand keeps a slight natural cascade, so the fingers never look splinted.
  const pick = (v: number | undefined, relaxed: Four) =>
    v === undefined ? [...relaxed] : [0, 1, 2, 3].map((i) => v + i * 1.5)
  const m = pick(mcp, RELAXED_HAND.mcp),
    p = pick(pip, RELAXED_HAND.pip),
    d = pick(dip, RELAXED_HAND.dip)
  if (indexCurl !== undefined) {
    m[0] = indexCurl
    p[0] = indexCurl
    d[0] = indexCurl * 0.65
  }
  return {
    mcp: m as unknown as Four,
    pip: p as unknown as Four,
    dip: d as unknown as Four,
    spread,
    thumb: [
      4 + 0.5 * opposition - 0.55 * open,
      4 + 0.75 * opposition + 0.6 * open,
      0.6 * opposition,
      10 + 0.3 * opposition - 0.2 * open,
      10 + 0.35 * opposition - 0.35 * open,
    ],
  }
}
const FINGERS = ['Index', 'Middle', 'Ring', 'Little'] as const
const FAN = [0.9, 0.25, -0.4, -1]
export function setHand(r: MovementRig, s: Side, shape: HandShape) {
  const side = prefixOf(s)
  FINGERS.forEach((digit, i) => {
    const values = [shape.mcp[i], shape.pip[i], shape.dip[i]]
    for (let k = 0; k < 3; k++) {
      const name = side + digit + (k + 1),
        axes = digitAxes[name],
        q = turn(vec(axes.flex), values[k] - bindFlexion(name))
      // Spread fans the fingers in the plane of the palm before they flex.
      if (k === 0 && axes.spread) q.multiply(turn(vec(axes.spread), FAN[i] * shape.spread * 0.5))
      r.bones[indexOfJoint[name as Joint]].quaternion.copy(q)
    }
  })
  const [flex, abduct, rotate, mcp, ip] = shape.thumb,
    base = digitAxes[side + 'Thumb0']
  r.bones[indexOfJoint[(side + 'Thumb0') as Joint]].quaternion
    .copy(turn(vec(base.flex), flex))
    .multiply(turn(vec(base.spread!), abduct))
    .multiply(turn(vec(base.twist!), rotate))
  for (const [k, value] of [
    [1, mcp],
    [2, ip],
  ] as const) {
    const name = side + 'Thumb' + k
    r.bones[indexOfJoint[name as Joint]].quaternion.copy(
      turn(vec(digitAxes[name].flex), value - bindFlexion(name)),
    )
  }
}
/** Toes: curl (+ flexes, − extends), spread, and extra big-toe flexion. */
export function setToes(r: MovementRig, s: Side, toes?: readonly [number, number?, number?]) {
  const side = prefixOf(s),
    [curl = 0, spread = 0, big = 0] = toes ?? []
  ;['ToeBig', 'ToeTwo', 'ToeThree', 'ToeFour', 'ToeLittle'].forEach((digit, i) => {
    const c = curl + (i === 0 ? big : 0)
    for (let k = 1; k <= (i === 0 ? 2 : 3); k++) {
      const name = side + digit + k,
        axes = digitAxes[name],
        q = turn(vec(axes.flex), c * [1, 0.32, 0.14][k - 1])
      if (k === 1 && axes.spread)
        q.multiply(turn(vec(axes.spread), [-1, -0.45, 0, 0.5, 1][i] * spread))
      r.bones[indexOfJoint[name as Joint]].quaternion.copy(q)
    }
  })
}

// ---------------------------------------------------------------------------------------------
// Limb solvers
// ---------------------------------------------------------------------------------------------
/** Ranges the solvers keep to. Measured limits for the checker are in `LIMITS`. */
// Passive end ranges: a stretch takes the wrist further than it moves on its own.
const ARM_RANGE = { pronation: [-4, 168], extension: [-82, 86], radial: [-33, 18] } as const
/**
 * Solve the two rotations about `k` then `e` that carry `v` onto `x` (both in the same frame):
 * turn(k, ρ)·turn(e, φ)·v = x. Returns both branches.
 */
function twoAxis(k: Vector3, e: Vector3, v: Vector3, x: Vector3) {
  const kx = k.dot(x),
    ke = k.dot(e)
  const A = x.dot(e) - kx * ke,
    B = -k.clone().cross(x).dot(e),
    C = kx * ke,
    D = v.dot(e) - C
  const R = Math.hypot(A, B),
    delta = Math.atan2(B, A)
  const c = R < 1e-9 ? 0 : Math.acos(clamp(D / R, -1, 1))
  return [delta + c, delta - c].map((rho) => {
    const y = x.clone().applyQuaternion(new Quaternion().setFromAxisAngle(k, -rho))
    return { rho: rho * R2D, phi: signedAngle(v, y, e) }
  })
}
/**
 * Of the two solutions for a hinge, keep one that bends the right way; when both do (a nearly
 * straight limb), keep the one that rolls the proximal bone least.
 */
/**
 * The valid branch with the least roll, or, when `near` scores the branches, the valid one it
 * scores lowest. A nearly straight limb satisfies both branches; between beats the one nearest
 * the interpolated pose keeps the limb from flipping.
 */
function pickBranch<T extends { rho: number; flex: number }>(
  branches: T[],
  lo: number,
  hi: number,
  near?: (b: T) => number,
) {
  const valid = (b: T) => b.flex > lo && b.flex < hi
  const score = near ?? ((b: T) => Math.abs(wrap(b.rho)))
  return [...branches].sort((p, q) => Number(valid(q)) - Number(valid(p)) || score(p) - score(q))[0]
}
interface ArmSolution {
  arm: Quaternion
  fore: Quaternion
  ulna: Quaternion
  hand: Quaternion
  cost: number
  pronation: number
}
/**
 * How widely a limb solve may look. Beats search the full swing of the elbow or knee and every
 * way the forearm can turn; between beats a `local` solve stays near the interpolated pose, so the
 * limb cannot jump to another solution from one frame to the next. `stay` keeps the full search but
 * still prefers the solution nearest the incoming pose when several fit equally well, as a
 * straight limb's roll does.
 */
export type SolveOptions = { search?: number; local?: boolean; stay?: boolean }
/**
 * Golden-section descent on the swing angle `psi` of a limb solve, inside one grid cell either
 * side of the best grid point. Keeps the better of the grid point and the refined one.
 */
function refine<T extends { cost: number }>(
  solve: (psi: number) => T,
  start: T,
  at: number,
  cell: number,
  limit: number,
): T {
  let lo = Math.max(-limit, at - cell),
    hi = Math.min(limit, at + cell),
    best = start
  const g = 0.381966
  let x1 = lo + (hi - lo) * g,
    x2 = hi - (hi - lo) * g,
    f1 = solve(x1),
    f2 = solve(x2)
  for (let k = 0; k < 8; k++) {
    if (f1.cost < f2.cost) {
      hi = x2
      x2 = x1
      f2 = f1
      x1 = lo + (hi - lo) * g
      f1 = solve(x1)
    } else {
      lo = x1
      x1 = x2
      f1 = f2
      x2 = hi - (hi - lo) * g
      f2 = solve(x2)
    }
  }
  for (const f of [f1, f2]) if (f.cost < best.cost) best = f
  return best
}
/**
 * Place the wrist at `wrist` with the hand at world orientation `hand`, keeping the elbow a
 * hinge, the forearm turning only about its pronation axis and the wrist without axial twist.
 * The elbow swings about the shoulder-wrist line toward `pole`, unless that would need
 * pronation or wrist motion beyond their ranges, in which case the nearest valid swing wins.
 */
export function reachArm(
  r: MovementRig,
  s: Side,
  wrist: Vector3,
  hand: Quaternion,
  pole: Vector3,
  options: SolveOptions = {},
) {
  const j = limb(s),
    b = armBind[s],
    [shrug, retract] = shrugOf(r, s),
    incoming = r.bones[j.arm].quaternion.clone()
  r.root.updateMatrixWorld(true)
  let longestReach = Infinity
  for (let pass = 0; pass < 2; pass++) {
    const parent = worldQ(r, j.girdle),
      inverse = parent.clone().invert(),
      shoulder = worldP(r, j.arm)
    const target = wrist.clone().sub(shoulder).applyQuaternion(inverse),
      want = inverse.clone().multiply(hand),
      towardPole = pole.clone().sub(shoulder).applyQuaternion(inverse)
    const upper = r.rest[j.fore],
      lower = r.rest[j.hand],
      l1 = upper.length(),
      l2 = lower.length()
    // The arm is longest with the elbow at anatomical zero, not with its pivots in a line.
    const longest = upper
        .clone()
        .add(lower.clone().applyQuaternion(turn(b.elbowAxis, -b.elbow)))
        .length(),
      dist = clamp(target.length(), Math.abs(l1 - l2) + 1e-4, Math.min(l1 + l2 - 1e-4, longest)),
      n = target.clone().normalize(),
      w = n.clone().multiplyScalar(dist)
    longestReach = longest
    const along = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist),
      radius = Math.sqrt(Math.max(0, l1 * l1 - along * along)),
      centre = n.clone().multiplyScalar(along)
    const e1 = towardPole.clone().addScaledVector(n, -towardPole.dot(n))
    if (e1.lengthSq() < 1e-10) e1.set(0, 0, -1).addScaledVector(n, n.z)
    e1.normalize()
    const e2 = n.clone().cross(e1)
    const h0 = upper.clone().normalize(),
      start = twistAbout(
        r.bones[j.ulna].quaternion.clone().invert().multiply(r.bones[j.fore].quaternion),
        b.pronationAxis,
      )
    const girdleNow = r.bones[j.girdle].quaternion.clone()
    const solveFrom = (psi: number, from: number): ArmSolution => {
      const elbow = centre
        .clone()
        .addScaledVector(e1, radius * Math.cos(psi * D2R))
        .addScaledVector(e2, radius * Math.sin(psi * D2R))
      const align = new Quaternion().setFromUnitVectors(h0, elbow.clone().normalize()),
        forearm = w.clone().sub(elbow).applyQuaternion(align.clone().invert())
      // Between beats the forearm turns on from where it is; it cannot swing to the far end of
      // its range within a frame.
      const lowest = Math.max(ARM_RANGE.pronation[0], options.local ? start - 15 : -Infinity),
        highest = Math.min(ARM_RANGE.pronation[1], options.local ? start + 15 : Infinity)
      let pronation = clamp(from, lowest, highest),
        best: ArmSolution | undefined
      for (let it = 0; it < 7; it++) {
        const v = lower.clone().applyQuaternion(turn(b.pronationAxis, pronation))
        const branch = pickBranch(
          twoAxis(h0, b.elbowAxis, v, forearm).map((x) => ({ ...x, flex: x.phi + b.elbow })),
          -10,
          165,
          options.local || options.stay
            ? (x) => align.clone().multiply(turn(h0, x.rho)).angleTo(incoming)
            : undefined,
        )
        const arm = align.clone().multiply(turn(h0, branch.rho)),
          ulna = turn(b.elbowAxis, branch.phi),
          fore = ulna.clone().multiply(turn(b.pronationAxis, pronation))
        const wristLocal = arm.clone().multiply(fore).invert().multiply(want)
        // Measure twist against the extension-then-deviation turn the wrist is rebuilt from, so
        // that what the forearm takes up is exactly what the wrist cannot.
        const { extension, radial, twist } = wristAngles(s, wristLocal)
        if (it < 6) {
          pronation = clamp(pronation + s * twist, lowest, highest)
          continue
        }
        // Remove any twist the forearm could not take, then keep the wrist within its range.
        const ext = clamp(extension, ARM_RANGE.extension[0], ARM_RANGE.extension[1]),
          rad = clamp(radial, ARM_RANGE.radial[0], ARM_RANGE.radial[1])
        const handLocal = turn(b.extensionAxis, ext).multiply(turn(b.radialAxis, rad))
        // The humerus may not turn past its axial range to make the hand fit.
        const humerus = girdleNow.clone().multiply(arm),
          elevation = b.humerus.clone().applyQuaternion(humerus).angleTo(DOWN) * R2D,
          rotation = humeralRotation(s, humerus)
        const rotationOver =
          elevation < 135 ? Math.max(0, rotation - 95) + Math.max(0, -88 - rotation) : 0
        const overflow =
          Math.abs(twist) +
          Math.abs(ext - extension) +
          Math.abs(rad - radial) +
          Math.max(0, -branch.flex - 8)
        // Between beats the arm keeps close to where the interpolated pose has it.
        const drift =
          options.local || options.stay
            ? ((arm.angleTo(incoming) * R2D) / 3) ** 2 + ((pronation - start) / 8) ** 2
            : 0
        best = {
          arm,
          fore,
          ulna,
          hand: handLocal,
          pronation,
          // Out of reach between beats, the hand lags its target rather than the arm leaping to
          // another solution.
          // The shoulder stops at its rotation range, between beats too; the hand gives first.
          cost:
            (options.local ? overflow * 2 : overflow * overflow) +
            (rotationOver * 3) ** 2 +
            (psi / 25) ** 2 +
            (rotation / 90) ** 2 * 0.25 +
            drift,
        }
      }
      return best!
    }
    // The forearm can reach a hand orientation by turning either way; try both ends and neutral.
    const solve = (psi: number) => {
      let found = solveFrom(psi, start)
      if (found.cost > 0.5 && !options.local)
        for (const from of [0, 85, 165]) {
          const trial = solveFrom(psi, from)
          if (trial.cost < found.cost) found = trial
        }
      return found
    }
    const span = options.search ?? (options.local ? 30 : 150)
    let best = solve(0)
    if (best.cost > 0.5 && span > 0) {
      let at = 0
      for (let psi = -span; psi <= span; psi += 10) {
        const trial = solve(psi)
        if (trial.cost < best.cost) {
          best = trial
          at = psi
        }
      }
      // The grid only finds the valley. Settle into it so the elbow swing varies smoothly with the
      // target instead of stepping a whole grid cell when the winner changes between frames.
      best = refine(solve, best, at, 10, span)
    }
    const girdle = r.bones[j.girdle].quaternion
    if (pass === 0) {
      // Scapular rhythm depends on the solved elevation; re-solve once with the girdle moved.
      const humerus = girdle.clone().multiply(best.arm),
        elevation = b.humerus.clone().applyQuaternion(humerus).angleTo(DOWN) * R2D
      // Reaching past arm's length slides the shoulder blade forward round the ribs: take the
      // least protraction that brings the wrist within reach. The girdle may already be
      // protracted, by the guide or an earlier solve, so only what is left of its 22 degree
      // range is available.
      const elevate = shrug + scapularRhythm(elevation),
        reach = longestReach - 0.004,
        room = clamp(retract + 22, 0, 22)
      const gap = (protract: number) => {
        girdle.copy(girdleRotation(s, elevate, retract - protract))
        r.bones[j.girdle].updateMatrixWorld(true)
        return wrist.distanceTo(worldP(r, j.arm)) - reach
      }
      let protract = 0
      if (room > 0 && gap(0) > 0 && gap(room) < gap(0)) {
        let lo = 0,
          hi = room
        if (gap(hi) < 0)
          for (let k = 0; k < 14; k++) {
            const mid = (lo + hi) / 2
            if (gap(mid) > 0) lo = mid
            else hi = mid
          }
        protract = hi
      }
      gap(protract)
      continue
    }
    r.bones[j.arm].quaternion.copy(best.arm)
    r.bones[j.ulna].quaternion.copy(best.ulna)
    r.bones[j.fore].quaternion.copy(best.fore)
    r.bones[j.hand].quaternion.copy(best.hand)
    r.bones[j.arm].updateMatrixWorld(true)
    return best
  }
}
/** Split the girdle into the choreography's shrug and the scapular rhythm of the current arm. */
function shrugOf(r: MovementRig, s: Side): [number, number] {
  const j = limb(s),
    girdle = r.bones[j.girdle].quaternion,
    e = new Euler().setFromQuaternion(girdle, 'XYZ')
  const humerus = girdle.clone().multiply(r.bones[j.arm].quaternion),
    elevation = armBind[s].humerus.clone().applyQuaternion(humerus).angleTo(DOWN) * R2D
  return [s * e.z * R2D - scapularRhythm(elevation), s * e.y * R2D]
}

/**
 * Put a point of the hand (`pad`, in the hand's frame) on `contact` with the palm facing as in
 * `hand`. A palm resting on a surface may lie at any angle about its own normal; when `spin` is
 * set, the turn the arm reaches most comfortably within that many degrees is kept.
 */
export function reachPalm(
  r: MovementRig,
  s: Side,
  contact: Vector3,
  hand: Quaternion,
  pad: Vector3,
  pole: Vector3,
  options: SolveOptions & { spin?: number; prefer?: Quaternion } = {},
) {
  const j = limb(s),
    { search, local } = options,
    solve = (q: Quaternion) =>
      reachArm(r, s, contact.clone().sub(pad.clone().applyQuaternion(q)), q, pole, {
        search,
        local,
      })
  let q = hand.clone()
  const span = options.spin ?? 0
  if (span > 0) {
    const normal = armBind[s].palmar.clone().applyQuaternion(hand),
      bones = [j.girdle, j.arm, j.fore, j.hand, j.ulna]
    const saved = bones.map((i) => r.bones[i].quaternion.clone())
    let best = { cost: Infinity, spin: 0 }
    for (let spin = -span; spin <= span; spin += 15) {
      bones.forEach((i, k) => r.bones[i].quaternion.copy(saved[k]))
      r.root.updateMatrixWorld(true)
      const turned = turn(normal, spin).multiply(hand)
      // A hand already resting on this contact in the beat before keeps its turn.
      const keep = options.prefer ? ((turned.angleTo(options.prefer) * R2D) / 30) ** 2 : 0
      const cost = (solve(turned)?.cost ?? Infinity) + (spin / 90) ** 2 * 0.5 + keep
      if (cost < best.cost) best = { cost, spin }
    }
    bones.forEach((i, k) => r.bones[i].quaternion.copy(saved[k]))
    r.root.updateMatrixWorld(true)
    q = turn(normal, best.spin).multiply(hand)
  }
  let found = solve(q)
  // Where the wrist could not turn the hand all the way, the pad lands off the contact. Aim the
  // wrist again from the orientation the hand actually reached.
  for (let k = 0; k < 3; k++) {
    const reached = worldQ(r, j.hand),
      wrist = contact.clone().sub(pad.clone().applyQuaternion(reached))
    if (wrist.distanceTo(worldP(r, j.hand)) < 2e-4) break
    found = reachArm(r, s, wrist, q, pole, { search, local }) ?? found
  }
  return found
}
/**
 * Hold the hand where it is, but make the arm anatomical: hinge elbow, pronation, no wrist twist.
 * A `local` pass keeps the elbow and forearm near where they already are.
 */
export function articulateArm(r: MovementRig, s: Side, local = false) {
  const j = limb(s)
  r.root.updateMatrixWorld(true)
  const wrist = worldP(r, j.hand),
    hand = worldQ(r, j.hand)
  return reachArm(r, s, wrist, hand, worldP(r, j.fore), local ? { local } : { search: 150 })
}

const LEG_RANGE = { tibial: 25, plantar: [-44, 60], eversion: [-34, 22] } as const
/** The knee turns only about its axis and the tibia, and the ankle can make the foot's turn. */
export function isHinged(r: MovementRig, s: Side) {
  const j = limb(s),
    b = legBind[s],
    shin = r.bones[j.shin].quaternion
  const flexion = twistAbout(shin, b.kneeAxis),
    rest = turn(b.kneeAxis, -flexion).multiply(shin),
    tibial = twistAbout(rest, b.tibia),
    varus = turn(b.tibia, -tibial).multiply(rest)
  const off = (q: Quaternion) => 2 * Math.acos(clamp(Math.abs(q.w), 0, 1)) * R2D,
    ankle = ankleAngles(s, r.bones[j.foot].quaternion)
  return (
    off(varus) < 1.5 &&
    off(ankle.residual) < 1.5 &&
    ankle.plantarflexion > LEG_RANGE.plantar[0] - 0.5 &&
    ankle.plantarflexion < LEG_RANGE.plantar[1] + 0.5 &&
    ankle.eversion > LEG_RANGE.eversion[0] - 0.5 &&
    ankle.eversion < LEG_RANGE.eversion[1] + 0.5
  )
}
/**
 * Place the ankle at `ankle` with the foot at world orientation `foot`, the knee a hinge with a
 * little tibial rotation once flexed, and the knee swinging toward `pole`.
 */
export function reachLeg(
  r: MovementRig,
  s: Side,
  ankle: Vector3,
  foot: Quaternion,
  pole: Vector3,
  options: SolveOptions = {},
) {
  const j = limb(s),
    b = legBind[s],
    incoming = r.bones[j.thigh].quaternion.clone()
  r.root.updateMatrixWorld(true)
  const parent = worldQ(r, 0),
    inverse = parent.clone().invert(),
    hip = worldP(r, j.thigh)
  const target = ankle.clone().sub(hip).applyQuaternion(inverse),
    want = inverse.clone().multiply(foot),
    towardPole = pole.clone().sub(hip).applyQuaternion(inverse)
  const upper = r.rest[j.shin],
    lower = r.rest[j.foot],
    l1 = upper.length(),
    l2 = lower.length()
  const dist = clamp(target.length(), Math.abs(l1 - l2) + 1e-4, l1 + l2 - 1e-4),
    n = target.clone().normalize(),
    w = n.clone().multiplyScalar(dist)
  const along = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist),
    radius = Math.sqrt(Math.max(0, l1 * l1 - along * along)),
    centre = n.clone().multiplyScalar(along)
  const e1 = towardPole.clone().addScaledVector(n, -towardPole.dot(n))
  if (e1.lengthSq() < 1e-10) e1.set(0, 0, 1).addScaledVector(n, -n.z)
  e1.normalize()
  const e2 = n.clone().cross(e1),
    f0 = upper.clone().normalize(),
    t0 = lower.clone().normalize()
  const solve = (psi: number) => {
    const knee = centre
      .clone()
      .addScaledVector(e1, radius * Math.cos(psi * D2R))
      .addScaledVector(e2, radius * Math.sin(psi * D2R))
    const align = new Quaternion().setFromUnitVectors(f0, knee.clone().normalize()),
      shin = w.clone().sub(knee).applyQuaternion(align.clone().invert())
    const branch = pickBranch(
      twoAxis(f0, b.kneeAxis, lower, shin).map((x) => ({ ...x, flex: x.phi })),
      -8,
      165,
      options.local || options.stay
        ? (x) => align.clone().multiply(turn(f0, x.rho)).angleTo(incoming)
        : undefined,
    )
    const thigh = align.clone().multiply(turn(f0, branch.rho)),
      hinge = turn(b.kneeAxis, branch.phi)
    // What the ankle cannot do (turning the foot about the leg) comes from tibial rotation,
    // more freely as the knee bends; any rest makes this swing of the knee costly.
    const allowance = LEG_RANGE.tibial * clamp(branch.phi / 70, 0, 1)
    const first = ankleAngles(s, thigh.clone().multiply(hinge).invert().multiply(want))
    const tibial = clamp(twistAbout(first.residual, t0), -allowance, allowance),
      shinQ = hinge.multiply(turn(t0, tibial))
    const ankle = ankleAngles(s, thigh.clone().multiply(shinQ).invert().multiply(want))
    const pf = clamp(ankle.plantarflexion, LEG_RANGE.plantar[0], LEG_RANGE.plantar[1]),
      ev = clamp(ankle.eversion, LEG_RANGE.eversion[0], LEG_RANGE.eversion[1])
    const footLocal = turn(b.ankleAxis, pf).multiply(turn(b.eversionAxis, ev))
    const rest =
      2 * Math.acos(clamp(Math.abs(ankle.residual.w), 0, 1)) * R2D +
      Math.abs(pf - ankle.plantarflexion) +
      Math.abs(ev - ankle.eversion)
    // The femur may not roll past its rotation range to make the foot fit.
    const femur = b.femur.clone().applyQuaternion(thigh),
      flexion = Math.atan2(femur.z, -femur.y) * R2D,
      abduction = Math.asin(clamp(s * femur.x, -1, 1)) * R2D,
      reference = turn(new Vector3(-1, 0, 0), flexion).multiply(
        turn(new Vector3(0, 0, s), abduction),
      ),
      rotation = s * twistAbout(reference.invert().multiply(thigh), b.femur.clone().negate())
    const rotationOver = Math.max(0, rotation - 75) + Math.max(0, -52 - rotation)
    // Between beats the thigh keeps close to where the interpolated pose has it.
    const drift = options.local || options.stay ? ((thigh.angleTo(incoming) * R2D) / 4) ** 2 : 0
    // A straight leg hardly fixes the roll of the femur; leave it near neutral unless the foot
    // asks for more.
    const cost =
      rest * rest +
      Math.max(0, -branch.phi - 6) ** 2 * 4 +
      rotationOver ** 2 +
      (rotation / 45) ** 2 * 0.5 +
      (psi / 30) ** 2 +
      drift
    return { thigh, shin: shinQ, foot: footLocal, cost }
  }
  const span = options.search ?? (options.local ? 24 : 90)
  let best = solve(0)
  if (best.cost > 0.5 && span > 0) {
    let at = 0
    for (let psi = -span; psi <= span; psi += 6) {
      const trial = solve(psi)
      if (trial.cost < best.cost) {
        best = trial
        at = psi
      }
    }
    // Between beats the knee swing settles smoothly instead of stepping a grid cell; a beat keeps
    // the grid so that its left and right sides stay exact mirrors.
    if (options.local) best = refine(solve, best, at, 6, span)
  }
  r.bones[j.thigh].quaternion.copy(best.thigh)
  r.bones[j.shin].quaternion.copy(best.shin)
  r.bones[j.foot].quaternion.copy(best.foot)
  r.bones[j.thigh].updateMatrixWorld(true)
  return best
}
export function articulateLeg(r: MovementRig, s: Side, local = false) {
  const j = limb(s)
  // Between beats a leg interpolated from two anatomical beats is already a hinge with an ankle
  // that can hold its foot. Re-solving it would only let a nearly straight knee pick a new roll.
  if (local && isHinged(r, s)) return
  r.root.updateMatrixWorld(true)
  const ankle = worldP(r, j.foot),
    foot = worldQ(r, j.foot),
    knee = worldP(r, j.shin)
  if (!local) return reachLeg(r, s, ankle, foot, knee, { search: 60 })
  const saved = [j.thigh, j.shin, j.foot].map((i) => r.bones[i].quaternion.clone())
  const result = reachLeg(r, s, ankle, foot, knee, { local })
  r.root.updateMatrixWorld(true)
  // A nearly straight leg turns its whole foot by swivelling at the hip, further than a local
  // solve may stray. When the foot has not kept its turn, solve again with the full swivel.
  if (worldQ(r, j.foot).angleTo(foot) * R2D <= 3) return result
  const kept = [j.thigh, j.shin, j.foot].map((i) => r.bones[i].quaternion.clone())
  saved.forEach((q, k) => r.bones[[j.thigh, j.shin, j.foot][k]].quaternion.copy(q))
  r.root.updateMatrixWorld(true)
  const full = reachLeg(r, s, ankle, foot, knee, { search: 60, stay: true })
  r.root.updateMatrixWorld(true)
  if (worldQ(r, j.foot).angleTo(foot) * R2D < 3) return full
  // Neither holds it exactly; keep whichever turned the foot least.
  const fullTurn = worldQ(r, j.foot).angleTo(foot)
  kept.forEach((q, k) => r.bones[[j.thigh, j.shin, j.foot][k]].quaternion.copy(q))
  r.root.updateMatrixWorld(true)
  if (worldQ(r, j.foot).angleTo(foot) <= fullTurn) return result
  saved.forEach((q, k) => r.bones[[j.thigh, j.shin, j.foot][k]].quaternion.copy(q))
  r.root.updateMatrixWorld(true)
  return reachLeg(r, s, ankle, foot, knee, { search: 60, stay: true })
}

/** Make the ulna follow the hinge part of the forearm, for poses that set the forearm directly. */
export function followUlna(r: MovementRig) {
  for (const s of [1, -1] as Side[]) {
    const j = limb(s),
      b = armBind[s]
    const forearm = r.rest[j.hand].clone().applyQuaternion(r.bones[j.fore].quaternion)
    r.bones[j.ulna].quaternion.copy(
      turn(b.elbowAxis, signedAngle(r.rest[j.hand], forearm, b.elbowAxis)),
    )
  }
}

// ---------------------------------------------------------------------------------------------
// Measurement
// ---------------------------------------------------------------------------------------------
export type Angles = Record<string, number>
/** Anatomical angles of the posed rig, in degrees. Keys read `L.elbow.flexion` and so on. */
export function measure(r: MovementRig): Angles {
  r.root.updateMatrixWorld(true)
  const out: Angles = {}
  const chest = worldQ(r, 3),
    pelvis = worldQ(r, 0)
  for (const s of [1, -1] as Side[]) {
    const k = s === 1 ? 'L.' : 'R.',
      j = limb(s),
      a = armBind[s],
      l = legBind[s]
    // Shoulder: humeral direction and axial rotation relative to the thorax.
    const humerus = chest.clone().invert().multiply(worldQ(r, j.arm))
    const dir = a.humerus.clone().applyQuaternion(humerus)
    out[k + 'shoulder.elevation'] = dir.angleTo(DOWN) * R2D
    out[k + 'shoulder.plane'] = Math.atan2(dir.z, s * dir.x) * R2D
    // Axial rotation has no stable reference near full elevation (Codman's paradox).
    if (out[k + 'shoulder.elevation'] < 135)
      out[k + 'shoulder.rotation'] = humeralRotation(s, humerus)
    const girdle = r.bones[j.girdle].quaternion
    out[k + 'girdle.elevation'] = s * twistAbout(girdle, new Vector3(0, 0, 1))
    out[k + 'girdle.retraction'] = s * twistAbout(girdle, new Vector3(0, 1, 0))
    // Elbow and forearm.
    const ulna = r.bones[j.ulna].quaternion,
      fore = r.bones[j.fore].quaternion
    out[k + 'elbow.flexion'] = twistAbout(ulna, a.elbowAxis) + a.elbow
    const radius = ulna.clone().invert().multiply(fore)
    out[k + 'forearm.pronation'] = twistAbout(radius, a.pronationAxis)
    out[k + 'forearm.offAxis'] =
      2 * Math.acos(clamp(Math.abs(swingOf(radius, a.pronationAxis).w), 0, 1)) * R2D
    // Wrist.
    const wrist = wristAngles(s, r.bones[j.hand].quaternion)
    out[k + 'wrist.extension'] = wrist.extension
    out[k + 'wrist.radial'] = wrist.radial
    out[k + 'wrist.twist'] = wrist.twist
    // Digits.
    const side = prefixOf(s)
    for (const digit of ['Thumb', ...FINGERS]) {
      const names = digit === 'Thumb' ? ['mcp', 'ip'] : ['mcp', 'pip', 'dip']
      names.forEach((label, n) => {
        const name = side + digit + (n + 1)
        out[k + digit.toLowerCase() + '.' + label] =
          twistAbout(r.bones[indexOfJoint[name as Joint]].quaternion, vec(digitAxes[name].flex)) +
          bindFlexion(name)
      })
    }
    // Hip, knee and ankle.
    const thigh = pelvis.clone().invert().multiply(worldQ(r, j.thigh)),
      femur = l.femur.clone().applyQuaternion(thigh)
    out[k + 'hip.flexion'] = Math.atan2(femur.z, -femur.y) * R2D
    out[k + 'hip.abduction'] = Math.asin(clamp(s * femur.x, -1, 1)) * R2D
    // Hip rotation in the joint convention the guides are authored in (flexion, then abduction,
    // then rotation about the femur), not against the shortest swing.
    const reference = turn(new Vector3(-1, 0, 0), out[k + 'hip.flexion']).multiply(
      turn(new Vector3(0, 0, s), out[k + 'hip.abduction']),
    )
    out[k + 'hip.rotation'] =
      s * twistAbout(reference.invert().multiply(thigh), l.femur.clone().negate())
    const shin = r.bones[j.shin].quaternion
    const kneeFlexion = twistAbout(shin, l.kneeAxis)
    out[k + 'knee.flexion'] = kneeFlexion
    // External rotation of the tibia is positive on both sides, as at the hip.
    out[k + 'knee.rotation'] =
      s * twistAbout(turn(l.kneeAxis, -kneeFlexion).multiply(shin), l.tibia.clone().negate())
    const ankle = ankleAngles(s, r.bones[j.foot].quaternion)
    out[k + 'ankle.plantarflexion'] = ankle.plantarflexion
    out[k + 'ankle.eversion'] = ankle.eversion
    out[k + 'ankle.twist'] = 2 * Math.acos(clamp(Math.abs(ankle.residual.w), 0, 1)) * R2D
    out[k + 'toe.mtp'] = twistAbout(
      r.bones[indexOfJoint[(side + 'ToeBig1') as Joint]].quaternion,
      vec(digitAxes[side + 'ToeBig1'].flex),
    )
  }
  const euler = (indices: number[]) => {
    const q = new Quaternion()
    for (const i of indices) q.multiply(r.bones[i].quaternion)
    const e = new Euler().setFromQuaternion(q, 'XYZ')
    return [e.x * R2D, e.y * R2D, -e.z * R2D]
  }
  const [tf, tr, tl] = euler([1, 2, 3]),
    [nf, nr, nl] = euler([4, 5])
  Object.assign(out, {
    'trunk.flexion': tf,
    'trunk.rotation': tr,
    'trunk.lateral': tl,
    'neck.flexion': nf,
    'neck.rotation': nr,
    'neck.lateral': nl,
    'jaw.opening': twistAbout(r.bones[indexOfJoint.jaw].quaternion, new Vector3(1, 0, 0)),
  })
  return out
}
/**
 * Normal active ranges (AAOS and standard goniometry references), widened slightly for the
 * passive end of a stretch. Keys are suffixes of the `measure` keys.
 */
export const LIMITS: Record<string, readonly [number, number]> = {
  'shoulder.elevation': [0, 182],
  'shoulder.rotation': [-95, 100],
  'girdle.elevation': [-14, 32],
  'girdle.retraction': [-22, 22],
  // Full passive flexion stops when the forearm meets the upper arm, about 150 to 155 degrees.
  'elbow.flexion': [-10, 155],
  'forearm.pronation': [-8, 172],
  'forearm.offAxis': [0, 3],
  'wrist.extension': [-88, 90],
  'wrist.radial': [-38, 22],
  'wrist.twist': [-4, 4],
  'thumb.mcp': [-25, 65],
  'thumb.ip': [-25, 85],
  'index.mcp': [-45, 95],
  'index.pip': [-8, 110],
  'index.dip': [-15, 90],
  'middle.mcp': [-45, 95],
  'middle.pip': [-8, 110],
  'middle.dip': [-15, 90],
  'ring.mcp': [-45, 95],
  'ring.pip': [-8, 110],
  'ring.dip': [-15, 90],
  'little.mcp': [-45, 95],
  'little.pip': [-8, 110],
  'little.dip': [-15, 90],
  // Passive hip flexion with the knee bent reaches about 150 when the thigh meets the trunk.
  'hip.flexion': [-36, 152],
  'hip.abduction': [-45, 55],
  // With the hip flexed, passive external rotation reaches about 75 degrees (figure-four, pigeon).
  'hip.rotation': [-55, 78],
  // Kneeling back onto the heels takes the knee to about 160 to 165 degrees.
  'knee.flexion': [-6, 165],
  'knee.rotation': [-30, 30],
  // A deep squat with the heels down needs up to 45 degrees of dorsiflexion; kneeling, 60 of plantarflexion.
  'ankle.plantarflexion': [-46, 62],
  'ankle.eversion': [-38, 25],
  'ankle.twist': [0, 8],
  'toe.mtp': [-80, 45],
  // Thoracolumbar extension in a prone press-up reaches about 40 to 45 degrees.
  'trunk.flexion': [-45, 100],
  // Thoracic and lumbar rotation together reach about 60 degrees with the pelvis fixed.
  'trunk.rotation': [-60, 60],
  'trunk.lateral': [-42, 42],
  'neck.flexion': [-75, 65],
  'neck.rotation': [-82, 82],
  'neck.lateral': [-48, 48],
  'jaw.opening': [-2, 38],
}
export function limitFor(key: string) {
  const suffix = key.replace(/^[LR]\./, '')
  return LIMITS[suffix]
}
