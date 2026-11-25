import {
  stretch as st,
  sequence as seq,
  both,
  hands,
  open,
  flat,
  fist,
  softFist,
  thumbInFist,
  hook,
  tabletop,
  straightFist,
  type Aim,
  type Recipe,
} from './types'
/**
 * Arm angles are anatomical: shoulder flexion, abduction, elbow flexion, pronation (0 palm
 * forward, 90 thumb up, about 165 palm down with the elbow bent), wrist extension (+) or flexion
 * (−), humeral external rotation, and radial (+) or ulnar (−) deviation.
 */
// The helping hand presses palm to palm across the working fingers, or over the back of the hand.
const palmToPalm: Aim = [[-0.99, -0.11, 0.12], [-0.09, -0.25, -0.97], 'Ahand']
const overTheBack: Aim = [[0.13, -0.96, 0.23], [0.09, 0.25, 0.97], 'Ahand']
export const armHand = {
  'overhead-triceps': st(
    'stand',
    { a: [160, 12, 135, 90, 0, 15], gb: 'Aelbow' },
    'Ease the elbow back and toward the midline',
    { a: [170, -4, 145, 90, 0, 22] },
  ),
  'wall-biceps': st(
    'stand',
    {
      ga: ['post', 0.03, 0.2, -0.42],
      // Palm flat on the wall behind, fingers pointing back.
      ha: [
        [0, 0, -1],
        [1, 0, 0],
      ],
      f: flat,
    },
    'Turn the chest away from the straight arm',
    { spine: [0, -26, 0], pelvis: [0, -7, 0] },
    { gear: ['sideWall'] },
  ),
  'wrist-flexor-stretch': st(
    'stand',
    // Stop sign: arm forward, palm away, fingers up; the other palm eases the fingers back.
    { a: [85, 2, 8, 155, 62, -10], f: open, gb: 'Afingers', hb: palmToPalm },
    'Draw the straight fingers back',
    { a: [85, 2, 8, 155, 76, -10], f: [-22, 0, 0, 4, 0, 10] },
    hands,
  ),
  'wrist-extensor-stretch': st(
    'stand',
    // Arm forward, palm down, wrist dropped; the other palm eases the back of the hand in.
    { a: [85, 2, 8, 160, -55, -5], gb: 'Aback', hb: overTheBack },
    'Draw the back of the hand toward the body',
    { a: [85, 2, 8, 160, -76, -5], f: [20, 24, 12] },
    hands,
  ),
  'prayer-stretch': st(
    'stand',
    {
      a: [20, 35, 110, 90, 60],
      b: [20, 35, 110, 90, 60],
      ga: ['prayer', -0.012, 0, 0],
      gb: ['prayer', 0.012, 0, 0],
      ha: [
        [0, 1, 0.12],
        [-1, 0, 0],
      ],
      hb: [
        [0, 1, 0.12],
        [1, 0, 0],
      ],
      f: open,
      g: open,
    },
    'Lower the joined palms toward the waist',
    { ga: ['prayer', -0.012, -0.14, -0.02], gb: ['prayer', 0.012, -0.14, -0.02] },
    { ...both, ...hands },
  ),
  'reverse-prayer': st(
    'stand',
    {
      a: [15, 40, 100, 100, -60],
      b: [15, 40, 100, 100, -60],
      ga: ['prayer', 0, -0.03, 0],
      gb: ['prayer', 0, -0.03, 0],
      // Backs of the hands together, fingers pointing down.
      ha: [[0, -1, 0.15], [1, 0, 0], 'world', 'back'],
      hb: [[0, -1, 0.15], [-1, 0, 0], 'world', 'back'],
      f: open,
      g: open,
    },
    'Lift the joined backs of the hands',
    { ga: ['prayer', 0, 0.05, 0], gb: ['prayer', 0, 0.05, 0] },
    { ...both, ...hands },
  ),
  'all-fours-wrist-flexor': st(
    'allFours',
    {
      ga: 'floor',
      gb: 'floor',
      // Fingers turned back toward the knees, palms flat, elbows straight.
      ha: [
        [-0.1, 0, -1],
        [0, -1, 0],
      ],
      hb: [
        [0.1, 0, -1],
        [0, -1, 0],
      ],
      f: flat,
      g: flat,
    },
    'Sit the hips back over the planted palms',
    { shift: [0, -0.02, -0.1], leg: [102, 4, 108], other: [102, 4, 108] },
    both,
  ),
  'all-fours-wrist-extensor': st(
    'allFours',
    {
      // Backs of the hands on the floor, fingers toward the knees. The extensor tendons stand a
      // finger's width proud of the bones, so the contact sits that far above the floor.
      ga: ['floor', 0, 0.012, 0],
      gb: ['floor', 0, 0.012, 0],
      ha: [[-0.1, 0, -1], [0, 1, 0], 'world', 'back'],
      hb: [[0.1, 0, -1], [0, 1, 0], 'world', 'back'],
      f: [10, 20, 10],
      g: [10, 20, 10],
    },
    'Ease the hips back over the backs of the hands',
    { shift: [0, -0.012, -0.06], leg: [97, 4, 101], other: [97, 4, 101] },
    both,
  ),
  'fist-wrist-extensor': st(
    'stand',
    { a: [85, 2, 6, 160, -10, -5], f: softFist, gb: 'Aback', hb: overTheBack },
    'Bend the wrist down and tip the fist toward the little finger',
    { a: [85, 2, 6, 160, -62, -5, -22] },
    hands,
  ),
  'forearm-supination': st(
    'stand',
    // Elbow tucked at the side at a right angle, palm up; the other hand wraps the wrist.
    { a: [0, 4, 90, 22], gb: 'Awrist' },
    'Roll the forearm further palm-up',
    { a: [0, 4, 90, -4] },
    hands,
  ),
  'forearm-pronation': st(
    'stand',
    { a: [0, 4, 90, 142], gb: 'Awrist' },
    'Roll the forearm further palm-down',
    { a: [0, 4, 90, 168] },
    hands,
  ),
  'finger-extension': st(
    'chair',
    // Arm forward, elbow straight, palm up; the other hand draws the fingers toward the floor.
    {
      a: [75, 4, 6, 10, 10],
      f: open,
      gb: 'Afingers',
      hb: [[0.13, -0.96, 0.23], [-0.09, -0.25, -0.97], 'Ahand'],
    },
    'Draw the straight fingertips toward the floor',
    { a: [75, 4, 6, 10, 62], f: [-25, -4, 0, 3] },
    hands,
  ),
  'hook-fist-intrinsic': st(
    'chair',
    // Hand held up, wrist straight; the other hand keeps the knuckles back.
    { a: [12, 6, 105, 20], f: open, gb: 'Aback', hb: overTheBack },
    'Bend only the middle and end joints into a hook',
    { f: hook },
    hands,
  ),
  'finger-fan': st(
    'chair',
    { ga: 'table', f: flat },
    'Spread the fingers and thumb wide',
    { f: [0, 4, 2, 30, 0, 42] },
    { ...hands, gear: ['table'] },
  ),
  'thumb-pull-back': st(
    'chair',
    // Hand held out palm up; the other hand takes the thumb from above, palm down and fingers
    // wrapping it, and draws it back and away from the palm.
    {
      a: [25, 6, 80, 12],
      f: open,
      gb: 'Athumb',
      hb: [[1, -0.2, 0.2], [0, -1, 0], 'chest'],
    },
    'Draw the thumb back and away from the palm',
    { f: [0, 4, 2, 4, -6, 48] },
    hands,
  ),
  'thumb-tuck-wrist-tilt': seq(
    'chair',
    {
      // Forearm on the table, thumb side up, hand over the far edge.
      ga: [0.18, 0.79, 0.6],
      ha: [
        [0, 0, 1],
        [-1, 0, 0],
      ],
      f: open,
    },
    [
      ['Fold the thumb in and wrap the fingers over it', { f: thumbInFist }],
      [
        'Let the hand tilt down toward the little finger',
        {
          ha: [
            [0, -0.55, 0.83],
            [-1, 0, 0],
          ],
          ga: [0.18, 0.775, 0.6],
        },
      ],
    ],
    { ...hands, gear: ['table'] },
  ),
  'thumb-web-space': st(
    'chair',
    { ga: 'table', f: flat, gb: 'Athumb' },
    'Ease the thumb away from the index finger',
    { f: [0, 4, 2, 6, -10, 52] },
    { ...hands, gear: ['table'] },
  ),
  'tendon-glides': seq(
    'chair',
    // Forearm upright, palm forward, wrist straight: each shape shows clearly from the side.
    { a: [15, 8, 105, 12], f: open },
    [
      ['Hook fist', { f: hook }],
      ['Full fist', { f: fist }],
      ['Straight hand again', { f: open }],
      ['Tabletop', { f: tabletop }],
      ['Straight fist', { f: straightFist }],
    ],
    hands,
  ),
  'wrist-circles': seq(
    'chair',
    { a: [8, 6, 90, 120], b: [8, 6, 90, 120], f: open, g: open },
    [
      ['Circle the wrists', { a: [8, 6, 90, 120, 25], b: [8, 6, 90, 120, 25] }],
      ['Reverse the circles', { a: [8, 6, 90, 120], b: [8, 6, 90, 120] }],
    ],
    { ...both, ...hands, cycle: 'wristCircles' },
  ),
} satisfies Record<string, Recipe>
