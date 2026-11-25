/** Original studio character. Build directly in the atlas bind pose so limbs meet at their real animation pivots. */
import { mkdir } from 'node:fs/promises'
import { Document, NodeIO } from '@gltf-transform/core'
import {
  BufferGeometry,
  Color,
  Euler,
  Float32BufferAttribute,
  Matrix4,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three'
import { joints, indexOfJoint, type Joint, type Triple } from '../../src/motion/joints'
import { digitTips } from '../../src/motion/distalJoints'
const V = (x: number, y: number, z: number) => new Vector3(x, y, z)
const bone = (name: Joint) => new Vector3(...joints[indexOfJoint[name]][2])
const skin = '#bd805e',
  lightSkin = '#cf9272',
  blush = '#dd967e',
  hair = '#46302f',
  curl = '#573b35',
  fringe = '#5d4039',
  dark = '#412e30',
  iris = '#64412c'
const mint = '#73c9b1',
  trim = '#daeee0',
  teal = '#3c9687',
  plum = '#51516b',
  shorts = '#d88472',
  cream = '#f9dfb3',
  gold = '#f4bb63'
const positions: number[] = [],
  normals: number[] = [],
  colors: number[] = [],
  indices: number[] = [],
  weights: number[] = [],
  jointIndices: number[] = []
type Weight = Joint | ((p: Vector3) => [Joint, number][])
function add(g: BufferGeometry, color: string, owner: Weight, matrix?: Matrix4) {
  if (matrix) g.applyMatrix4(matrix)
  const start = positions.length / 3,
    pos = g.getAttribute('position'),
    normal = g.getAttribute('normal'),
    rgb = new Color(color),
    p = new Vector3()
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i)
    positions.push(p.x, p.y, p.z)
    normals.push(normal.getX(i), normal.getY(i), normal.getZ(i))
    colors.push(rgb.r, rgb.g, rgb.b)
    const w = typeof owner === 'string' ? [[owner, 1] as [Joint, number]] : owner(p)
    for (let j = 0; j < 4; j++) {
      jointIndices.push(w[j] ? indexOfJoint[w[j][0]] : 0)
      weights.push(w[j]?.[1] ?? 0)
    }
  }
  const ix = g.getIndex()
  for (let i = 0; i < (ix?.count ?? pos.count); i++) indices.push(start + (ix ? ix.getX(i) : i))
  g.dispose()
}
function shape(
  color: string,
  owner: Weight,
  center: Triple,
  radii: Triple,
  rot: Triple = [0, 0, 0],
  detail = 20,
) {
  add(
    new SphereGeometry(1, detail, Math.max(8, detail >> 1)),
    color,
    owner,
    new Matrix4().compose(
      new Vector3(...center),
      new Quaternion().setFromEuler(new Euler(...rot)),
      new Vector3(...radii),
    ),
  )
}
function shell(
  color: string,
  owner: Weight,
  rings: { c: Vector3; x: Vector3; z: Vector3 }[],
  resolution = 32,
) {
  const points: number[] = [],
    ix: number[] = []
  for (const { c, x, z } of rings)
    for (let j = 0; j < resolution; j++) {
      const a = (2 * Math.PI * j) / resolution
      points.push(
        ...c.clone().addScaledVector(x, Math.cos(a)).addScaledVector(z, Math.sin(a)).toArray(),
      )
    }
  for (let i = 0; i < rings.length - 1; i++)
    for (let j = 0; j < resolution; j++) {
      const a = i * resolution + j,
        b = i * resolution + ((j + 1) % resolution)
      ix.push(a, a + resolution, b, b, a + resolution, b + resolution)
    }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(points, 3))
  g.setIndex(ix)
  g.computeVertexNormals()
  add(g, color, owner)
}
function tube(
  color: string,
  owner: Weight,
  a: Vector3,
  b: Vector3,
  profile: number[][],
  resolution = 20,
) {
  const up = b.clone().sub(a).normalize(),
    ref = Math.abs(up.x) < 0.85 ? V(1, 0, 0) : V(0, 0, 1),
    x = ref.addScaledVector(up, -ref.dot(up)).normalize(),
    z = x.clone().cross(up)
  shell(
    color,
    owner,
    profile.map(([f, rx, rz]) => ({
      c: a.clone().lerp(b, f),
      x: x.clone().multiplyScalar(rx),
      z: z.clone().multiplyScalar(rz ?? rx),
    })),
    resolution,
  )
}
function line(color: string, owner: Weight, points: Triple[], radius: number) {
  for (let i = 1; i < points.length; i++) {
    tube(
      color,
      owner,
      new Vector3(...points[i - 1]),
      new Vector3(...points[i]),
      [
        [0, radius],
        [1, radius],
      ],
      10,
    )
  }
  points.forEach((p) => shape(color, owner, p, [radius, radius, radius], [0, 0, 0], 10))
}
const torso: Weight = (p) => {
  const keys: [number, Joint][] = [
    [0.92, 'pelvis'],
    [1.02, 'lumbar'],
    [1.14, 'spine'],
    [1.26, 'chest'],
  ]
  for (let i = 1; i < keys.length; i++)
    if (p.y < keys[i][0]) {
      const t = Math.max(0, (p.y - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]))
      return [
        [keys[i - 1][1], 1 - t],
        [keys[i][1], t],
      ]
    }
  return [['chest', 1]]
}
function body(color: string, owner: Weight, data: number[][]) {
  shell(
    color,
    owner,
    data.map(([y, rx, rz, z = 0.07]) => ({ c: V(0, y, z), x: V(rx, 0, 0), z: V(0, 0, rz) })),
  )
}
body(shorts, 'pelvis', [
  [0.757, 0.0005, 0.0005],
  [0.763, 0.049, 0.048],
  [0.787, 0.083, 0.07],
  [0.805, 0.119, 0.097],
  [0.86, 0.147, 0.117],
  [0.925, 0.142, 0.099],
  [0.945, 0.127, 0.087],
])
body(shorts, 'pelvis', [
  [0.811, 0.124, 0.099],
  [0.845, 0.151, 0.119],
  [0.914, 0.15, 0.108],
  [0.95, 0.135, 0.096],
])
body(teal, torso, [
  [0.925, 0.132, 0.095],
  [0.937, 0.145, 0.108],
  [0.964, 0.145, 0.107],
  [0.973, 0.138, 0.102],
])
body(mint, torso, [
  [0.953, 0.137, 0.103],
  [0.97, 0.149, 0.111],
  [1.06, 0.139, 0.104],
  [1.17, 0.151, 0.109],
  [1.255, 0.166, 0.115],
  [1.307, 0.163, 0.099],
  [1.337, 0.142, 0.08],
  [1.355, 0.077, 0.06],
  [1.349, 0.049, 0.046],
])
shape(skin, 'neck', [0, 1.397, 0.078], [0.043, 0.079, 0.045])
body(trim, 'chest', [
  [1.339, 0.074, 0.068],
  [1.355, 0.069, 0.062],
  [1.362, 0.054, 0.052],
])
// A stitched daisy on the sweatshirt.
for (let i = 0; i < 6; i++) {
  const a = (i * Math.PI) / 3
  shape(
    cream,
    'chest',
    [0.081 + Math.sin(a) * 0.011, 1.283 + Math.cos(a) * 0.011, 0.159],
    [0.0065, 0.011, 0.004],
    [0, 0, -a],
    14,
  )
}
shape(gold, 'chest', [0.081, 1.283, 0.164], [0.007, 0.007, 0.003])
for (const side of ['left', 'right'] as const) {
  const s = side === 'left' ? 1 : -1,
    stem = (part: string) => (side + part) as Joint
  const shoulder = bone(stem('Arm')),
    elbow = bone(stem('Forearm')),
    wrist = bone(stem('Hand')),
    hip = bone(stem('Thigh')),
    knee = bone(stem('Shin')),
    ankle = bone(stem('Foot'))
  const ball = (color: string, j: Joint, c: Vector3, r: number) =>
    shape(color, j, c.toArray(), [r, r, r])
  tube(skin, stem('Arm'), shoulder, elbow, [
    [0, 0.043],
    [0.24, 0.047],
    [0.52, 0.043],
    [0.84, 0.034],
    [1, 0.032],
  ])
  tube(skin, stem('Forearm'), elbow, wrist, [
    [0, 0.032],
    [0.19, 0.039],
    [0.43, 0.035],
    [0.78, 0.025],
    [1, 0.022],
  ])
  ball(skin, stem('Forearm'), elbow, 0.033)
  ball(skin, stem('Hand'), wrist, 0.022)
  ball(mint, stem('Arm'), shoulder, 0.054)
  tube(mint, stem('Arm'), shoulder, elbow, [
    [-0.06, 0.048],
    [0.08, 0.056],
    [0.32, 0.054],
    [0.45, 0.047],
  ])
  tube(trim, stem('Arm'), shoulder, elbow, [
    [0.39, 0.049],
    [0.455, 0.047],
  ])
  tube(plum, stem('Thigh'), hip, knee, [
    [0, 0.072],
    [0.17, 0.08],
    [0.38, 0.074],
    [0.65, 0.057],
    [0.9, 0.044],
    [1, 0.043],
  ])
  tube(shorts, stem('Thigh'), hip, knee, [
    [-0.04, 0.073],
    [0.12, 0.085],
    [0.28, 0.083],
    [0.36, 0.078],
  ])
  tube('#edac94', stem('Thigh'), hip, knee, [
    [0.325, 0.08],
    [0.365, 0.078],
  ])
  ball(plum, stem('Shin'), knee, 0.044)
  tube(plum, stem('Shin'), knee, ankle, [
    [0, 0.042],
    [0.23, 0.05],
    [0.48, 0.043],
    [0.76, 0.031],
    [0.89, 0.027],
    [1, 0.025],
  ])
  tube(trim, stem('Shin'), knee, ankle, [
    [0.85, 0.0285],
    [0.9, 0.028],
  ])
  tube(skin, stem('Shin'), knee, ankle, [
    [0.9, 0.026],
    [1.02, 0.025],
  ])
  // Open feet keep each toe visible for the foot guides.
  const foot = stem('Foot')
  tube(
    skin,
    foot,
    V(s * 0.084, 0.043, 0.015),
    V(s * 0.099, 0.025, 0.208),
    [
      [0, 0.009, 0.012],
      [0.07, 0.028, 0.029],
      [0.18, 0.038, 0.04],
      [0.34, 0.04, 0.039],
      [0.55, 0.041, 0.032],
      [0.76, 0.052, 0.025],
      [0.88, 0.05, 0.021],
      [1, 0.027, 0.013],
    ],
    30,
  )
  ball(skin, foot, ankle, 0.028)
  const palm = stem('Hand'),
    middle = bone(stem('Middle1')),
    palmEnd = middle.clone().add(V(s * 0.002, -0.008, 0.002))
  tube(
    skin,
    palm,
    wrist,
    palmEnd,
    [
      [0, 0.022, 0.019],
      [0.25, 0.031, 0.02],
      [0.63, 0.043, 0.019],
      [0.84, 0.042, 0.017],
      [1, 0.029, 0.013],
    ],
    28,
  )
  const fingerAxis = V(0.025 * s, -0.156, 0.093).normalize(),
    palmNormal = V(0, 0, 1).addScaledVector(fingerAxis, -fingerAxis.z).normalize()
  const heelPad = wrist
    .clone()
    .add(V(s * 0.012, -0.075, 0.083))
    .addScaledVector(palmNormal, -0.01)
  shape(skin, palm, heelPad.toArray(), [0.018, 0.011, 0.01])
  for (const name of [
    'Thumb',
    'Index',
    'Middle',
    'Ring',
    'Little',
    'ToeBig',
    'ToeTwo',
    'ToeThree',
    'ToeFour',
    'ToeLittle',
  ]) {
    const isFoot = name.startsWith('Toe'),
      levels = name === 'Thumb' ? [0, 1, 2] : name === 'ToeBig' ? [1, 2] : [1, 2, 3]
    const end = new Vector3(...digitTips[(side + name) as keyof typeof digitTips])
    const width = {
      Thumb: 0.012,
      Index: 0.0095,
      Middle: 0.0097,
      Ring: 0.0092,
      Little: 0.008,
      ToeBig: 0.014,
      ToeTwo: 0.01,
      ToeThree: 0.0095,
      ToeFour: 0.0088,
      ToeLittle: 0.0084,
    }[name]!
    for (const [i, n] of levels.entries()) {
      const joint = stem(name + n),
        a = bone(joint),
        b = i === levels.length - 1 ? end : bone(stem(name + levels[i + 1]))
      const r = width * (1 - i * 0.1)
      tube(
        skin,
        joint,
        a,
        b,
        [
          [0, r],
          [0.55, r * 0.96],
          [1, r * 0.83],
        ],
        14,
      )
      ball(skin, joint, a, r)
      if (i === levels.length - 1) {
        ball(lightSkin, joint, b, r * 0.82)
        if (isFoot)
          shape(
            '#dfa98b',
            joint,
            [b.x, b.y + r * 0.61, b.z],
            [r * 0.58, r * 0.23, r * 0.55],
            [0, 0, 0],
            12,
          )
      }
    }
  }
}
// Soft sculpted face. The chin and lower lip follow the mandible when the mouth opens.
const face: Weight = (p) => {
  const f =
    Math.max(0, Math.min(0.92, (1.508 - p.y) / 0.058)) *
    Math.max(0, Math.min(1, (p.z - 0.066) / 0.08))
  return [
    ['head', 1 - f],
    ['jaw', f],
  ]
}
body(skin, face, [
  [1.443, 0.009, 0.014, 0.114],
  [1.454, 0.047, 0.048, 0.112],
  [1.478, 0.078, 0.069, 0.107],
  [1.51, 0.096, 0.082, 0.1],
  [1.546, 0.102, 0.091, 0.095],
  [1.583, 0.103, 0.092, 0.091],
  [1.615, 0.091, 0.082, 0.087],
  [1.642, 0.061, 0.052, 0.083],
  [1.654, 0.005, 0.009, 0.08],
])
shape(lightSkin, 'head', [0, 1.531, 0.182], [0.016, 0.016, 0.02])
for (const s of [-1, 1]) {
  shape(skin, 'head', [s * 0.103, 1.533, 0.083], [0.021, 0.029, 0.016], [0, 0, -s * 0.2])
  shape(blush, 'head', [s * 0.113, 1.532, 0.086], [0.008, 0.015, 0.01])
  shape(gold, 'head', [s * 0.111, 1.51, 0.089], [0.006, 0.006, 0.006])
  shape(blush, 'head', [s * 0.065, 1.521, 0.162], [0.022, 0.009, 0.004], [0, s * 0.55, s * 0.07])
  for (const [dx, dy] of [
    [-0.006, 0],
    [0.002, 0.003],
    [0.009, -0.001],
  ])
    shape(
      '#945d4d',
      'head',
      [s * (0.062 + dx), 1.523 + dy, 0.168 - dx * 0.65],
      [0.0016, 0.0015, 0.0013],
      [0, 0, 0],
      8,
    )
  const eye: Triple = [s * 0.04, 1.554, 0.176]
  shape(
    dark,
    'head',
    [eye[0], eye[1] + 0.001, eye[2]],
    [0.027, 0.021, 0.01],
    [0, s * 0.36, -s * 0.06],
  )
  shape(
    '#fff3dd',
    'head',
    [eye[0], eye[1], eye[2] + 0.0025],
    [0.025, 0.0185, 0.01],
    [0, s * 0.36, -s * 0.06],
  )
  shape(iris, 'head', [s * 0.037, 1.555, 0.186], [0.0135, 0.016, 0.005], [0, s * 0.25, 0])
  shape('#332b2e', 'head', [s * 0.037, 1.555, 0.19], [0.008, 0.011, 0.003])
  shape('#fff9e8', 'head', [s * 0.037 - 0.004, 1.561, 0.193], [0.004, 0.0043, 0.002], [0, 0, 0], 12)
  line(
    hair,
    'head',
    [
      [s * 0.016, 1.588, 0.176],
      [s * 0.033, 1.593, 0.176],
      [s * 0.05, 1.592, 0.17],
      [s * 0.061, 1.588, 0.164],
    ],
    0.0039,
  )
}
const mouth = new BufferGeometry(),
  lipPos: number[] = [],
  lipIx: number[] = []
