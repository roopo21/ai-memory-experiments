/**
 * Hand joint ranges, couplings, arches and tenodesis, grounded in hand anatomy.
 * Degrees; flexion is positive. Sources are cited in `.claude/skills/hand-lab/SKILL.md`.
 *
 * Three columns per joint, because "can the joint go there" and "would a person put it there" differ:
 *  - `active`: the range a person moves through unaided (AAOS goniometry norms).
 *  - `functional`: where the joint sits in everyday tasks (Hume et al. 1990: MCP 61, PIP 60, DIP 39;
 *    thumb MCP 21 and IP 18). A pose far outside this needs a reason.
 *  - `passive`: the end of range with an outside force; a stretch may use it, a gesture never.
 */
export type Range = readonly [lo: number, hi: number]
export interface JointRange {
  active: Range
  passive: Range
  functional: number
}
export const HAND_RANGES = {
  wristExtension: { active: [0, 70], passive: [-85, 88], functional: 30 },
  wristFlexion: { active: [0, 80], passive: [0, 88], functional: 5 },
  wristRadial: { active: [0, 20], passive: [0, 30], functional: 5 },
  wristUlnar: { active: [0, 30], passive: [0, 40], functional: 10 },
  fingerMcp: { active: [-10, 90], passive: [-45, 95], functional: 61 },
  fingerPip: { active: [0, 110], passive: [-8, 115], functional: 60 },
  fingerDip: { active: [0, 80], passive: [-15, 90], functional: 39 },
  /** Knuckle abduction each way from the middle finger's line; the middle finger itself ~ +-6. */
  fingerAbduction: { active: [-20, 20], passive: [-30, 30], functional: 8 },
  /**
   * Thumb CMC (trapeziometacarpal saddle joint):
   * - `thumbCmcFlex`: negative = radial extension/abduction in the palm plane; positive = ulnar flexion across palm.
   * - `thumbCmcAbduct`: palmar abduction (perpendicular out of palm plane), 0 to ~60 deg.
   * - `thumbCmcRotate`: axial pronation/opposition twist toward the finger pads.
   */
  thumbCmcFlex: { active: [-45, 45], passive: [-50, 50], functional: 18 },
  thumbCmcAbduct: { active: [-15, 60], passive: [-20, 65], functional: 28 },
  thumbCmcRotate: { active: [-45, 45], passive: [-50, 50], functional: 20 },
  thumbMcp: { active: [0, 55], passive: [-10, 65], functional: 21 },
  thumbIp: { active: [-5, 80], passive: [-25, 85], functional: 18 },
} as const satisfies Record<string, JointRange>

/**
 * DIP follows PIP: the oblique retinacular ligament (Landsmeer) ties the two, so a finger bent at
 * the PIP carries about two thirds of that at the DIP when no object stops it.
 */
export const DIP_PER_PIP = 0.66
export const coupledDip = (pip: number) => Math.max(0, pip * DIP_PER_PIP)

/**
 * The finger cascade: fingers close further the nearer they are to the little finger. Given an
 * index-finger flexion it returns index, middle, ring, little, as in a relaxed or a closing hand.
 * `gain` is the extra flexion per finger as a fraction of the index value (0.1 at rest to 0.12 in
 * a fist, where the little finger's MCP reaches ~95 while the index stops near 80).
 */
export const cascade = (index: number, gain = 0.1): [number, number, number, number] => [
  index,
  index * (1 + gain),
  index * (1 + 2 * gain),
  index * (1 + 3 * gain),
]

/**
 * Tenodesis: with the fingers and thumb free, extending the wrist passively flexes the fingers
 * (flexor tendons tighten across the carpus) and flexing the wrist extends/opens them.
 * Gain in degrees of passive finger flexion per degree of wrist extension.
 */
export const TENODESIS_PER_DEGREE = { mcp: 0.25, pip: 0.3, dip: 0.12 } as const

/** Apply passive tenodesis delta from a wrist extension angle (deg) onto base MCP/PIP/DIP arrays. */
export function applyTenodesis(
  wristExtensionDeg: number,
  base: {
    mcp: readonly [number, number, number, number]
    pip: readonly [number, number, number, number]
    dip: readonly [number, number, number, number]
  },
) {
  const clampDeg = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
  const shift = (
    arr: readonly [number, number, number, number],
    rate: number,
    lo: number,
    hi: number,
  ): [number, number, number, number] =>
    arr.map((v) => clampDeg(v + wristExtensionDeg * rate, lo, hi)) as [
      number,
      number,
      number,
      number,
    ]
  return {
    mcp: shift(base.mcp, TENODESIS_PER_DEGREE.mcp, 0, 75),
    pip: shift(base.pip, TENODESIS_PER_DEGREE.pip, 0, 85),
    dip: shift(base.dip, TENODESIS_PER_DEGREE.dip, 0, 60),
  }
}

/**
 * Arches of the hand (Kapandji; Neumann):
 * - Proximal transverse arch: carpal bones forming the carpal tunnel.
 * - Distal transverse arch: 2nd–5th metacarpal heads; 4th & 5th CMC mobility cups the ulnar palm.
 * - Longitudinal arch: carpometacarpal rays curving distally, aligning flexed fingertips toward the
 *   scaphoid tubercle (modeled in the rig's `distalJoints` bind frame and finger flexion axes).
 */
export const HAND_ARCH_CONVERGENCE_DEG = 5
