/**
 * Derive joint pivots and anatomical axes from the registered BodyParts3D surfaces.
 * The atlas and the performer share these bind coordinates.
 *
 * Every pivot is measured, never placed by eye:
 * - ball joints (shoulder, hip) and the elbow, wrist and digit joints sit at the centre of a sphere
 *   fitted to the articular head of the proximal bone;
 * - the knee hinges on the axis through both posterior femoral condyles;
 * - the ankle hinges at the centre of the talar dome;
 * - each digit flexes about the width axis of its phalanx, found by principal components.
 */
import { format, resolveConfig } from 'prettier'
import { writeFile } from 'node:fs/promises'
import { NodeIO } from '@gltf-transform/core'
import { KHRDracoMeshCompression } from '@gltf-transform/extensions'
import draco from 'draco3dgltf'
import { Vector3 } from 'three'
import { structureByMesh } from '../../src/anatomy/catalogue'
const io = new NodeIO()
  .registerExtensions([KHRDracoMeshCompression])
  .registerDependencies({ 'draco3d.decoder': await draco.createDecoderModule() })
const nodes = (await io.read('public/models/male-skeleton.glb')).getRoot().listNodes()
const bones = new Map<string, { id: string; points: Vector3[]; center: Vector3 }>()
for (const n of nodes) {
  const s = structureByMesh.get(n.getName()),
    pos = n.getMesh()?.listPrimitives()[0].getAttribute('POSITION')
  if (!s || !pos) continue
  const points = Array.from({ length: pos.getCount() }, (_, i) =>
    new Vector3().fromArray(pos.getElement(i, [])),
  )
  bones.set(s.displayName.toLowerCase(), { id: s.meshName, points, center: mean(points) })
}
function mean(points: Vector3[]) {
  return points.reduce((v, q) => v.add(q), new Vector3()).divideScalar(points.length)
}
const at = (name: string) => {
  const b = bones.get(name)
  if (!b) throw Error('No registered surface for ' + name)
  return b
}
const array = (v: Vector3, digits = 6) => v.toArray().map((x) => Number(x.toFixed(digits)))

/** Algebraic least-squares sphere: |p|² = 2c·p + d. */
function sphere(points: Vector3[]) {
  const m = Array.from({ length: 4 }, () => Array<number>(5).fill(0))
  for (const p of points) {
    const row = [2 * p.x, 2 * p.y, 2 * p.z, 1],
      rhs = p.lengthSq()
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) m[i][j] += row[i] * row[j]
      m[i][4] += row[i] * rhs
    }
  }
  for (let c = 0; c < 4; c++) {
    let pivot = c
    for (let r = c + 1; r < 4; r++) if (Math.abs(m[r][c]) > Math.abs(m[pivot][c])) pivot = r
    ;[m[c], m[pivot]] = [m[pivot], m[c]]
    for (let r = 0; r < 4; r++)
      if (r !== c) {
        const f = m[r][c] / m[c][c]
        for (let k = c; k < 5; k++) m[r][k] -= f * m[c][k]
      }
  }
  const x = m.map((r, i) => r[4] / r[i]),
    center = new Vector3(x[0], x[1], x[2]),
    radius = Math.sqrt(x[3] + center.lengthSq())
  const rms = Math.sqrt(
    points.reduce((s, p) => s + (p.distanceTo(center) - radius) ** 2, 0) / points.length,
  )
  return { center, radius, rms }
}
/** Principal axes, longest first (Jacobi rotation on the covariance matrix). */
function principal(points: Vector3[]) {
  const c = mean(points),
    a = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ]
  for (const p of points) {
    const d = p.clone().sub(c).toArray()
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) a[i][j] += (d[i] * d[j]) / points.length
  }
  const v = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ]
  for (let it = 0; it < 60; it++) {
    let p = 0,
      q = 1
    for (const [i, j] of [
      [0, 1],
      [0, 2],
      [1, 2],
    ])
      if (Math.abs(a[i][j]) > Math.abs(a[p][q])) [p, q] = [i, j]
    if (Math.abs(a[p][q]) < 1e-16) break
    const th = 0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]),
      cs = Math.cos(th),
      sn = Math.sin(th)
    for (let k = 0; k < 3; k++) {
      const x = a[k][p],
        y = a[k][q]
      a[k][p] = cs * x - sn * y
      a[k][q] = sn * x + cs * y
    }
    for (let k = 0; k < 3; k++) {
      const x = a[p][k],
        y = a[q][k]
      a[p][k] = cs * x - sn * y
      a[q][k] = sn * x + cs * y
    }
    for (let k = 0; k < 3; k++) {
      const x = v[k][p],
        y = v[k][q]
      v[k][p] = cs * x - sn * y
      v[k][q] = sn * x + cs * y
    }
  }
  return [0, 1, 2]
    .map((i) => ({ value: a[i][i], axis: new Vector3(v[0][i], v[1][i], v[2][i]).normalize() }))
    .sort((x, y) => y.value - x.value)
    .map((e) => e.axis)
}
/** The articular end of a bone: vertices within `depth` of its extreme along `toward`. */
function end(points: Vector3[], toward: Vector3, depth: number) {
  const axis = toward.clone().normalize(),
    max = Math.max(...points.map((p) => p.dot(axis)))
  return points.filter((p) => p.dot(axis) > max - depth)
}
function headCentre(name: string, toward: Vector3, depth: number) {
  const b = at(name)
  return sphere(end(b.points, toward.clone().sub(b.center), depth)).center
}
/** A unit axis oriented so a positive right-handed turn moves `from` toward `to`. */
const flexAxis = (from: Vector3, to: Vector3) => {
  const d = from.clone().normalize(),
    p = to.clone().addScaledVector(d, -to.dot(d)).normalize()
  return d.cross(p).normalize()
}

