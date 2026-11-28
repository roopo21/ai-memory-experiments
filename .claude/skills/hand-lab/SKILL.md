---
name: hand-lab
description: Interactive dev bench, anatomical rules, gesture/grip recipes and self-learning iteration loop for hands, wrists and object contacts in Anatomy Explorer. Use whenever designing, fixing or reviewing any hand gesture, grip, floor palm or hand-prop interaction in Hand Lab or Motion Lab.
---

# Hand Lab & Hand Anatomy

The bar for any hand pose or motion is visual realism from every angle under gravity — automated checks are necessary, never sufficient. Hand Lab isolates one arm and hand (with an optional whole-body view) on the exact same skeleton and `MovementRig` used by Motion Lab, without any low-quality performer mesh.

## 1. Using the Hand Lab

- **Dev route**: open `?handlab` (or `?handlab=<gesture-id>&side=left|right&figure=tissue|bones|anatomy&view=oblique&body=0|1`). Guarded by `import.meta.env.DEV` in `src/App.tsx` so production bundles exclude it.
- **Figure modes**:
  - `bones`: skeleton only (skeletal atlas meshes skinned to `MovementRig`).
  - `anatomy`: skeleton + upper-limb muscles (`/models/muscles/upper-limbs.glb`).
  - `tissue` (default): skeleton inside a translucent procedural soft-tissue capsule envelope (`SKIN_RADIUS` per phalanx + palmar metacarpal capsules) so pad contact and penetration are visible against props without any performer body mesh.
- **Camera views**: world-fixed (`front`, `side`, `top`, `low` at floor level) keep gravity upright; hand-relative (`oblique`, `palm`, `back`, `thumb`, `pinky`) frame the working hand closely. Toggle `whole body` to inspect shoulder/trunk/stance context.
- **Render contact sheets (stills only, never video)**:
  ```bash
  npm run stills:hands -- --gestures fist,thumbs-up --views front,side,top,low,oblique,thumb --iterate docs/iterations/hands
  npm run stills:hands -- --gestures basketball-dribble --views front,side,low,oblique --cols 4 --iterate docs/iterations/hands
  ```
- **Code layout**:
  - `src/motion/hands/ranges.ts`: joint ranges, coupling, cascade, tenodesis, arches.
  - `src/motion/hands/fit.ts`: `SKIN_RADIUS` capsules, signed-distance props (`sphere`, `halfSpace`, `cylinder`, `finiteCylinder`, `roundedBox`, `capsuleSurface`), `closeFingers`, `placeThumb`.
  - `src/motion/hands/shapes.ts`: reusable poses (`relaxedAngles`, `openAngles`, `fist`, `pointing`, `okSign`, `pinch`, `padToPad`, `padGap`, `tipToPalm`).
  - `src/handlab/`: `HandLab.tsx`, `views.ts`, `types.ts`, `gestures/{kit,rest,signs,grips,sports}.ts`.

## 2. Hand Anatomy Rules

### Joint Ranges (degrees; flexion is positive)

Enforced limits live in `HAND_RANGES` (`src/motion/hands/ranges.ts`) and `LIMITS` (`src/motion/anatomy.ts`):

| Joint                    | Active (AAOS)      | Functional (Hume 1990) | Passive (`LIMITS`)    | Notes                                                                                             |
| ------------------------ | ------------------ | ---------------------- | --------------------- | ------------------------------------------------------------------------------------------------- |
| Wrist extension          | 0 to 70            | 30                     | up to 90              | Weight-bearing floor palm ~78–86 with forward forearm lean                                        |
| Wrist flexion            | 0 to 80            | 5                      | up to 88              | —                                                                                                 |
| Wrist radial / ulnar     | 0 to 20 / 0 to 30  | 5 / 10                 | 22 / 38               | Avoid >20 ulnar deviation in relaxed/grip poses                                                   |
| Finger MCP               | -10 to 90          | 61                     | -45 to 95             | `check:hands` forbids < -30                                                                       |
| Finger PIP               | 0 to 110           | 60                     | -8 to 115             | `check:hands` forbids < -1                                                                        |
| Finger DIP               | 0 to 80            | 39                     | -15 to 90             | `check:hands` forbids < -1                                                                        |
| Finger abduction (`fan`) | -20 to 20          | 8                      | -30 to 30             | Positive = toward thumb (radial)                                                                  |
| Thumb CMC flex           | -45 to 45          | 18                     | -50 to 50             | **Negative** = radial extension/abduction in palm plane; **positive** = ulnar flexion across palm |
| Thumb CMC abduct         | -15 to 60          | 28                     | -20 to 65             | **Positive** = palmar abduction perpendicular out of palm plane                                   |
| Thumb CMC rotate         | -45 to 45          | 20                     | -50 to 50             | Positive = pronation/opposition twist facing fingers                                              |
| Thumb MCP / IP           | 0 to 55 / -5 to 80 | 21 / 18                | -10 to 65 / -25 to 85 | Keep IP >= 0 in grips/pinch unless pressed                                                        |

