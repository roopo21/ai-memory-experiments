import assert from 'node:assert/strict'
import { Vector3 } from 'three'
import { exerciseById } from '../src/guides/exercises'
import { clips, guideClip, clipInfo, type ClipId } from '../src/studio/clips'
import { scores } from '../src/studio/choreography'
import { interpretRequest } from '../src/studio/requests'
import { distalBindings } from '../src/motion/distalJoints'
import { ANKLE_Y, indexOfJoint, joints, type Joint } from '../src/motion/joints'
import { createMovementRig } from '../src/motion/movementRig'
import { measure } from '../src/motion/anatomy'
import { tip } from '../src/motion/studio/guides/precision'
import { sampleStudio } from '../src/motion/studio/sample'
import { newProject } from '../src/studio/project'
import { selectSurfaces } from '../src/motion/studio/figure'
import { structureByMesh } from '../src/anatomy/catalogue'
const r = createMovementRig(),
  p = newProject(),
  guides = new Set<string>()
const pose = (id: ClipId, n: number) => {
  sampleStudio(r, id, clips[id].phases[n][0], 'left', p)
}
const angle = (name: Joint, axis: 'x' | 'y' | 'z' = 'x') =>
  (r.bones[indexOfJoint[name]].rotation[axis] * 180) / Math.PI