for (let i = 0; i <= 20; i++) {
  const u = i / 20,
    x = (u - 0.5) * 0.047,
    smile = 1.495 + 0.005 * (2 * u - 1) ** 2,
    z = 0.186 - 0.009 * (2 * u - 1) ** 2
  lipPos.push(x, smile + 0.0014, z, x, smile - 0.0014, z)
  if (i) lipIx.push(2 * i - 2, 2 * i - 1, 2 * i, 2 * i, 2 * i - 1, 2 * i + 1)
}
mouth.setAttribute('position', new Float32BufferAttribute(lipPos, 3)).setIndex(lipIx)
mouth.computeVertexNormals()
add(mouth, '#663e3c', (p) => {
  const top = p.y > 1.495 + 0.005 * (p.x / 0.0235) ** 2
  return [[top ? 'head' : 'jaw', 1]]
})
line(
  dark,
  'jaw',
  [
    [-0.02, 1.497, 0.175],
    [-0.01, 1.493, 0.179],
    [0, 1.492, 0.18],
    [0.01, 1.493, 0.179],
    [0.02, 1.497, 0.175],
  ],
  0.0027,
)
shape('#d58978', 'jaw', [0, 1.489, 0.178], [0.01, 0.0027, 0.003])
// A continuous cap with a shaped hairline and swept, overlapping locks.
const cap = new SphereGeometry(1, 48, 26)
const attr = cap.getAttribute('position')
for (let i = 0; i < attr.count; i++) {
  const x = attr.getX(i),
    y = attr.getY(i),
    z = attr.getZ(i),
    az = Math.atan2(x, z),
    v = Math.acos(Math.max(-1, Math.min(1, y))) / Math.PI
  const edge = 1.7 - 0.62 * Math.cos(az) + 0.08 * Math.sin(2 * az),
    a = v * edge
  attr.setXYZ(
    i,
    0.108 * Math.sin(a) * Math.sin(az),
    1.548 + 0.122 * Math.cos(a),
    0.079 + 0.115 * Math.sin(a) * Math.cos(az),
  )
}
cap.computeVertexNormals()
add(cap, hair, 'head')
for (const s of [-1, 1]) {
  shape(curl, 'head', [s * 0.095, 1.55, 0.095], [0.019, 0.045, 0.026], [0.09, 0, -s * 0.15])
  shape(fringe, 'head', [s * 0.055, 1.618, 0.157], [0.05, 0.021, 0.021], [0, s * 0.4, -s * 0.26])
}
shape(hair, 'head', [-0.011, 1.646, 0.066], [0.068, 0.037, 0.066])
shape(trim, 'head', [-0.018, 1.667, 0.06], [0.047, 0.019, 0.045])
shape(curl, 'head', [-0.02, 1.704, 0.058], [0.066, 0.056, 0.061], [0, 0, -0.18], 32)
shape(fringe, 'head', [-0.042, 1.717, 0.079], [0.039, 0.037, 0.036], [0, 0, 0.33])
// Little flower clip just above one temple.
for (let i = 0; i < 5; i++) {
  const a = (i * Math.PI * 2) / 5
  shape(
    cream,
    'head',
    [0.089 + 0.011 * Math.sin(a), 1.608 + 0.011 * Math.cos(a), 0.137],
    [0.008, 0.009, 0.006],
    [0, 0.52, -a],
    12,
  )
}
shape(gold, 'head', [0.09, 1.608, 0.143], [0.006, 0.006, 0.005])
// A thin soft sole and finger pads can meet the floor in both flat and angled supports.
const headIndex = indexOfJoint.head,
  jawIndex = indexOfJoint.jaw
