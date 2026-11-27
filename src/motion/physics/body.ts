/**
 * Mass distribution and contact points of the performer rig, for balance and support checks.
 *
 * Segment masses follow de Leva (1996) for an adult male, split along the rig's own joints, so
 * the centre of mass is good to a couple of centimetres. That is plenty to ask "does this pose
 * fall over?", which is the only question it answers.
 */
import { Vector3 } from 'three'
import cloud from '../studio/guides/contact-cloud.json'
import anatomyCloud from '../studio/guides/anatomy-cloud.json'
import { indexOfJoint, joints, type Joint } from '../joints'
import type { MovementRig } from '../movementRig'

const j = (name: string) => indexOfJoint[name as Joint]
type Segment = { mass: number; from: number; to: number; at: number }
const pair = (side: 'left' | 'right') => {
  const S = side === 'left' ? 'left' : 'right'
  return [
    { mass: 0.0271, from: j(S + 'Arm'), to: j(S + 'Forearm'), at: 0.577 },
    { mass: 0.0162, from: j(S + 'Forearm'), to: j(S + 'Hand'), at: 0.457 },
    { mass: 0.0061, from: j(S + 'Hand'), to: j(S + 'Middle1'), at: 0.8 },
    { mass: 0.1416, from: j(S + 'Thigh'), to: j(S + 'Shin'), at: 0.4095 },
    { mass: 0.0433, from: j(S + 'Shin'), to: j(S + 'Foot'), at: 0.4459 },
    { mass: 0.0137, from: j(S + 'Foot'), to: j(S + 'ToeTwo1'), at: 0.5 },
  ] satisfies Segment[]
}
export const SEGMENTS: Segment[] = [
  // Trunk, 43.46 %, in four slices along the spine.
  { mass: 0.1117, from: j('pelvis'), to: j('lumbar'), at: 0.5 },
  { mass: 0.1633, from: j('lumbar'), to: j('spine'), at: 0.5 },
  { mass: 0.0798, from: j('spine'), to: j('chest'), at: 0.5 },
  { mass: 0.0798, from: j('chest'), to: j('neck'), at: 0.5 },
  // Head and neck, 6.94 %: the head joint sits at the skull base, the mass sits above it.
  { mass: 0.0694, from: j('neck'), to: j('head'), at: 1.6 },
  ...pair('left'),
  ...pair('right'),
]
const total = SEGMENTS.reduce((n, s) => n + s.mass, 0)

const a = new Vector3(),
  b = new Vector3()
/** World-space centre of mass of the posed rig, in metres. Call after `updateMatrixWorld`. */
export function centreOfMass(r: MovementRig, out = new Vector3()) {
  out.set(0, 0, 0)
  for (const s of SEGMENTS) {
    r.bones[s.from].getWorldPosition(a)
    r.bones[s.to].getWorldPosition(b)
    out.addScaledVector(a.lerp(b, s.at), s.mass)
  }
  return out.divideScalar(total)
}

const localize = (rows: number[][]) =>
  rows.map((row, i) => {
    const p = joints[i][2] as readonly number[],
      out = new Float32Array(row.length)
    for (let k = 0; k < row.length; k += 3) {
      out[k] = row[k] / 1000 - p[0]
      out[k + 1] = row[k + 1] / 1000 - p[1]
      out[k + 2] = row[k + 2] / 1000 - p[2]
    }
    return out
  })
/** Every contact witness of the clothed performer and skeleton, as local points per joint. */
const witnesses = localize(cloud)
/** The same for the bare atlas tissue alone: the skeleton and the muscles. */
const bare = localize(anatomyCloud)
const handish = (i: number) => /Hand|Thumb|Index|Middle|Ring|Little/.test(joints[i][0])
const jointsOf = (sets: Float32Array[]) =>
  Uint8Array.from(sets.flatMap((w, i) => Array(w.length / 3).fill(i)))
/** The joint each witness belongs to, in the order `worldWitnesses` writes them. */
export const witnessJoint = jointsOf(witnesses),
  bareJoint = jointsOf(bare)
function place(r: MovementRig, sets: Float32Array[], out: Float32Array) {
  let n = 0
  for (let i = 0; i < sets.length; i++) {
    const m = r.bones[i].matrixWorld.elements,
      w = sets[i]
    for (let k = 0; k < w.length; k += 3, n += 3) {
      const x = w[k],
        y = w[k + 1],
        z = w[k + 2]
      out[n] = m[0] * x + m[4] * y + m[8] * z + m[12]
      out[n + 1] = m[1] * x + m[5] * y + m[9] * z + m[13]
      out[n + 2] = m[2] * x + m[6] * y + m[10] * z + m[14]
    }
  }
  return out
}
/** World positions of the performer's contact witnesses, packed x, y, z. */
export const worldWitnesses = (r: MovementRig, out = new Float32Array(witnessJoint.length * 3)) =>
  place(r, witnesses, out)
/** World positions of the bare atlas tissue's witnesses, packed x, y, z. */
export const worldBare = (r: MovementRig, out = new Float32Array(bareJoint.length * 3)) =>
  place(r, bare, out)
export const isHandJoint = handish
export const isFootJoint = (i: number) => /Foot|Toe/.test(joints[i][0])
export const jointSide = (i: number): 1 | -1 | 0 =>
  joints[i][0].startsWith('left') ? 1 : joints[i][0].startsWith('right') ? -1 : 0

/** Andrew's monotone chain on the floor plane (x, z). */
export function hull(points: readonly (readonly [number, number])[]) {
  const p = [...points].sort((u, v) => u[0] - v[0] || u[1] - v[1])
  if (p.length < 3) return p
  const cross = (o: readonly number[], u: readonly number[], v: readonly number[]) =>
    (u[0] - o[0]) * (v[1] - o[1]) - (u[1] - o[1]) * (v[0] - o[0])
  const lower: (readonly [number, number])[] = []
  for (const q of p) {
    while (lower.length >= 2 && cross(lower.at(-2)!, lower.at(-1)!, q) <= 0) lower.pop()
    lower.push(q)
  }
  const upper: (readonly [number, number])[] = []
  for (const q of [...p].reverse()) {
    while (upper.length >= 2 && cross(upper.at(-2)!, upper.at(-1)!, q) <= 0) upper.pop()
    upper.push(q)
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)]
}
/**
 * Signed distance from a point to the support polygon: positive inside (the margin of stability),
 * negative outside (how far the centre of mass has passed the edge).
 */
export function marginInside(poly: readonly (readonly [number, number])[], x: number, z: number) {
  if (!poly.length) return -Infinity
  let inside = poly.length >= 3,
    best = Infinity
  for (let i = 0; i < poly.length; i++) {
    const [x1, z1] = poly[i],
      [x2, z2] = poly[(i + 1) % poly.length]
    const dx = x2 - x1,
      dz = z2 - z1,
      len2 = dx * dx + dz * dz
    const t = len2 ? Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / len2)) : 0
    best = Math.min(best, Math.hypot(x - (x1 + t * dx), z - (z1 + t * dz)))
    if (poly.length >= 3 && dx * (z - z1) - dz * (x - x1) < 0) inside = false
  }
  return inside ? best : -best
}
