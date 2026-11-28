import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Grid, OrbitControls, useGLTF } from '@react-three/drei'
import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three'
import type { OrbitControls as Orbit } from 'three-stdlib'
import { theme } from '../theme'
import { createMovementRig, restPose } from '../motion/movementRig'
import { assetUrl, DRACO_PATH } from '../viewer/assets'
import { skeletonUrl, structureByMesh } from '../anatomy/catalogue'
import { fingerCapsules, thumbCapsules, type Capsule } from '../motion/hands/fit'
import { armFrame, limb } from '../motion/anatomy'
import { indexOfJoint, type Joint } from '../motion/joints'
import { makeFigure } from '../motion/studio/figure'
import type { Side } from '../motion/anatomy'
import { gestureById, gestures } from './gestures'
import type { Built, PropSpec } from './types'
import { cameraFor, VIEWS } from './views'

/** bones: skeleton only; anatomy: bones and arm muscles; tissue: bones inside a plain translucent soft-tissue envelope. */
type Figure = 'bones' | 'anatomy' | 'tissue'
interface LabState {
  gesture: string
  t: number
  side: Side
  figure: Figure
  view: string
  wholeBody: boolean
}
const params = new URLSearchParams(location.search)
const capture = params.get('capture') === '1'
const lab: LabState = {
  gesture: params.get('handlab') || gestures[0].id,
  t: Number(params.get('t') ?? 0),
  side: params.get('side') === 'right' ? -1 : 1,
  figure: (params.get('figure') as Figure) || 'tissue',
  view: params.get('view') || 'oblique',
  wholeBody: params.get('body') === '1',
}
declare global {
  interface Window {
    handLab?: {
      frame: (o: Partial<LabState> & { fov?: number }) => string
      notes: () => Built['notes']
      info: (id: string) => { name: string; duration: number; moments: { t: number; label: string }[] } | undefined
    }
  }
}

function ballTexture(look: 'basketball' | 'cricket') {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 256
  const g = c.getContext('2d')!
  g.fillStyle = look === 'basketball' ? '#d9692b' : '#a3171c'
  g.fillRect(0, 0, 512, 256)
  if (look === 'basketball') {
    g.strokeStyle = '#1b1410'
    g.lineWidth = 5
    for (const x of [0, 256, 512]) {
      g.beginPath()
      g.moveTo(x, 0)
      g.lineTo(x, 256)
      g.stroke()
    }
    g.beginPath()
    g.moveTo(0, 128)
    g.lineTo(512, 128)
    g.stroke()
    for (const x of [128, 384]) {
      g.beginPath()
      g.ellipse(x, 128, 70, 150, 0, 0, Math.PI * 2)
      g.stroke()
    }
  } else {
    // Cricket seam: a raised ridge round the equator with a row of stitches on each side.
    g.strokeStyle = '#d8c9a5'
    g.lineWidth = 9
    g.beginPath()
    g.moveTo(0, 128)
    g.lineTo(512, 128)
    g.stroke()
    g.lineWidth = 3
    g.strokeStyle = '#f2ead6'
    for (const dy of [-9, 9])
      for (let x = 0; x < 512; x += 10) {
        g.beginPath()
        g.moveTo(x, 128 + dy)
        g.lineTo(x + 5, 128 + dy * 1.4)
        g.stroke()
      }
  }
  return new CanvasTexture(c)
}
const UP = new Vector3(0, 1, 0)
let current: { rig: ReturnType<typeof createMovementRig>; built: Built } | null = null
/** Send the orbit camera to a named view of the current instant. */
function aim(view: string) {
  if (!current) return
  const { rig, built } = current
  const { position, up, focus } = cameraFor(
    view,
    built.focus,
    built.span,
    rig,
    lab.side,
    32,
    lab.wholeBody,
  )
  window.dispatchEvent(new CustomEvent('handlab-aim', { detail: { position, up, focus } }))
}
/** Draws the props of the current instant, reusing one mesh per prop name. */
class PropLayer {
  root = new Group()
  private meshes = new Map<string, Mesh>()
  private unit = {
    ball: new SphereGeometry(1, 48, 32),
    cylinder: new CylinderGeometry(1, 1, 1, 40),
    box: new BoxGeometry(1, 1, 1),
  }
  update(specs: PropSpec[]) {
    const seen = new Set<string>()
    for (const spec of specs) {
      seen.add(spec.name)
      let m = this.meshes.get(spec.name)
      if (!m) {
        m = new Mesh(
          this.unit[spec.kind],
          new MeshStandardMaterial(
            spec.kind === 'ball'
              ? { map: ballTexture(spec.look), roughness: 0.75 }
              : { color: spec.color, roughness: 0.7 },
          ),
        )
        m.castShadow = m.receiveShadow = true
        this.meshes.set(spec.name, m)
        this.root.add(m)
      }
      m.visible = true
      m.position.copy(spec.centre)
      if (spec.kind === 'ball') {
        m.scale.setScalar(spec.radius)
        m.quaternion.copy(spec.quaternion ?? new Quaternion())
      } else if (spec.kind === 'cylinder') {
        m.scale.set(spec.radius, spec.length, spec.radius)
        m.quaternion.setFromUnitVectors(UP, spec.axis.clone().normalize())
      } else {
        m.scale.set(...spec.size)
        m.quaternion.copy(spec.quaternion ?? new Quaternion())
      }
    }
    for (const [name, m] of this.meshes) m.visible = seen.has(name)
  }
  dispose() {
    for (const m of this.meshes.values()) (m.material as MeshStandardMaterial).dispose()
    Object.values(this.unit).forEach((g) => g.dispose())
  }
}