for (let i = 0; i < positions.length / 3; i++) {
  const k = i * 3,
    owner = jointIndices[i * 4]
  if (owner === headIndex || owner === jawIndex) {
    positions[k] *= 1.14
    positions[k + 1] = 1.49 + (positions[k + 1] - 1.49) * 1.055 - 0.01
  }
}
const footSet = new Set(joints.flatMap(([name], i) => (/Foot|Toe/.test(name) ? [i] : [])))
for (let i = 0; i < positions.length / 3; i++)
  if (footSet.has(jointIndices[i * 4])) {
    const k = i * 3,
      y = (positions[k + 1] = Math.max(0.001, positions[k + 1]))
    positions[k + 2] = Math.min(
      positions[k + 2],
      0.236 + (y - 0.019) / Math.tan((70 * Math.PI) / 180),
    )
  }
const doc = new Document(),
  buf = doc.createBuffer(),
  scene = doc.createScene('Clover studio coach'),
  sk = doc.createSkin('Atlas rig')
const points = joints.map((j) => new Vector3(...j[2])),
  nodes = joints.map(([name, parent], i) =>
    doc.createNode(name).setTranslation(
      points[i]
        .clone()
        .sub(parent < 0 ? new Vector3() : points[parent])
        .toArray(),
    ),
  )
