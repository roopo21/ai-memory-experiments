import assert from 'node:assert/strict'
import { Quaternion, Vector3 } from 'three'
import { interpretRequest } from '../src/studio/requests'
import { pinWeight, readPins } from '../src/studio/pins'
import { groups } from '../src/guides/library/groups'
import { clips, clipInfo, isClip, type ClipId, type Side } from '../src/studio/clips'
import { applyCue, newProject, putPose, readProject } from '../src/studio/project'
import { ANKLE_Y, joints } from '../src/motion/joints'
import { createMovementRig, solveLimb } from '../src/motion/movementRig'
import { pushUpPalm, sampleStudio, thighGrip } from '../src/motion/studio/sample'
import { palmPad, toePad, landmark, destination } from '../src/motion/studio/anchors'
import { checkCustomMotion, editableCopy } from '../src/motion/studio/author'
import { selectSurfaces } from '../src/motion/studio/figure'
import {
  chooseClip,
  chooseFigure,
  chooseSide,
  initialSession,
  lengthOf,
  seek,
  tick,
  togglePlay,
  useStudio,
} from '../src/studio/store'
import { structureByMesh } from '../src/anatomy/catalogue'

const r = createMovementRig(),
  p = newProject(),
  world = (i: number, v = new Vector3()) => r.bones[i].localToWorld(v)
const compare = (a: Vector3, b: Vector3, label: string, eps = 1e-6) =>
  assert(a.distanceTo(b) < eps, label + ' error ' + a.distanceTo(b))
const dumped = () => r.bones.map((b) => b.matrixWorld.toArray())
let samples = 0,
  locks = 0