### Natural Coupling, Cascade, Arches & Tenodesis

- **DIP–PIP coupling (`DIP_PER_PIP = 0.66`)**: Landsmeer's oblique retinacular ligament couples DIP flexion to roughly two-thirds of PIP flexion whenever no external surface blocks the distal phalanx (`coupledDip`).
- **Finger cascade (`cascade`)**: Ulnar digits flex more than radial digits (~10–12% increase per digit from index to little). Even straight/open hands keep ~1.5°–2° progression per finger so the hand never looks splinted.
- **Tenodesis (`TENODESIS_PER_DEGREE`)**: With free fingers, extending the wrist passively flexes the fingers (~0.25° MCP, ~0.30° PIP, ~0.12° DIP per degree of wrist extension via `applyTenodesis`); flexing the wrist relaxes/extends them.
- **Arches of the hand**:
  1. _Proximal transverse arch_ (carpal bones forming the carpal tunnel).
  2. _Distal transverse arch_ (2nd–5th metacarpal heads; 4th/5th CMC mobility drops the ulnar knuckles slightly, giving the palm concavity for cupping a ball or handle).
  3. _Longitudinal arch_ (CMC–phalangeal rays; flexed fingertips converge slightly toward the scaphoid tubercle rather than staying strictly parallel).
- **Gravity relaxation**: A hanging arm rests ~12–14° abducted to clear the lateral thigh, forearm near neutral (~78° pronation), wrist ~5° extended with ~6° ulnar tilt, and fingers in the relaxed cascade (`relaxedAngles(5)`). On a thigh, fingers drape over the curved surface via `closeFingers(..., { touch: 'pads' })`.

### Sources

- American Academy of Orthopaedic Surgeons (AAOS), _Joint Motion: Method of Measuring and Recording_ (active goniometric norms).
- Hume, M. C., Gellman, H., McKellop, H., & Brumfield, R. H. (1990), _Functional range of motion of the joints of the hand_, Journal of Hand Surgery 15(2): 240–243.
- Landsmeer, J. M. F. (1949), _The anatomy of the dorsal aponeurosis of the human finger and its functional significance_, Anatomical Record 104(1): 31–44.
- Kapandji, I. A., _The Physiology of the Joints, Volume 1: Upper Limb_ (thumb CMC saddle axes, opposition pronation, hand arches).
- Napier, J. R. (1956), _The prehensile movements of the human hand_, Journal of Bone and Joint Surgery 38B(4): 902–913 (power grip vs precision pinch).
- Neumann, D. A., _Kinesiology of the Musculoskeletal System: Foundations for Rehabilitation_ (tenodesis, palmar arches, weight-bearing wrist kinematics).
- Garrett, J. W. (1971), _The adult human hand: some anthropometric and biomechanical considerations_, Human Factors 13(2): 117–131.

## 3. Gesture & Grip Recipes

- **Relaxed hang (`relaxed-hang`)**: Shoulder abduction ~13° (clears 78 mm thigh tissue), pronation ~78°, wrist ext 5° / ulnar 6°, `relaxedAngles(5)`.
- **Relaxed on thigh (`relaxed-thigh`)**: Seated in chair, forearm pronated over distal-mid thigh, fingers started near straight and draped via `closeFingers(..., { touch: 'pads' })` onto the 68 mm thigh cylinder (`0..-1 mm` gap).
- **Fist (`fist`)**: `mcp [88..94]`, `pip [104..108]`, `dip [68..72]`, `placeThumb` across `Middle2`–`Ring2` dorsal face (`abduct 6..36`, `mcp 25..58`, `ip 24..58`) so the thumb wraps snugly instead of bridging out.
- **Thumbs up / Thumbs down (`thumbs-up`, `thumbs-down`)**: Same tight fist; thumb `[-42, -12, -36, 3, 3]` (radial CMC extension, NOT positive palmar abduction!). For thumbs-down, pronate forearm (~165°) and internally rotate humerus (~-85°) rather than hyperflexing/ulnar-deviating the wrist.
- **Pointing (`pointing`)**: Index straight `[4, 2, 1]` with `fan[0] = 3`, middle/ring/little fist-curled, thumb wrapped over `Middle2`.
- **OK sign (`ok-sign`)**: Forearm **supinated** (~22°), `padToPad` with `mcp >= 14°` and `ip >= 18°` so thumb and index form a round O-ring (`padGapMm ~ -1.7 mm`), middle/ring/little gently fanned (`[8, 0, -5, -11]`).
- **Pinch (`pinch`)**: Curved precision arch (`padToPad` with `mcp >= 14, ip >= 18`), other three fingers tucked cleanly in cascade (`[48..66]`).
- **Floor palm (`palm-floor`)**: All-fours stance with hands slightly ahead of shoulders so elbow is ~8–14° and wrist ext ~78–86°; `flatPalmOrientation` + `onFloor` keeps palm pad and all digits at `0..4 mm` above `y=0` with thumb level in the palm plane.
- **Power grip (`band-grip`)**: Oblique cylinder across `gripPoint`, `closeFingers` from open start (`mcp 14..20`) with `coupling: 0.66`, `placeThumb` opposed on the wrist/radial side avoiding handle & index (`-0.5..-1.0 mm` per finger).
- **Chair edge (`chair-edge`)**: Wrist positioned outside the lateral cushion (`roundedBox`, 9 mm edge radius), fingers hooked underneath via `closeFingers`, thumb resting on top of the cushion (`-0.5..-1.1 mm`).
- **Basketball dribble (`basketball-dribble`)**: Athletic bent-knee dribble stance (so shoulder reaches down to release height without arm max-out!), wide finger fan (`[11, 3, -5, -13]`), `closeFingers(..., { touch: 'pads' })` onto 120 mm sphere keeping palm arch clear, wrist flexing smoothly through release, ball kissing `y = 0` at bounce.
- **Off-spin bowling (`off-spin-bowling`)**: Index & middle spread wide (`fan[0]=12`, `fan[1]=-4`) straddling the 36 mm cricket ball's stitched seam, ring & little curled underneath, thumb on opposite seam side; arm slots at ~30–32° abduction (clear of skull), forearm pronates through release as index rips across the seam.