nodes.forEach((n, i) => {
  const parent = joints[i][1]
  if (parent < 0) scene.addChild(n)
  else nodes[parent].addChild(n)
  sk.addJoint(n)
})
const acc = (
  type: 'SCALAR' | 'VEC3' | 'VEC4' | 'MAT4',
  v: Float32Array<ArrayBuffer> | Uint16Array<ArrayBuffer> | Uint32Array<ArrayBuffer>,
) => doc.createAccessor().setBuffer(buf).setType(type).setArray(v)
sk.setSkeleton(nodes[0]).setInverseBindMatrices(
  acc(
    'MAT4',
    new Float32Array(
      points.flatMap((v) => new Matrix4().makeTranslation(v.clone().negate()).toArray()),
    ),
  ),
)
const prim = doc
  .createPrimitive()
  .setIndices(acc('SCALAR', new Uint32Array(indices)))
  .setMaterial(
    doc
      .createMaterial('Painted studio colours')
      .setMetallicFactor(0)
      .setRoughnessFactor(0.81)
      .setDoubleSided(false),
  )
prim
  .setAttribute('POSITION', acc('VEC3', new Float32Array(positions)))
  .setAttribute('NORMAL', acc('VEC3', new Float32Array(normals)))
  .setAttribute('COLOR_0', acc('VEC3', new Float32Array(colors)))
  .setAttribute('JOINTS_0', acc('VEC4', new Uint16Array(jointIndices)))
  .setAttribute('WEIGHTS_0', acc('VEC4', new Float32Array(weights)))
scene.addChild(
  doc.createNode('Clover').setMesh(doc.createMesh('Clover').addPrimitive(prim)).setSkin(sk),
)
doc.getRoot().getAsset().copyright =
  'Anatomy Explorer. Original procedural studio character; articulated using registered atlas landmarks. See model credits.'
await mkdir('src/motion/studio/assets', { recursive: true })
await new NodeIO().write('src/motion/studio/assets/performer.glb', doc)
console.log(
  'Built Clover with ' + positions.length / 3 + ' vertices and ' + joints.length + ' joints.',
)