const close = (a: Vector3, b: Vector3, note: string) => {
  compare(a, b, note, 0.005)
  locks++
}
for (const id of Object.keys(clips).filter(isClip)) {
  const info = clipInfo(id)
  for (const side of (info.unilateral ? ['left', 'right'] : ['left']) as Side[]) {
    let first: number[][] = []
    const active = side === 'left' ? 12 : 15,
      s = side === 'left' ? 1 : -1
    let previous: Quaternion[] | null = null
    for (let n = 0; n <= Math.ceil(info.seconds * 60); n++) {
      const t = Math.min(n / 60, info.seconds)
      sampleStudio(r, id, t, side, p)
      samples++
      if (!n) first = dumped()
      r.bones.forEach((b, i) => {
        assert(b.matrixWorld.elements.every(Number.isFinite), id + ' nonfinite ' + b.name)
        assert(Math.abs(b.quaternion.length() - 1) < 1e-8)
        if (i) assert(b.position.distanceTo(r.rest[i]) < 1e-9, id + ' changed segment ' + b.name)
        if (previous)
          assert(
            b.quaternion.angleTo(previous[i]) < 0.82,
            id + ' discontinuity ' + b.name + ' at ' + t,
          )
      })
      previous = r.bones.map((b) => b.quaternion.clone())
      for (const sign of [1, -1]) {
        const hand = sign === 1 ? 8 : 11,
          foot = sign === 1 ? 14 : 17
        if (id === 'push-up') {
          close(world(hand, palmPad(sign)), pushUpPalm(sign), 'palm')
          close(world(foot, toePad(sign)), new Vector3(sign * 0.08, 0, -0.68), 'toe')
          // The elbows bend back toward the feet, off the line from shoulder to wrist.
          const upper = world(hand - 2),
            line = world(hand).sub(upper).normalize(),
            bend = world(hand - 1).sub(upper)
          bend.addScaledVector(line, -bend.dot(line))
          assert(bend.z < 0.001, 'elbow bends back ' + bend.z)
        }
        if (id === 'supine-hamstring')
          close(world(hand, palmPad(sign)), world(active, thighGrip(sign, active)), 'thigh grip')
        if (id === 'squat')
          close(world(foot), new Vector3(sign * 0.115, ANKLE_Y, 0.07), 'squat ankle')
      }
      if (id === 'supine-hamstring')
        close(world(s === 1 ? 17 : 14), new Vector3(-s * 0.11, ANKLE_Y, 0.53), 'resting heel')
      if (id === 'sciatic-slider-seated')
        close(world(s === 1 ? 17 : 14), new Vector3(-s * 0.095, ANKLE_Y, 0.285), 'seated heel')
    }
    if (!info.travels)
      first.forEach((row, i) =>
        row.forEach((v, j) =>
          assert(Math.abs(v - r.bones[i].matrixWorld.elements[j]) < 1e-6, id + ' repeat seam'),
        ),
      )
    const middle = info.seconds * 0.47
    sampleStudio(r, id, middle, side, p)
    const expected = dumped(),
      turned = r.bones.map((b) => b.getWorldQuaternion(new Quaternion()))
    sampleStudio(r, 'cartwheel', 1.37, 'right', p)
    sampleStudio(r, id, middle, side, p)
    assert.deepEqual(dumped(), expected, 'seek is history independent')
    if (info.unilateral) {
      sampleStudio(r, id, middle, side === 'left' ? 'right' : 'left', p)
      for (const [left, right] of [
        [6, 9],
        [7, 10],
        [8, 11],
        [12, 15],
        [13, 16],
        [14, 17],
        [79, 80],
      ]) {
        // The scanned skeleton is not quite symmetric: its left and right joint centres differ
        // by up to 2 mm and its fitted elbow axes by 0.7 degrees, so the same deep elbow bend puts
        // the two wrists up to 6 mm apart. A side mirrored wrongly is off by centimetres and tens
        // of degrees.
        const pos = new Vector3().setFromMatrixPosition(r.bones[left].matrixWorld)
        pos.x = -pos.x
        const other = new Vector3(expected[right][12], expected[right][13], expected[right][14])
        compare(pos, other, 'mirrored ' + id + ' ' + left, 0.008)
        const q = r.bones[left].getWorldQuaternion(new Quaternion())
        const angle = new Quaternion(q.x, -q.y, -q.z, q.w).angleTo(turned[right])
        assert(angle < 0.035, 'mirrored ' + id + ' ' + left + ' turns ' + angle)
      }
    }
    if (id !== 'custom') {
      const copy = editableCopy(id, side)
      assert.deepEqual(
        JSON.stringify(readProject(JSON.stringify(copy)).frames),
        JSON.stringify(copy.frames),
      )
      for (let n = 0; n <= Math.ceil(info.seconds * 60); n++) {
        sampleStudio(r, 'custom', n / 60, side, copy)
        for (const pin of copy.pins ?? [])
          close(landmark(r, pin), destination(r, pin), 'editable ' + id + ' ' + pin.limb)
      }
      const time = copy.frames[Math.floor(copy.frames.length / 2)].time
      sampleStudio(r, id, time, side, p)
      const want = r.bones.map((b) => b.getWorldPosition(new Vector3()))
      sampleStudio(r, 'custom', time, side, copy)
      // The copy re-solves its anchored limbs with the editor's pin solver, so allow a millimetre.
      // A pin holds a planted hand exactly as it was set, where the anatomical solver may leave it
      // rolled up to 2.5 degrees at the end of forearm range; the digits then differ by millimetres.
      want.forEach((v, i) =>
        compare(
          world(i),
          v,
          'editable ' + id + ' ' + joints[i][0],
          i >= 21 && i < 79 ? 0.004 : 0.001,
        ),
      )
    }
  }
}
for (const id of [
  'push-up',
  'supine-hamstring',
  'sciatic-slider-seated',
  'curl',
  'squat',
] as ClipId[]) {
  const sel = selectSurfaces(id, 'anatomy', 'left')
  assert(sel.selected.size > 0)
  if (clipInfo(id).unilateral)
    assert(
      [...sel.selected.keys()].every(
        (k) => !structureByMesh.get(k)!.displayName.toLowerCase().includes('right'),
      ),
    )
  assert.equal(selectSurfaces(id, 'bones', 'right').selected.size, 0)
}
sampleStudio(r, 'sciatic-slider-seated', 0, 'left', p)
const knee0 = world(14),
  neck0 = r.bones[4].rotation.x
sampleStudio(r, 'sciatic-slider-seated', 2.75, 'left', p)
assert(
  world(14).z > knee0.z + 0.22 &&
    world(14).y > knee0.y + 0.13 &&
    r.bones[4].rotation.x < neck0 - 0.3,
)
sampleStudio(r, 'supine-hamstring', 2.5, 'right', p)
const held = dumped()
sampleStudio(r, 'supine-hamstring', 5.5, 'right', p)
assert.deepEqual(dumped(), held)
sampleStudio(r, 'push-up', 0, 'left', p)
const top = world(3).y
sampleStudio(r, 'push-up', 1.8, 'left', p)
assert(top - world(3).y > 0.25)
for (const goal of [new Vector3(0, 50, 0), world(6), world(6).add(new Vector3(0, 1e-11, 0))]) {
  solveLimb(r, 6, 7, 8, goal, goal)
  assert(r.bones.every((b) => b.matrixWorld.elements.every(Number.isFinite)))
}
const bent = applyCue(p, 'At 2s bend both elbows 85 degrees').project
assert.deepEqual(bent.frames[1].angles, { leftForearm: [-85, 0, 0], rightForearm: [-85, 0, 0] })
const rotation = applyCue(bent, 'At 2s rotate chest y -30').project
assert.equal(rotation.frames[1].angles.chest![1], -30)
assert.equal(applyCue(bent, 'At 6s return to start').project.frames.at(-1)!.time, 6)
assert.deepEqual(applyCue(bent, 'At 3s hold').project.frames[2].angles, bent.frames[1].angles)
assert.deepEqual(readProject(JSON.stringify(bent)), bent)
for (const cue of [
  'at -1s hold',
  'At 62s hold',
  'At 0.01s hold',
  'At 2s shatter',
  'At 2s bend both knees 200',
  'At 2s rotate banana x 2',
  'At 2s move root 0 0 3',
])
  assert.throws(() => applyCue(p, cue))