/**
 * A plain translucent soft-tissue envelope: a capsule round every finger phalanx and a slab for
 * the palm, at the measured skin radii. It stands in for the flesh the bone figure lacks, so a
 * viewer can see where a pad meets an object. It is not a body model.
 */
/** Rounded palm: a capsule over each metacarpal plus the thenar mass, pushed to the palm side. */
function palmCapsules(rig: ReturnType<typeof createMovementRig>, s: Side): Capsule[] {
  const hand = rig.bones[limb(s).hand],
    f = armFrame(s),
    q = hand.getWorldQuaternion(new Quaternion())
  const palmar = f.palmar.clone().applyQuaternion(q),
    along = f.handLong.clone().applyQuaternion(q)
  const wrist = hand.getWorldPosition(new Vector3()).addScaledVector(along, 0.02)
  const side = s === 1 ? 'left' : 'right'
  const knuckle = (name: string) =>
    rig.bones[indexOfJoint[(side + name + '1') as Joint]].getWorldPosition(new Vector3())
  const out: Capsule[] = ['Index', 'Middle', 'Ring', 'Little'].map((d) => ({
    a: wrist.clone().addScaledVector(palmar, 0.004),
    b: knuckle(d).addScaledVector(palmar, 0.003),
    radius: 0.0105,
    palmar,
  }))
  const thumb = rig.bones[indexOfJoint[(side + 'Thumb1') as Joint]].getWorldPosition(new Vector3())
  out.push({ a: wrist.clone().addScaledVector(palmar, 0.008), b: thumb.addScaledVector(palmar, 0.004), radius: 0.0125, palmar })
  return out
}
class TissueLayer {
  root = new Group()
  private material = new MeshStandardMaterial({
    color: '#d9a98a',
    transparent: true,
    opacity: 0.42,
    roughness: 0.7,
    depthWrite: false,
  })
  private parts: Group[] = []
  private cylinder = new CylinderGeometry(1, 1, 1, 20, 1, true)
  private ball = new SphereGeometry(1, 16, 12)
  constructor() {}
  private capsule(i: number) {
    let g = this.parts[i]
    if (!g) {
      g = new Group()
      g.add(new Mesh(this.cylinder, this.material), new Mesh(this.ball, this.material), new Mesh(this.ball, this.material))
      this.parts[i] = g
      this.root.add(g)
    }
    return g
  }
  update(rig: ReturnType<typeof createMovementRig>, s: Side) {
    const caps: Capsule[] = [
      ...(['Index', 'Middle', 'Ring', 'Little'] as const).flatMap((d) => fingerCapsules(rig, s, d)),
      ...thumbCapsules(rig, s),
      ...palmCapsules(rig, s),
    ]
    caps.forEach((c, i) => {
      const g = this.capsule(i),
        len = c.a.distanceTo(c.b)
      const [body, e1, e2] = g.children as Mesh[]
      body.position.copy(c.a).lerp(c.b, 0.5)
      body.quaternion.setFromUnitVectors(UP, c.b.clone().sub(c.a).normalize())
      body.scale.set(c.radius, len, c.radius)
      e1.position.copy(c.a)
      e1.scale.setScalar(c.radius)
      e2.position.copy(c.b)
      e2.scale.setScalar(c.radius)
    })
  }
  dispose() {
    this.material.dispose()
    this.cylinder.dispose()
    this.ball.dispose()
  }
}

