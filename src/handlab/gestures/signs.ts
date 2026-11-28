import type { Vector3 } from 'three'
import { setArm } from '../../motion/anatomy'
import { limb, measure, type Side } from '../../motion/anatomy'
import { fist, okSign, padGap, pinch, pointing, tipToPalm } from '../../motion/hands/shapes'
import { palmPad } from '../../motion/studio/anchors'
import type { MovementRig } from '../../motion/movementRig'
import type { Built, Gesture } from '../types'
import { placeHand, V } from './kit'

/** Forearm raised in front of the chest, the pose most gestures are made in. */
function raised(
  r: MovementRig,
  s: Side,
  o: { wrist?: Vector3; fingers: Vector3; normal: Vector3; pole?: Vector3 },
) {
  placeHand(
    r,
    s,
    o.wrist ?? V(s * 0.17, 1.13, 0.4),
    o.fingers,
    o.normal,
    o.pole ?? V(s * 0.55, 0.7, 0.05),
  )
  r.root.updateMatrixWorld(true)
}
function framed(r: MovementRig, s: Side, span = 0.095, extra: Record<string, number> = {}): Built {
  const c = r.bones[limb(s).hand].localToWorld(palmPad(s).add(V(0.0, 0, 0)))
  const a = measure(r)
  const k = s === 1 ? 'L.' : 'R.'
  return {
    props: [],
    focus: c,
    span,
    notes: {
      wristExt: +a[k + 'wrist.extension'].toFixed(1),
      wristRad: +a[k + 'wrist.radial'].toFixed(1),
      pron: +a[k + 'forearm.pronation'].toFixed(1),
      elbow: +a[k + 'elbow.flexion'].toFixed(1),
      ...extra,
    },
  }
}
const sign = (
  id: string,
  name: string,
  form: string,
  place: (r: MovementRig, s: Side) => void,
  extra?: (r: MovementRig, s: Side) => Record<string, number>,
): Gesture => ({
  id,
  name,
  group: 'gesture',
  form,
  duration: 1,
  moments: [{ t: 0, label: 'Hold' }],
  build({ r, side }) {
    place(r, side)
    return framed(r, side, 0.095, extra?.(r, side))
  },
})

export const signs: Gesture[] = [
  sign(
    'fist',
    'Fist',
    'All four fingers fold onto the palm in the cascade: MCP 80 to 92, PIP 100 to 105, DIP about 60, the little finger most. The fingertips press the palm and the thumb lies across the middle phalanges of the index and middle fingers. Wrist about 15 extension and slight ulnar deviation so the flexors can grip; forearm neutral.',
    (r, s) => {
      raised(r, s, { fingers: V(0, 0.1, 1), normal: V(-s, 0.1, 0) })
      fist(r, s, 'across')
    },
    (r, s) => ({ tipToPalmMm: Math.round(Math.max(...tipToPalm(r, s)) * 1000) }),
  ),
  sign(
    'thumbs-up',
    'Thumbs up',
    'A closed fist with the thumb standing straight out radially (CMC extended radially ~42 deg, MCP & IP ~3 deg), pointing up. Forearm in neutral so the radial edge faces up, wrist slightly extended (~18 deg) and near neutral deviation.',
    (r, s) => {
      raised(r, s, { fingers: V(0, 0.02, 1), normal: V(-s, 0, 0) })
      fist(r, s, 'up')
    },
  ),
  sign(
    'thumbs-down',
    'Thumbs down',
    'The same closed fist with the thumb extended radially, but the forearm is fully pronated (~165 deg) and the humerus rotated inward (~-85 deg) so the thumb points straight down under gravity without exceeding wrist limits. The fist stays tight.',
    (r, s) => {
      // Forearm pronated and humerus turned inward so the radial side points down.
      setArm(r, s, [50, 42, 62, 165, 5, -85, -5])
      r.root.updateMatrixWorld(true)
      fist(r, s, 'down')
    },
  ),
  sign(
    'pointing',
    'Pointing',
    'The index finger is straight (MCP 4, PIP 2, DIP 1) and aims forward; the other three fingers curl into the palm in the cascade; the thumb wraps across the middle phalanges of the middle finger. Wrist slightly extended (~20 deg) so the index aligns cleanly.',
    (r, s) => {
      raised(r, s, { fingers: V(0, 0.05, 1), normal: V(-s, 0.1, 0) })
      pointing(r, s)
    },
  ),
  sign(
    'ok-sign',
    'OK sign',
    'The thumb pad meets the index pad (both thumb MCP ~16, IP ~22 and index MCP ~40, PIP ~55, DIP ~30 curved into a round O-ring); the middle, ring and little fingers extend gently and fan out with a mild cascade. Forearm supinated (~22 deg) so the palm faces forward cleanly.',
    (r, s) => {
      setArm(r, s, [32, 8, 98, 22, 12, 18, 0])
      r.root.updateMatrixWorld(true)
      okSign(r, s)
    },
    (r, s) => ({ padGapMm: +(padGap(r, s) * 1000).toFixed(1) }),
  ),
  sign(
    'pinch',
    'Pinch',
    'Pad to pad precision pinch: index and thumb pads face each other and meet; the other fingers curl loosely in the cascade out of the way. The wrist is neutral to slightly extended.',
    (r, s) => {
      raised(r, s, { fingers: V(0, 0.1, 1), normal: V(-s, -0.2, 0.2) })
      pinch(r, s)
    },
    (r, s) => ({ padGapMm: +(padGap(r, s) * 1000).toFixed(1) }),
  ),
]