const world = (name: Joint) => r.bones[indexOfJoint[name]].getWorldPosition(new Vector3())
for (const kind of ['stretch', 'glide'] as const) {
  for (const g of exerciseById[kind].values()) {
    assert(!guides.has(g.id))
    guides.add(g.id)
    assert(guideClip(g.id), 'Missing studio entry ' + g.id)
    const info = clipInfo(g.id)
    assert.equal(info.guide, g.id)
    assert.equal(info.kind, kind)
    assert.equal(interpretRequest(g.id, 'push-up').clip, g.id)
    assert.equal(interpretRequest(g.name, 'push-up').clip, g.id)
    assert(info.phases.length >= 3 && g.steps.length > 0)
    const targets = selectSurfaces(g.id, 'pair', 'left').selected
    assert([...targets.values()].includes('primary'), g.id + ' loses its primary mesh')
    pose(g.id, 0)
    const start = r.bones.map((b) => b.quaternion.clone())
    let motion = 0
    for (let n = 1; n < info.phases.length; n++) {
      const t = (info.phases[n][0] + info.phases[n - 1][0]) * 0.5
      sampleStudio(r, g.id, t, 'left', p)
      motion = Math.max(motion, ...r.bones.map((b, i) => b.quaternion.angleTo(start[i])))
    }
    assert(motion > 0.025, g.id + ' is static')
  }
}
assert.deepEqual(
  new Set(
    Object.entries(clips)
      .filter(([, c]) => c.guide)
      .map(([id]) => id),
  ),
  guides,
)
assert.equal(guides.size, 189)
assert.equal(joints.length, 81)
for (const [id, j] of Object.entries(distalBindings)) {
  const n = structureByMesh.get(id)!.displayName.toLowerCase(),
    joint = joints[j][0]
  if (joint !== 'jaw' && /left|right/.test(n))
    assert(joint.toLowerCase().startsWith(n.includes('left') ? 'left' : 'right'))
  if (n.includes('phalanx')) assert(j >= 21)
  if (n.includes('lower ') && n.includes('tooth')) assert.equal(joint, 'jaw')
}
// Anatomical angles of the working (left) side, in degrees.
const deg = (key: string) => measure(r)['L.' + key]
// Tendon glides: hook (knuckles straight), full fist, tabletop, straight fist.
pose('tendon-glides', 1)
assert(deg('index.mcp') < 10 && deg('index.pip') > 80 && deg('index.dip') > 60, 'hook fist')
pose('tendon-glides', 2)
assert(deg('index.mcp') > 75 && deg('index.pip') > 90 && deg('index.dip') > 45, 'full fist')
pose('tendon-glides', 4)
assert(deg('index.mcp') > 75 && deg('index.pip') < 10, 'tabletop')
pose('tendon-glides', 5)
assert(deg('index.pip') > 90 && deg('index.dip') < 10, 'straight fist')
// Median nerve glides, Totten and Hunter: fist, fingers straight, wrist back, thumb out,
// palm up, thumb assisted.
pose('median-glide-sequence', 0)
assert(deg('middle.pip') > 80, 'starts in a fist')
pose('median-glide-sequence', 1)
assert(Math.abs(deg('middle.pip')) < 8 && Math.abs(deg('wrist.extension')) < 5)
pose('median-glide-sequence', 2)
assert(deg('wrist.extension') > 45)
const pronated = deg('forearm.pronation')
pose('median-glide-sequence', 4)
assert(pronated - deg('forearm.pronation') > 60 && deg('forearm.pronation') < 25, 'palm turns up')
pose('median-glide-sequence', 5)
assert(world('rightHand').distanceTo(world('leftThumb2')) < 0.2)
// Ankle sliders: tibial nerve dorsiflexes and everts, fibular plantarflexes and inverts, sural
// dorsiflexes and inverts. The chin drops when the foot points.
for (const [id, pf, ev] of [
  ['tibial-slider-seated', -1, 1],
  ['fibular-slider-seated', 1, -1],
  ['sural-slider-seated', -1, -1],
] as const) {
  pose(id, 1)
  assert(pf * deg('ankle.plantarflexion') > 12 && ev * deg('ankle.eversion') > 8, id + ' foot')
  assert(measure(r)['neck.flexion'] < 0, id + ' looks up')
  pose(id, 2)
  assert(measure(r)['neck.flexion'] > 0, id + ' chin down')
}
// Sliders tilt the head toward the arm with tension at the hand; tensioners tilt it away.
pose('median-slider', 1)
assert(measure(r)['neck.lateral'] > 0 && deg('wrist.extension') > 45 && deg('elbow.flexion') < 15)
pose('median-tensioner', 2)
assert(measure(r)['neck.lateral'] < 0)
pose('big-toe-extension', 1)
assert(deg('toe.mtp') < -40)
pose('jaw-controlled-opening', 1)
assert(angle('jaw') > 16 && Math.abs(angle('head')) < 2)
pose('jaw-side-glide', 1)
const left = angle('jaw', 'y')
pose('jaw-side-glide', 2)
assert(left * angle('jaw', 'y') < 0)
const glyphs = new Set<string>()
for (let n = 0; n < 26; n++) {
  const path = []
  for (let k = 1; k <= 8; k++) {
    sampleStudio(r, 'ankle-alphabet', (n + k / 9) * 1.25, 'left', p)
    path.push(
      r.bones[14].quaternion
        .toArray()
        .map((x) => x.toFixed(3))
        .join(','),
    )
  }
  glyphs.add(path.join(';'))
}
assert.equal(glyphs.size, 26, 'Each ankle letter follows its own path')
for (const id of [
  'neck-rotation',
  'jaw-assisted-opening',
  'cat-cow',
  'pigeon',
  'childs-pose',
  'couch-stretch',
  'downward-dog',
  'finger-fan',
] as const) {
  assert(scores[id].frames.at(-1)!.pose === scores[id].setup)
}
for (const id of [
  'leg-swings-front',
  'hip-circles',
  'standing-quad',
  'standing-lunge-hip-flexor',
  'side-lunge',
  'cossack-squat',
] as const) {
  pose(id, 0)
  const foot = world('rightFoot')
  for (let i = 0; i <= 60; i++) {
    sampleStudio(r, id, (i / 60) * clips[id].seconds, 'left', p)
    const endpoint = world('rightFoot')
    assert(
      Math.hypot(foot.x - endpoint.x, foot.z - endpoint.z) < 0.003,
      id + ' skates across the floor',
    )
  }
}
pose('pigeon', 1)
// The front knee rests on the floor; the back leg reaches long behind.
assert(world('rightFoot').z < world('pelvis').z - 0.55 && world('leftShin').y < 0.08)
pose('childs-pose', 1)
assert(world('head').y < 0.23 && world('head').z > world('pelvis').z + 0.45)
pose('downward-dog', 2)
assert(world('pelvis').y > world('head').y + 0.3 && world('leftFoot').y < 0.14)
pose('scorpion', 1)
assert(world('leftFoot').y > world('rightFoot').y + 0.25 && world('chest').y < 0.25)
pose('ulnar-tensioner', 2)
assert(tip(r, 'Thumb').distanceTo(tip(r, 'Index')) < 0.005)
// The crossed ankle rests on the front of the other thigh just above the knee.
for (const id of [
  'supine-figure-four',
  'standing-figure-four',
  'seated-figure-four',
  'seated-peroneal',
] as const) {
  pose(id, id === 'supine-figure-four' ? 2 : 1)
  const thigh = world('rightThigh').lerp(world('rightShin'), 0.85)
  assert(world('leftFoot').distanceTo(thigh) < 0.12, id + ' crossed ankle')
}
pose('ball-backbend', 2)
assert(world('leftFoot').y < 0.08 && world('rightFoot').y < 0.08)
pose('golf-ball-roll', 1)
assert(Math.abs(world('leftFoot').y - (ANKLE_Y + 0.045)) < 0.005, 'foot rests on the ball')
pose('inchworm', 0)
const start = world('pelvis')
pose('inchworm', 4)
assert(world('pelvis').z - start.z > 0.75)
for (const id of ['standing-forward-fold', 'seated-forward-fold-chair', 'pendulum'] as const) {
  pose(id, 1)
  assert(world('leftHand').y < world('leftArm').y - 0.38, id + ' releases the arm toward the floor')
}
pose('suboccipital-nod', 1)
assert(world('pelvis').y < 0.155 && world('leftFoot').y < 0.09)
pose('kneeling-lat-bench', 1)
// Elbows rest on the bench (top 0.39 m) out in front.
assert(Math.abs(world('leftForearm').y - 0.44) < 0.02 && world('leftForearm').z > 0.425)
pose('seated-reverse-reach', 1)
assert(world('pelvis').y < 0.2 && world('leftHand').y < 0.12)
r.skeleton.dispose()
console.log(
  'All ' +
    guides.size +
    ' catalogue motions match their guides, move visible targets and resolve by name. Distal articulation, slider coupling, support and posture checks passed.',
)
