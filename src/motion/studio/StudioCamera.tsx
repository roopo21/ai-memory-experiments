import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Box3, OrthographicCamera, Quaternion, Vector3 } from 'three'
import type { OrbitControls as Orbit } from 'three-stdlib'
import { groupById } from '../../guides/library/groups'
import { hasScore, scores } from '../../studio/choreography'
import { clipInfo, targetsFor, type Angle, type ClipId } from '../../studio/clips'
import { glideViews } from '../../studio/glideViews'
import { lengthOf, useStudio } from '../../studio/store'
import { joints } from '../joints'
import { oldLocal } from '../oldPivots'
import { createMovementRig } from '../movementRig'
import { sampleStudio } from './sample'

type Framing = 'body' | 'leg' | 'arm' | 'upper' | 'face' | 'hand' | 'foot'
function framing(id: ClipId, angle: Angle): Framing {
  if (angle !== 'Teaching' && angle !== 'Focus') return 'body'
  const authored = hasScore(id) ? scores[id].focus : undefined
  if (authored && angle === 'Teaching') return authored
  const region = glideViews.get(id)?.region
  if (region) return region.startsWith('arm') ? 'arm' : 'leg'
  if (authored) return authored
  if (
    /^(neck-|scm-stretch|scalene-stretch|chin-tuck|levator-scapulae|upper-trap-arm|head-rolls|shoulder-rolls)/.test(
      id,
    )
  )
    return 'upper'
  if (angle === 'Teaching') return 'body'
  const area = groupById.stretch.get(targetsFor(id).primary[0])?.area ?? ''
  if (area === 'Forearms and hands') return 'hand'
  if (area === 'Feet') return 'foot'
  if (['Lower legs', 'Thighs', 'Hips and glutes'].includes(area)) return 'leg'
  if (['Arms', 'Shoulders', 'Neck', 'Chest and ribs', 'Upper back'].includes(area)) return 'upper'
  return 'body'
}

function teachingDirection(id: ClipId, angle: Angle) {
  if (angle !== 'Teaching' && angle !== 'Focus') return
  const score = hasScore(id) ? scores[id] : undefined
  if (angle === 'Teaching' && score?.focus && score.view) return score.view
  const region = glideViews.get(id)?.region
  if (region?.startsWith('arm')) return [0.65, 0.22, 1.8]
  if (region) return id === 'sciatic-slider-standing' ? [0.55, 0.18, -1.8] : [1.8, 0.55, 0.65]
  if (/cossack|side-bend|lateral|cartwheel|side-lunge/.test(id)) return [0, 0.12, 1]
  if (/squat/.test(id) || clipInfo(id).phases.some(([, label]) => /hinge/i.test(label)))
    return [1, 0.12, 0.035]
  return score?.view
}

