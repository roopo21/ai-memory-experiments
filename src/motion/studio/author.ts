import { Euler, Vector3 } from 'three'
import { joints, type Triple } from '../joints'
import { createMovementRig } from '../movementRig'
import { clipInfo, type ClipId, type Side } from '../../studio/clips'
import { newProject, type Project } from '../../studio/project'
import { sampleStudio } from './sample'
import { destination, landmark, pinHere, solePad } from './anchors'
import { pinWeight } from '../../studio/pins'
import type { Pin } from '../../studio/pins'

export function editableCopy(clip: ClipId, side: Side): Project {
  const info = clipInfo(clip),
    r = createMovementRig(),
    p = newProject(),
    times = new Set(info.phases.map((ph) => ph[0]))
  const hz = clip === 'ankle-alphabet' ? 8 : 4
  for (let i = 0; i <= Math.ceil(info.seconds * hz); i++) times.add(Math.min(i / hz, info.seconds))
  // Phase markers can be closer than the editor's minimum spacing to a regular sample.
  const ordered = [...times]
    .sort((a, b) => a - b)
    .filter((t, i, a) => !i || t - a[i - 1] >= 0.05 - 1e-8 || t === info.seconds)
  const frames = ordered.map((time) => {
    sampleStudio(r, clip, time, side, p)
    const angles = Object.fromEntries(
      joints
        .map(
          ([name], i) =>
            [
              name,
              new Euler()
                .setFromQuaternion(r.bones[i].quaternion)
                .toArray()
                .slice(0, 3)
                .map(
                  (n) => Math.round(((Number(n) * 180) / Math.PI) * 1000000) / 1000000 || 0,
                ) as Triple,
            ] as const,
        )
        .filter(([, angle]) => angle.some((v) => v !== 0)),
    )
    return {
      time,
      label: info.phases.find((v) => v[0] === time)?.[1] ?? 'Pose',
      root: r.root.position
        .clone()
        .sub(r.rest[0])
        .toArray()
        .map((n) => n || 0) as Triple,
      angles,
    }
  })
  sampleStudio(r, clip, 0, side, p)
  const pins: Pin[] = []
  for (const s of ['left', 'right'] as const) {
    if (clip === 'push-up') {
      pins.push(
        pinHere(r, s === 'left' ? 'leftHand' : 'rightHand', 'world', 'palm'),
        pinHere(r, s === 'left' ? 'leftFoot' : 'rightFoot', 'world', 'toe'),
      )
    }
    if (clip === 'supine-hamstring')
      pins.push(
        pinHere(
          r,
          s === 'left' ? 'leftHand' : 'rightHand',
          side === 'left' ? 'leftThigh' : 'rightThigh',
          'palm',
        ),
      )
    if (
      clip === 'squat' ||
      ((clip === 'supine-hamstring' || clip === 'sciatic-slider-seated') && s !== side)
    )
      pins.push(pinHere(r, s === 'left' ? 'leftFoot' : 'rightFoot', 'world', 'sole'))
  }
  r.skeleton.dispose()
  return {
    ...(clip !== 'custom' ? { base: { id: clip, side } } : {}),
    ...(pins.length ? { pins } : {}),
    ...(clip === 'supine-hamstring'
      ? { prop: 'mat' as const }
      : clip === 'sciatic-slider-seated'
        ? { prop: 'chair' as const }
        : {}),
    version: 1,
    name: info.name + (info.unilateral ? ' · ' + side : '') + ' edit',
    plantFeet: false,
    frames,
  }
}
export function checkCustomMotion(p: Project): string {
  const r = createMovementRig(),
    end = p.frames.at(-1)!.time
  let worstSlip = 0,
    slipTime = 0,
    below = 0,
    floorTime = 0
  let worstAnchor = 0,
    anchorTime = 0,
    which = ''
  for (let n = 0; n <= Math.ceil(end * 60); n++) {
    const t = Math.min(n / 60, end)
    sampleStudio(r, 'custom', t, 'left', p)
    for (const pin of p.pins ?? []) {
      if (pinWeight(pin, t) < 1) continue
      const error = landmark(r, pin).distanceTo(destination(r, pin))
      if (error > worstAnchor) {
        worstAnchor = error
        anchorTime = t
        which = pin.limb
      }
    }
    for (const [index, s] of [
      [14, 1],
      [17, -1],
    ]) {
      const ankle = r.bones[index].getWorldPosition(new Vector3())
      const error = ankle.distanceTo(new Vector3(0.08 * s, 0.065, 0.07))
      if (p.plantFeet && error > worstSlip) {
        worstSlip = error
        slipTime = t
      }
    }
    const minY = Math.min(
      ...r.bones.map((b) => b.getWorldPosition(new Vector3()).y),
      ...[14, 17].map((i) => r.bones[i].localToWorld(solePad()).y),
      ...[8, 11].map(
        (i) => r.bones[i].localToWorld(new Vector3(i === 8 ? 0.025 : -0.025, -0.156, 0.093)).y,
      ),
    )
    if (minY < below) {
      below = minY
      floorTime = t
    }
  }
  r.skeleton.dispose()
  const warnings = []
  if (worstAnchor > 0.005)
    warnings.push(
      which +
        ' misses its anchor by ' +
        Math.round(worstAnchor * 1000) +
        ' mm at ' +
        anchorTime.toFixed(2) +
        ' s.',
    )
  if (worstSlip > 0.005)
    warnings.push(
      'Planted ankle misses its mark by ' +
        Math.round(worstSlip * 1000) +
        ' mm at ' +
        slipTime.toFixed(2) +
        ' s. Move the pelvis closer.',
    )
  if (below < -0.005)
    warnings.push(
      'A joint or extremity crosses the floor by ' +
        Math.round(-below * 1000) +
        ' mm at ' +
        floorTime.toFixed(2) +
        ' s.',
    )
  return warnings.join(' ') || 'Joint and floor landmarks passed at 60 samples per second.'
}