for (const v of [
  { ...p, version: 2 },
  { ...p, frames: [] },
  { ...p, frames: [...p.frames].reverse() },
  { ...p, frames: [p.frames[0], { ...p.frames[1], angles: { tail: [0, 0, 0] } }] },
  { ...p, target: { kind: 'stretch', id: 'wrong' } },
])
  assert.throws(() => readProject(JSON.stringify(v)))
assert.throws(() => readProject('x'.repeat(160001)))
assert.deepEqual(newProject().frames[1].angles, {})
const impossible = applyCue({ ...p, plantFeet: true }, 'At 2s move root 0 1.3 0').project
assert.match(checkCustomMotion(impossible), /ankle misses/)
assert.match(checkCustomMotion(bent), /passed/)
const through = putPose(p, { ...p.frames[1], root: [0, -1.1, 0] })
assert.match(checkCustomMotion(through), /crosses the floor/)
assert(
  selectSurfaces('custom', 'anatomy', 'left', { kind: 'glide', id: groups.glide[0].id }).selected
    .size > 0,
)
useStudio.setState(initialSession(new URLSearchParams('studio=nonexistent')))
assert.equal(useStudio.getState().clip, 'push-up')
togglePlay()
assert.equal(useStudio.getState().playing, false)
useStudio.setState({ ready: true })
togglePlay()
tick(0.25)
assert.equal(useStudio.getState().time, 0.25)
chooseFigure('human')
tick(0.4)
assert.equal(useStudio.getState().time, 0.25)
useStudio.setState({ ready: true })
tick(0.25)
assert.equal(useStudio.getState().time, 0.5)
chooseClip('supine-hamstring')
chooseSide('right')
assert.equal(useStudio.getState().time, 0)
seek(999)
assert.equal(useStudio.getState().time, lengthOf(useStudio.getState()))
useStudio.setState({ ready: true })
togglePlay()
tick(9)
assert.equal(useStudio.getState().playing, false)
assert.equal(useStudio.getState().time, 8)
useStudio.setState({ loop: true })
togglePlay()
tick(9)
assert.equal(useStudio.getState().time, 1)
seek(-1)
assert.equal(useStudio.getState().time, 0)
console.log(
  'Motion checks passed across ' +
    samples +
    ' frames, ' +
    locks +
    ' contact measurements and ' +
    joints.length +
    ' joints, including mirror, seek, hold, authoring, invalid input and playback recovery.',
)

const anchor = editableCopy('push-up', 'left').pins![0]
assert.throws(() => readPins([{ ...anchor, until: 9 }], 4))
assert.throws(() => readPins([anchor, anchor], 4))
assert.throws(() => readPins([{ ...anchor, rotation: [0, 0, 0, 0] }], 4))
const timed = { ...anchor, from: 1, until: 2 }
assert.equal(pinWeight(timed, 0.5), 0)
assert.equal(pinWeight(timed, 1), 1)
assert.equal(pinWeight(timed, 2), 1)
assert.equal(pinWeight(timed, 2.2), 0)
assert(Math.abs(pinWeight(timed, 0.925) - 0.5) < 1e-9)

assert.equal(
  interpretRequest(
    'The skeleton does a push up with the muscles that activate glowing yellow',
    'curl',
  ).figure,
  'anatomy',
)
assert.deepEqual(
  interpretRequest(
    'Show the right hamstring stretch with a human and skeleton from the side',
    'curl',
  ),
  { clip: 'supine-hamstring', side: 'right', figure: 'pair', angle: 'Side' },
)
assert.equal(interpretRequest('The same exercise as a human', 'push-up').clip, 'push-up')
assert.throws(() => interpretRequest('squat then do a cartwheel', 'curl'))
assert.throws(() => interpretRequest('unknown pirouette', 'curl'))