export function StudioCamera({ capture }: { capture: boolean }) {
  const id = useStudio((s) => s.clip),
    side = useStudio((s) => s.side),
    angle = useStudio((s) => s.angle),
    reset = useStudio((s) => s.resetCamera)
  const original = useStudio((s) => (s.clip === 'custom' ? s.project.base?.id : undefined)),
    originalSide = useStudio((s) => (s.clip === 'custom' ? s.project.base?.side : undefined)),
    prop = useStudio((s) => (s.clip === 'custom' ? s.project.prop : undefined))
  const cameraId = original ?? id
  const region = glideViews.get(cameraId)?.region
  const focus = framing(cameraId, angle)
  const sideLying = hasScore(cameraId) && scores[cameraId].posture === 'side'
  const figure = useStudio((s) => s.figure)
  const paired = figure === 'pair',
    atlasOnly = figure === 'anatomy' || figure === 'bones'
  const marginX = focus === 'body' ? 0.31 : focus === 'face' && atlasOnly ? 0.066 : 0.14
  const marginY = focus === 'body' ? 0.26 : focus === 'face' && atlasOnly ? 0.058 : 0.14
  const transition = useRef<{
    started: number
    from: Vector3
    to: Vector3
    fromQ: Quaternion
    toQ: Quaternion
    fromZoom: number
    toZoom: number
    distance: number
  } | null>(null)
  const previousSize = useRef<{ key: string; width: number; height: number } | null>(null)
  const orbit = useRef<Orbit>(null)
  const { camera, size, invalidate } = useThree()
  // Frame the complete movement once. Scrubbing never moves the camera.
  const { points, context } = useMemo(() => {
    const r = createMovementRig(),
      s = useStudio.getState(),
      project = s.project,
      end = lengthOf(s),
      out: Vector3[] = [],
      bounds = new Box3()
    const times = Array.from({ length: 37 }, (_, i) => (end * i) / 36)
    if (id === 'custom') for (const f of project.frames) times.push(f.time)
    for (const t of times) {
      sampleStudio(r, id, t, side, project)
      if (focus !== 'body') {
        for (const bone of r.bones) bounds.expandByPoint(bone.getWorldPosition(new Vector3()))
        const active = clipInfo(cameraId).unilateral ? (originalSide ?? side) : 'left'
        const hand = r.bones[active === 'left' ? 8 : 11].getWorldPosition(new Vector3())
        for (const [i, [name]] of joints.entries()) {
          const pos = r.bones[i].getWorldPosition(new Vector3())
          if (
            focus === 'leg'
              ? name === 'lumbar' ||
                name === 'pelvis' ||
                (region === 'leg-spine' && (name === 'neck' || name === 'head')) ||
                (/Thigh|Shin|Foot|Toe/.test(name) &&
                  (name.startsWith(active) || !clipInfo(cameraId).unilateral))
              : focus === 'arm'
                ? name === 'neck' ||
                  name === 'head' ||
                  (/Arm|Forearm|Hand|Shoulder|Thumb|Index|Middle|Ring|Little/.test(name) &&
                    !name.includes('Toe') &&
                    name.startsWith(active))
                : focus === 'upper'
                  ? i <= 11 ||
                    name === 'rightShoulder' ||
                    (/Hand|Thumb|Index|Middle|Ring|Little/.test(name) && !name.includes('Toe'))
                  : focus === 'face'
                    ? name === 'jaw' || name === 'head' || name === 'neck'
                    : focus === 'hand'
                      ? /Hand|Thumb|Index|Middle|Ring|Little/.test(name) &&
                        !name.includes('Toe') &&
                        (name.startsWith(active) ||
                          pos.distanceTo(hand) < 0.19 ||
                          !clipInfo(cameraId).unilateral)
                      : /Foot|Toe/.test(name) &&
                        (name.startsWith(active) || !clipInfo(cameraId).unilateral)
          )
            out.push(pos)
        }
        if (focus === 'upper' || focus === 'arm')
          out.push(r.bones[5].localToWorld(new Vector3(0, 0.18, 0)))
        if (focus === 'face')
          out.push(
            r.bones[5].localToWorld(new Vector3(0, atlasOnly ? 0.157 : 0.265, 0)),
            r.bones[5].localToWorld(new Vector3(0.115, 0.04, 0.11)),
            r.bones[5].localToWorld(new Vector3(-0.115, 0.04, 0.11)),
          )
        continue
      }
      for (const b of r.bones) out.push(b.getWorldPosition(new Vector3()))
      const floor = r.bones[0].getWorldPosition(new Vector3())
      floor.y = 0
      out.push(floor)
      for (const [i, y, z] of [
        [5, 0.2, 0.025],
        [14, -0.055, 0.2],
        [17, -0.055, 0.2],
        [8, -0.17, 0.1],
        [11, -0.17, 0.1],
      ])
        out.push(r.bones[i].localToWorld(oldLocal(i, 0, y, z)))
    }
    if (focus === 'body' && (id === 'sciatic-slider-seated' || prop === 'chair'))
      for (const x of [-0.23, 0.23]) for (const y of [0, 0.84]) out.push(new Vector3(x, y, -0.34))
    r.skeleton.dispose()
    let context: OrthographicCamera | undefined
    if (!bounds.isEmpty()) {
      bounds.min.y = Math.min(bounds.min.y, 0)
      const at = bounds.getCenter(new Vector3())
      const radius = bounds.getSize(new Vector3()).length() / 2 + 0.2
      context = new OrthographicCamera(-radius, radius, radius, -radius, 0.01, 35)
      context.position.copy(at).add(new Vector3(side === 'left' ? 3 : -3, 1.1, 1.8))
      context.lookAt(at)
      if (paired) context.layers.enable(1)
    }
    return { points: out, context }
  }, [id, side, prop, reset, focus, originalSide, cameraId, atlasOnly, paired])
  useFrame(() => {
    const move = transition.current
    if (!move || !(camera instanceof OrthographicCamera) || !orbit.current) return
    const elapsed = Math.min(1, (performance.now() - move.started) / 360)
    const t = elapsed * elapsed * (3 - 2 * elapsed)
    orbit.current.target.lerpVectors(move.from, move.to, t)
    camera.quaternion.slerpQuaternions(move.fromQ, move.toQ, t)
    camera.position
      .set(0, 0, move.distance + (4 - move.distance) * t)
      .applyQuaternion(camera.quaternion)
      .add(orbit.current.target)
    camera.zoom = move.fromZoom * (move.toZoom / move.fromZoom) ** t
    camera.updateProjectionMatrix()
    orbit.current.update()
    if (elapsed === 1) transition.current = null
    invalidate()
  })
  useLayoutEffect(() => {
    if (!(camera instanceof OrthographicCamera) || !orbit.current) return
    camera.userData.floorContext = context
    const viewportWidth = size.width / (paired ? 2 : 1)
    const key = [id, side, angle, reset, prop, original, originalSide, atlasOnly].join('/'),
      prior = previousSize.current
    previousSize.current = { key, width: viewportWidth, height: size.height }
    if (prior?.key === key) {
      // A clean take keeps the orbit, pan and zoom chosen by its author.
      const direction = camera.position.clone().sub(orbit.current.target).normalize()
      const x = new Vector3(0, 1, 0).cross(direction).normalize(),
        y = direction.clone().cross(x)
      const span = (axis: Vector3) => {
        const v = points.map((p) => p.dot(axis))
        return Math.max(...v) - Math.min(...v)
      }
      const w = span(x) + marginX,
        h = span(y) + marginY
      camera.zoom *=
        Math.min(viewportWidth / w, size.height / h) / Math.min(prior.width / w, prior.height / h)
      camera.updateProjectionMatrix()
      invalidate()
      return
    }
    const sign = clipInfo(original ?? id).unilateral && (originalSide ?? side) === 'right' ? -1 : 1
    const standing = clipInfo(original ?? id).posture === 'standing'
    const teaching = angle === 'Teaching' || angle === 'Focus'
    const authored = teachingDirection(cameraId, angle)
    const dir = authored
      ? [...authored]
      : angle === 'Side'
        ? [sign, 0.09, 0.015]
        : angle === 'Front'
          ? [0, 0.1, 1]
          : angle === 'Back'
            ? [0, 0.1, -1]
            : angle === 'Overhead'
              ? [0.001, 1, 0]
              : sideLying
                ? [0.22, 0.52, 2.6]
                : focus === 'face'
                  ? [0.38, 0.09, 2.4]
                  : focus === 'hand'
                    ? // From the working side, so the wrist and fingers read in profile, clear of the trunk.
                      [2.3, 0.8, 1.05]
                    : focus === 'foot'
                      ? [1.1, 0.72, 1.65]
                      : standing
                        ? [1.1, 0.3, 2.1]
                        : [2.45, 1.1, 1.35]
    if (teaching) dir[0] *= sign
    const look = new Vector3(...dir).normalize(),
      right = new Vector3(0, 1, 0).cross(look).normalize(),
      up = look.clone().cross(right)
    const range = (axis: Vector3) => {
      let low = Infinity,
        high = -Infinity
      for (const p of points) {
        const n = p.dot(axis)
        low = Math.min(low, n)
        high = Math.max(high, n)
      }
      return [low, high]
    }
    const [l, r] = range(right),
      [b, t] = range(up),
      [n, f] = range(look)
    const at = right
      .clone()
      .multiplyScalar((l + r) / 2)
      .addScaledVector(up, (b + t) / 2)
      .addScaledVector(look, (n + f) / 2)
    const zoom = Math.min(viewportWidth / (r - l + marginX), size.height / (t - b + marginY)) * 0.89
    if (prior && !capture && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const end = new OrthographicCamera()
      end.position.copy(at).addScaledVector(look, 4)
      end.lookAt(at)
      transition.current = {
        started: performance.now(),
        from: orbit.current.target.clone(),
        to: at,
        fromQ: camera.quaternion.clone(),
        toQ: end.quaternion,
        fromZoom: camera.zoom,
        toZoom: zoom,
        distance: camera.position.distanceTo(orbit.current.target),
      }
      invalidate()
      return
    }
    camera.zoom = zoom
    camera.position.copy(at).addScaledVector(look, 4)
    camera.lookAt(at)
    camera.updateProjectionMatrix()
    orbit.current.target.copy(at)
    orbit.current.update()
    invalidate()
  }, [
    camera,
    size,
    points,
    id,
    side,
    angle,
    reset,
    prop,
    original,
    originalSide,
    paired,
    invalidate,
  ])
  return (
    <OrbitControls
      onStart={() => {
        transition.current = null
      }}
      ref={orbit}
      makeDefault
      enableDamping={false}
      minZoom={12}
      maxZoom={3000}
    />
  )
}
