import { Quaternion } from 'three'
import { armFrame, handShape, limb } from '../../motion/anatomy'
import {
  anglesOf,
  applyAngles,
  clearance,
  closeFingers,
  cylinder,
  DIGITS,
  fingerCapsules,
  halfSpace,
  placeThumb,
  roundedBox,
  thumbCapsules,
  union,
  capsuleSurface,
} from '../../motion/hands/fit'
import { palmPoint } from '../../motion/hands/shapes'
import { gripPoint, palmPad, worldGrip } from '../../motion/studio/anchors'
import { onFloor } from '../../studio/choreography/types'
import type { Gesture } from '../types'
import { allFoursPose, handNotes, placeHand, sitInChair, V } from './kit'

export const grips: Gesture[] = [
  {
    id: 'palm-floor',
    name: 'Open palm flat on floor (weight-bearing)',
    group: 'grip',
    form:
      'All-fours tabletop weight-bearing posture: knees and shins rest on the floor, trunk near horizontal, shoulder positioned slightly behind the wrist so the forearm leans forward (~10 deg), keeping wrist extension ~78–83 deg within passive tolerance. The heel of the palm and all finger pads contact y = 0 cleanly with no hovering or sinking; fingers spread gently (~10 deg total); thumb stays level in the plane of the palm.',
    duration: 1,
    moments: [{ t: 0, label: 'Plant' }],
    build({ r, side }) {
      allFoursPose(r, 0.52)
      // Place palm flat on y = 0 ahead of the shoulder (z = 0.49) so the elbow is nearly straight
      // (~10-15 deg) and wrist radial deviation stays comfortable.
      const targetPalm = V(side * 0.17, 0.001, 0.49)
      const fingersDir = V(side * 0.15, 0, 1)
      placeHand(r, side, targetPalm, fingersDir, V(0, -1, 0), V(side * 0.22, 0.25, 0.15), true)
      const q = r.bones[limb(side).hand].getWorldQuaternion(new Quaternion())
      const wrist = targetPalm.clone().sub(palmPad(side).applyQuaternion(q))
      placeHand(r, side, wrist, fingersDir, V(0, -1, 0), V(side * 0.22, 0.25, 0.15), true)
      r.root.updateMatrixWorld(true)

      const a = anglesOf(handShape(onFloor))
      applyAngles(r, side, a)

      // Measure lowest skin point and palm height above floor y = 0.
      const floor = halfSpace(V(0, 0, 0), V(0, 1, 0))
      const minClearMm = Math.min(
        ...DIGITS.flatMap((d) => fingerCapsules(r, side, d).map((c) => clearance(c, floor))),
        ...thumbCapsules(r, side).map((c) => clearance(c, floor)),
      ) * 1000
      const palmYmm = palmPoint(r, side).y * 1000
      return {
        props: [],
        focus: targetPalm.clone().add(V(0, 0.015, 0.04)),
        span: 0.14,
        notes: handNotes(r, side, {
          palmYmm: +palmYmm.toFixed(1),
          minSkinYmm: +minClearMm.toFixed(1),
        }),
      }
    },
  },
  {
    id: 'band-grip',
    name: 'Power grip on a band handle',
    group: 'grip',
    form:
      'Power grip around a 12 mm radius cylindrical resistance-band handle held in front of the torso. The handle crosses the proximal palmar pads obliquely from the higher index knuckle to the lower little knuckle (`gripPoint`). All four fingers wrap cleanly round the shaft (MCP ~65–75, PIP ~88–98, DIP ~50–65 following PIP coupling) with 0–2 mm pad compression; the thumb opposes on the radial/wrist side across the index and middle middle phalanges.',
    duration: 1,
    moments: [{ t: 0, label: 'Grip' }],
    build({ r, side }) {
      const radius = 0.012
      const length = 0.13
      const handleCentre = V(side * 0.19, 1.08, 0.38)
      // Orient hand palm inward-upward so handle is nearly vertical/oblique in front of torso.
      placeHand(
        r,
        side,
        handleCentre,
        V(-side * 0.2, 0.15, 1),
        V(-side, 0.25, 0),
        V(side * 0.55, 0.7, 0.05),
      )
      // Re-center wrist so `worldGrip` lands on `handleCentre`.
      const q = r.bones[limb(side).hand].getWorldQuaternion(new Quaternion())
      const wrist = handleCentre.clone().sub(gripPoint(side).applyQuaternion(q))
      placeHand(
        r,
        side,
        wrist,
        V(-side * 0.2, 0.15, 1),
        V(-side, 0.25, 0),
        V(side * 0.55, 0.7, 0.05),
      )
      r.root.updateMatrixWorld(true)

      const center = worldGrip(r, side)
      const axis = worldGrip(r, side, 0.03).sub(center).normalize()
      const handleSurface = cylinder(center, axis, radius)

      const a = {
        mcp: [14, 16, 18, 20] as [number, number, number, number],
        pip: [16, 18, 20, 22] as [number, number, number, number],
        dip: [8, 10, 12, 12] as [number, number, number, number],
        fan: [2, 0, -2, -4] as [number, number, number, number],
        thumb: [30, 32, 24, 24, 22] as [number, number, number, number, number],
      }
      applyAngles(r, side, a)
      closeFingers(r, side, a, handleSurface, { press: 0.0005, coupling: 0.66 })

      // Thumb opposes on the wrist/radial side pressing toward the index/middle middle phalanx
      // while staying outside the handle cylinder.
      const i2 = fingerCapsules(r, side, 'Index')[1]
      const f = armFrame(side)
      const hq = r.bones[limb(side).hand].getWorldQuaternion(new Quaternion())
      const wristDir = f.handLong.clone().negate().applyQuaternion(hq)
      const goalPt = i2.a
        .clone()
        .lerp(i2.b, 0.55)
        .addScaledVector(i2.palmar.clone().negate(), i2.radius + 0.006)
        .addScaledVector(wristDir, 0.006)
      placeThumb(r, side, a, {
        point: goalPt,
        facing: i2.palmar.clone(),
        avoid: union(handleSurface, capsuleSurface(i2)),
        pad: 1,
        along: 0.6,
        prefer: [32, 28, 28, 30, 24],
        limits: [
          [12, 48],
          [10, 55],
          [5, 45],
          [10, 58],
          [10, 60],
        ],
      })

      const gaps = DIGITS.map(
        (d) => +(Math.min(...fingerCapsules(r, side, d).map((c) => clearance(c, handleSurface))) * 1000).toFixed(1),
      )
      return {
        props: [
          {
            kind: 'cylinder',
            name: 'band-handle',
            centre: center,
            axis,
            radius,
            length,
            color: '#2b7a78',
          },
        ],
        focus: center,
        span: 0.11,
        notes: handNotes(r, side, {
          gapsMm: gaps.join(','),
        }),
      }
    },
  },
  {
    id: 'chair-edge',
    name: 'Holding a chair edge',
    group: 'grip',
    form:
      'Seated upright on a chair with feet on the floor. The working arm reaches straight down beside the hip to grasp the lateral seat edge (18 mm thick rounded seat cushion, 9 mm edge radius). The palm heel rests against the outer/top edge while all four fingers hook underneath the rounded edge (MCP ~28–38, PIP ~85–95, DIP ~45–55) and the thumb rests on the top surface of the seat.',
    duration: 1,
    moments: [{ t: 0, label: 'Hold' }],
    build({ r, side }) {
      const seat = sitInChair(r)
      // Seat box: centre [0, 0.375, -0.17], size [0.43, 0.04, 0.38] -> top y=0.395, side x=side*0.215
      const edgeX = side * 0.215
      const seatTopY = 0.395
      const edgeZ = -0.14
      const seatSurface = roundedBox(V(0, 0.375, -0.17), [0.215, 0.02, 0.19], 0.009)

      // Hand outside the lateral seat edge: palm faces inward (-side, -0.15, 0), fingers point down
      // beside the cushion before hooking underneath.
      const wristTarget = V(edgeX + side * 0.036, seatTopY + 0.044, edgeZ)
      placeHand(
        r,
        side,
        wristTarget,
        V(-side * 0.08, -1, 0.05),
        V(-side, -0.15, 0),
        V(side * 0.25, 0.65, -0.4),
      )
      r.root.updateMatrixWorld(true)

      const a = {
        mcp: [0, 2, 4, 6] as [number, number, number, number],
        pip: [8, 10, 12, 14] as [number, number, number, number],
        dip: [4, 6, 8, 8] as [number, number, number, number],
        fan: [2, 0, -2, -4] as [number, number, number, number],
        thumb: [-10, 14, 4, 14, 12] as [number, number, number, number, number],
      }
      applyAngles(r, side, a)
      closeFingers(r, side, a, seatSurface, {
        press: 0.0005,
        limit: { mcp: 55, pip: 100, dip: 70 },
        coupling: 0.6,
      })

      // Thumb rests cleanly on top of the seat cushion near the edge.
      placeThumb(r, side, a, {
        point: V(edgeX - side * 0.015, seatTopY + 0.008, edgeZ + 0.035),
        facing: V(0, 1, 0),
        avoid: seatSurface,
        pad: 1,
        along: 0.6,
        prefer: [-8, 16, 6, 12, 12],
      })

      const gaps = DIGITS.map(
        (d) => +(Math.min(...fingerCapsules(r, side, d).map((c) => clearance(c, seatSurface))) * 1000).toFixed(1),
      )
      const thumbGap = +(
        Math.min(...thumbCapsules(r, side).map((c) => clearance(c, seatSurface))) * 1000
      ).toFixed(1)
      return {
        props: [seat],
        focus: V(edgeX, seatTopY - 0.01, edgeZ),
        span: 0.14,
        notes: handNotes(r, side, {
          gapsMm: gaps.join(','),
          thumbGapMm: thumbGap,
        }),
      }
    },
  },
]