## 4. Self-Learning Iteration Loop

1. **Describe the real form first**: body support/weight, contacts, joint angles, timing, and citations in `form`.
2. **Render multi-angle sheets**: always include world views (`front`, `side`, `top`, `low`) to expose floating/gravity errors, plus hand close-ups (`oblique`, `thumb`, `palm`) and all key motion moments (`--iterate docs/iterations/hands`).
3. **Critique the PNGs directly**: open every sheet and inspect against real human form (never rely on metrics alone).
4. **Fix, re-render, and keep every iteration**: store `01.png`, `02.png`, ... under `docs/iterations/hands/<id>/` so progress is auditable.
5. **Distil into LEARNINGS below** before moving to the next gesture or back to Motion Lab.

## 5. LEARNINGS

- **Thumb CMC axes on this skeleton**: positive `thumb[1]` (`spread`) produces **palmar abduction** (out perpendicular to the palm), NOT radial abduction! For thumbs-up, thumbs-down, and flat floor palms, radial abduction requires **negative `thumb[0]` (`flex` ~ -38 to -42°) + negative `thumb[1]` + negative `thumb[2]`**.
- **Hand-relative camera `up` hides gravity errors**: setting camera `up = handLong` flips hanging hands and thumbs-down upside down so they look upright in hand-local frames. World views (`front`, `side`, `top`, `low`) must always keep `worldUp = (0, 1, 0)`, and `oblique`/`thumb`/`pinky` should also use `worldUp` whenever not looking straight down.
- **Do not let `closeFingers` trap penetrating starts**: if a finger starts inside a surface (thigh, basketball, handle), a flex-only loop skips it (`gap <= 0`) and leaves fingers buried. Backing off toward `OPEN_LIMIT` (`mcp -25, pip 0, dip -8`) guarantees clean surface contact regardless of initial pose.
- **`touch: 'pads'` vs `'wrap'`**: wrapping sequentially onto a small handle (`band-grip`) closes `mcp` -> `pip` -> `dip` cleanly, but on a broad convex surface (thigh, basketball), closing `pip` until `phal2` touches drives `phal3` (fingertip) 10–16 mm _into_ the surface. Stopping `mcp`/`pip` whenever any distal phalanx reaches the surface (`touch: 'pads'`) eliminates fingertip penetration.
- **Thumb-across fist needs tight `abduct` bounds & `along: 0.7`**: targeting `Middle2` with unrestricted `abduct` lets `placeThumb` bridge the thumb out in mid-air (`26 mm` off the knuckles) while still hitting the pad point. Constraining `FIST_THUMB_LIMITS` (`abduct 6..36`, `mcp 25..58`, `ip 24..58`) makes the thumb wrap flush across `Index2`/`Middle2`.
- **Precision pinch/OK needs curved MCP & IP floors**: unconstrained `placeThumb` solves pad-to-pad contact with `thumb.mcp = 0, ip = 0` (stiff straight stick). Setting `PAD_PINCH_LIMITS` (`mcp >= 14, ip >= 18`) produces natural C-shaped precision opposition.
- **Standing upright cannot reach a low dribble release**: with pelvis at `0.88 m`, the shoulder is at `1.33 m` and total arm reach is ~`0.54 m` (floor of reach ~`0.79 m`). A realistic basketball push-release (`ballY ~ 0.52 m`) requires an athletic bent-knee stance (`root y ~ 0.78 m`, `trunk +16°`), otherwise the elbow locks straight at `0.8°` and the hand hovers above the ball.
- **No performer mesh**: Hand Lab renders only anatomical bones, upper-limb muscles, and translucent procedural soft-tissue capsules (`TissueLayer`), never `performer.glb`.