// Jaw: unchanged from the first articulation pass.
const joints: [string, number, number[]][] = [],
  bindings: Record<string, number> = {},
  tips: Record<string, number[]> = {},
  axes: Record<string, { flex: number[]; spread?: number[]; twist?: number[] }> = {}
const insert = (name: string, parent: number, p: Vector3) => {
  joints.push([name, parent, array(p)])
  return 19 + joints.length
}
const jaw = at('mandible'),
  condyles = jaw.points
    .filter((v) => Math.abs(v.x - jaw.center.x) > 0.043)
    .sort((a, b) => b.y - a.y)
    .slice(0, Math.ceil(jaw.points.length * 0.01))
const hinge = mean(condyles)
hinge.x = jaw.center.x
const jawIndex = insert('jaw', 5, hinge)
bindings[jaw.id] = jawIndex
for (const [name, b] of bones)
  if (name.includes('lower ') && name.includes('tooth')) bindings[b.id] = jawIndex

const fingers = [
  ['Thumb', 'thumb', 'first'],
  ['Index', 'index finger', 'second'],
  ['Middle', 'middle finger', 'third'],
  ['Ring', 'ring finger', 'fourth'],
  ['Little', 'little finger', 'fifth'],
] as const
const toes = [
  ['ToeBig', 'big toe', 'first'],
  ['ToeTwo', 'second toe', 'second'],
  ['ToeThree', 'third toe', 'third'],
  ['ToeFour', 'fourth toe', 'fourth'],
  ['ToeLittle', 'little toe', 'fifth'],
] as const