function Actor({ onReady }: { onReady: () => void }) {
  const rig = useMemo(createMovementRig, [])
  const skeleton = useGLTF(assetUrl(skeletonUrl), DRACO_PATH)
  const muscles = useGLTF(assetUrl('/models/muscles/upper-limbs.glb'), DRACO_PATH)
  const { gl, scene, camera, invalidate } = useThree()
  const layer = useMemo(() => new PropLayer(), [])
  const tissue = useMemo(() => new TissueLayer(), [])
  const parts = useMemo(() => {
    const select = (system: 'skeletal' | 'muscular', role: 'bone' | 'muscle') => ({
      roleFor: (name: string) =>
        structureByMesh.get(name)?.systems.includes(system) ? role : null,
      selected: new Map<string, 'primary' | 'secondary'>(),
      kind: 'stretch' as const,
      urls: [] as string[],
    })
    return {
      bones: makeFigure([skeleton.scene], rig, select('skeletal', 'bone')),
      muscles: makeFigure([muscles.scene], rig, select('muscular', 'muscle')),
    }
  }, [skeleton, muscles, rig])
  const built = useRef<Built | null>(null)

  const draw = useCallback(() => {
    const g = gestureById.get(lab.gesture) ?? gestures[0]
    restPose(rig)
    rig.root.updateMatrixWorld(true)
    built.current = g.build({ r: rig, side: lab.side, t: Math.max(0, Math.min(g.duration, lab.t)) })
    for (const b of rig.bones) b.quaternion.normalize()
    rig.root.updateMatrixWorld(true)
    rig.skeleton.update()
    current = { rig, built: built.current }
    layer.update(built.current.props)
    parts.muscles.root.visible = lab.figure === 'anatomy'
    tissue.root.visible = lab.figure === 'tissue'
    if (lab.figure === 'tissue') tissue.update(rig, lab.side)
    invalidate()
  }, [rig, layer, parts, tissue, invalidate])

  useLayoutEffect(() => {
    draw()
    aim(lab.view)
    onReady()
    window.handLab = {
      info: (id) => {
        const g = gestureById.get(id)
        return g && { name: g.name, duration: g.duration, moments: g.moments }
      },
      notes: () => built.current?.notes,
      frame(o) {
        Object.assign(lab, o)
        draw()
        const b = built.current!
        const cam = camera as PerspectiveCamera
        const fov = o.fov ?? 32
        cam.fov = fov
        const { position, up, focus } = cameraFor(
          lab.view,
          b.focus,
          b.span,
          rig,
          lab.side,
          fov,
          lab.wholeBody,
        )
        cam.position.copy(position)
        cam.up.copy(up)
        cam.lookAt(focus)
        cam.updateProjectionMatrix()
        gl.render(scene, cam)
        return gl.domElement.toDataURL('image/jpeg', 0.95)
      },
    }
    return () => {
      delete window.handLab
    }
  }, [draw, onReady, camera, gl, scene, rig])
  useLayoutEffect(
    () => () => {
      parts.bones.dispose()
      parts.muscles.dispose()
      tissue.dispose()
      layer.dispose()
    },
    [parts, layer, tissue],
  )
  useEffect(() => {
    const redraw = () => draw()
    window.addEventListener('handlab-change', redraw)
    return () => window.removeEventListener('handlab-change', redraw)
  }, [draw])
  useFrame(() => {}, 1)
  return (
    <>
      <primitive object={rig.root} />
      <primitive object={parts.bones.root} dispose={null} />
      <primitive object={parts.muscles.root} dispose={null} />
      <primitive object={tissue.root} dispose={null} />
      <primitive object={layer.root} dispose={null} />
    </>
  )
}

function Camera() {
  const { camera } = useThree()
  const controls = useRef<Orbit>(null)
  useEffect(() => {
    const aim = (e: Event) => {
      const detail = (e as CustomEvent<{ position: Vector3; up: Vector3; focus: Vector3 }>).detail
      camera.position.copy(detail.position)
      camera.up.copy(detail.up)
      controls.current?.target.copy(detail.focus)
      camera.lookAt(detail.focus)
      controls.current?.update()
    }
    window.addEventListener('handlab-aim', aim)
    return () => window.removeEventListener('handlab-aim', aim)
  }, [camera])
  return <OrbitControls ref={controls} makeDefault enableDamping={false} />
}

