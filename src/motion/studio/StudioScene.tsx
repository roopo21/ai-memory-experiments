import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { theme } from '../../theme'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Grid, useGLTF } from '@react-three/drei'
import { Group } from 'three'
import { StudioCamera } from './StudioCamera'
import performerUrl from './assets/performer.glb?url'
import { createMovementRig } from '../movementRig'
import { lengthOf, seek, tick, useStudio } from '../../studio/store'
import { assetUrl, DRACO_PATH, previewUrlOf } from '../../viewer/assets'
import { renderStage } from './renderStage'
import { pinHere } from './anchors'
import { editableCopy, checkCustomMotion } from './author'
import { chair, supports, sampleStudio } from './sample'
import { hasScore } from '../../studio/choreography'
import { makeChair } from '../../studio/props/chair'
import { guideEquipment } from './guides/equipment'
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
    if (figure !== 'pair' && figure !== 'human') return makeFigure(scenes, rig, selection)
    const atlas = makeFigure(scenes.slice(0, -1), rig, selection)
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
function Chair({ support }: { support: number }) {
  const top = support === supports(true).seat ? support : 0.356
  const model = useMemo(
    () => makeChair(chair.width, chair.depth, top, support - top),
    [top, support],
  )
  useLayoutEffect(() => () => model.dispose(), [model])
  return <primitive object={model.root} position-z={chair.z} dispose={null} />
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.004, 0]} receiveShadow>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color={theme.floor} roughness={1} />
      </mesh>
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
      <StudioCamera capture={capture} />
      <Suspense fallback={null}>
        <Actor />
      </Suspense>
    </Canvas>
  )
}
