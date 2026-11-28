import { Quaternion } from 'three'
import { armFrame, limb, setArm, setLeg, turn } from '../../motion/anatomy'
import {
  applyAngles,
  clearance,
  closeFingers,
  DIGITS,
  fingerCapsules,
  placeThumb,
  sphere,
  thumbCapsules,
  type HandAngles,
} from '../../motion/hands/fit'
import { palmNormal, palmPoint } from '../../motion/hands/shapes'
import type { Gesture } from '../types'
import { clamp01, ease, handNotes, lerp, placeHand, V } from './kit'

const BBALL_R = 0.12 // Size-7 basketball radius (24 cm diameter)
const CRICKET_R = 0.036 // Standard cricket ball radius (7.2 cm diameter)

export const sports: Gesture[] = [
  {
    id: 'basketball-dribble',
    name: 'Basketball dribble',
    group: 'sport',
    form:
      'Athletic dribble stance (hips flexed ~24 deg, knees bent ~34 deg, trunk leaned ~16 deg forward, feet flat on floor) with one-hand dribble cycle (0.85 s): (1) Cup at t=0 s with ball at y=0.68 m, wrist extended ~18 deg, fingers spread wide and arched over the upper hemisphere so distal pads contact the ball cleanly without palm slap; (2) Push/release at t=0.22 s as elbow extends (~90->34 deg) and wrist flexes downward (~-28 deg) pushing the ball to y=0.50 m; (3) Floor bounce at t=0.45 s where ball bottom touches y=0 (centre y=0.12 m) while hand follows through softly; (4) Rise/catch at t=0.70 s as ball rebounds under gravity back into cushioned fingertips.',
    duration: 0.85,
    moments: [
      { t: 0.0, label: 'Cup' },
      { t: 0.22, label: 'Push' },
      { t: 0.45, label: 'Bounce' },
      { t: 0.7, label: 'Catch' },
    ],
    build({ r, side, t }) {
      // Athletic dribble stance so shoulder sits near y=1.15 m and feet remain planted on y=0.
      r.root.position.set(0, 0.78, -0.04)
      r.bones[0].quaternion.copy(turn(V(1, 0, 0), 16))
      setLeg(r, 1, [34, 8, 38, 0, 0, 0])
      setLeg(r, -1, [34, 8, 38, 0, 0, 0])
      r.root.updateMatrixWorld(true)

      const ballX = side * 0.25
      const ballZ = 0.36
      // Parabolic gravity + bounce trajectory between release (t=0.22, y=0.52) and catch (t=0.70, y=0.64).
      let ballY: number
      let wristY: number
      let wristFlexPitch: number // positive = fingers pitch downward (wrist flexion)
      let fingerClose = 1
      if (t < 0.22) {
        const u = ease(t / 0.22)
        ballY = lerp(0.68, 0.52, u)
        wristY = ballY + BBALL_R + 0.052 - 0.006 * u
        wristFlexPitch = lerp(-0.1, 0.38, u)
      } else if (t < 0.45) {
        const u = (t - 0.22) / (0.45 - 0.22)
        const s = 0.28 * u + 0.72 * u * u
        ballY = lerp(0.52, BBALL_R, s)
        wristY = lerp(0.52 + BBALL_R + 0.046, 0.62, ease(u))
        wristFlexPitch = lerp(0.38, 0.45, ease(u))
        fingerClose = 1 - ease(u)
      } else if (t < 0.7) {
        const u = (t - 0.45) / (0.7 - 0.45)
        const s = 1 - (1 - u) * (1 - u)
        ballY = lerp(BBALL_R, 0.64, s)
        wristY = lerp(0.62, 0.64 + BBALL_R + 0.052, ease(u))
        wristFlexPitch = lerp(0.45, -0.1, ease(u))
        fingerClose = ease(Math.max(0, (u - 0.45) / 0.55))
      } else {
        const u = ease((t - 0.7) / 0.15)
        ballY = lerp(0.64, 0.68, u)
        wristY = ballY + BBALL_R + 0.052
        wristFlexPitch = -0.1
        fingerClose = 1
      }

      const ballCentre = V(ballX, ballY, ballZ)
      const ballSurface = sphere(ballCentre, BBALL_R)

      // Palm faces down-and-back as the wrist flexes through release; fingers pitch downward (+wristFlexPitch -> -y).
      const fingerDir = V(side * 0.06, -wristFlexPitch, 1).normalize()
      const normalDir = V(0, -1, -wristFlexPitch * 0.45).normalize()
      placeHand(
        r,
        side,
        V(ballX, wristY, ballZ - 0.055),
        fingerDir,
        normalDir,
        V(side * 0.48, 0.85, -0.05),
      )
      r.root.updateMatrixWorld(true)

      // Start fingers slightly open so `closeFingers` settles cleanly onto the upper hemisphere
      // without burying the pads inside the sphere.
      const a: HandAngles = {
        mcp: [-4, -2, 0, 4],
        pip: [6, 8, 10, 12],
        dip: [4, 5, 6, 6],
        fan: [11, 3, -5, -13],
        thumb: [8, 34, 14, 14, 16],
      }
      applyAngles(r, side, a)

      if (fingerClose > 0.25) {
        closeFingers(r, side, a, ballSurface, {
          press: 0.0005,
          limit: { mcp: 48, pip: 64, dip: 45 },
          coupling: 0.66,
        })
        const radialPoint = ballCentre
          .clone()
          .add(V(side * 0.05, BBALL_R * 0.88, -0.03).normalize().multiplyScalar(BBALL_R))
        placeThumb(r, side, a, {
          point: radialPoint,
          facing: radialPoint.clone().sub(ballCentre).normalize(),
          avoid: ballSurface,
          pad: 1,
          along: 0.65,
          prefer: [10, 34, 16, 16, 18],
        })
      }

      const gaps = DIGITS.map(
        (d) => +(Math.min(...fingerCapsules(r, side, d).map((c) => clearance(c, ballSurface))) * 1000).toFixed(1),
      )
      const ballSpin = new Quaternion().setFromAxisAngle(V(1, 0, 0), t * 6)
      return {
        props: [
          {
            kind: 'ball',
            name: 'basketball',
            centre: ballCentre,
            radius: BBALL_R,
            look: 'basketball',
            quaternion: ballSpin,
          },
        ],
        focus: t >= 0.36 && t <= 0.54 ? V(ballX, 0.28, ballZ) : ballCentre.clone().add(V(0, 0.04, 0)),
        span: t >= 0.36 && t <= 0.54 ? 0.38 : 0.22,
        notes: handNotes(r, side, {
          ballBottomMm: +((ballY - BBALL_R) * 1000).toFixed(1),
          padGapsMm: gaps.join(','),
        }),
      }
    },
  },
  {
    id: 'off-spin-bowling',
    name: 'Off-spin cricket delivery grip & release',
    group: 'sport',
    form:
      'Working-arm off-spin delivery (0.80 s): (1) Seam grip at t=0 s — index and middle fingers spread wide across the vertical equatorial seam (index on off-side, middle beside it, ring & little tucked lightly beneath the ball, thumb resting lightly on the opposite seam side); (2) Cocked delivery load at t=0.24 s — arm at high three-quarter slot (~145 deg elevation, ~32 deg out clear of head), wrist cocked radially/slightly extended behind the seam; (3) Rip & release at t=0.48 s — forearm pronates through vertical while the index finger rips across/over the top-side of the seam, imparting vigorous spin as the ball leaves the pads; (4) Follow-through at t=0.75 s — arm swings down across the torso as the spinning ball flies forward.',
    duration: 0.8,
    moments: [
      { t: 0.0, label: 'Grip' },
      { t: 0.24, label: 'Load' },
      { t: 0.48, label: 'Release' },
      { t: 0.75, label: 'Follow' },
    ],
    build({ r, side, t }) {
      const releaseT = 0.48
      let arm: [number, number, number, number, number, number, number]
      if (t < 0.24) {
        const u = ease(t / 0.24)
        arm = [
          lerp(54, 140, u),
          lerp(24, 32, u),
          lerp(76, 22, u),
          lerp(26, 36, u),
          lerp(18, 28, u),
          lerp(22, 40, u),
          lerp(10, 14, u),
        ]
      } else if (t < releaseT) {
        const u = ease((t - 0.24) / (releaseT - 0.24))
        arm = [
          lerp(140, 118, u),
          lerp(32, 30, u),
          lerp(22, 12, u),
          lerp(36, 98, u),
          lerp(28, 4, u),
          lerp(40, 12, u),
          lerp(14, -12, u),
        ]
      } else {
        const u = ease((t - releaseT) / (0.8 - releaseT))
        arm = [
          lerp(118, 30, u),
          lerp(30, -8, u),
          lerp(12, 38, u),
          lerp(98, 148, u),
          lerp(4, -18, u),
          lerp(12, -26, u),
          lerp(-12, -18, u),
        ]
      }
      setArm(r, side, arm)
      r.root.updateMatrixWorld(true)

      const hand = r.bones[limb(side).hand]
      const hq = hand.getWorldQuaternion(new Quaternion())
      const n = palmNormal(r, side)
      const p0 = palmPoint(r, side)
      const f = armFrame(side)
      const along = f.handLong.clone().applyQuaternion(hq)
      const radial = f.radial.clone().applyQuaternion(hq)

      // Ball cradled in the distal palm/finger cup (radius + 14 mm offset so fingers wrap cleanly
      // without burying into the ball), then leaves fingertips spinning forward (+z) after releaseT.
      const heldCentre = p0
        .clone()
        .addScaledVector(n, CRICKET_R + 0.014)
        .addScaledVector(along, 0.036)
      const ballCentre =
        t <= releaseT
          ? heldCentre
          : heldCentre
              .clone()
              .add(
                V(
                  -side * 0.04 * (t - releaseT),
                  -0.35 * (t - releaseT) ** 2 + 0.08 * (t - releaseT),
                  1.45 * (t - releaseT),
                ),
              )

      const baseSeam = hq.clone().multiply(new Quaternion().setFromAxisAngle(V(0, 0, 1), Math.PI / 2))
      const spinAngle =
        t <= 0.24
          ? 0
          : t <= releaseT
            ? ease((t - 0.24) / (releaseT - 0.24)) * 1.1
            : 1.1 + (t - releaseT) * 28
      const ballQ = baseSeam.clone().premultiply(
        new Quaternion().setFromAxisAngle(
          V(side * 0.55, 0.3, 0.78).normalize(),
          -side * spinAngle,
        ),
      )

      const rip = t < 0.24 ? 0 : t <= releaseT ? ease((t - 0.24) / (releaseT - 0.24)) : 1
      const follow = t <= releaseT ? 0 : ease(clamp01((t - releaseT) / 0.18))
      const a: HandAngles = {
        mcp: [
          lerp(12, 24, rip) - 10 * follow,
          lerp(14, 18, rip) - 10 * follow,
          lerp(42, 48, rip) - 20 * follow,
          lerp(48, 54, rip) - 20 * follow,
        ],
        pip: [
          lerp(18, 34, rip) - 16 * follow,
          lerp(20, 26, rip) - 14 * follow,
          lerp(60, 64, rip) - 26 * follow,
          lerp(66, 70, rip) - 26 * follow,
        ],
        dip: [
          lerp(12, 22, rip) - 10 * follow,
          lerp(14, 18, rip) - 10 * follow,
          lerp(36, 40, rip) - 16 * follow,
          lerp(40, 44, rip) - 16 * follow,
        ],
        // Spread index radially (+12) and middle slightly ulnarly (-4) across the seam.
        fan: [12 - 4 * rip, -4, -6, -10],
        thumb: [16, 26, 16, 16, 16],
      }
      applyAngles(r, side, a)

      if (t <= releaseT) {
        const ballSurface = sphere(ballCentre, CRICKET_R)
        closeFingers(r, side, a, ballSurface, {
          press: 0.0005,
          limit: { mcp: 75, pip: 88, dip: 60 },
          coupling: 0.66,
        })
        const thumbTarget = ballCentre
          .clone()
          .addScaledVector(radial, CRICKET_R * 0.96)
          .addScaledVector(along, -CRICKET_R * 0.25)
        placeThumb(r, side, a, {
          point: thumbTarget,
          facing: thumbTarget.clone().sub(ballCentre).normalize(),
          avoid: ballSurface,
          pad: 1,
          along: 0.65,
          prefer: [16, 28, 16, 16, 16],
        })
      }

      const gaps = DIGITS.slice(0, 2).map(
        (d) =>
          +(
            Math.min(
              ...fingerCapsules(r, side, d).map((c) => clearance(c, sphere(ballCentre, CRICKET_R))),
            ) * 1000
          ).toFixed(1),
      )
      const thumbGap = +(
        Math.min(...thumbCapsules(r, side).map((c) => clearance(c, sphere(ballCentre, CRICKET_R)))) *
        1000
      ).toFixed(1)

      return {
        props: [
          {
            kind: 'ball',
            name: 'cricket-ball',
            centre: ballCentre,
            radius: CRICKET_R,
            look: 'cricket',
            quaternion: ballQ,
          },
        ],
        focus: t <= releaseT ? ballCentre : heldCentre.clone().lerp(ballCentre, 0.45),
        span: t <= releaseT ? 0.11 : 0.2,
        notes: handNotes(r, side, {
          idxMidGapMm: gaps.join(','),
          thumbGapMm: thumbGap,
        }),
      }
    },
  },
]