export default function HandLab() {
  const [ready, setReady] = useState(false)
  const [, bump] = useState(0)
  const onReady = useCallback(() => setReady(true), [])
  const change = (patch: Partial<LabState>) => {
    Object.assign(lab, patch)
    window.dispatchEvent(new Event('handlab-change'))
    bump((n) => n + 1)
  }
  const g = gestureById.get(lab.gesture) ?? gestures[0]
  return (
    <div style={{ position: 'fixed', inset: 0, background: theme.stage, color: '#e9e9ec' }}>
      <main data-ready={ready} aria-label="Hand Lab stage" style={{ position: 'absolute', inset: 0 }}>
        <Canvas
          shadows
          dpr={capture ? 1 : [1, 1.5]}
          camera={{ fov: 32, near: 0.01, far: 40, position: [0.5, 1, 1.2] }}
          gl={{ antialias: true, preserveDrawingBuffer: capture }}
        >
          <color attach="background" args={[theme.stage]} />
          <hemisphereLight args={[theme.sky, theme.bounce, 1.3]} />
          <directionalLight
            position={[2.8, 4.5, 3]}
            intensity={2.1}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-bias={-0.0002}
            shadow-normalBias={0.002}
            shadow-camera-left={-1.5}
            shadow-camera-right={1.5}
            shadow-camera-top={1.5}
            shadow-camera-bottom={-1.5}
          />
          <directionalLight position={[-3, 2, -2]} intensity={1.15} color={theme.rim} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.004, 0]} receiveShadow>
            <planeGeometry args={[60, 60]} />
            <meshStandardMaterial color={theme.floor} roughness={1} />
          </mesh>
          <Grid
            args={[8, 8]}
            position={[0, -0.003, 0]}
            cellSize={0.1}
            sectionSize={0.5}
            cellColor={theme.grid}
            sectionColor={theme.grid}
            cellThickness={0.4}
            sectionThickness={0.7}
            fadeDistance={4}
          />
          <Camera />
          <Suspense fallback={null}>
            <Actor onReady={onReady} />
          </Suspense>
        </Canvas>
      </main>
      {!capture && (
        <aside
          style={{
            position: 'absolute',
            left: 12,
            top: 12,
            width: 300,
            font: '13px system-ui',
            background: '#111113cc',
            padding: 12,
            borderRadius: 8,
            maxHeight: 'calc(100% - 24px)',
            overflow: 'auto',
          }}
        >
          <b>Hand Lab</b> (dev only)
          <select
            aria-label="Gesture"
            value={lab.gesture}
            onChange={(e) => {
              change({ gesture: e.target.value, t: 0 })
              aim(lab.view)
            }}
            style={{ width: '100%', margin: '8px 0' }}
          >
            {gestures.map((x) => (
              <option key={x.id} value={x.id}>
                {x.group} · {x.name}
              </option>
            ))}
          </select>
          <input
            aria-label="Time"
            type="range"
            min={0}
            max={g.duration}
            step={0.01}
            value={lab.t}
            onChange={(e) => change({ t: Number(e.target.value) })}
            style={{ width: '100%' }}
          />
          <div>
            {g.moments.map((m) => (
              <button key={m.label} onClick={() => change({ t: m.t })} style={{ margin: 2 }}>
                {m.label}
              </button>
            ))}
          </div>
          <div style={{ margin: '8px 0' }}>
            {(['bones', 'anatomy', 'tissue'] as Figure[]).map((f) => (
              <button
                key={f}
                aria-pressed={lab.figure === f}
                onClick={() => change({ figure: f })}
                style={{ margin: 2, fontWeight: lab.figure === f ? 700 : 400 }}
              >
                {f}
              </button>
            ))}
            {([1, -1] as Side[]).map((s) => (
              <button
                key={s}
                aria-pressed={lab.side === s}
                onClick={() => change({ side: s })}
                style={{ margin: 2, fontWeight: lab.side === s ? 700 : 400 }}
              >
                {s === 1 ? 'left hand' : 'right hand'}
              </button>
            ))}
            <button
              aria-pressed={lab.wholeBody}
              onClick={() => {
                change({ wholeBody: !lab.wholeBody })
                aim(lab.view)
              }}
              style={{ margin: 2, fontWeight: lab.wholeBody ? 700 : 400 }}
            >
              whole body
            </button>
          </div>
          <div>
            {VIEWS.map((v) => (
              <button
                key={v}
                onClick={() => {
                  change({ view: v })
                  aim(v)
                }}
                style={{ margin: 2 }}
              >
                {v}
              </button>
            ))}
          </div>
          {current?.built.notes && (
            <pre style={{ fontSize: 11, opacity: 0.78, margin: '8px 0 0', whiteSpace: 'pre-wrap' }}>
              {Object.entries(current.built.notes)
                .map(([k, val]) => `${k}: ${val}`)
                .join('  ')}
            </pre>
          )}
          <p style={{ lineHeight: 1.4, opacity: 0.85 }}>{g.form}</p>
        </aside>
      )}
    </div>
  )
}