type Frames = Record<string, number[]>
const limb: Record<'left' | 'right', Frames> = { left: {}, right: {} }
for (const side of ['left', 'right'] as const) {
  const s = side === 'left' ? 1 : -1,
    out = limb[side]
  // Shoulder: humeral head.
  const humerus = at(side + ' humerus'),
    top = Math.max(...humerus.points.map((p) => p.y))
  const shoulder = sphere(humerus.points.filter((p) => p.y > top - 0.045 && s * p.x < 0.185)).center
  // Elbow: capitulum (lateral) and trochlea (medial) surfaces of the distal humerus.
  const bottom = Math.min(...humerus.points.map((p) => p.y)),
    distal = humerus.points.filter((p) => p.y < bottom + 0.025),
    split = mean(distal).x
  const capitulum = sphere(distal.filter((p) => s * (p.x - split) > 0.004)).center,
    trochlea = sphere(distal.filter((p) => s * (p.x - split) < -0.004)).center
  // The radius turns about the line from the capitulum to the ulnar head.
  const ulna = at(side + ' ulna'),
    ulnaLow = Math.min(...ulna.points.map((p) => p.y))
  const ulnarHead = mean(ulna.points.filter((p) => p.y < ulnaLow + 0.02))
  // Wrist: head of the capitate.
  const capitate = at(side + ' capitate'),
    capTop = Math.max(...capitate.points.map((p) => p.y))
  const wrist = sphere(capitate.points.filter((p) => p.y > capTop - 0.008)).center
  // Hand frame from the metacarpal heads.
  const mc = (n: string, toward: Vector3) =>
    headCentre(side + ' ' + n + ' metacarpal bone', toward, 0.009)
  const phalanxCentre = (kind: string, display: string) =>
    at(kind + ' phalanx of ' + side + ' ' + display).center
  const m2 = mc('second', phalanxCentre('proximal', 'index finger')),
    m3 = mc('third', phalanxCentre('proximal', 'middle finger')),
    m5 = mc('fifth', phalanxCentre('proximal', 'little finger'))
  const handLong = m3.clone().sub(wrist).normalize(),
    radial = m2
      .clone()
      .sub(m5)
      .addScaledVector(handLong, -m2.clone().sub(m5).dot(handLong))
      .normalize(),
    palmar = handLong.clone().cross(radial).multiplyScalar(s).normalize()
  // A palm laid flat rests on the heel of the hand (the pisiform and trapezium ridges) and on the
  // metacarpal heads. The heel stands further from the bony axis, so the surface dips toward the
  // fingers.
  const depth = (p: Vector3) => p.clone().sub(wrist).dot(palmar),
    reach = (p: Vector3) => p.clone().sub(wrist).dot(handLong)
  const palmarMost = (points: Vector3[]) =>
    points.reduce((b, p) => (depth(p) > depth(b) ? p : b), points[0])
  const handHeel = palmarMost(at(side + ' pisiform').points)
    .add(palmarMost(at(side + ' trapezium').points))
    .multiplyScalar(0.5)
  const knuckles = mean(
    ['second', 'third', 'fourth', 'fifth'].map((n) => {
      const points = at(side + ' ' + n + ' metacarpal bone').points,
        far = Math.max(...points.map(reach))
      return palmarMost(points.filter((p) => reach(p) > far - 0.014))
    }),
  )
  const palmSurfaceLong = knuckles
      .clone()
      .sub(handHeel)
      .addScaledVector(radial, -knuckles.clone().sub(handHeel).dot(radial))
      .normalize(),
    palmSurface = palmSurfaceLong.clone().cross(radial).multiplyScalar(s).normalize()
  // Hip: femoral head. Knee: both posterior condyles. Ankle: talar dome.
  const femur = at(side + ' femur'),
    fTop = Math.max(...femur.points.map((p) => p.y)),
    fLow = Math.min(...femur.points.map((p) => p.y))
  const hip = sphere(femur.points.filter((p) => p.y > fTop - 0.05 && s * p.x < 0.095)).center
  const condyleRegion = femur.points.filter((p) => p.y < fLow + 0.06),
    cx = mean(condyleRegion).x,
    cz = mean(condyleRegion).z
  const medial = sphere(condyleRegion.filter((p) => s * (p.x - cx) < -0.008 && p.z < cz + 0.005)),
    lateral = sphere(condyleRegion.filter((p) => s * (p.x - cx) > 0.008 && p.z < cz + 0.005))
  const knee = medial.center.clone().add(lateral.center).multiplyScalar(0.5)
  const talus = at(side + ' talus'),
    tTop = Math.max(...talus.points.map((p) => p.y))
  const ankle = sphere(talus.points.filter((p) => p.y > tTop - 0.012)).center
  const mt1 = headCentre(
      side + ' first metatarsal bone',
      at('proximal phalanx of ' + side + ' big toe').center,
      0.01,
    ),
    mt5 = headCentre(
      side + ' fifth metatarsal bone',
      at('proximal phalanx of ' + side + ' little toe').center,
      0.01,
    )
  const calcaneus = at(side + ' calcaneus'),
    heel = calcaneus.points.reduce((b, p) => (p.z < b.z ? p : b), calcaneus.points[0])
  const ball = mt1.clone().add(mt5).multiplyScalar(0.5),
    footLong = ball.clone().sub(heel).setY(0).normalize()
  // The talocrural axis runs between the tips of the malleoli.
  const lowest = (points: Vector3[]) => points.reduce((b, p) => (p.y < b.y ? p : b), points[0])
  const lateralMalleolus = lowest(at(side + ' fibula').points),
    medialMalleolus = lowest(at(side + ' tibia').points)
  const ankleAxis = lateralMalleolus.clone().sub(medialMalleolus).normalize().multiplyScalar(s)
  Object.assign(out, {
    shoulder: array(shoulder),
    humerusAxis: array(
      shoulder.clone().sub(capitulum.clone().add(trochlea).multiplyScalar(0.5)).normalize(),
    ),
    elbow: array(capitulum),
    trochlea: array(trochlea),
    // Positive turns flex the elbow, pronate the forearm, extend the wrist and deviate it radially.
    elbowAxis: array(
      flexAxis(new Vector3(0, -1, 0), new Vector3(0, 0, 1)).dot(capitulum.clone().sub(trochlea)) > 0
        ? capitulum.clone().sub(trochlea).normalize()
        : trochlea.clone().sub(capitulum).normalize(),
    ),
    pronationAxis: array(ulnarHead.clone().sub(capitulum).normalize().multiplyScalar(s)),
    ulnarHead: array(ulnarHead),
    wrist: array(wrist),
    wristExtensionAxis: array(radial.clone().multiplyScalar(s)),
    wristRadialAxis: array(palmar.clone().multiplyScalar(s)),
    handLong: array(handLong),
    palmar: array(palmar),
    radial: array(radial),
    palmCentre: array(m3.clone().lerp(wrist, 0.45).addScaledVector(palmar, 0.016)),
    // Along and out of the plane a flat palm rests in.
    palmSurfaceLong: array(palmSurfaceLong),
    palmSurface: array(palmSurface),
    hip: array(hip),
    knee: array(knee),
    kneeAxis: array(lateral.center.clone().sub(medial.center).normalize().multiplyScalar(s)),
    ankle: array(ankle),
    ankleAxis: array(ankleAxis),
    footLong: array(footLong),
    heel: array(heel),
    ball: array(ball),
  })
  console.log(
    side,
    'fits (mm rms): condyles',
    (medial.rms * 1000).toFixed(1),
    (lateral.rms * 1000).toFixed(1),
  )
  // Digits: pivots at the articular head of each proximal bone.
  for (const [digit, display, metacarpal] of [...fingers, ...toes]) {
    const foot = digit.startsWith('Toe'),
      thumb = digit === 'Thumb'
    const chain = (
      thumb || digit === 'ToeBig' ? ['Proximal', 'Distal'] : ['Proximal', 'Middle', 'Distal']
    ).map((p) => at(p.toLowerCase() + ' phalanx of ' + side + ' ' + display))
    const meta = at(side + ' ' + metacarpal + (foot ? ' metatarsal bone' : ' metacarpal bone'))
    // Flexion moves a finger toward the palm and a toe toward the sole.
    const plantar = foot ? new Vector3(0, -1, 0) : palmar
    let parent = foot ? (side === 'left' ? 14 : 17) : side === 'left' ? 8 : 11
    if (thumb) {
      // The thumb's carpometacarpal saddle sits at the base of the first metacarpal.
      const axis = chain[0].center.clone().sub(meta.center).normalize(),
        base = mean(end(meta.points, axis.clone().negate(), 0.006))
      parent = insert(side + digit + '0', parent, base)
      bindings[meta.id] = parent
      // The metacarpal is nearly as thick as it is wide, so its minor principal axes are unstable.
      // Its pulp side is taken toward the centre of the palm instead.
      const [long] = principal(meta.points)
      if (long.dot(axis) < 0) long.negate()
      // Flexion carries the metacarpal across the palm; abduction lifts it off the palm.
      const pulp = m3.clone().sub(meta.center)
      pulp.addScaledVector(long, -pulp.dot(long)).normalize()
      const lift = palmar.clone().addScaledVector(long, -palmar.dot(long))
      lift.addScaledVector(pulp, -lift.dot(pulp)).normalize()
      axes[side + digit + '0'] = {
        flex: array(flexAxis(long, pulp)),
        spread: array(flexAxis(long, lift)),
        twist: array(long.clone().multiplyScalar(-s)),
      }
    }
    for (const [i, bone] of chain.entries()) {
      const previous = i === 0 ? meta : chain[i - 1],
        pivot = sphere(
          end(previous.points, bone.center.clone().sub(previous.center), i === 0 ? 0.009 : 0.006),
        ).center
      const name = side + digit + (i + 1)
      parent = insert(name, parent, pivot)
      bindings[bone.id] = parent
      const [principalLong, , thin] = principal(
        i < chain.length - 1 ? bone.points : chain[i - 1].points,
      )
      const distalDir = (i < chain.length - 1 ? chain[i + 1].center : bone.center)
        .clone()
        .sub(i < chain.length - 1 ? bone.center : chain[i - 1].center)
        .normalize()
      const long = foot ? distalDir : principalLong
      if (long.dot(distalDir) < 0) long.negate()
      // Toe phalanges are too small and blocky for principal axes; toes curl toward the sole.
      const toward = foot
        ? plantar.clone().addScaledVector(long, -plantar.dot(long)).normalize()
        : thumb
          ? thin.dot(m3.clone().sub(bone.center)) > 0
            ? thin
            : thin.clone().negate()
          : thin.dot(plantar) > 0
            ? thin
            : thin.clone().negate()
      const flex = flexAxis(long, toward)
      // Spread turns a digit across the palm (or sole), about the axis through its pulp.
      axes[name] = { flex: array(flex), spread: array(toward.clone().multiplyScalar(s)) }
      if (i === chain.length - 1) {
        const far = bone.center.clone().sub(chain[i - 1].center)
        tips[side + digit] = array(mean(end(bone.points, far, 0.003)))
      }
    }
  }
}

