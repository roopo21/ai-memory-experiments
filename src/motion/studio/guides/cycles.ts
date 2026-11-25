import type { MovementRig } from '../../movementRig'
import { indexOfJoint, type Joint } from '../../joints'
import { scores, type AuthoredId } from '../../../studio/choreography'
const rad = Math.PI / 180
// Each character indexes a point of a 3 × 3 tracing grid, from upper left to lower right.
const glyphs = [
  '612845',
  '60325876',
  '2068',
  '60125876',
  '2068654',
  '602045',
  '2068754',
  '0634582',
  '0121786',
  '25876',
  '062438',
  '068',
  '60428',
  '6082',
  '02680',
  '602540',
  '0268048',
  '6025438',
  '2034586',
  '01217',
  '06782',
  '072',
  '067482',
  '08426',
  '04742',
  '0268',
]
export function cycleAt(r: MovementRig, id: AuthoredId, t: number) {
  const row = scores[id],
    end = row.frames.at(-1)!.time,
    f = t / end
  if (t <= 0 || t >= end) return
  const envelope = Math.sin(Math.PI * f),
    phase = 2 * Math.PI * f,
    wave = Math.sin(phase * 2) * envelope,
    arc = Math.sin(phase * 2) ** 2 * envelope
  const rotate = (j: Joint, x = 0, y = 0, z = 0) => {
    const b = r.bones[indexOfJoint[j]]
    b.rotateX(x * rad)
    b.rotateY(y * rad)
    b.rotateZ(z * rad)
  }
  switch (row.cycle) {
    case 'alphabet': {
      const index = Math.min(25, Math.floor(t / 1.25))
      if (t >= 26 * 1.25) return
      const path = '4' + glyphs[index] + '4',
        at = ((t - index * 1.25) / 1.25) * (path.length - 1),
        n = Math.min(path.length - 2, Math.floor(at))
      const a = Number(path[n]),
        b = Number(path[n + 1]),
        u = at - n
      rotate(
        'leftFoot',
        ((Math.floor(a / 3) - 1) * (1 - u) + (Math.floor(b / 3) - 1) * u) * 12,
        (((a % 3) - 1) * (1 - u) + ((b % 3) - 1) * u) * 10,
      )
      break
    }
    case 'walk':
      for (const [n, name] of ['Index', 'Middle', 'Ring'].entries())
        rotate(('left' + name + '1') as Joint, -12 * envelope * (1 + Math.sin(phase * 5 + n * 2)))
      break
    case 'wristCircles':
      for (const s of ['left', 'right'] as const)
        rotate(
          (s + 'Hand') as Joint,
          14 * wave,
          0,
          (s === 'left' ? 1 : -1) * 18 * arc * (f < 0.5 ? 1 : -1),
        )
      break
    case 'pendulum':
      rotate('leftArm', 10 * wave, 0, 10 * arc)
      break
    case 'armCircles':
      for (const s of ['left', 'right'] as const)
        rotate((s + 'Arm') as Joint, 8 * wave, 0, (s === 'left' ? 1 : -1) * 11 * arc)
      break
    case 'headRolls':
      rotate('neck', 9 * arc, 4 * wave)
      break
    case 'shoulderRolls':
      for (const s of ['left', 'right'] as const)
        rotate((s + 'Shoulder') as Joint, 0, (s === 'left' ? 1 : -1) * 8 * wave)
      break
    case 'ulnarCircle':
      if (f > 0.46)
        rotate(
          'leftArm',
          13 * Math.sin((Math.PI * (f - 0.46)) / 0.54) * Math.sin(phase * 3),
          0,
          5 * arc,
        )
      break
  }
  const breath = row.frames.find((fr) => fr.pose.breath)?.pose.breath
  if (breath) {
    rotate('chest', -2.6 * breath * Math.sin(Math.PI * f) ** 2)
    rotate('leftShoulder', 0, 0, 2 * breath * envelope)
    rotate('rightShoulder', 0, 0, -2 * breath * envelope)
  }
}
