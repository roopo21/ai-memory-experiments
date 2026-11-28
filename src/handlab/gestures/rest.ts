import { Vector3 } from 'three'
import { limb, setArm } from '../../motion/anatomy'
import {
  applyAngles,
  clearance,
  closeFingers,
  cylinder,
  fingerCapsules,
  placeThumb,
} from '../../motion/hands/fit'
import { relaxedAngles } from '../../motion/hands/shapes'
import { palmPad } from '../../motion/studio/anchors'
import type { Gesture } from '../types'
import { handNotes, placeHand, sitInChair, V, wristOf } from './kit'

export const rest: Gesture[] = [
  {
    id: 'relaxed-hang',
    name: 'Relaxed hand, arm hanging',
    group: 'rest',
    form: 'Standing at rest with the arm hanging freely beside (clear of) the thigh: shoulder abducted ~13 deg so the hand clears lateral thigh tissue. Forearm near neutral (pronation ~78 deg) so the palm faces inward toward the thigh and the thumb faces forward. Wrist in ~5 deg extension and ~6 deg ulnar deviation; passive tenodesis and gravity bring the fingers into the cascade (MCP 23–47, PIP 31–47, DIP 14–18), thumb lightly beside the index.',
    duration: 1,
    moments: [{ t: 0, label: 'Rest' }],
    build({ r, side }) {
      setArm(r, side, [3, 13, 10, 78, 5, 0, -6])
      r.root.updateMatrixWorld(true)
      applyAngles(r, side, relaxedAngles(5))
      const w = wristOf(r, side)
      return { props: [], focus: w.add(new Vector3(0, -0.07, 0.01)), span: 0.14 }
    },
  },
  {
    id: 'relaxed-thigh',
    name: 'Relaxed hand resting on thigh',
    group: 'rest',
    form: 'Seated upright on a chair with both feet flat on the floor. The upper arm rests beside the torso (~16 deg flexion), elbow flexed ~62 deg, forearm pronated (~138 deg) so the ulnar palm rests gently on top of the distal-mid anterior thigh (72 mm soft-tissue radius above the femur). The wrist rests slightly extended (~8 deg) and the fingers drape softly over the curved thigh surface without gripping or penetrating.',
    duration: 1,
    moments: [{ t: 0, label: 'Rest' }],
    build({ r, side }) {
      const seat = sitInChair(r)
      const j = limb(side)
      const hip = r.bones[j.thigh].getWorldPosition(V())
      const knee = r.bones[j.shin].getWorldPosition(V())
      const femurAxis = knee.clone().sub(hip).normalize()
      // Soft-tissue thigh radius tapers from ~78 mm mid-thigh to ~66 mm near the knee.
      const thighR = 0.068
      const restAt = hip
        .clone()
        .lerp(knee, 0.56)
        .add(V(0, thighR + 0.012, 0))
      const thighSurface = cylinder(hip, femurAxis, thighR)

      // Palm rests along the upper slope of the thigh, fingers pointing gently forward along the thigh.
      placeHand(
        r,
        side,
        restAt.clone().add(V(side * 0.008, 0.036, -0.028)),
        femurAxis
          .clone()
          .add(V(side * 0.04, 0.14, 0.25))
          .normalize(),
        V(-side * 0.15, -1, 0),
        V(side * 0.35, 0.55, -0.25),
      )
      r.root.updateMatrixWorld(true)

      const a = relaxedAngles(6)
      a.mcp = [4, 6, 8, 10]
      a.pip = [10, 12, 16, 18]
      a.dip = [4, 6, 8, 8]
      applyAngles(r, side, a)
      // Drape gently onto the thigh tissue cylinder without pushing fingertips through it.
      closeFingers(r, side, a, thighSurface, {
        press: 0.0,
        limit: { mcp: 45, pip: 55, dip: 35 },
        touch: 'pads',
      })
      const idx = fingerCapsules(r, side, 'Index')[0]
      placeThumb(r, side, a, {
        point: idx.a
          .clone()
          .lerp(idx.b, 0.45)
          .add(V(side * 0.018, 0.006, 0)),
        avoid: thighSurface,
        prefer: [10, 14, 4, 12, 12],
      })

      const palm = r.bones[j.hand].localToWorld(palmPad(side))
      const gaps = (['Index', 'Middle', 'Ring', 'Little'] as const).map((d) =>
        Math.round(
          Math.min(...fingerCapsules(r, side, d).map((c) => clearance(c, thighSurface))) * 1000,
        ),
      )
      return {
        props: [
          seat,
          {
            kind: 'cylinder',
            name: 'thigh-envelope',
            centre: hip.clone().lerp(knee, 0.5),
            axis: femurAxis,
            radius: thighR,
            length: hip.distanceTo(knee) * 0.88,
            color: '#5a4e46',
          },
        ],
        focus: palm.clone().add(V(0, -0.01, 0.02)),
        span: 0.15,
        notes: handNotes(r, side, {
          thighGapMm: gaps.join(','),
        }),
      }
    },
  },
]
