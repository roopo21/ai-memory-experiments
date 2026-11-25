import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
} from 'three'
import { makeGuideChair } from '../../../studio/props/chair'
import { makeBand } from '../../../studio/props/band'
import { scores, type AuthoredId } from '../../../studio/choreography'
import { palmPad } from '../anchors'
import type { MovementRig } from '../../movementRig'
import { fixturePoint } from './contacts'
import type { Side } from '../../../studio/clips'
const V = (x = 0, y = 0, z = 0) => new Vector3(x, y, z)
const vertical = V(0, 1, 0)
export function guideEquipment(id: AuthoredId, side: Side, r: MovementRig, human: boolean) {
  const root = new Group(),
    gear = new Set(scores[id].gear),
    posture = scores[id].posture,
    s = side === 'right' && !scores[id].both ? -1 : 1
  const seated = posture === 'chair' || posture === 'figureFour'
  if (seated) gear.add('chair')
  const wood = '#b69370',
    frame = '#394e52',
    fabric = '#69a99f',
    gold = '#efb06c'
  const materials = new Map<string, MeshStandardMaterial>(),
    dispose: (() => void)[] = [],
    updates: (() => void)[] = []
  function add(g: BoxGeometry | SphereGeometry | CylinderGeometry, color: string) {
    if (!materials.has(color))
      materials.set(color, new MeshStandardMaterial({ color, roughness: 0.86 }))
    const mesh = new Mesh(g, materials.get(color)!)
    mesh.receiveShadow = true
    mesh.castShadow = true
    root.add(mesh)
    dispose.push(() => g.dispose())
    return mesh
  }
  function box(x: number, y: number, z: number, w: number, h: number, d: number, colour: string) {
    const mesh = add(new BoxGeometry(w, h, d), colour)
    mesh.position.set(x, y, z)
    return mesh
  }
  function ball(x: number, y: number, z: number, w: number, h: number, d: number, colour: string) {
    const mesh = add(new SphereGeometry(1, 24, 16), colour)
    mesh.scale.set(w, h, d)
    mesh.position.set(x, y, z)
    return mesh
  }
  function rod(
    a: () => Vector3,
    b: () => Vector3,
    radius: number,
    colour: string,
    dynamic = false,
  ) {
    const mesh = add(new CylinderGeometry(radius, radius, 1, 12), colour)
    const update = () => {
      const start = a(),
        end = b(),
        delta = end.clone().sub(start)
      mesh.position.copy(start).lerp(end, 0.5)
      mesh.scale.y = Math.max(0.001, delta.length())
      mesh.quaternion.setFromUnitVectors(vertical, delta.normalize())
    }
    update()
    if (dynamic) updates.push(update)
  }
  function table(x: number, y: number, z: number, w: number, d: number, back = false) {
    box(x, y - 0.018, z, w, 0.036, d, wood)
    for (const i of [-1, 1])
      for (const k of [-1, 1]) {
        const h = back && k < 0 ? y + 0.41 : y
        box(x + i * (w / 2 - 0.024), h / 2, z + k * (d / 2 - 0.024), 0.027, h, 0.027, frame)
      }
    if (back) box(x, y + 0.31, z - d / 2 + 0.015, w, 0.19, 0.034, wood)
  }
  if (gear.has('chair')) {
    const chair = makeGuideChair(id, side, human)
    root.add(chair.root)
    dispose.push(chair.dispose)
  }
  if (gear.has('table')) {
    const top = fixturePoint(id, 'table', 1)
    table(0, top.y - 0.006, top.z + 0.11, 0.77, 0.3)
  }
  if (gear.has('lowBench')) table(0, 0.39, 0.57, 0.68, 0.29)
  if (gear.has('door')) {
    const lying = posture === 'supine',
      z = lying ? 0.025 : 0.27
    for (const k of [-1, 1]) box(k * (lying ? 0.19 : 0.43), 1.03, z, 0.045, 2.06, 0.055, wood)
    box(0, 2.04, z, lying ? 0.42 : 0.92, 0.05, 0.055, wood)
  }
  if (gear.has('pole') || gear.has('sideWall')) {
    const h = 1.58
    const handSign = scores[id].setup.gb === 'post' ? -s : s
    const p = fixturePoint(id, 'post', handSign)
    box(p.x, h / 2, p.z, 0.045, h, 0.055, wood)
    if (gear.has('sideWall'))
      for (const dz of [0.13, 0.26]) box(p.x, h / 2, p.z + dz, 0.035, h, 0.1, frame)
  }
  if (gear.has('wall') || gear.has('backWall')) {
    const back = gear.has('backWall'),
      z = back
        ? id === 'couch-stretch'
          ? -0.39
          : -0.105
        : id === 'wall-straddle'
          ? 0.015
          : id === 'knee-to-wall'
            ? 0.39
            : fixturePoint(id, 'wall', 1).z
    // Narrow slats leave the working hand and ankle visible from the reverse side.
    for (let k = -4; k <= 4; k++) {
      const panel = box(
        k * 0.107,
        0.91,
        z + (back ? -0.017 : 0.017),
        0.087,
        1.82,
        0.023,
        k % 2 === 0 ? '#87928d' : '#92a09a',
      )
      panel.material.transparent = true
      panel.material.opacity = 0.17
      panel.material.depthWrite = false
      panel.castShadow = false
    }
  }
  if (gear.has('step')) {
    if (id === 'step-heel-drop') box(0, 0.076, 0.31, 0.63, 0.152, 0.29, wood)
    else box(s * 0.095, 0.08, 0.56, 0.3, 0.16, 0.35, wood)
  }
  if (gear.has('bed')) {
    table(0, 0.523, -0.6, 0.84, 1.38)
    box(0, 0.55, -0.6, 0.86, 0.056, 1.4, fabric)
  }
  if (gear.has('bar')) {
    rod(
      () => V(-0.46, 1.89, 0.09),
      () => V(0.46, 1.89, 0.09),
      0.016,
      wood,
    )
    for (const k of [-1, 1]) box(k * 0.47, 0.95, 0.09, 0.025, 1.9, 0.025, frame)
  }
  if (gear.has('longRoll'))
    rod(
      () => V(0, 0.052, -0.76),
      () => V(0, 0.052, 0.025),
      0.052,
      fabric,
    )
  if (gear.has('crossRoll'))
    rod(
      () => V(-0.24, 0.052, -0.37),
      () => V(0.24, 0.052, -0.37),
      0.052,
      fabric,
    )
  if (gear.has('pillow')) ball(0, 0.06, -0.045, 0.19, 0.065, 0.2, fabric)
  if (gear.has('kneePillow')) ball(0, 0.11, 0.32, 0.24, 0.115, 0.19, fabric)
  if (gear.has('ball')) ball(0, 0.32, -0.16, 0.32, 0.32, 0.32, fabric)
  const leg = s === 1 ? 14 : 17,
    hand = (sign: number) => r.bones[sign === 1 ? 8 : 11].localToWorld(palmPad(sign))
  if (gear.has('smallBall')) {
    const mesh = ball(0, 0.023, 0, 0.023, 0.023, 0.023, gold)
    updates.push(() => {
      const foot = r.bones[leg].getWorldPosition(V())
      mesh.position.set(foot.x, 0.023, 0.225 + 0.5 * foot.z)
    })
  }
  if (gear.has('towel') || gear.has('stick')) {
    const end = (k: number) => {
      const a = hand(k),
        b = hand(-k)
      return a.addScaledVector(a.clone().sub(b).normalize(), 0.05)
    }
    rod(
      () => end(1),
      () => end(-1),
      gear.has('stick') ? 0.011 : 0.015,
      gear.has('stick') ? wood : gold,
      true,
    )
  }
  if (gear.has('footStrap') || gear.has('quadStrap')) {
    const band = makeBand(r, r.bones[leg], s, gear.has('quadStrap'), id === 'strap-itb')
    root.add(band.root)
    updates.push(band.update)
    dispose.push(band.dispose)
  }
  return {
    root,
    update: () => updates.forEach((fn) => fn()),
    dispose: () => {
      dispose.forEach((fn) => fn())
      materials.forEach((m) => m.dispose())
    },
  }
}
