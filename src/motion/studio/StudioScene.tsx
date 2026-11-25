import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { theme } from '../../theme'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Grid, OrbitControls, useGLTF } from '@react-three/drei'
import { Group, OrthographicCamera, Vector3 } from 'three'
import type { OrbitControls as Orbit } from 'three-stdlib'
import performerUrl from './assets/performer.glb?url'
import { createMovementRig } from '../movementRig'
import { clipInfo } from '../../studio/clips'
import { lengthOf, seek, tick, useStudio } from '../../studio/store'
import { assetUrl, DRACO_PATH, previewUrlOf } from '../../viewer/assets'
import { renderStage } from './renderStage'
import { pinHere } from './anchors'
import { editableCopy, checkCustomMotion } from './author'
import { chair, supports, sampleStudio } from './sample'
import { scores, hasScore } from '../../studio/choreography'
import { guideEquipment } from './guides/equipment'
import { joints } from '../joints'
import { addPerformer, makeFigure, selectSurfaces } from './figure'

const capture = new URLSearchParams(location.search).get('capture') === '1'
declare global {
  interface Window {
    anatomyCapture?: { frame: (time: number, format?: 'png' | 'jpeg') => string; duration: number }
  }
}
function Actor() {
  const id = useStudio((s) => s.clip),
    side = useStudio((s) => s.side),
    figure = useStudio((s) => s.figure),
    detail = useStudio((s) => s.detail)
  const rig = useMemo(createMovementRig, [])
  const selectionKey = useStudio((s) =>
    s.clip === 'custom'
      ? JSON.stringify([
          s.project.target ?? null,
          s.project.target === undefined,
          s.project.base ?? null,
        ])
      : '',
  )
  const { target, base } = useMemo(() => {
    const p = useStudio.getState().project
    return selectionKey ? { target: p.target, base: p.base } : {}
  }, [selectionKey])
  const selection = useMemo(
    () => selectSurfaces(id, figure, side, target, base),
    [id, figure, side, target, base],
  )
  const urls = useMemo(() => {
    const files = selection.urls.map((u) => assetUrl(detail ? u : (previewUrlOf(u) ?? u)))
    return figure === 'pair' || figure === 'human' ? [...files, performerUrl] : files
  }, [figure, selection, detail])
  const assets = useGLTF(urls, DRACO_PATH)
  const built = useMemo(() => {
    const scenes = assets.map((a) => a.scene)
    if (figure !== 'pair' && figure !== 'human') return makeFigure(scenes, rig, figure, selection)
    const atlas = makeFigure(scenes.slice(0, -1), rig, figure, selection)
    const human = figure === 'pair' ? atlas.root.clone(true) : atlas.root
    const disposeShell = addPerformer(human, scenes[scenes.length - 1], rig)
    const root = new Group().add(human)
    if (figure === 'pair') {
      atlas.root.traverse((o) => o.layers.set(1))
      human.traverse((o) => o.layers.set(2))
      root.add(atlas.root)
    }
    return {
      root,
      dispose() {
        atlas.dispose()
        disposeShell()
      },
    }
  }, [assets, rig, figure, selection])
  const equipment = useMemo(() => {
    const key = base?.id ?? id
    if (!hasScore(key)) return []
    const kinds = figure === 'pair' ? (['anatomy', 'human'] as const) : [figure]
    return kinds.map((kind) => {
      const props = guideEquipment(key, base?.side ?? side, rig, kind === 'human')
      props.root.traverse((o) => o.layers.set(figure === 'pair' ? (kind === 'human' ? 2 : 1) : 0))
      return props
    })
  }, [id, side, figure, base, rig])
  useLayoutEffect(() => () => equipment.forEach((p) => p.dispose()), [equipment])
  const { gl, scene, camera, invalidate } = useThree()
  function drawPose() {
    const s = useStudio.getState()
    sampleStudio(rig, s.clip, s.time, s.side, s.project)
    equipment.forEach((p) => p.update())
  }
  useLayoutEffect(() => {
    drawPose()
    useStudio.setState({
      ready: true,
      author: {
        copy: () => editableCopy(id, side),
        check: checkCustomMotion,
        pin: (p, t, limb, space, point) => {
          const scratch = createMovementRig()
          sampleStudio(scratch, 'custom', t, side, p)
          const pin = pinHere(scratch, limb, space, point)
          scratch.skeleton.dispose()
          return pin
        },
      },
    })
    invalidate()
    return () => {
      built.dispose()
      useStudio.setState({ ready: false, author: undefined })
    }
  }, [built, invalidate])
  useEffect(() => () => rig.skeleton.dispose(), [rig])
  useLayoutEffect(() => {
    if (!capture) return
    window.anatomyCapture = {
      get duration() {
        return lengthOf(useStudio.getState())
      },
      frame(t, format = 'png') {
        if (!useStudio.getState().ready) throw Error('The figure is loading.')
        seek(t)
        drawPose()
        renderStage(gl, scene, camera, figure === 'pair')
        return gl.domElement.toDataURL('image/' + format, 0.96)
      },
    }
    return () => {
      delete window.anatomyCapture
    }
  }, [rig, built, camera, gl, scene])
  const clock = useRef<number | null>(null)
  useEffect(
    () =>
      useStudio.subscribe((s, old) => {
        if (s.playing !== old.playing || !s.ready) clock.current = null
        if (s.time !== old.time || s.playing !== old.playing || s.project !== old.project)
          invalidate()
      }),
    [invalidate],
  )
  useFrame(() => {
    const now = performance.now(),
      s = useStudio.getState()
    if (s.playing && s.ready) {
      if (clock.current !== null) tick((now - clock.current) / 1000)
      clock.current = now
      invalidate()
    } else clock.current = null
    drawPose()
    renderStage(gl, scene, camera, figure === 'pair')
  }, 1)
  return (
    <>
      <primitive object={rig.root} />
      <primitive object={built.root} dispose={null} />
      {equipment.map((p, i) => (
        <primitive key={i} object={p.root} dispose={null} />
      ))}
    </>
  )
}
function Camera() {
  const id = useStudio((s) => s.clip),
    side = useStudio((s) => s.side),
    angle = useStudio((s) => s.angle),
    reset = useStudio((s) => s.resetCamera)
  const original = useStudio((s) => (s.clip === 'custom' ? s.project.base?.id : undefined)),
    originalSide = useStudio((s) => (s.clip === 'custom' ? s.project.base?.side : undefined)),
    prop = useStudio((s) => (s.clip === 'custom' ? s.project.prop : undefined))
  const cameraId = original ?? id
  const upperBody =
    /^(neck-|scm-stretch|scalene-stretch|chin-tuck|levator-scapulae|upper-trap-arm|head-rolls|shoulder-rolls|median-|ulnar-|radial-|brachial-plexus|plexus-shoulder)/.test(
      cameraId,
    )
  const focus =
    angle === 'Teaching' && hasScore(cameraId)
      ? (scores[cameraId].focus ?? (upperBody ? 'upper' : 'body'))
      : 'body'
  const sideLying = hasScore(cameraId) && scores[cameraId].posture === 'side'
  const figure = useStudio((s) => s.figure)
  const paired = figure === 'pair',
    atlasOnly = figure === 'anatomy' || figure === 'bones'
  const marginX = focus === 'body' ? 0.31 : focus === 'face' && atlasOnly ? 0.066 : 0.14
  const marginY = focus === 'body' ? 0.26 : focus === 'face' && atlasOnly ? 0.058 : 0.14
  const previousSize = useRef<{ key: string; width: number; height: number } | null>(null)
  const orbit = useRef<Orbit>(null)
  const { camera, size, invalidate } = useThree()
  // Frame the complete movement once. Scrubbing never moves the camera.
  const points = useMemo(() => {
    const r = createMovementRig(),
      s = useStudio.getState(),
      project = s.project,
      end = lengthOf(s),
      out: Vector3[] = []
    const times = Array.from({ length: 37 }, (_, i) => (end * i) / 36)
    if (id === 'custom') for (const f of project.frames) times.push(f.time)
    for (const t of times) {
      sampleStudio(r, id, t, side, project)
      if (focus !== 'body') {
        const active = clipInfo(cameraId).unilateral ? (originalSide ?? side) : 'left'
        const hand = r.bones[active === 'left' ? 8 : 11].getWorldPosition(new Vector3())
        for (const [i, [name]] of joints.entries()) {
          const pos = r.bones[i].getWorldPosition(new Vector3())
          if (
            focus === 'upper'
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
        if (focus === 'upper') out.push(r.bones[5].localToWorld(new Vector3(0, 0.18, 0)))
        if (focus === 'face')
          out.push(
            r.bones[5].localToWorld(new Vector3(0, atlasOnly ? 0.157 : 0.265, 0)),
            r.bones[5].localToWorld(new Vector3(0.115, 0.04, 0.11)),
            r.bones[5].localToWorld(new Vector3(-0.115, 0.04, 0.11)),
          )
        continue
      }
      for (const b of r.bones) out.push(b.getWorldPosition(new Vector3()))
      for (const [i, y, z] of [
        [5, 0.2, 0.025],
        [14, -0.055, 0.2],
        [17, -0.055, 0.2],
        [8, -0.17, 0.1],
        [11, -0.17, 0.1],
      ])
        out.push(r.bones[i].localToWorld(new Vector3(0, y, z)))
    }
    if (id === 'sciatic-slider-seated' || prop === 'chair')
      for (const x of [-0.23, 0.23]) for (const y of [0, 0.84]) out.push(new Vector3(x, y, -0.34))
    r.skeleton.dispose()
    return out
  }, [id, side, prop, reset, focus, originalSide, cameraId, atlasOnly])
  useLayoutEffect(() => {
    if (!(camera instanceof OrthographicCamera) || !orbit.current) return
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
    const dir =
      angle === 'Side'
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
                    ? [1.15, 0.95, 2.1]
                    : focus === 'foot'
                      ? [1.1, 0.72, 1.65]
                      : standing
                        ? [1.1, 0.3, 2.1]
                        : [2.45, 1.1, 1.35]
    if (angle === 'Teaching') dir[0] *= sign
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
    camera.zoom =
      Math.min(viewportWidth / (r - l + marginX), size.height / (t - b + marginY)) * 0.89
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
  return <OrbitControls ref={orbit} makeDefault enableDamping={false} minZoom={12} maxZoom={3000} />
}
function Chair({ support }: { support: number }) {
  const top = support === supports(true).seat ? support : 0.356
  const wood = '#987d60',
    frame = '#47535a'
  return (
    <group>
      <mesh position={[0, top - 0.018, chair.z]} castShadow receiveShadow>
        <boxGeometry args={[chair.width, 0.036, chair.depth]} />
        <meshStandardMaterial color={wood} />
      </mesh>
      {support > top && (
        <mesh position={[0, (support + top) / 2, -0.2]} castShadow receiveShadow>
          <boxGeometry args={[0.12, support - top, 0.066]} />
          <meshStandardMaterial color="#486665" />
        </mesh>
      )}
      <mesh position={[0, 0.68, chair.z - 0.17]} castShadow>
        <boxGeometry args={[chair.width, 0.27, 0.033]} />
        <meshStandardMaterial color={wood} />
      </mesh>
      {[-0.2, 0.2].flatMap((x) =>
        [-0.14, 0.14].map((z) => {
          const h = z < 0 ? 0.81 : top
          return (
            <mesh key={x + '/' + z} position={[x, h / 2, chair.z + z]} castShadow>
              <boxGeometry args={[0.025, h, 0.025]} />
              <meshStandardMaterial color={frame} />
            </mesh>
          )
        }),
      )}
    </group>
  )
}
function Supports({
  prop,
  human,
  layer,
}: {
  prop: 'chair' | 'mat'
  human: boolean
  layer: number
}) {
  const ref = useRef<Group>(null),
    support = supports(human)
  useLayoutEffect(() => {
    ref.current?.traverse((o) => o.layers.set(layer))
  }, [layer, human, prop])
  return (
    <group ref={ref}>
      {prop === 'chair' && <Chair support={support.seat} />}
      {prop === 'mat' &&
        [
          [0.6, support.mat, 0.74, -0.24],
          [0.34, support.head, 0.3, -0.76],
        ].map(([width, h, depth, z]) => (
          <mesh key={z} position={[0, (h - 0.004) / 2, z]} receiveShadow castShadow>
            <boxGeometry args={[width, h + 0.004, depth]} />
            <meshStandardMaterial color="#486665" roughness={1} />
          </mesh>
        ))}
    </group>
  )
}
function ContextRecovery() {
  const { gl } = useThree()
  useEffect(() => {
    const lost = (e: Event) => {
      e.preventDefault()
      useStudio.setState({
        ready: false,
        playing: false,
        clean: false,
        error: 'Graphics context lost. Reload the studio to restore the figure.',
      })
    }
    gl.domElement.addEventListener('webglcontextlost', lost)
    return () => gl.domElement.removeEventListener('webglcontextlost', lost)
  }, [gl])
  return null
}
export default function StudioScene() {
  const detailBackdrop = useStudio((s) => {
    const id = s.clip === 'custom' ? s.project.base?.id : s.clip
    return (
      (s.figure === 'anatomy' || s.figure === 'bones') &&
      s.angle === 'Teaching' &&
      id &&
      hasScore(id) &&
      scores[id].focus === 'face'
    )
  })
  const figure = useStudio((s) => s.figure),
    prop = useStudio((s) =>
      s.clip === 'custom'
        ? s.project.prop
        : s.clip === 'sciatic-slider-seated'
          ? 'chair'
          : s.clip === 'supine-hamstring'
            ? 'mat'
            : undefined,
    )
  return (
    <Canvas
      aria-label="Motion Lab stage"
      orthographic
      frameloop="demand"
      shadows
      dpr={capture ? 1 : [1, 1.5]}
      camera={{ near: 0.01, far: 35, position: [3, 2, 3] }}
      gl={{
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: capture,
        powerPreference: 'high-performance',
      }}
    >
      <color attach="background" args={[theme.stage]} />
      <hemisphereLight args={[theme.sky, theme.bounce, 1.3]} />
      <directionalLight
        position={[2.8, 4.5, 3]}
        intensity={2.1}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0002}
        shadow-normalBias={0.003}
        shadow-camera-left={-2}
        shadow-camera-right={2}
        shadow-camera-top={2}
        shadow-camera-bottom={-2}
      />
      <directionalLight position={[-3, 2, -2]} intensity={1.15} color={theme.rim} />
      <mesh
        visible={!detailBackdrop}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.004, 0]}
        receiveShadow
      >
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color={theme.floor} roughness={1} />
      </mesh>
      {!detailBackdrop && (
        <Grid
          args={[8, 8]}
          position={[0, -0.003, 0]}
          cellSize={0.25}
          sectionSize={1}
          cellColor={theme.grid}
          sectionColor={theme.grid}
          cellThickness={0.35}
          sectionThickness={0.6}
          fadeFrom={0}
          fadeDistance={3.5}
          fadeStrength={1.5}
        />
      )}
      {prop &&
        (figure === 'pair' ? (
          <>
            <Supports prop={prop} human={false} layer={1} />
            <Supports prop={prop} human layer={2} />
          </>
        ) : (
          <Supports prop={prop} human={figure === 'human'} layer={0} />
        ))}
      <ContextRecovery />
      <Camera />
      <Suspense fallback={null}>
        <Actor />
      </Suspense>
    </Canvas>
  )
}
