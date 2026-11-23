import { createContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { Group } from 'three'
import { useAnatomyStore } from '../store/useAnatomyStore'
import {
  advanceMovement,
  CARTWHEEL_SECONDS,
  createMovementRig,
  type MovementRig,
} from './movementRig'

export const BodyPose = createContext<MovementRig | null>(null)

export default function LivingBody({
  enabled,
  children,
}: {
  enabled: boolean
  children: ReactNode
}) {
  const body = useRef<Group>(null)
  const rig = useMemo(createMovementRig, [])
  const phase = useRef(0)
  const clock = useRef({ serial: -1, time: 0 })
  const serial = useAnatomyStore((s) => s.actionSerial)
  const action = useAnatomyStore((s) => s.bodyAction)
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined
    const update = () => {
      clearInterval(timer)
      if (enabled && !document.hidden)
        timer = setInterval(
          invalidate,
          1000 / (action === 'moonwalk' || action === 'cartwheel' ? 60 : 30),
        )
      invalidate()
    }
    update()
    document.addEventListener('visibilitychange', update)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', update)
    }
  }, [enabled, action, invalidate])
  useEffect(() => {
    invalidate()
  }, [serial, action, invalidate])
  useEffect(() => () => rig.skeleton.dispose(), [rig])
  useFrame((_, dt) => {
    const group = body.current
    if (!group) return
    const changed = clock.current.serial !== serial
    if (changed) clock.current = { serial, time: 0 }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches && !enabled
    const running = enabled && !document.hidden
    if (running) {
      phase.current += Math.min(dt, 0.08)
      clock.current.time += Math.min(dt, 0.08)
    }
    if (action === 'idle' && enabled) {
      const t = phase.current,
        breath = (1 - Math.cos((t * Math.PI * 2) / 5)) / 2
      group.scale.set(1 + breath * 0.012, 1 + breath * 0.004, 1 + breath * 0.028)
      group.rotation.set(
        Math.sin(t * 0.57) * 0.006,
        Math.sin(t * 0.43) * 0.008,
        Math.sin(t * 0.71) * 0.01,
      )
    } else {
      group.scale.setScalar(1)
      group.rotation.set(0, 0, 0)
    }
    group.updateMatrixWorld(true)
    if (running || changed || reduced || action === 'idle') {
      const time = reduced
        ? action === 'cartwheel'
          ? CARTWHEEL_SECONDS / 2
          : 0.8
        : clock.current.time
      const moving = advanceMovement(rig, action, time, dt, reduced)
      if (moving && (running || action === 'idle')) invalidate()
    }
    if (action === 'cartwheel' && running && clock.current.time > CARTWHEEL_SECONDS + 0.5)
      useAnatomyStore.getState().setBodyAction('idle')
  }, -1)
  return (
    <BodyPose.Provider value={rig}>
      <group ref={body}>
        <primitive object={rig.root} />
        {children}
      </group>
    </BodyPose.Provider>
  )
}