const write = async (output: string, source: string) =>
  writeFile(output, await format(source, { ...(await resolveConfig(output)), filepath: output }))
await write(
  'src/motion/distalJoints.ts',
  '// Generated by build:articulation from the registered skeleton GLB. Coordinates are metres.\n' +
    '// Each pivot is the fitted centre of the articular head of the bone proximal to it.\n' +
    'export const distalJoints = ' +
    JSON.stringify(joints) +
    ' as const\nexport const distalBindings: Record<string,number> = ' +
    JSON.stringify(bindings) +
    '\nexport const digitTips = ' +
    JSON.stringify(tips) +
    ' as const\n/** Unit axes in bind coordinates. A positive turn about `flex` flexes the digit. */\n' +
    'export const digitAxes: Record<string, { flex: readonly number[]; spread?: readonly number[]; twist?: readonly number[] }> = ' +
    JSON.stringify(axes) +
    '\n',
)
await write(
  'src/motion/limbFrames.ts',
  '// Generated by build:articulation from the registered skeleton GLB. Coordinates are metres.\n' +
    '// Pivots are fitted joint centres; axes are unit vectors in bind coordinates, signed so a\n' +
    '// positive turn flexes the elbow, pronates the forearm, extends the wrist and deviates it radially.\n' +
    'export const limbFrames = ' +
    JSON.stringify(limb) +
    ' as const\n',
)
console.log(
  joints.length + ' distal joints, ' + Object.keys(bindings).length + ' source bones bound.',
)
