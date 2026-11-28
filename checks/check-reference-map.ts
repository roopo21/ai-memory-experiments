/**
 * Which reference movement each guide is held against. Guides not listed here get the generic
 * checks only (speed, acceleration and jerk against all reference movement). The reasoning, and
 * the joint and axis conventions, are in docs/reference/motion-reference/README.md.
 *
 * `same`     the guide is that movement, so joint extremes, coupling, timing and foot contact are
 *            compared with it.
 * `similar`  the same joints in a related posture or as a passive stretch. Joint extremes get a
 *            passive allowance (TOL.passive) and coupling is compared; timing and contact are not.
 */
export type Mapping = {
  /** Reference movements in docs/reference/motion-reference/data/envelopes.json. */
  families: string[]
  relation: 'same' | 'similar'
  /** Joints to compare (reference names); default is every joint the families report. */
  joints?: string[]
  /** Compare joint coupling too. Always done for `same`; opt in for `similar` where the motion is alike. */
  coupling?: boolean
  note: string
}

const SQUAT = ['ui-prmd/deep-squat', 'addbiomechanics/squat']
const LUNGE = ['ui-prmd/inline-lunge']
const LEG_RAISE = ['ui-prmd/standing-leg-raise']
const HIP_FLEX = ['ui-prmd/deep-squat', 'ui-prmd/hurdle-step', 'ui-prmd/sit-to-stand']
const ARM_UP = ['ui-prmd/shoulder-abduction', 'ui-prmd/shoulder-scaption']

const similar = (families: string[], joints: string[], note: string): Mapping => ({
  families,
  relation: 'similar',
  joints,
  note,
})

export const GUIDE_REFERENCE: Record<string, Mapping> = {
  // Loaded or free movements that are the reference movement itself.
  'deep-squat-hold': {
    families: SQUAT,
    relation: 'same',
    note: 'Bodyweight deep squat; UI-PRMD deep squat and AddBiomechanics squats.',
  },
  'side-lunge': {
    families: ['ui-prmd/side-lunge'],
    relation: 'same',
    note: 'Side lunge; one working leg, trunk leans forward.',
  },
  'standing-lunge-hip-flexor': {
    families: LUNGE,
    relation: 'similar',
    joints: ['hip.flexion', 'knee.flexion', 'ankle.plantarflexion', 'pelvis.tilt'],
    coupling: true,
    note: 'Split stance as in the inline lunge, held with the back hip extended further than a lunge goes.',
  },
  'leg-swings-front': {
    families: [...LEG_RAISE, 'addbiomechanics/walk'],
    relation: 'same',
    joints: ['hip.flexion', 'knee.flexion'],
    note: 'Active straight leg raise forward and back; gait supplies the hip extension.',
  },

  // Same joints, related posture or passive end range.
  'cossack-squat': similar(
    ['ui-prmd/side-lunge', ...SQUAT],
    ['hip.flexion', 'hip.abduction', 'knee.flexion', 'ankle.plantarflexion'],
    'Deeper than any side lunge in the reference; held against both lunge and squat.',
  ),
  'leg-swings-side': similar(['ui-prmd/side-lunge'], ['hip.abduction'], 'Hip abduction only.'),
  'hip-circles': similar([...LEG_RAISE, 'addbiomechanics/walk'], ['hip.flexion'], 'Hip flexion.'),
  'knee-to-wall': similar(
    LUNGE,
    ['ankle.plantarflexion', 'knee.flexion'],
    'Ankle dorsiflexion in a lunge.',
  ),
  'heel-cord': similar(LUNGE, ['ankle.plantarflexion'], 'Ankle dorsiflexion in a lunge.'),
  'heel-cord-bent-knee': similar(
    LUNGE,
    ['ankle.plantarflexion', 'knee.flexion'],
    'Ankle in a lunge.',
  ),
  'supine-hamstring': similar(
    LEG_RAISE,
    ['hip.flexion'],
    'Hip flexion; the knee starts bent in the set-up',
  ),
  'doorway-hamstring': similar(
    LEG_RAISE,
    ['hip.flexion'],
    'Hip flexion; the knee starts bent in the set-up',
  ),
  'standing-hamstring-step': similar(
    LEG_RAISE,
    ['hip.flexion'],
    'Hip flexion; the knee starts bent in the set-up',
  ),
  'chair-hamstring': similar(
    LEG_RAISE,
    ['hip.flexion'],
    'Hip flexion; the knee starts bent in the set-up',
  ),
  'single-leg-seated-hamstring': similar(
    LEG_RAISE,
    ['hip.flexion'],
    'Hip flexion; the knee starts bent in the set-up',
  ),
  'active-knee-extension': similar(
    LEG_RAISE,
    ['hip.flexion'],
    'Hip flexion; the knee starts bent in the set-up',
  ),
  'knee-to-chest': similar(HIP_FLEX, ['hip.flexion'], 'Hip flexion to the chest.'),
  'double-knee-to-chest': similar(HIP_FLEX, ['hip.flexion'], 'Hip flexion to the chest.'),
  'happy-baby': similar(HIP_FLEX, ['hip.flexion'], 'Hip flexion to the chest.'),
  'knee-to-opposite-shoulder': similar(HIP_FLEX, ['hip.flexion'], 'Hip flexion to the chest.'),
  'standing-quad': similar(['ui-prmd/hurdle-step', ...SQUAT], ['knee.flexion'], 'Knee flexion.'),
  'side-lying-quad': similar(['ui-prmd/hurdle-step', ...SQUAT], ['knee.flexion'], 'Knee flexion.'),
  'prone-quad-strap': similar(['ui-prmd/hurdle-step', ...SQUAT], ['knee.flexion'], 'Knee flexion.'),
  'standing-forward-fold': similar(HIP_FLEX, ['hip.flexion'], 'Hip flexion in a bend.'),
  'wide-leg-forward-fold': similar(HIP_FLEX, ['hip.flexion'], 'Hip flexion in a bend.'),
  'seated-forward-fold': similar(HIP_FLEX, ['hip.flexion'], 'Hip flexion in a bend.'),
  'seated-forward-fold-chair': similar(HIP_FLEX, ['hip.flexion'], 'Hip flexion in a bend.'),
  frog: similar(SQUAT, ['hip.flexion', 'knee.flexion'], 'Deep hip and knee flexion.'),
  'arm-circles': similar(ARM_UP, ['shoulder.elevation'], 'Shoulder elevation.'),
  'wall-angels': similar(ARM_UP, ['shoulder.elevation'], 'Shoulder elevation.'),
  'supine-overhead-stick': similar(ARM_UP, ['shoulder.elevation'], 'Shoulder elevation.'),
  'overhead-side-bend': similar(ARM_UP, ['shoulder.elevation'], 'Shoulder elevation.'),
  'overhead-triceps': similar(ARM_UP, ['shoulder.elevation'], 'Shoulder elevation.'),
  'full-body-reach': similar(ARM_UP, ['shoulder.elevation'], 'Shoulder elevation.'),
  pendulum: similar(
    ['ui-prmd/shoulder-extension', 'ui-prmd/shoulder-scaption'],
    ['shoulder.elevation'],
    'Hanging arm swings; small elevation.',
  ),
}
